-- Milestone 13 — نظام مراجعة مشاريع التخرّج: /projects مش "شارك أي مشروع
-- وقت ما عايز" — هي showcase رسمي لمشاريع التخرّج، مربوطة بمصداقية الشهادة
-- (لينك/QR هيودّي على المشروع ده). يعني النشر العام لازم يمر على مراجعة
-- ليدر حقيقية، مش self-publish زي ما كان.
--
-- قرارات معمارية أساسية (اترجعت مع المستخدمة قبل الكتابة):
-- 1) course_submissions (تسليمات الكورس الخاصة، بتتراجع من المنتور) فضلت
--    زي ما هي تمامًا — مفيش أي لمس. النظام ده منفصل عمدًا، بيوسّع projects
--    نفسها بس (الجدول العام أصلاً).
-- 2) catalog_courses.mentor_id نص Seed زخرفي (مش FK حقيقي على profiles —
--    موثّق صراحة في 0008 كقرار متأجل) — اتأكد بالفحص إنه مش قابل للاستخدام.
--    البديل: mentor_ratings (student_id, course_id, mentor_id) — قراءة فقط،
--    الداتابيز نفسها (مش الكود في TypeScript) بتحسبها وقت الإرسال للمراجعة.
-- 3) المشاريع الحالية بحالة published بتفضل زي ما هي — مفيش retroactive
--    review، القيم القديمة (draft/published) subset من القيم الجديدة أصلًا
--    فمفيش أي UPDATE على بيانات موجودة مطلوب.
-- 4) project_reviews جدول history منفصل (append-only، مفيش UPDATE/DELETE
--    grant خالص) — مش أعمدة على projects نفسها، عشان نحتفظ بكل محاولات
--    المراجعة القديمة من غير overwrite.
--
-- تعديلات بعد أول مراجعة أمنية (راجع الشات قبل الكتابة):
-- 5) submit_project_review() بقت الطريق الوحيد اللي ينشر/يرفض بيه أي
--    مشروع — security definer، ومفيش أي RLS policy تانية بتسمح لليدر
--    يعمل UPDATE مباشر على status. الصلاحية بقت فحص يدوي جوّه الدالة نفسها.
-- 6) project_reviews.reviewer_id بقت nullable + on delete set null (مش
--    cascade) — حذف حساب مراجع مايمسحش تاريخ المراجعات القديمة.
-- 7) project_reviews.project_id بقت on delete restrict — مشروع دخل
--    مراجعة (عنده صف project_reviews) مينفعش يتمسح خالص، حتى لو owner.
--    الـ DELETE policy بقت مقصورة على draft بس (مش rejected) عشان تتماشى
--    مع القيد ده من غير ما تصطدم بيه بـ error خام.
-- 8) الـ trigger بقى بيتحقق من (old.status, new.status) كزوج بالظبط، مش
--    بس كل قيمة لوحدها — draft->rejected مباشر بقى ممنوع صراحة.
-- 9) صلاحية SELECT جديدة للمنتور (mentor_id = auth.uid()) — SELECT بس،
--    مستحيل تأثّر على UPDATE/DELETE لأنها نوع أمر مختلف تمامًا في RLS.
-- 10) evidence check بقى بيرفض NULL/فاضي/مسافات بس.
-- 11) submit_project_review() بقت ترفض لو المراجع نفسه هو صاحب المشروع
--     (conflict of interest — عضو فريق عنده project_review ولسه طالب
--     كمان مايقدرش يوافق على مشروع نفسه، خصوصًا إنه Verified Graduation
--     Project مرتبط بمصداقية شهادة حقيقية).
--
-- تسجيل تقني (مش هنصلحه هنا، خارج نطاق الملف ده تمامًا): mentor_ratings
-- الأصلية (migration 0004) بتسمح لأي طالب يـ insert صف بيسمّي فيه أي uuid
-- عشوائي كـ mentor_id — مفيش تحقق إنه منتور معتمد فعلاً. الـ auto-resolution
-- هنا بتثق في البيانات دي زي ما هي. لازم يتصلح في migration منفصلة.

begin;

-- ============================================================
-- 1) توسيع projects
-- ============================================================
alter table public.projects
  add column if not exists course_id text references public.catalog_courses(id),
  add column if not exists mentor_id uuid references public.profiles(id) on delete set null,
  add column if not exists github_url text,
  add column if not exists video_url text;

-- status بقى مصدر الحقيقة الوحيد لحالة المراجعة (مفيش عمود review_status
-- منفصل) — draft (بيتعدّل بحرية) -> pending_review (متقفول، مستني الليدر)
-- -> published (معتمد، عام) أو rejected (اترفض، الطالب يقدر يعدّل ويرسل
-- تاني -> pending_review). القيم القديمة (draft/published) subset من دي.
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('draft', 'pending_review', 'published', 'rejected'));

-- مشروع تخرّج حقيقي لازم يحدّد كورسه ويقدّم دليل حقيقي (فيديو + جيت هاب)
-- قبل ما يدخل المراجعة أصلًا — ده جزء من "التحقق البشري" نفسه، مش شكلي.
-- بيرفض NULL وكمان string فاضي/مسافات بس (مش بس is not null).
--
-- مهم: القيد ده على pending_review بس، مش published. لو حطيناه على
-- published كمان، الـ ALTER TABLE هيفشل فورًا (Postgres بيتحقق من الصفوف
-- الموجودة وقت إضافة constraint جديد) — المشاريع المنشورة قبل الـ
-- migration ده كلها course_id/github_url/video_url = NULL (أعمدة جديدة
-- فاضية بالطبيعة)، وده بالظبط اللي كسر أول تشغيلة فعلية للملف ده
-- (ERROR 23514). الحماية لسه فعّالة لكل مشروع جديد رغم كده: published
-- بقى مش بيتوصله غير من submit_project_review()، اللي بترفض غير لو
-- الحالة الحالية pending_review بالظبط — يعني أي مشروع published جديد
-- لازم يكون فعلاً عدّى من pending_review (ومعاه evidence اتفحصت هناك)،
-- والمشروع مايقدرش يتعدّل خالص وهو pending_review أو published عشان
-- الحقول تتمسح بعد كده. فالضمان الفعلي موجود من غير ما نكسر البيانات القديمة
alter table public.projects drop constraint if exists projects_review_requires_evidence;
alter table public.projects add constraint projects_review_requires_evidence
  check (
    status <> 'pending_review'
    or (
      course_id is not null and length(trim(course_id)) > 0
      and github_url is not null and length(trim(github_url)) > 0
      and video_url is not null and length(trim(video_url)) > 0
    )
  );

-- ============================================================
-- 2) الحارس: مين يقدر يشوف/يغيّر إيه على projects
-- ============================================================
-- الليدر لازم يشوف المشاريع اللي مش published (pending_review بتاعة ناس
-- تانية) عشان يراجعها أصلًا — للقراءة بس، مفيش UPDATE هنا خالص (شوف #5)
drop policy if exists "projects_select_reviewer" on public.projects;
create policy "projects_select_reviewer"
  on public.projects for select
  to authenticated
  using (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'project_review'));

-- المنتور يشوف بس المشاريع المرتبطة بيه (طلابه) — SELECT بس. نوع أمر
-- مختلف تمامًا عن UPDATE/DELETE في RLS، فمفيش أي احتمال إنها "تسرّب" أي
-- صلاحية كتابة — سياسة SELECT فيزيائيًا مستحيل تأثّر على أوامر تانية
drop policy if exists "projects_select_mentor" on public.projects;
create policy "projects_select_mentor"
  on public.projects for select
  to authenticated
  using (mentor_id = auth.uid());

-- صاحب المشروع: يعدّل بس وهو draft أو rejected. with check هنا حد أقصى
-- تقريبي (draft/pending_review/rejected) — التحقق الدقيق من كل زوج
-- (old_status, new_status) بالظبط منقول للـ trigger تحت (RLS وحدها مش
-- قادرة تقارن العمود القديم بالجديد في تعبير واحد)
drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects for update
  to authenticated
  using (auth.uid() = owner_id and status in ('draft', 'rejected'))
  with check (auth.uid() = owner_id and status in ('draft', 'pending_review', 'rejected'));

-- ملحوظة أمان مهمة: **مفيش** أي UPDATE policy لليدر هنا خالص. قرار
-- النشر/الرفض ممنوع تمامًا عن طريق UPDATE مباشر على الجدول — الطريق
-- الوحيد هو submit_project_review() (قسم 5) اللي بيتحقق من الصلاحية
-- بنفسه جوّه الدالة كـ security definer، مش عن طريق RLS على الجدول.
-- لو حد حاول UPDATE مباشر بصلاحية project_review، الصف مش هيبقى
-- selectable للتعديل أصلًا (مفيش policy تسمح بيه) — 0 rows affected.

-- حذف مشروع دخل مراجعة (عنده صف واحد على الأقل في project_reviews) بيكسر
-- تاريخ المراجعة وممنوع فعليًا بالـ FK (on delete restrict تحت) — الـ
-- policy هنا مقصورة على draft بس عشان الطالب ميوصلش لمحاولة حذف هترفض
-- بـ error خام من الداتابيز، يوصله رفض واضح من الأول (RLS)
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects for delete
  to authenticated
  using (auth.uid() = owner_id and status = 'draft');

-- ============================================================
-- 3) trigger: (أ) يمنع أي حد غير الليدر من تعديل mentor_id يدويًا،
-- (ب) بيحسب المنتور تلقائيًا وقت الإرسال للمراجعة، (ج) بيتأكد إن صاحب
-- المشروع بس عامل بالظبط واحد من الـ 4 transitions المسموحة ليه —
-- draft->draft, draft->pending_review, rejected->rejected,
-- rejected->pending_review. أي زوج تاني (زي draft->rejected مباشر) ممنوع
-- ============================================================
create or replace function public.projects_guard_and_resolve_mentor()
returns trigger
language plpgsql
as $$
declare
  is_leader boolean;
  resolved_mentor uuid;
  candidates int;
begin
  is_leader := public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'project_review');

  -- الليدر (بما فيه submit_project_review() نفسها، اللي بتحتفظ بهوية
  -- المستخدم الأصلي في auth.uid() حتى وهي security definer) يعدّي بحرية
  if is_leader then
    return new;
  end if;

  if new.mentor_id is distinct from old.mentor_id then
    raise exception 'مش مسموح تعدّل المنتور المرتبط بالمشروع مباشرة.';
  end if;

  if (old.status, new.status) not in (
    ('draft', 'draft'),
    ('draft', 'pending_review'),
    ('rejected', 'rejected'),
    ('rejected', 'pending_review')
  ) then
    raise exception 'انتقال حالة غير مسموح به.';
  end if;

  if new.status = 'pending_review' and old.status in ('draft', 'rejected') then
    -- min(uuid) مش موجودة كـ aggregate في النسخة دي من Postgres (اتأكد
    -- بالتجربة الفعلية — 42883/function min(uuid) does not exist). array_agg
    -- distinct بيحتاج equality بس مش ordering، فشغالة مع أي نوع عمود
    select count(distinct mr.mentor_id), (array_agg(distinct mr.mentor_id))[1]
      into candidates, resolved_mentor
    from public.mentor_ratings mr
    where mr.student_id = new.owner_id and mr.course_id = new.course_id;

    -- منتور واضح واحد بس -> استخدمه. صفر أو أكتر من واحد -> NULL، الليدر
    -- بيحدده وقت المراجعة
    if candidates = 1 then
      new.mentor_id := resolved_mentor;
    else
      new.mentor_id := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists projects_guard_and_resolve_mentor_trg on public.projects;
create trigger projects_guard_and_resolve_mentor_trg
  before update on public.projects
  for each row
  execute function public.projects_guard_and_resolve_mentor();

-- ============================================================
-- 4) project_reviews — سجل تاريخي، append-only. الطالب/المنتور محدش فيهم
-- يقدر يكتب فيه أو يعدّله — الليدر بس insert (دايمًا عن طريق الدالة تحت
-- عمليًا)، مفيش UPDATE/DELETE خالص لحد. reviewer_id nullable عشان حذف
-- حساب مراجع مايمسحش السجل التاريخي (on delete set null مش cascade)
-- ============================================================
create table if not exists public.project_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('approved', 'rejected')),
  student_score smallint check (student_score between 1 and 5),
  mentor_score smallint check (mentor_score between 1 and 5),
  reviewer_note text check (reviewer_note is null or char_length(reviewer_note) <= 2000),
  created_at timestamptz not null default now(),
  constraint project_reviews_rejection_needs_reason
    check (decision = 'approved' or (reviewer_note is not null and char_length(trim(reviewer_note)) > 0))
);

create index if not exists project_reviews_project_idx on public.project_reviews (project_id, created_at desc);

alter table public.project_reviews enable row level security;

drop policy if exists "project_reviews_select_leader" on public.project_reviews;
create policy "project_reviews_select_leader"
  on public.project_reviews for select
  to authenticated
  using (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'project_review'));

-- الحماية الحقيقية للـ INSERT هنا بقت مزدوجة عمدًا: submit_project_review()
-- كـ security definer بتتجاوز RLS الجدول ده لعملياتها هي، فالـ policy دي
-- defense-in-depth لأي محاولة insert مباشرة من برّه الدالة (لو حصلت لأي
-- سبب) — مش المسار الطبيعي، لكن مفيش سبب نسيبها مفتوحة
drop policy if exists "project_reviews_insert_leader" on public.project_reviews;
create policy "project_reviews_insert_leader"
  on public.project_reviews for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'project_review'))
  );

grant select, insert on public.project_reviews to authenticated;

-- Views ضيّقة فوق project_reviews — نفس تقنية profiles_public (0005): الـ
-- view بتتقرا بصلاحية مالكها (بتتجاوز الـ RLS المقفولة بتاعة الجدول
-- الأصلي)، وبتفلتر هي بنفسها بشرط auth.uid() صريح. كده الطالب يشوف سبب
-- الرفض بس من غير أي درجة رقمية، والمنتور يشوف درجته هو بس من غير درجة الطالب
create or replace view public.project_reviews_for_owner as
  select pr.id, pr.project_id, pr.decision, pr.reviewer_note, pr.created_at
  from public.project_reviews pr
  join public.projects p on p.id = pr.project_id
  where p.owner_id = auth.uid();

grant select on public.project_reviews_for_owner to authenticated;

create or replace view public.project_reviews_for_mentor as
  select pr.id, pr.project_id, pr.mentor_score, pr.created_at
  from public.project_reviews pr
  join public.projects p on p.id = pr.project_id
  where p.mentor_id = auth.uid();

grant select on public.project_reviews_for_mentor to authenticated;

-- ============================================================
-- 5) submit_project_review — الطريق الوحيد والحصري اللي أي قرار نشر/رفض
-- بيتاخد بيه. security definer (مش invoker زي أول نسخة) — عشان الجدول
-- projects معندوش أي UPDATE policy لليدر خالص دلوقتي، فلازم الدالة نفسها
-- تتجاوز RLS وتعمل الفحص يدويًا جوّاها. الصلاحية، وجود المشروع، وحالته
-- (pending_review فعلاً) كلهم بيتفحصوا هنا قبل أي كتابة. الـ SELECT ... FOR
-- UPDATE بتاخد row lock حقيقي يمنع two reviewers من الموافقة على نفس
-- المشروع في نفس اللحظة (التاني هيستنى، يشوف الحالة اتغيرت، ويترفض).
-- INSERT + UPDATE هنا statement واحد جوّه نفس استدعاء الدالة — لو أي
-- exception اتقفزت في أي سطر (decision غلط، صلاحية ناقصة، مشروع مش
-- pending_review)، الدالة كلها بترجع من غير ما تلمس أي جدول، زي أي
-- exception عادي في Postgres بيلغي الـ statement بالكامل تلقائيًا
-- ============================================================
create or replace function public.submit_project_review(
  p_project_id uuid,
  p_decision text,
  p_reviewer_note text,
  p_student_score smallint default null,
  p_mentor_score smallint default null,
  p_mentor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reviewer uuid := auth.uid();
  v_status text;
  v_owner uuid;
begin
  if v_reviewer is null then
    raise exception 'لازم تسجّلي دخولك.';
  end if;

  if not (public.is_super_admin(v_reviewer) or public.has_permission(v_reviewer, 'project_review')) then
    raise exception 'الإجراء ده لفريق COCR بس.';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid decision';
  end if;

  select status, owner_id into v_status, v_owner from public.projects where id = p_project_id for update;

  if v_status is null then
    raise exception 'المشروع مش موجود.';
  end if;
  if v_status <> 'pending_review' then
    raise exception 'المشروع مش مستني مراجعة دلوقتي — ممكن حد تاني راجعه قبلك.';
  end if;
  -- conflict of interest: مراجع مايقدرش يوافق/يرفض مشروع هو نفسه صاحبه —
  -- مهم خصوصًا إن المشروع مرتبط بمصداقية شهادة (Verified Graduation Project)
  if v_owner = v_reviewer then
    raise exception 'مينفعش تراجعي مشروعك انتي نفسك.';
  end if;

  insert into public.project_reviews (project_id, reviewer_id, decision, student_score, mentor_score, reviewer_note)
  values (p_project_id, v_reviewer, p_decision, p_student_score, p_mentor_score, nullif(trim(coalesce(p_reviewer_note, '')), ''));

  update public.projects
  set status = case when p_decision = 'approved' then 'published' else 'rejected' end,
      mentor_id = coalesce(p_mentor_id, mentor_id),
      updated_at = now()
  where id = p_project_id;
end;
$$;

revoke all on function public.submit_project_review(uuid, text, text, smallint, smallint, uuid) from public;
grant execute on function public.submit_project_review(uuid, text, text, smallint, smallint, uuid) to authenticated;

-- ============================================================
-- 6) project_views — عداد مشاهدات حقيقي، deduplicated بـ unique constraint
-- (مش cached column ممكن يخرج غلط). زوار مش مسجّلين دخول مش بيتعدّوا في v1
-- عمدًا — أبسط قرار أمين بدل ما نخترع طريقة تتبّع لزائر مجهول (fingerprint/IP)
-- ============================================================
create table if not exists public.project_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (project_id, viewer_id)
);

create index if not exists project_views_project_idx on public.project_views (project_id);

alter table public.project_views enable row level security;

drop policy if exists "project_views_select_project_visible" on public.project_views;
create policy "project_views_select_project_visible"
  on public.project_views for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_views.project_id and (p.status = 'published' or p.owner_id = auth.uid())
    )
  );

drop policy if exists "project_views_insert_own" on public.project_views;
create policy "project_views_insert_own"
  on public.project_views for insert
  to authenticated
  with check (
    auth.uid() = viewer_id
    and exists (select 1 from public.projects p where p.id = project_views.project_id and p.status = 'published')
  );

grant select, insert on public.project_views to authenticated;

commit;

-- ============================================================
-- خطوة يدوية لازم تتعمل بعد الـ migration (مش SQL، مينفعش نعملها هنا لأننا
-- مش عارفين شكل جدول admin_permissions الحقيقي بالظبط):
-- امنحي صلاحية project_review لأي حساب تيمكم عايزينه يراجع مشاريع التخرّج،
-- بنفس الطريقة اللي مينوحة بيها mentor_application_review دلوقتي (نفس
-- الجدول، بس target_permission = 'project_review').
-- ============================================================
