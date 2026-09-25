-- Opportunities: بايبلاين مراجعة حقيقي (كان مفقود تمامًا) -----------------
--
-- اتأكّدنا من الداتابيز الحية قبل الكتابة (مش تخمين): opportunities.status
-- أصلاً enum حقيقي (opportunity_status) بالقيم السبعة اللي الأودت وصفها
-- بالظبط: research -> official_source_check -> independent_review ->
-- approved -> published -> deadline_review -> expired_archive. الجدول كان
-- فعلاً مبني من الأول لنظام مراجعة (عنده researcher_id/reviewer_id
-- + قيد researcher_not_reviewer)، بس مفيش أي دالة أو RLS تسمح لحد
-- يستخدمهم فعليًا — كل الفرص التسعة الحالية دخلت مباشرة بـ status='published'
-- عن طريق seed migration 0010، مش عن طريق البايبلاين ده.
--
-- تبسيط متعمّد (موثّق هنا، مش مخفي): مفيش enum value اسمه "rejected" أصلاً
-- في opportunity_status — القرار البديل (بدل ما نضيف value جديدة لنوع حي)
-- إن "المراجع رافض" بيرجّع الفرصة لحالة research تاني مع سبب إجباري، بدل
-- ما نخترع حالة مش موجودة. وكمان approved/published بيحصلوا في نفس اللحظة
-- (استدعاء واحد للمراجع) بدل خطوتين منفصلتين — الجدول مفيهوش سجل تاريخي
-- منفصل زي project_reviews، فمفيش فرق فعلي ملموس بين "approved لحظة واحدة
-- بعدها published" و"published مباشرة". deadline_review/expired_archive
-- محتاجين job مجدول (وقت/cron) مش حدث بشري — مؤجّلين لـP2 عمدًا، مش هنبني
-- cron infrastructure دلوقتي (زي ما الأودت طلب صراحة).
--
-- صلاحية opportunity_review اتأكّدت موجودة فعلاً في جدول permissions
-- الحقيقي (933e39b8-...) — مفيش صلاحية جديدة اتخترعت هنا.

begin;

-- الستاف (opportunity_review أو super admin) يشوف كل الفرص بكل حالاتها،
-- مش بس published — عشان يقدر يشتغل على الـ queue أصلاً. سياسة permissive
-- إضافية، بتتحط فوق opportunities_select_published الموجودة (OR بينهم)
drop policy if exists "opportunities_select_reviewer" on public.opportunities;
create policy "opportunities_select_reviewer"
  on public.opportunities for select
  to authenticated
  using (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'opportunity_review'));

-- مفيش أي GRANT INSERT/UPDATE مباشر لحد خالص على opportunities — كل
-- الكتابة عن طريق الدوال الأربعة تحت بس (SECURITY DEFINER)، نفس فلسفة
-- submit_project_review بالظبط

-- ============================================================
-- 1) propose_opportunity — الباحث (عنده opportunity_review) بيبدأ فرصة
-- جديدة بحالة research
-- ============================================================
create or replace function public.propose_opportunity(
  p_title text, p_provider text, p_opportunity_type text, p_summary text, p_official_source_url text,
  p_category text default null, p_icon text default null, p_accent text default null,
  p_min_age integer default null, p_max_age integer default null,
  p_eligible_countries text[] default '{}', p_location text default 'عالمي',
  p_delivery_mode text default null, p_funding_label text default null, p_cost text default null,
  p_duration text default null, p_age_note text default null,
  p_deadline timestamptz default null, p_deadline_timezone text default null, p_deadline_note text default null,
  p_eligibility text[] default '{}', p_requirements text default null, p_required_documents text default null,
  p_tags text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'لازم تسجّل دخولك.';
  end if;
  if not (public.is_super_admin(v_actor) or public.has_permission(v_actor, 'opportunity_review')) then
    raise exception 'الإجراء ده لفريق COCR بس.';
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(coalesce(p_official_source_url, ''))) = 0 then
    raise exception 'العنوان ورابط المصدر الرسمي لازم يكونوا موجودين.';
  end if;

  insert into public.opportunities (
    title, provider, opportunity_type, summary, official_source_url,
    category, icon, accent, min_age, max_age, eligible_countries, location, delivery_mode,
    funding_label, cost, duration, age_note, deadline, deadline_timezone, deadline_note,
    eligibility, requirements, required_documents, tags,
    verified, featured, status, researcher_id, reviewer_id
  ) values (
    trim(p_title), p_provider, p_opportunity_type, coalesce(p_summary, ''), trim(p_official_source_url),
    p_category, p_icon, p_accent, p_min_age, p_max_age, p_eligible_countries, p_location, p_delivery_mode,
    p_funding_label, p_cost, p_duration, p_age_note, p_deadline, p_deadline_timezone, p_deadline_note,
    p_eligibility, p_requirements, p_required_documents, p_tags,
    false, false, 'research', v_actor, null
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.propose_opportunity(
  text, text, text, text, text, text, text, text, integer, integer, text[], text, text, text, text,
  text, text, timestamptz, text, text, text[], text, text, text[]
) from public;
grant execute on function public.propose_opportunity(
  text, text, text, text, text, text, text, text, integer, integer, text[], text, text, text, text,
  text, text, timestamptz, text, text, text[], text, text, text[]
) to authenticated;

-- ============================================================
-- 2) advance_opportunity_stage — الباحث نفسه بيقدّم من مرحلة تحضير
-- لاللي بعدها (research -> official_source_check -> independent_review).
-- نفس الشخص اللي بدأها بس (أو أدمن) — مفيش شرط "شخص مختلف" هنا لأن دول
-- مراحل تحضير مش قرار اعتماد
-- ============================================================
create or replace function public.advance_opportunity_stage(p_opportunity_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_researcher uuid;
  v_next text;
begin
  if v_actor is null then
    raise exception 'لازم تسجّل دخولك.';
  end if;

  select status, researcher_id into v_status, v_researcher
  from public.opportunities where id = p_opportunity_id for update;

  if v_status is null then
    raise exception 'الفرصة دي مش موجودة.';
  end if;
  if v_researcher <> v_actor and not public.is_super_admin(v_actor) then
    raise exception 'انتي مش الباحث المسؤول عن الفرصة دي.';
  end if;

  v_next := case v_status
    when 'research' then 'official_source_check'
    when 'official_source_check' then 'independent_review'
    else null
  end;

  if v_next is null then
    raise exception 'الفرصة دي مش في مرحلة تحضير قابلة للتقديم دلوقتي.';
  end if;

  -- مش بنلمس updated_at هنا عمدًا — مش متأكدين إنه موجود فعليًا على الجدول
  -- القديم ده (مفيش ذكر ليه في أي migration متتبّعة)، والعمود مش ضروري
  -- لصحة العملية نفسها
  update public.opportunities set status = v_next where id = p_opportunity_id;
end;
$$;

revoke all on function public.advance_opportunity_stage(uuid) from public;
grant execute on function public.advance_opportunity_stage(uuid) to authenticated;

-- ============================================================
-- 3) review_opportunity — المراجع (شخص مختلف عن الباحث، researcher_not_reviewer
-- constraint بيفرض ده على مستوى الجدول كمان) بيوافق (-> published مباشرة،
-- verified = true) أو بيرجّعها للباحث يعدّل (-> research + سبب إجباري)
-- ============================================================
create or replace function public.review_opportunity(p_opportunity_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_researcher uuid;
begin
  if v_actor is null then
    raise exception 'لازم تسجّل دخولك.';
  end if;
  if not (public.is_super_admin(v_actor) or public.has_permission(v_actor, 'opportunity_review')) then
    raise exception 'الإجراء ده لفريق COCR بس.';
  end if;
  if p_decision not in ('approved', 'needs_rework') then
    raise exception 'invalid decision';
  end if;

  select status, researcher_id into v_status, v_researcher
  from public.opportunities where id = p_opportunity_id for update;

  if v_status is null then
    raise exception 'الفرصة دي مش موجودة.';
  end if;
  if v_status <> 'independent_review' then
    raise exception 'الفرصة دي مش مستنية مراجعة نهائية دلوقتي.';
  end if;
  if v_researcher = v_actor then
    raise exception 'مينفعش تراجع فرصة انتي اللي بحثتها.';
  end if;
  if p_decision = 'needs_rework' and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'لازم توضّح سبب الإرجاع.';
  end if;

  -- نفس ملحوظة updated_at فوق — متعمّد إننا مش بنلمسه
  if p_decision = 'approved' then
    update public.opportunities
    set status = 'published', verified = true, reviewer_id = v_actor
    where id = p_opportunity_id;
  else
    update public.opportunities
    set status = 'research', reviewer_id = v_actor
    where id = p_opportunity_id;
  end if;
end;
$$;

revoke all on function public.review_opportunity(uuid, text, text) from public;
grant execute on function public.review_opportunity(uuid, text, text) to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد (all-or-nothing)، كل حاجة idempotent
-- (create or replace / drop policy if exists). مفيش لمس لأي صف موجود —
-- الفرص المنشورة التسعة الحالية فضلت زي ما هي بالظبط. deadline_review/
-- expired_archive عمدًا برّه نطاق الملف ده (محتاجين جدولة زمنية، قرار منفصل).
