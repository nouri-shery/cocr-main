-- ROLLBACK لنظام الدفعات (0025 → 0034) ------------------------------------
--
-- بيرجّع الداتابيز لحالة "قبل 0025" (يعني بعد 0016b/0016c/0017-0024). مجرَّب
-- على نسخة محلية: بعد تطبيق 0025-0034 ثم الملف ده، الـ schema والـ policies
-- والـ functions مطابقة لحالة قبل 0025، وكل اختبارات المسار القديم بتعدّي.
--
-- بيرفض يشتغل لو فيه أي داتا حقيقية للدفعات (دفعة، تسجيل في دفعة، تسليم دفعة،
-- شهادة دفعة)، عشان مايمسحش شغل ناس. مفيش حاجة من ده بتمس داتا المسار القديم.
--
-- مقصود إنه مايرجّعش: 0016b/0016c/0017-0024/0035 (تقفيل أمان — الرجوع فيهم
-- معناه فتح الثغرات تاني)، والأعمدة الإضافية على course_proposals
-- (learning_outcomes...) و mentor_applications (0030) لأنها additive وفاضية
-- ومؤذيش، وقيد status الأوسع على course_proposals.
--
-- ملحوظة: ملف الرجوع ده بيعيد policies الكورسات/التسليمات القديمة زي ما كانت
-- بعد 0020-0024 (مش قبلهم).

begin;

do $$
begin
  if exists (select 1 from public.course_cohorts)
    or exists (select 1 from public.course_enrollments where cohort_id is not null)
    or exists (select 1 from public.course_submissions where cohort_id is not null)
    or exists (select 1 from public.course_sessions where cohort_id is not null)
    or exists (select 1 from public.certificates where cohort_id is not null)
  then
    raise exception 'ROLLBACK REFUSED: فيه داتا حقيقية للدفعات — الرجوع هيمسحها.';
  end if;
end $$;

-- ---- triggers على جداول قديمة
drop trigger if exists course_sessions_evaluate_completion_trg on public.course_sessions;
drop trigger if exists course_submissions_evaluate_completion_trg on public.course_submissions;
drop trigger if exists course_sessions_guard_immutable_trg on public.course_sessions;
drop trigger if exists course_enrollments_guard_immutable_trg on public.course_enrollments;
drop trigger if exists course_proposals_guard_transitions_trg on public.course_proposals;

-- ---- policies جديدة على جداول قديمة
drop policy if exists "enrollments_insert_own_legacy_course" on public.course_enrollments;
drop policy if exists "enrollments_withdraw_own" on public.course_enrollments;
drop policy if exists "enrollments_select_cohort_mentor" on public.course_enrollments;
drop policy if exists "enrollments_select_staff_cohorts" on public.course_enrollments;
drop policy if exists "course_sessions_select_cohort_enrolled" on public.course_sessions;
drop policy if exists "course_sessions_insert_cohort_mentor" on public.course_sessions;
drop policy if exists "course_sessions_update_own_scheduled" on public.course_sessions;
drop policy if exists "course_submissions_select_cohort_mentor" on public.course_submissions;
drop policy if exists "course_submissions_select_cohort_mates" on public.course_submissions;
drop policy if exists "submission_feedback_insert_cohort_mentor" on public.submission_feedback;
drop policy if exists "course_proposals_update_own_draftable" on public.course_proposals;
drop policy if exists "course_proposals_publish_own_approved" on public.course_proposals;

-- ---- استرجاع نسخ ما قبل 0025 لـ functions/policies المشتركة
create or replace function public.course_submissions_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.student_id is distinct from old.student_id
    or new.course_id is distinct from old.course_id
    or new.course_category is distinct from old.course_category
    or new.lesson_id is distinct from old.lesson_id
    or new.is_graduation_project is distinct from old.is_graduation_project
  then
    raise exception 'مينفعش تغيّري نوع أو انتماء التسليم بعد إنشائه.';
  end if;
  return new;
end;
$$;

create or replace function public.issue_certificate_for_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_number text;
begin
  select title into v_title from public.catalog_courses where id = new.course_id;
  if v_title is null then
    v_title := new.course_id;
  end if;

  loop
    v_number := 'COCR-' || to_char(now(), 'YYYY') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.certificates (certificate_number, student_id, course_id, course_title, issued_at)
      values (v_number, new.user_id, new.course_id, v_title, now())
      on conflict (student_id, course_id) do nothing;
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;

  return new;
end;
$$;
revoke all on function public.issue_certificate_for_enrollment() from public, anon, authenticated;

create or replace function public.trg_notify_session_scheduled()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student record;
begin
  begin
    for v_student in
      select user_id from public.course_enrollments where course_id = new.course_id
    loop
      perform public.notify_user(
        v_student.user_id, 'session_scheduled', 'سيشن جديدة اتحجزت',
        new.title, '/courses/' || new.course_id
      );
    end loop;
  exception when others then
    raise warning 'trg_notify_session_scheduled failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.trg_notify_session_scheduled() from public, anon, authenticated;

drop policy if exists "enrollments_insert_own" on public.course_enrollments;
create policy "enrollments_insert_own"
  on public.course_enrollments for insert
  to authenticated
  with check (auth.uid() = user_id and completed_at is null);

drop policy if exists "course_submissions_insert_own_enrolled" on public.course_submissions;
create policy "course_submissions_insert_own_enrolled"
  on public.course_submissions for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and exists (
      select 1 from public.course_enrollments ce
      where ce.user_id = auth.uid() and ce.course_id = course_submissions.course_id
    )
    and (
      coalesce(is_graduation_project, false) = false
      or exists (
        select 1 from public.course_enrollments ce
        where ce.user_id = auth.uid()
          and ce.course_id = course_submissions.course_id
          and ce.completed_at is not null
      )
    )
  );

drop policy if exists "course_submissions_select_mentor" on public.course_submissions;
create policy "course_submissions_select_mentor"
  on public.course_submissions for select
  to authenticated
  using (status = 'submitted' and is_approved_mentor(course_category));

drop policy if exists "submission_feedback_insert_mentor" on public.submission_feedback;
create policy "submission_feedback_insert_mentor"
  on public.submission_feedback for insert
  to authenticated
  with check (
    auth.uid() = mentor_id
    and exists (
      select 1 from public.course_submissions cs
      where cs.id = submission_feedback.submission_id and is_approved_mentor(cs.course_category)
    )
  );

drop policy if exists "course_sessions_insert_mentor" on public.course_sessions;
create policy "course_sessions_insert_mentor"
  on public.course_sessions for insert
  to authenticated
  with check (auth.uid() = mentor_id and is_approved_mentor(course_category));

-- course_proposals: policies المراجعة كانت على mentor_application_review (0011)
drop policy if exists "course_proposals_insert_own_approved_mentor" on public.course_proposals;
create policy "course_proposals_insert_own_approved_mentor"
  on public.course_proposals for insert
  to authenticated
  with check (auth.uid() = mentor_id and is_approved_mentor(track));

drop policy if exists "course_proposals_select_own_or_staff" on public.course_proposals;
create policy "course_proposals_select_own_or_staff"
  on public.course_proposals for select
  to authenticated
  using (
    auth.uid() = mentor_id
    or is_super_admin(auth.uid())
    or has_permission(auth.uid(), 'mentor_application_review')
  );

drop policy if exists "course_proposals_update_staff_only" on public.course_proposals;
create policy "course_proposals_update_staff_only"
  on public.course_proposals for update
  to authenticated
  using (is_super_admin(auth.uid()) or has_permission(auth.uid(), 'mentor_application_review'))
  with check (is_super_admin(auth.uid()) or has_permission(auth.uid(), 'mentor_application_review'));


-- ---- الجداول الجديدة (cascade بيشيل policies/triggers/indexes/FKs بتاعتها)
drop table if exists public.graduation_project_reviews cascade;
drop table if exists public.session_quiz_attempt_answers cascade;
drop table if exists public.session_quiz_attempts cascade;
drop table if exists public.session_quiz_questions cascade;
drop table if exists public.session_quizzes cascade;
drop table if exists public.session_attendance cascade;
drop table if exists public.session_recordings cascade;

drop view if exists public.published_courses_public;
drop view if exists public.published_curriculum_public;

alter table public.projects drop column if exists graduation_submission_id;

-- ---- أعمدة جديدة على جداول قديمة (بعد ما الجداول اللي بتشاور عليها راحت)
alter table public.course_submissions drop constraint if exists course_submissions_exactly_one_target;
alter table public.course_submissions drop constraint if exists course_submissions_exactly_one_type;
alter table public.course_submissions drop constraint if exists course_submissions_category_required_legacy;
drop index if exists public.course_submissions_student_task_uidx;
drop index if exists public.course_submissions_graduation_cohort_uidx;
alter table public.course_submissions drop column if exists session_task_id;
alter table public.course_submissions drop column if exists cohort_id;
alter table public.course_submissions alter column course_id set not null;
alter table public.course_submissions alter column course_category set not null;

drop table if exists public.session_tasks cascade;

alter table public.course_sessions drop constraint if exists course_sessions_exactly_one_target;
alter table public.course_sessions drop constraint if exists course_sessions_category_required_legacy;
alter table public.course_sessions drop constraint if exists course_sessions_status_check;
alter table public.course_sessions
  drop column if exists cohort_id,
  drop column if exists curriculum_session_id,
  drop column if exists objectives,
  drop column if exists session_type,
  drop column if exists preparation,
  drop column if exists live_activity,
  drop column if exists post_session_task_brief,
  drop column if exists resources,
  drop column if exists expected_deliverable,
  drop column if exists status,
  drop column if exists updated_at;
alter table public.course_sessions alter column course_id set not null;
alter table public.course_sessions alter column course_category set not null;

alter table public.certificates drop constraint if exists certificates_exactly_one_target;
drop index if exists public.certificates_student_cohort_uidx;
alter table public.certificates drop column if exists cohort_id;
alter table public.certificates alter column course_id set not null;

drop index if exists public.course_enrollments_user_cohort_uidx;
alter table public.course_enrollments drop constraint if exists course_enrollments_exactly_one_target;
alter table public.course_enrollments drop constraint if exists course_enrollments_status_check;
alter table public.course_enrollments drop column if exists cohort_id;
alter table public.course_enrollments drop column if exists status;
alter table public.course_enrollments alter column course_id set not null;

drop table if exists public.course_cohorts cascade;
drop table if exists public.course_curriculum_sessions cascade;

-- ---- functions جديدة
drop function if exists public.enroll_in_cohort(uuid);
drop function if exists public.submit_quiz_attempt(uuid, uuid, jsonb);
drop function if exists public.submit_graduation_review(uuid, text, text, jsonb);
drop function if exists public.evaluate_cohort_completion(uuid, uuid);
drop function if exists public.trg_evaluate_completion_on_session_complete();
drop function if exists public.trg_evaluate_completion_on_attendance();
drop function if exists public.trg_evaluate_completion_on_task_submission();
drop function if exists public.trg_evaluate_completion_on_graduation_review();
drop function if exists public.session_attendance_guard_immutable();
drop function if exists public.course_enrollments_guard_immutable();
drop function if exists public.course_sessions_guard_immutable();
drop function if exists public.course_cohorts_guard();
drop function if exists public.course_proposals_guard_transitions();
drop function if exists public.trg_freeze_curriculum();
drop function if exists public.assert_curriculum_editable(uuid);
drop function if exists public.is_content_staff();
drop function if exists public.is_course_owner(uuid);
drop function if exists public.is_cohort_mentor(uuid);
drop function if exists public.is_cohort_member(uuid);
drop function if exists public.is_enrolled_in_course(uuid);
drop function if exists public.is_my_cohort_student(uuid, uuid);
drop function if exists public.is_enrolled_via_curriculum_session(uuid);
drop function if exists public.task_belongs_to_cohort(uuid, uuid);

alter table public.course_proposals alter column status set default 'pending';

commit;
