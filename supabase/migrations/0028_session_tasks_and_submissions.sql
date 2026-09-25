-- Session Tasks — إعادة استخدام course_submissions/submission_feedback ---
--
-- session_tasks جدول جديد بس (قالب المهمة، مستوى المنهج). التسليم نفسه
-- بيتعمل في course_submissions الموجود بالفعل — نفس التسليمات الدرسية
-- ومشروع التخرّج، عمود جديد session_task_id بس بيربطها. مفيش جدول
-- submissions تاني، مفيش تكرار.

begin;

create table if not exists public.session_tasks (
  id uuid primary key default gen_random_uuid(),
  curriculum_session_id uuid not null references public.course_curriculum_sessions(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  description text not null check (char_length(description) between 10 and 2000),
  submission_type text not null check (submission_type in ('text', 'link', 'github', 'file')),
  created_at timestamptz not null default now()
);

create index if not exists session_tasks_curriculum_idx on public.session_tasks (curriculum_session_id);

alter table public.session_tasks enable row level security;

drop policy if exists "session_tasks_select_enrolled_owner_or_staff" on public.session_tasks;
create policy "session_tasks_select_enrolled_owner_or_staff"
  on public.session_tasks for select
  to authenticated
  using (
    exists (
      select 1 from public.course_curriculum_sessions ccs
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where ccs.id = session_tasks.curriculum_session_id and cp.mentor_id = auth.uid()
    )
    or public.is_enrolled_via_curriculum_session(curriculum_session_id)
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

drop policy if exists "session_tasks_write_owner_draftable" on public.session_tasks;
create policy "session_tasks_write_owner_draftable"
  on public.session_tasks for all
  to authenticated
  using (
    exists (
      select 1 from public.course_curriculum_sessions ccs
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where ccs.id = session_tasks.curriculum_session_id and cp.mentor_id = auth.uid() and cp.status in ('draft', 'needs_changes')
    )
  )
  with check (
    exists (
      select 1 from public.course_curriculum_sessions ccs
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where ccs.id = session_tasks.curriculum_session_id and cp.mentor_id = auth.uid() and cp.status in ('draft', 'needs_changes')
    )
  );

revoke all on public.session_tasks from anon, authenticated;
grant select, insert, update, delete on public.session_tasks to authenticated;

-- ============================================================
-- توسيع course_submissions: cohort_id (زي course_enrollments، مسار
-- تاني للدفعات الجديدة) + session_task_id
-- ============================================================
alter table public.course_submissions
  add column if not exists cohort_id uuid references public.course_cohorts(id) on delete cascade,
  add column if not exists session_task_id uuid references public.session_tasks(id) on delete cascade;

alter table public.course_submissions alter column course_id drop not null;

-- course_category كان NOT NULL (0004) — تسليمات الدفعات مبتحملش تراك قديم.
-- اتكشف بتجربة فعلية. المسار القديم (course_id) لسه لازم يملاه.
alter table public.course_submissions alter column course_category drop not null;
alter table public.course_submissions drop constraint if exists course_submissions_category_required_legacy;
alter table public.course_submissions add constraint course_submissions_category_required_legacy
  check (cohort_id is not null or course_category is not null);

alter table public.course_submissions drop constraint if exists course_submissions_exactly_one_target;
alter table public.course_submissions add constraint course_submissions_exactly_one_target
  check (
    (course_id is not null and cohort_id is null)
    or (course_id is null and cohort_id is not null)
  );

-- تسليم لازم يكون بالظبط نوع واحد: درس قديم، أو مهمة سيشن، أو مشروع
-- تخرّج — مفيش تلبيس ولا صف فاضي من النوعين. القيد ده مكانش موجود أصلًا
-- حتى للحالتين القديمتين، بنضيفه دلوقتي مع التوسيع
alter table public.course_submissions drop constraint if exists course_submissions_exactly_one_type;
alter table public.course_submissions add constraint course_submissions_exactly_one_type
  check (
    (case when lesson_id is not null then 1 else 0 end)
    + (case when session_task_id is not null then 1 else 0 end)
    + (case when is_graduation_project then 1 else 0 end)
    = 1
  );

create unique index if not exists course_submissions_graduation_cohort_uidx
  on public.course_submissions (student_id, cohort_id)
  where is_graduation_project and cohort_id is not null;

create unique index if not exists course_submissions_student_task_uidx
  on public.course_submissions (student_id, session_task_id)
  where session_task_id is not null;

-- إعادة كتابة INSERT policy عشان تغطّي مسار الدفعات كمان، بنفس صرامة
-- 0020 (مشروع التخرّج لازم completed_at حقيقي، سواء من مسار course_id
-- القديم أو cohort_id الجديد؛ مهمة سيشن لازم تكون فعلاً تابعة لدفعة
-- الطالب المسجّل فيها)
drop policy if exists "course_submissions_insert_own_enrolled" on public.course_submissions;
create policy "course_submissions_insert_own_enrolled"
  on public.course_submissions for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and (
      (
        course_id is not null
        and exists (
          select 1 from public.course_enrollments ce
          where ce.user_id = auth.uid() and ce.course_id = course_submissions.course_id
        )
      )
      or (
        cohort_id is not null
        and exists (
          select 1 from public.course_enrollments ce
          where ce.user_id = auth.uid() and ce.cohort_id = course_submissions.cohort_id and ce.status in ('active', 'completed')
        )
      )
    )
    -- مشروع التخرّج: المسار القديم (course_id) لازم completed_at (خلّص الدروس).
    -- مسار الدفعات: لازم تسجيل نشط بس — مش completed_at. النسخة الأولى كانت
    -- بتطلب completed_at للمسارين، وإتمام الدفعة نفسه (0033) محتاج مشروع تخرّج
    -- معتمد → deadlock: الطالب مايقدرش يسلّم قبل الإتمام ومايقدرش يتم قبل ما
    -- يسلّم. اتأكّد بتجربة فعلية.
    and (
      coalesce(is_graduation_project, false) = false
      or (
        course_id is not null
        and exists (
          select 1 from public.course_enrollments ce
          where ce.user_id = auth.uid() and ce.course_id = course_submissions.course_id and ce.completed_at is not null
        )
      )
      or (
        cohort_id is not null
        and exists (
          select 1 from public.course_enrollments ce
          where ce.user_id = auth.uid() and ce.cohort_id = course_submissions.cohort_id and ce.status = 'active'
        )
      )
    )
    and (
      session_task_id is null
      or (cohort_id is not null and public.task_belongs_to_cohort(session_task_id, cohort_id))
    )
  );

-- رؤية أدق للدفعات: منتور الدفعة بالتحديد (مش أي منتور معتمد في نفس
-- التراك زي المسار القديم — الدفعة الجديدة عندها منتور واحد معروف بالظبط)
drop policy if exists "course_submissions_select_cohort_mentor" on public.course_submissions;
create policy "course_submissions_select_cohort_mentor"
  on public.course_submissions for select
  to authenticated
  using (
    status = 'submitted'
    and cohort_id is not null
    and public.is_cohort_mentor(cohort_id)
  );

-- policies المنتور القديمة (0004): "أي منتور معتمد في نفس التراك" بيقرا كل
-- التسليمات المتسلّمة ويكتب feedback عليها. من غير القيد cohort_id is null كانت
-- هتخلّي أي منتور معتمد في التراك يقرا تسليمات طلاب دفعة منتور تاني (قُصّر)
-- ويكتب عليها feedback. اتأكّد بتجربة فعلية. بتتحصر على المسار القديم.
drop policy if exists "course_submissions_select_mentor" on public.course_submissions;
create policy "course_submissions_select_mentor"
  on public.course_submissions for select
  to authenticated
  using (status = 'submitted' and cohort_id is null and is_approved_mentor(course_category));

drop policy if exists "submission_feedback_insert_mentor" on public.submission_feedback;
create policy "submission_feedback_insert_mentor"
  on public.submission_feedback for insert
  to authenticated
  with check (
    auth.uid() = mentor_id
    and exists (
      select 1 from public.course_submissions cs
      where cs.id = submission_feedback.submission_id and cs.cohort_id is null and is_approved_mentor(cs.course_category)
    )
  );

drop policy if exists "course_submissions_select_cohort_mates" on public.course_submissions;
create policy "course_submissions_select_cohort_mates"
  on public.course_submissions for select
  to authenticated
  using (
    status = 'submitted'
    and cohort_id is not null
    and public.is_cohort_member(cohort_id)
  );

-- تحديث حارس الثبات (0022) عشان يغطّي الأعمدة الجديدة — نفس الدالة،
-- مفيش لمس للـ trigger نفسه (create or replace كفاية)
create or replace function public.course_submissions_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.student_id is distinct from old.student_id
    or new.course_id is distinct from old.course_id
    or new.cohort_id is distinct from old.cohort_id
    or new.course_category is distinct from old.course_category
    or new.lesson_id is distinct from old.lesson_id
    or new.session_task_id is distinct from old.session_task_id
    or new.is_graduation_project is distinct from old.is_graduation_project
  then
    raise exception 'مينفعش تغيّري نوع أو انتماء التسليم بعد إنشائه.';
  end if;
  return new;
end;
$$;

-- submission_feedback: منتور الدفعة بالتحديد يقدر يقيّم تسليمات دفعته،
-- إضافة على القاعدة القديمة القائمة على التراك
drop policy if exists "submission_feedback_insert_cohort_mentor" on public.submission_feedback;
create policy "submission_feedback_insert_cohort_mentor"
  on public.submission_feedback for insert
  to authenticated
  with check (
    auth.uid() = mentor_id
    and exists (
      select 1 from public.course_submissions cs
      where cs.id = submission_feedback.submission_id and cs.cohort_id is not null and public.is_cohort_mentor(cs.cohort_id)
    )
  );

commit;

-- ملحوظة تشغيل: begin/commit واحد. لازم يتشغّل بعد 0020/0022 (بيحدّث
-- نفس الدالة) و0025/0026 (معتمد على course_cohorts/course_enrollments
-- .cohort_id) و0025 (course_curriculum_sessions).
