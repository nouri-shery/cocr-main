-- عقد إتمام كورس الدفعة — موثّق بالكامل قبل الكود (راجع الشات) -----------
--
-- الأربعة شروط: حضور السيشنز الإجبارية اللي خلصت فعلاً، نجاح الكويزات
-- الإجبارية، تسليم المهام الإجبارية، اعتماد مشروع التخرّج. كل شرط بيتفحص
-- من جديد كل مرة (مفيش cache)، وبيتنادى بس من triggers داخلية — مفيش
-- أي RPC يقدر الطالب يناديه مباشرة يخلّي الكورس "مكتمل".
--
-- بيربط بنفس نظام الشهادات/الإنجازات الموجود (0014/0015/0017) — مفيش
-- نظام تاني موازي. لقينا وصلّحنا bug حقيقي أثناء التتبّع: إصدار الشهادة
-- كان هيفشل بالكامل (وبالتالي إتمام الدفعة كله يترجع/rollback) لأول طالب
-- يكمّل دفعة، لأن course_title كان بيتجاب من catalog_courses بس (course_id
-- فاضي دايمًا في مسار الدفعات).

begin;

-- ============================================================
-- 1) أعلام "إجباري" — مفقودة من قبل، محتاجة لتعريف العقد أصلًا
-- ============================================================
alter table public.course_curriculum_sessions add column if not exists is_required boolean not null default true;
alter table public.session_quizzes add column if not exists is_required boolean not null default true;
alter table public.session_tasks add column if not exists is_required boolean not null default true;

-- ============================================================
-- 2) certificates: cohort_id عشان مسار الدفعات يبقى له unique صحيح
-- (نفس نمط XOR + unique مستقل اللي مستخدم في كل جداول الليلة دي)
-- ============================================================
alter table public.certificates add column if not exists cohort_id uuid references public.course_cohorts(id) on delete set null;

-- certificates.course_id كان NOT NULL (0015، اتأكّد من الداتابيز الحية). شهادة
-- الدفعة مفيهاش course_id، فأول طالب يكمّل دفعة كان الـ INSERT هيفشل بـ
-- not-null violation جوّه الـ trigger والـ transaction كلها (الإتمام نفسه)
-- بترجع. اتأكّد بتجربة فعلية. بنخفّف NOT NULL ونحط قيد إن بالظبط واحد
-- منهم موجود (الشهادات الحالية كلها course_id فقط فبتعدّي).
alter table public.certificates alter column course_id drop not null;
alter table public.certificates drop constraint if exists certificates_exactly_one_target;
alter table public.certificates add constraint certificates_exactly_one_target
  check ((course_id is not null and cohort_id is null) or (course_id is null and cohort_id is not null));
create unique index if not exists certificates_student_cohort_uidx
  on public.certificates (student_id, cohort_id)
  where cohort_id is not null;

-- ============================================================
-- 3) إصلاح issue_certificate_for_enrollment — تدعم مسار الدفعات كمان
-- ============================================================
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
  if new.course_id is not null then
    select title into v_title from public.catalog_courses where id = new.course_id;
  elsif new.cohort_id is not null then
    select cp.title into v_title
    from public.course_cohorts cc
    join public.course_proposals cp on cp.id = cc.course_proposal_id
    where cc.id = new.cohort_id;
  end if;

  if v_title is null then
    v_title := coalesce(new.course_id, 'كورس COCR');
  end if;

  loop
    v_number := 'COCR-' || to_char(now(), 'YYYY') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.certificates (certificate_number, student_id, course_id, cohort_id, course_title, issued_at)
      values (v_number, new.user_id, new.course_id, new.cohort_id, v_title, now())
      on conflict do nothing;
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;

  return new;
end;
$$;

-- ============================================================
-- 4) evaluate_cohort_completion — الدالة الوحيدة اللي بتحدّد الإتمام.
-- مفيش GRANT EXECUTE لـ authenticated خالص، بتتنادى من triggers داخلية
-- بس (نفس فلسفة award_achievement تمامًا)
-- ============================================================
create or replace function public.evaluate_cohort_completion(p_cohort_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_course_proposal_id uuid;
  v_status text;
  v_missing_attendance boolean;
  v_missing_quiz boolean;
  v_missing_task boolean;
  v_graduation_approved boolean;
begin
  select course_proposal_id into v_course_proposal_id from public.course_cohorts where id = p_cohort_id;
  if v_course_proposal_id is null then
    return;
  end if;

  select status into v_status
  from public.course_enrollments
  where cohort_id = p_cohort_id and user_id = p_student_id;

  -- مش نشط (يا إما مسحوب أو خلص بالفعل) — متلمسهوش. النشط بس هو اللي
  -- ممكن ينتقل لـ completed
  if v_status is distinct from 'active' then
    return;
  end if;

  -- مهم: بنكرّر على قوالب المنهج الإجبارية نفسها (course_curriculum_sessions)
  -- مش على السيشنز اللي اتجدولت فعلاً. لو منتور نسي يجدول واحدة من
  -- السيشنز الإجبارية للدفعة دي بالذات، لازم ده يمنع الإتمام برضو —
  -- مش يختفي بصمت لمجرد إنها معملتش لها course_sessions row أصلًا
  select exists (
    select 1
    from public.course_curriculum_sessions ccs
    where ccs.course_proposal_id = v_course_proposal_id
      and ccs.is_required = true
      and not exists (
        select 1
        from public.course_sessions cs
        join public.session_attendance sa on sa.session_id = cs.id
        where cs.cohort_id = p_cohort_id
          and cs.curriculum_session_id = ccs.id
          and cs.status = 'completed'
          and sa.student_id = p_student_id
          and sa.status in ('present', 'late', 'excused')
      )
  ) into v_missing_attendance;

  select exists (
    select 1
    from public.session_quizzes sq
    join public.course_curriculum_sessions ccs on ccs.id = sq.curriculum_session_id
    where ccs.course_proposal_id = v_course_proposal_id
      and sq.is_required = true
      and not exists (
        select 1 from public.session_quiz_attempts qa
        where qa.quiz_id = sq.id and qa.student_id = p_student_id
          and qa.cohort_id = p_cohort_id and qa.passed = true
      )
  ) into v_missing_quiz;

  select exists (
    select 1
    from public.session_tasks st
    join public.course_curriculum_sessions ccs on ccs.id = st.curriculum_session_id
    where ccs.course_proposal_id = v_course_proposal_id
      and st.is_required = true
      and not exists (
        select 1 from public.course_submissions sub
        where sub.session_task_id = st.id and sub.student_id = p_student_id
          and sub.cohort_id = p_cohort_id and sub.status = 'submitted'
      )
  ) into v_missing_task;

  select exists (
    select 1
    from public.course_submissions sub
    where sub.cohort_id = p_cohort_id and sub.student_id = p_student_id and sub.is_graduation_project = true
      and (
        select gpr.decision from public.graduation_project_reviews gpr
        where gpr.submission_id = sub.id
        order by gpr.created_at desc
        limit 1
      ) = 'approved'
  ) into v_graduation_approved;

  if not v_missing_attendance and not v_missing_quiz and not v_missing_task and v_graduation_approved then
    update public.course_enrollments
    set status = 'completed', completed_at = coalesce(completed_at, now())
    where cohort_id = p_cohort_id and user_id = p_student_id and status = 'active';
  end if;
end;
$$;

revoke all on function public.evaluate_cohort_completion(uuid, uuid) from public, anon, authenticated;

-- ============================================================
-- 5) نقاط التنفيذ — كل واحدة بتعيد الفحص من جديد وقت الحدث اللي ممكن
-- يكون هو آخر شرط ناقص
-- ============================================================

-- (أ) سيشن مجدولة بقت completed — بنفحص كل طلاب الدفعة النشطين
create or replace function public.trg_evaluate_completion_on_session_complete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment record;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.cohort_id is not null then
    for v_enrollment in
      select user_id from public.course_enrollments where cohort_id = new.cohort_id and status = 'active'
    loop
      perform public.evaluate_cohort_completion(new.cohort_id, v_enrollment.user_id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists course_sessions_evaluate_completion_trg on public.course_sessions;
create trigger course_sessions_evaluate_completion_trg
  after update of status on public.course_sessions
  for each row
  execute function public.trg_evaluate_completion_on_session_complete();

-- (ب) حضور اتسجّل/اتعدّل
create or replace function public.trg_evaluate_completion_on_attendance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cohort_id uuid;
begin
  select cohort_id into v_cohort_id from public.course_sessions where id = new.session_id;
  if v_cohort_id is not null then
    perform public.evaluate_cohort_completion(v_cohort_id, new.student_id);
  end if;
  return new;
end;
$$;

drop trigger if exists session_attendance_evaluate_completion_trg on public.session_attendance;
create trigger session_attendance_evaluate_completion_trg
  after insert or update on public.session_attendance
  for each row
  execute function public.trg_evaluate_completion_on_attendance();

-- (ج) تسليم مهمة سيشن بقى submitted
create or replace function public.trg_evaluate_completion_on_task_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.session_task_id is not null and new.status = 'submitted' and new.cohort_id is not null then
    perform public.evaluate_cohort_completion(new.cohort_id, new.student_id);
  end if;
  return new;
end;
$$;

drop trigger if exists course_submissions_evaluate_completion_trg on public.course_submissions;
create trigger course_submissions_evaluate_completion_trg
  after insert or update of status on public.course_submissions
  for each row
  execute function public.trg_evaluate_completion_on_task_submission();

-- (د) مشروع تخرّج اتوافق عليه
create or replace function public.trg_evaluate_completion_on_graduation_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student uuid;
  v_cohort_id uuid;
begin
  if new.decision = 'approved' then
    select student_id, cohort_id into v_student, v_cohort_id
    from public.course_submissions where id = new.submission_id;
    if v_cohort_id is not null then
      perform public.evaluate_cohort_completion(v_cohort_id, v_student);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists graduation_project_reviews_evaluate_completion_trg on public.graduation_project_reviews;
create trigger graduation_project_reviews_evaluate_completion_trg
  after insert on public.graduation_project_reviews
  for each row
  execute function public.trg_evaluate_completion_on_graduation_review();

-- (هـ) كويز اتصحّح — جزء من submit_quiz_attempt نفسها (0027)، مش trigger
-- منفصل، عشان القيمة v_student/p_cohort_id متاحة فورًا من غير استعلام إضافي
create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_cohort_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student uuid := auth.uid();
  v_attempt_id uuid;
  v_attempt_number int;
  v_max_attempts int;
  v_passing_score numeric;
  v_max_score numeric := 0;
  v_score numeric := 0;
  v_answer text;
  v_question record;
  v_is_correct boolean;
  v_points numeric;
  v_passed boolean;
begin
  if v_student is null then
    raise exception 'لازم تسجّل دخولك.';
  end if;

  if not exists (
    select 1 from public.course_enrollments ce
    where ce.cohort_id = p_cohort_id and ce.user_id = v_student and ce.status in ('active', 'completed')
  ) then
    raise exception 'انتي مش مسجّلة في الدفعة دي.';
  end if;

  select max_attempts, passing_score into v_max_attempts, v_passing_score
  from public.session_quizzes where id = p_quiz_id;

  if v_passing_score is null then
    raise exception 'الكويز ده مش موجود.';
  end if;

  if not exists (
    select 1 from public.session_quizzes sq
    join public.course_curriculum_sessions ccs on ccs.id = sq.curriculum_session_id
    join public.course_cohorts cc on cc.course_proposal_id = ccs.course_proposal_id
    where sq.id = p_quiz_id and cc.id = p_cohort_id
  ) then
    raise exception 'الكويز ده مش تابع للدفعة دي.';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
  from public.session_quiz_attempts
  where quiz_id = p_quiz_id and student_id = v_student;

  if v_max_attempts is not null and v_attempt_number > v_max_attempts then
    raise exception 'خلّصتي كل المحاولات المسموحة للكويز ده.';
  end if;

  insert into public.session_quiz_attempts (quiz_id, student_id, cohort_id, attempt_number, score, max_score, passed)
  values (p_quiz_id, v_student, p_cohort_id, v_attempt_number, 0, 0, false)
  returning id into v_attempt_id;

  for v_question in
    select id, correct_answer, points from public.session_quiz_questions where quiz_id = p_quiz_id
  loop
    v_max_score := v_max_score + v_question.points;

    select answer_item ->> 'selected_answer' into v_answer
    from jsonb_array_elements(p_answers) as answer_item
    where (answer_item ->> 'question_id')::uuid = v_question.id
    limit 1;

    v_is_correct := v_answer is not null and trim(lower(v_answer)) = trim(lower(v_question.correct_answer));
    v_points := case when v_is_correct then v_question.points else 0 end;
    v_score := v_score + v_points;

    insert into public.session_quiz_attempt_answers (attempt_id, question_id, selected_answer, is_correct, points_awarded)
    values (v_attempt_id, v_question.id, v_answer, coalesce(v_is_correct, false), v_points);
  end loop;

  v_passed := v_max_score > 0 and v_score >= v_passing_score;

  update public.session_quiz_attempts
  set score = v_score, max_score = v_max_score, passed = v_passed
  where id = v_attempt_id;

  if v_passed then
    perform public.evaluate_cohort_completion(p_cohort_id, v_student);
  end if;

  return v_attempt_id;
end;
$$;

revoke all on function public.submit_quiz_attempt(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, uuid, jsonb) to authenticated;

revoke all on function public.issue_certificate_for_enrollment() from public, anon, authenticated;
revoke all on function public.trg_evaluate_completion_on_session_complete() from public, anon, authenticated;
revoke all on function public.trg_evaluate_completion_on_attendance() from public, anon, authenticated;
revoke all on function public.trg_evaluate_completion_on_task_submission() from public, anon, authenticated;
revoke all on function public.trg_evaluate_completion_on_graduation_review() from public, anon, authenticated;

-- ============================================================
-- سطح القراءة العام للكورسات المنشورة (كتالوج) — الطالب مش شايف
-- course_proposals (RLS: المالك والستاف بس) فمكانش فيه أي طريقة يشوف كورس
-- منشور قبل ما يتسجّل. views ضيّقة بأعمدة آمنة بس (من غير notes/reviewed_*).
-- مالكها postgres (بتتخطّى RLS الجدول عن قصد، للمنشور بس)، وSELECT بس —
-- الكتابة مسحوبة صراحة (view أحادي الجدول auto-updatable، ولو سبناها كانت
-- هتبقى نفس ثغرة profiles_public بالظبط).
-- ============================================================
create or replace view public.published_courses_public as
  select id, mentor_id, title, description, track, learning_outcomes, skills, age_min, age_max,
         prerequisites, weekly_workload_hours, level, final_project_brief, final_project_rubric,
         final_project_deliverables, created_at
  from public.course_proposals
  where status = 'published';

create or replace view public.published_curriculum_public as
  select ccs.id, ccs.course_proposal_id, ccs.order_index, ccs.title, ccs.objectives,
         ccs.session_type, ccs.duration_minutes, ccs.is_required
  from public.course_curriculum_sessions ccs
  join public.course_proposals cp on cp.id = ccs.course_proposal_id
  where cp.status = 'published';

revoke all on public.published_courses_public from anon, authenticated;
revoke all on public.published_curriculum_public from anon, authenticated;
grant select on public.published_courses_public to anon, authenticated;
grant select on public.published_curriculum_public to anon, authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد، كل حاجة idempotent (create or replace /
-- drop trigger if exists / add column if not exists). لازم يتشغّل بعد
-- 0025-0032 كلهم (معتمد على كل جداول الدفعات).
