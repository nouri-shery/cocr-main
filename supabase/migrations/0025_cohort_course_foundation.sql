-- نظام الكورسات الجماعية اللايف (Live Mentor-Led Cohort Learning) --------
-- الأساس: توسيع course_proposals لتبقى الـ Course نفسها، + جدول curriculum
-- sessions (القالب القابل لإعادة الاستخدام)، + جدول cohorts (الدفعة
-- المجدولة)، + توسيع course_enrollments عشان تحمل عضوية الدفعة.
--
-- المعمارية المتفق عليها (اتقفلت مع المستخدمة قبل أي كود):
--   course_proposals (الكورس) -> course_curriculum_sessions (القالب)
--     -> course_cohorts (دفعة مجدولة، منتور + تواريخ)
--       -> course_enrollments (طالب داخل دفعة معيّنة، مش كورس مجرّد)
--
-- قرار مهم اتفق عليه: منتور واحد بس لكل كورس في V1 — مقترِح الكورس
-- (course_proposals.mentor_id) هو الوحيد اللي يقدر يعمل cohorts لكورسه.
-- تعدد المنتورين لنفس المنهج قرار مؤجّل (محتاج course_mentors جدول تاني).

begin;

-- ============================================================
-- 1) course_proposals — من pitch بسيط لـ Course حقيقي بدورة حياة كاملة
-- ============================================================
alter table public.course_proposals
  add column if not exists learning_outcomes text[] not null default '{}',
  add column if not exists skills text[] not null default '{}',
  add column if not exists age_min integer,
  add column if not exists age_max integer,
  add column if not exists prerequisites text,
  add column if not exists weekly_workload_hours numeric,
  add column if not exists level text,
  add column if not exists final_project_brief text,
  add column if not exists final_project_rubric jsonb,
  add column if not exists final_project_deliverables text;

-- الحالات القديمة (pending/approved/rejected) subset من الجديدة، ماعدا
-- pending نفسها — مش موجودة في القايمة الجديدة، فلازم نرحّل الصفوف
-- الموجودة الأول قبل ما نضيف الـ constraint، وإلا الـ ALTER TABLE هيفشل
-- فورًا (نفس درس projects_review_requires_evidence بالظبط)
update public.course_proposals set status = 'submitted' where status = 'pending';

alter table public.course_proposals drop constraint if exists course_proposals_status_check;
alter table public.course_proposals add constraint course_proposals_status_check
  check (status in (
    'draft', 'submitted', 'content_review', 'technical_review',
    'needs_changes', 'approved', 'published', 'archived', 'rejected'
  ));

alter table public.course_proposals alter column status set default 'draft';

-- ============================================================
-- 1b) دوال مساعدة للـ RLS (SECURITY DEFINER)
--
-- ليه محتاجينها: subquery جوّه policy بتتنفّذ بصلاحيات وRLS المستخدم نفسه،
-- فلو الجدول اللي جوّه الـ subquery المستخدم مش شايفه (طالب مش شايف
-- course_proposals، منتور مش شايف enrollments طلاب دفعته...) الـ subquery
-- بيرجّع صفر صفوف والـ policy بتفشل بصمت. اتأكّد بتجربة فعلية على نسخة
-- محلية مطابقة: تسجيل الحضور، رؤية الطالب للمنهج/المهام، مستحيلين من غيرها.
-- كل دالة بتسأل عن حالة auth.uid() الحالي هو نفسه بس (مفيش uid كمعامل)، فمفيش
-- طريقة تستعملها لاستكشاف بيانات حد تاني. plpgsql عمدًا (late binding) عشان
-- الجداول/الأعمدة اللي بتشاور عليها بتتضاف في الأقسام اللي بعد.
-- ============================================================
create or replace function public.is_content_staff()
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'content_review');
end;
$$;

create or replace function public.is_course_owner(p_proposal_id uuid)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return exists (select 1 from public.course_proposals where id = p_proposal_id and mentor_id = auth.uid());
end;
$$;

create or replace function public.is_cohort_mentor(p_cohort_id uuid)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return exists (select 1 from public.course_cohorts where id = p_cohort_id and mentor_id = auth.uid());
end;
$$;

-- الطالب عضو فعلي في الدفعة (نشط أو خلّصها)
create or replace function public.is_cohort_member(p_cohort_id uuid)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return exists (
    select 1 from public.course_enrollments
    where cohort_id = p_cohort_id and user_id = auth.uid() and status in ('active', 'completed')
  );
end;
$$;

-- الطالب عضو في أي دفعة من الكورس ده
create or replace function public.is_enrolled_in_course(p_proposal_id uuid)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return exists (
    select 1
    from public.course_cohorts cc
    join public.course_enrollments ce on ce.cohort_id = cc.id
    where cc.course_proposal_id = p_proposal_id and ce.user_id = auth.uid() and ce.status in ('active', 'completed')
  );
end;
$$;

-- المنتور (المستدعي) هو منتور الدفعة، والطالب ده مسجّل فيها فعلاً
create or replace function public.is_my_cohort_student(p_cohort_id uuid, p_student_id uuid)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return exists (
    select 1
    from public.course_cohorts cc
    join public.course_enrollments ce on ce.cohort_id = cc.id
    where cc.id = p_cohort_id and cc.mentor_id = auth.uid()
      and ce.user_id = p_student_id and ce.status in ('active', 'completed')
  );
end;
$$;

-- الطالب مسجّل في دفعة من الكورس اللي القالب ده تابع له (بتتستخدم مع
-- session_tasks / session_quizzes اللي بتشاور على curriculum_session_id)
create or replace function public.is_enrolled_via_curriculum_session(p_curriculum_session_id uuid)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return exists (
    select 1
    from public.course_curriculum_sessions ccs
    join public.course_cohorts cc on cc.course_proposal_id = ccs.course_proposal_id
    join public.course_enrollments ce on ce.cohort_id = cc.id
    where ccs.id = p_curriculum_session_id and ce.user_id = auth.uid() and ce.status in ('active', 'completed')
  );
end;
$$;

-- المهمة/القالب ده تابع فعلاً لكورس الدفعة اللي الطالب بيسلّم فيها
create or replace function public.task_belongs_to_cohort(p_task_id uuid, p_cohort_id uuid)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return exists (
    select 1
    from public.session_tasks st
    join public.course_curriculum_sessions ccs on ccs.id = st.curriculum_session_id
    join public.course_cohorts cc on cc.course_proposal_id = ccs.course_proposal_id
    where st.id = p_task_id and cc.id = p_cohort_id
  );
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'is_content_staff()', 'is_enrolled_via_curriculum_session(uuid)', 'task_belongs_to_cohort(uuid, uuid)', 'is_course_owner(uuid)', 'is_cohort_mentor(uuid)',
    'is_cohort_member(uuid)', 'is_enrolled_in_course(uuid)', 'is_my_cohort_student(uuid, uuid)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ============================================================
-- 2) course_curriculum_sessions — القالب التعليمي القابل لإعادة الاستخدام
-- (نفس المحتوى بيتكرر عبر أي عدد من الدفعات المجدولة لاحقًا)
-- ============================================================
create table if not exists public.course_curriculum_sessions (
  id uuid primary key default gen_random_uuid(),
  course_proposal_id uuid not null references public.course_proposals(id) on delete cascade,
  order_index integer not null,
  title text not null check (char_length(title) between 3 and 200),
  objectives text[] not null default '{}',
  session_type text not null check (session_type in (
    'workshop', 'practice', 'project_review', 'qa', 'assessment', 'final_review'
  )),
  duration_minutes integer not null check (duration_minutes > 0),
  preparation text,
  live_activity text,
  post_session_task_brief text,
  resources text[] not null default '{}',
  expected_deliverable text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- عمدًا مفيش unique(course_proposal_id, order_index) — order_index مجرد
-- ترتيب عرض، مش قيد ثقة. إعادة ترتيب السيشنز بتتم بـUPDATE منفصلة لكل
-- صف (مش transaction واحدة عن طريق PostgREST)، فـunique صارمة كانت
-- هتفشل لحظيًا لما صفين يتبادلوا الترتيب. تكرار قيمة نادر مش خطير —
-- ORDER BY هيحطهم جنب بعض بس، مفيش تأثير تاني
create index if not exists course_curriculum_sessions_order_idx
  on public.course_curriculum_sessions (course_proposal_id, order_index);

alter table public.course_curriculum_sessions enable row level security;

-- الملّاك (المنتور صاحب الكورس) بس يقدر يشوف/يعدّل المنهج وهو لسه بيتبنى —
-- الستاف (content_review) يشوفوا أي منهج عشان يراجعوه، بغض النظر عن حالة الكورس
drop policy if exists "curriculum_sessions_select_owner_or_staff" on public.course_curriculum_sessions;
create policy "curriculum_sessions_select_owner_or_staff"
  on public.course_curriculum_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.course_proposals cp
      where cp.id = course_curriculum_sessions.course_proposal_id and cp.mentor_id = auth.uid()
    )
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

-- الطلاب المسجّلين فعلاً في دفعة من الكورس ده يشوفوا المنهج كامل (خارطة
-- الطريق). النسخة الأولى كانت بتعمل subquery على course_proposals والطالب
-- مش شايفه فبترجّع صفر صفوف لأي طالب، وكانت كمان لو اشتغلت هتفتح المنهج لأي
-- مستخدم مش مسجّل. دلوقتي: مسجّل بس، وعن طريق دالة SECURITY DEFINER
drop policy if exists "curriculum_sessions_select_enrolled" on public.course_curriculum_sessions;
create policy "curriculum_sessions_select_enrolled"
  on public.course_curriculum_sessions for select
  to authenticated
  using (public.is_enrolled_in_course(course_proposal_id));

-- الكتابة (INSERT/UPDATE/DELETE) بس للمنتور صاحب الكورس، وبس وهو لسه
-- draft/needs_changes (مش وهو تحت المراجعة أو منشور بالفعل — تعديل منهج
-- منشور له قواعد تانية، هيتحدد لاحقًا لو احتجناه)
drop policy if exists "curriculum_sessions_write_owner_draftable" on public.course_curriculum_sessions;
create policy "curriculum_sessions_write_owner_draftable"
  on public.course_curriculum_sessions for all
  to authenticated
  using (
    exists (
      select 1 from public.course_proposals cp
      where cp.id = course_curriculum_sessions.course_proposal_id
        and cp.mentor_id = auth.uid()
        and cp.status in ('draft', 'needs_changes')
    )
  )
  with check (
    exists (
      select 1 from public.course_proposals cp
      where cp.id = course_curriculum_sessions.course_proposal_id
        and cp.mentor_id = auth.uid()
        and cp.status in ('draft', 'needs_changes')
    )
  );

revoke all on public.course_curriculum_sessions from anon, authenticated;
grant select, insert, update, delete on public.course_curriculum_sessions to authenticated;

-- ============================================================
-- 3) course_cohorts — دفعة مجدولة فعليًا (منتور + تواريخ + جدول)
-- ============================================================
create table if not exists public.course_cohorts (
  id uuid primary key default gen_random_uuid(),
  course_proposal_id uuid not null references public.course_proposals(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 3 and 150),
  status text not null default 'draft' check (status in (
    'draft', 'published', 'in_progress', 'completed', 'cancelled'
  )),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  schedule jsonb not null default '[]',
  timezone text not null default 'Africa/Cairo',
  max_seats integer not null check (max_seats > 0),
  enrollment_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_cohorts_proposal_idx on public.course_cohorts (course_proposal_id);
create index if not exists course_cohorts_mentor_idx on public.course_cohorts (mentor_id);

alter table public.course_cohorts enable row level security;

-- عامة: أي حد يشوف الدفعات المنشورة (فتح تسجيل) بتاعة كورس منشور — ده
-- اللي بيظهر للطالب في صفحة الكورس عشان يختار دفعة ينضم لها
drop policy if exists "cohorts_select_published" on public.course_cohorts;
create policy "cohorts_select_published"
  on public.course_cohorts for select
  to anon, authenticated
  using (status in ('published', 'in_progress', 'completed'));

-- المنتور صاحب الكورس يشوف كل دفعاته بما فيها draft
drop policy if exists "cohorts_select_own_mentor" on public.course_cohorts;
create policy "cohorts_select_own_mentor"
  on public.course_cohorts for select
  to authenticated
  using (mentor_id = auth.uid());

drop policy if exists "cohorts_select_staff" on public.course_cohorts;
create policy "cohorts_select_staff"
  on public.course_cohorts for select
  to authenticated
  using (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'content_review'));

-- إنشاء دفعة: بس المنتور صاحب الكورس نفسه، وبس لو الكورس منشور فعليًا
-- (مراجعة المنهج خلصت) — قرار V1: مفيش مراجعة ليدر منفصلة على الدفعة
-- نفسها، المنهج المعتمد هو اللي بيتراجع
drop policy if exists "cohorts_insert_own_published_course" on public.course_cohorts;
create policy "cohorts_insert_own_published_course"
  on public.course_cohorts for insert
  to authenticated
  with check (
    mentor_id = auth.uid()
    and exists (
      select 1 from public.course_proposals cp
      where cp.id = course_cohorts.course_proposal_id
        and cp.mentor_id = auth.uid()
        and cp.status = 'published'
    )
  );

-- تعديل دفعة بتاعته: وهي draft (تعديل حر) أو بعد النشر (تغيير حالة بس —
-- التفاصيل والانتقالات المسموحة بيفرضها trigger في 0034، لأن RLS مبتقدرش
-- تقارن القيمة القديمة بالجديدة). النسخة الأولى كانت بتقفل التعديل خالص بعد
-- النشر: مفيش أي طريق ينقل الدفعة لـ in_progress/completed/cancelled.
drop policy if exists "cohorts_update_own_draft" on public.course_cohorts;
create policy "cohorts_update_own_draft"
  on public.course_cohorts for update
  to authenticated
  using (mentor_id = auth.uid() and status = 'draft')
  with check (mentor_id = auth.uid());

drop policy if exists "cohorts_update_own_lifecycle" on public.course_cohorts;
create policy "cohorts_update_own_lifecycle"
  on public.course_cohorts for update
  to authenticated
  using (mentor_id = auth.uid() and status in ('published', 'in_progress'))
  with check (mentor_id = auth.uid());

-- الستاف (content_review) يقدر يلغي دفعة (trigger 0034 بيحصر ده على
-- الانتقال لـ cancelled بس)
drop policy if exists "cohorts_update_staff" on public.course_cohorts;
create policy "cohorts_update_staff"
  on public.course_cohorts for update
  to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

revoke all on public.course_cohorts from anon, authenticated;
grant select on public.course_cohorts to anon, authenticated;
grant insert, update on public.course_cohorts to authenticated;

-- ============================================================
-- 4) course_enrollments — بقى فيها عضوية دفعة، مش كورس مجرّد
-- ============================================================
alter table public.course_enrollments
  add column if not exists cohort_id uuid references public.course_cohorts(id) on delete cascade,
  add column if not exists status text not null default 'active';

alter table public.course_enrollments drop constraint if exists course_enrollments_status_check;
alter table public.course_enrollments add constraint course_enrollments_status_check
  check (status in ('active', 'withdrawn', 'completed'));

-- تسجيلات اتكمّلت فعلاً قبل الـ migration ده (completed_at موجود من 0014،
-- سواء من الـ backfill بتاعه أو من trigger الإتمام) لازم status بتاعها
-- يعكس ده. DEFAULT 'active' لوحده كان هيسيبها completed_at موجود + status
-- active (حالة متناقضة، وevaluate_cohort_completion/الـ RLS بيقروا status).
-- بيمسّ status بس (مش completed_at) فمفيش trigger شهادات/إنجازات بيتفعّل،
-- وآمن يتشغّل تاني (where status = 'active'). بيعتمد على 0014.
update public.course_enrollments
set status = 'completed'
where completed_at is not null and status = 'active';

-- course_id كان NOT NULL (0001) — تسجيل الدفعات (cohort_id) مفيهوش course_id.
-- اتكشف بتجربة فعلية: من غير السطر ده أي تسجيل في دفعة كان هيفشل بـ
-- "null value in column course_id violates not-null constraint"، حتى عن
-- طريق enroll_in_cohort(). UNIQUE(user_id, course_id) القديم مش بيتأثر
-- (NULL مش بيتساوى بـ NULL) — والدفعات ليها unique مستقل تحت.
alter table public.course_enrollments alter column course_id drop not null;

-- تسجيل (enrollment) لازم يكون إما كورس ثابت قديم (course_id) أو دفعة
-- (cohort_id) — الاتنين مع بعض أو مفيش حاجة منهم غلط
alter table public.course_enrollments drop constraint if exists course_enrollments_exactly_one_target;
alter table public.course_enrollments add constraint course_enrollments_exactly_one_target
  check (
    (course_id is not null and cohort_id is null)
    or (course_id is null and cohort_id is not null)
  );

-- unique(user_id, course_id) الأصلية بتفضل زي ما هي (للكورسات الثابتة
-- القديمة) — دي unique تانية مستقلة للدفعات، عشان NULL != NULL في
-- الأصلية مش هتمنع تسجيل مكرر في نفس الدفعة
drop index if exists course_enrollments_user_cohort_uidx;
create unique index course_enrollments_user_cohort_uidx
  on public.course_enrollments (user_id, cohort_id)
  where cohort_id is not null;

-- التسجيل في دفعة بيتم عن طريق enroll_in_cohort() (0032) بس — دالة بتقفل صف
-- الدفعة وتفحص الحالة والمعاد والمقاعد atomically. الـ INSERT المباشر مقصور
-- على مسار الكورس الثابت القديم (course_id).
--
-- مهم: policy الإدخال القديمة (enrollments_insert_own، من 0001 ومعدّلة في
-- 0020) كانت بتفحص user_id بس، ومتجمّعة بـ OR مع أي policy تانية — يعني كانت
-- هتفضل تسمح بإدخال مباشر بـ cohort_id لأي دفعة (draft/كاملة/فات معادها)
-- وتتخطّى كل فحوصات enroll_in_cohort. اتأكّد بتجربة فعلية. بتتشال هنا
-- وبتتبدّل بنسخة مقصورة على course_id.
drop policy if exists "enrollments_insert_own" on public.course_enrollments;
drop policy if exists "enrollments_insert_own_cohort" on public.course_enrollments;
drop policy if exists "enrollments_insert_own_legacy_course" on public.course_enrollments;
create policy "enrollments_insert_own_legacy_course"
  on public.course_enrollments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and completed_at is null
    and status = 'active'
    and course_id is not null
    and cohort_id is null
  );

-- منتور الدفعة يشوف قايمة طلابها (roster) — من غير ده مفيش طريقة يعرف مين
-- مسجّل عنده. الستاف (content_review) يشوفوا برضو للمتابعة.
drop policy if exists "enrollments_select_cohort_mentor" on public.course_enrollments;
create policy "enrollments_select_cohort_mentor"
  on public.course_enrollments for select
  to authenticated
  using (cohort_id is not null and public.is_cohort_mentor(cohort_id));

drop policy if exists "enrollments_select_staff_cohorts" on public.course_enrollments;
create policy "enrollments_select_staff_cohorts"
  on public.course_enrollments for select
  to authenticated
  using (cohort_id is not null and public.is_content_staff());

-- انسحاب من دفعة — الطالب نفسه بس، وبس التحديث لـ status='withdrawn'
-- (مفيش سماح بأي تعديل تاني، خصوصًا مش قادر يزوّر completed_at بنفسه)
drop policy if exists "enrollments_withdraw_own" on public.course_enrollments;
create policy "enrollments_withdraw_own"
  on public.course_enrollments for update
  to authenticated
  using (auth.uid() = user_id and status = 'active')
  with check (auth.uid() = user_id and status = 'withdrawn' and completed_at is null);

grant update on public.course_enrollments to authenticated;

-- WITH CHECK فوق بتتأكد إن status/completed_at النهائيين صح، بس مبتمنعش
-- الطالب من تغيير cohort_id/course_id/user_id لصف مش بتاعه أو دفعة تانية
-- في نفس الـ UPDATE — نفس فئة الثغرة اللي اتقفلت في course_submissions
-- (migration 0022). trigger منفصل بيمنع تغيير هوية التسجيل نفسه خالص،
-- بغض النظر عن أي RLS policy
create or replace function public.course_enrollments_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.course_id is distinct from old.course_id
    or new.cohort_id is distinct from old.cohort_id
  then
    raise exception 'مينفعش تغيّري التسجيل ده لكورس أو دفعة تانية.';
  end if;
  return new;
end;
$$;

drop trigger if exists course_enrollments_guard_immutable_trg on public.course_enrollments;
create trigger course_enrollments_guard_immutable_trg
  before update on public.course_enrollments
  for each row
  execute function public.course_enrollments_guard_immutable();

commit;

-- ملحوظة تشغيل: begin/commit واحد (all-or-nothing)، كل جملة idempotent.
-- الـ UPDATE grant الجديد على course_enrollments مقصور فعليًا على انتقال
-- active->withdrawn بس عن طريق WITH CHECK — مفيش أي طريقة يعدّل بيها
-- completed_at أو أي عمود تاني.
