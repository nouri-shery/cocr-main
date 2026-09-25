-- Session Quizzes — بنية حقيقية، الطالب مايشوفش الإجابة الصح قبل ما يحاول ---
--
-- تصحيح جوهري بعد مقارنة بالداتابيز الحية (audit2): جدولين quiz_questions و
-- quiz_attempts موجودين فعلاً من النظام الأصلي (Milestone-1) بشكل مختلف
-- تمامًا (FK على جدول quizzes القديم المربوط بالدروس، correct_option، من غير
-- cohort). create table if not exists كانت هتتخطّاهم بصمت وبعدها تفشل. الأسماء
-- هنا اتغيّرت لـ session_quiz_* عشان مفيش أي تداخل مع الجداول الحية، ومفيش
-- لمس ليها خالص. ملحوظة: quiz_questions الحي فيه policy بتكشف correct_option
-- لأي حد على الكورسات المنشورة القديمة — الجدول فاضي ومحدش بيستخدمه، فمسجّل
-- كملاحظة مش إصلاح هنا.
--
-- Session Quizzes — بنية حقيقية، الطالب مايشوفش الإجابة الصح خالص --------
--
-- 4 جداول: session_quizzes (كويز مربوط بقالب السيشن) -> session_quiz_questions
-- (سؤال) -> session_quiz_attempts (محاولة طالب) -> session_quiz_attempt_answers (إجابة
-- كل سؤال في المحاولة دي).
--
-- نقطة أمان أساسية: session_quiz_questions.correct_answer ميتقراش مباشرة من
-- الطالب خالص — الجدول الأساسي مقفول على المنتور صاحب الكورس والستاف
-- بس. الطالب بيشوف الأسئلة (من غير الإجابة) عن طريق view ضيّق، وبيقدّم
-- إجاباته عن طريق submit_quiz_attempt() اللي بتصحّح على السيرفر وترجّع
-- النتيجة — مفيش طريقة يشوف مفتاح الإجابة قبل التسليم. بعد التسليم بس،
-- view تاني بيورّيه الإجابة الصح للأسئلة اللي فعلاً حاول فيها.

begin;

create table if not exists public.session_quizzes (
  id uuid primary key default gen_random_uuid(),
  curriculum_session_id uuid not null references public.course_curriculum_sessions(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  passing_score numeric not null default 0 check (passing_score >= 0),
  max_attempts integer,
  created_at timestamptz not null default now()
);

create index if not exists session_quizzes_curriculum_idx on public.session_quizzes (curriculum_session_id);

alter table public.session_quizzes enable row level security;

drop policy if exists "quizzes_select_owner_or_staff" on public.session_quizzes;
create policy "quizzes_select_owner_or_staff"
  on public.session_quizzes for select
  to authenticated
  using (
    exists (
      select 1 from public.course_curriculum_sessions ccs
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where ccs.id = session_quizzes.curriculum_session_id and cp.mentor_id = auth.uid()
    )
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

drop policy if exists "quizzes_write_owner_draftable" on public.session_quizzes;
create policy "quizzes_write_owner_draftable"
  on public.session_quizzes for all
  to authenticated
  using (
    exists (
      select 1 from public.course_curriculum_sessions ccs
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where ccs.id = session_quizzes.curriculum_session_id
        and cp.mentor_id = auth.uid() and cp.status in ('draft', 'needs_changes')
    )
  )
  with check (
    exists (
      select 1 from public.course_curriculum_sessions ccs
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where ccs.id = session_quizzes.curriculum_session_id
        and cp.mentor_id = auth.uid() and cp.status in ('draft', 'needs_changes')
    )
  );

-- الطالب المسجّل يشوف بيانات الكويز نفسها (عنوان، درجة النجاح، عدد المحاولات) —
-- الأسئلة والإجابات لأ (بتعدّي على الـ view تحت). الكويز نفسه من غير أسئلة مش
-- حاجة سرية.
drop policy if exists "quizzes_select_enrolled" on public.session_quizzes;
create policy "quizzes_select_enrolled"
  on public.session_quizzes for select
  to authenticated
  using (public.is_enrolled_via_curriculum_session(curriculum_session_id));

revoke all on public.session_quizzes from anon, authenticated;
grant select, insert, update, delete on public.session_quizzes to authenticated;

create table if not exists public.session_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.session_quizzes(id) on delete cascade,
  order_index integer not null,
  question_text text not null,
  question_type text not null check (question_type in ('mcq', 'true_false', 'short_answer')),
  options jsonb,
  correct_answer text not null,
  explanation text,
  points numeric not null default 1 check (points > 0)
);

-- نفس ملحوظة course_curriculum_sessions (0025): مفيش unique صارمة على
-- order_index عمدًا، لنفس سبب إعادة الترتيب بـUPDATEs منفصلة
create index if not exists session_quiz_questions_order_idx on public.session_quiz_questions (quiz_id, order_index);

alter table public.session_quiz_questions enable row level security;

-- نفس صاحب/ستاف الكويز بس — الطالب العادي هنا بيرجّعله صفر صفوف عمدًا،
-- لازم يمر بالـ view تحت
drop policy if exists "session_quiz_questions_select_owner_or_staff" on public.session_quiz_questions;
create policy "session_quiz_questions_select_owner_or_staff"
  on public.session_quiz_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.session_quizzes sq
      join public.course_curriculum_sessions ccs on ccs.id = sq.curriculum_session_id
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where sq.id = session_quiz_questions.quiz_id and cp.mentor_id = auth.uid()
    )
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

drop policy if exists "session_quiz_questions_write_owner_draftable" on public.session_quiz_questions;
create policy "session_quiz_questions_write_owner_draftable"
  on public.session_quiz_questions for all
  to authenticated
  using (
    exists (
      select 1 from public.session_quizzes sq
      join public.course_curriculum_sessions ccs on ccs.id = sq.curriculum_session_id
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where sq.id = session_quiz_questions.quiz_id and cp.mentor_id = auth.uid() and cp.status in ('draft', 'needs_changes')
    )
  )
  with check (
    exists (
      select 1 from public.session_quizzes sq
      join public.course_curriculum_sessions ccs on ccs.id = sq.curriculum_session_id
      join public.course_proposals cp on cp.id = ccs.course_proposal_id
      where sq.id = session_quiz_questions.quiz_id and cp.mentor_id = auth.uid() and cp.status in ('draft', 'needs_changes')
    )
  );

revoke all on public.session_quiz_questions from anon, authenticated;
grant select, insert, update, delete on public.session_quiz_questions to authenticated;

create table if not exists public.session_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.session_quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid not null references public.course_cohorts(id) on delete cascade,
  attempt_number integer not null default 1,
  score numeric not null default 0,
  max_score numeric not null default 0,
  passed boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (quiz_id, student_id, attempt_number)
);

create index if not exists session_quiz_attempts_student_idx on public.session_quiz_attempts (student_id);

alter table public.session_quiz_attempts enable row level security;

drop policy if exists "session_quiz_attempts_select_own_or_mentor_or_staff" on public.session_quiz_attempts;
create policy "session_quiz_attempts_select_own_or_mentor_or_staff"
  on public.session_quiz_attempts for select
  to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from public.course_cohorts cc where cc.id = session_quiz_attempts.cohort_id and cc.mentor_id = auth.uid())
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

-- مفيش INSERT/UPDATE مباشر لحد خالص — submit_quiz_attempt() بس (تحت)
revoke all on public.session_quiz_attempts from anon, authenticated;
grant select on public.session_quiz_attempts to authenticated;

create table if not exists public.session_quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.session_quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.session_quiz_questions(id) on delete cascade,
  selected_answer text,
  is_correct boolean not null,
  points_awarded numeric not null default 0,
  unique (attempt_id, question_id)
);

alter table public.session_quiz_attempt_answers enable row level security;

drop policy if exists "session_quiz_attempt_answers_select_own_or_mentor_or_staff" on public.session_quiz_attempt_answers;
create policy "session_quiz_attempt_answers_select_own_or_mentor_or_staff"
  on public.session_quiz_attempt_answers for select
  to authenticated
  using (
    exists (select 1 from public.session_quiz_attempts qa where qa.id = session_quiz_attempt_answers.attempt_id and qa.student_id = auth.uid())
    or exists (
      select 1 from public.session_quiz_attempts qa
      join public.course_cohorts cc on cc.id = qa.cohort_id
      where qa.id = session_quiz_attempt_answers.attempt_id and cc.mentor_id = auth.uid()
    )
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

revoke all on public.session_quiz_attempt_answers from anon, authenticated;
grant select on public.session_quiz_attempt_answers to authenticated;

-- ============================================================
-- views آمنة للطالب — بدون مفتاح الإجابة قبل التسليم
-- ============================================================
create or replace view public.session_quiz_questions_for_student as
  select qq.id, qq.quiz_id, qq.order_index, qq.question_text, qq.question_type, qq.options
  from public.session_quiz_questions qq
  join public.session_quizzes sq on sq.id = qq.quiz_id
  join public.course_curriculum_sessions ccs on ccs.id = sq.curriculum_session_id
  where exists (
    select 1 from public.course_cohorts cc
    join public.course_enrollments ce on ce.cohort_id = cc.id
    where cc.course_proposal_id = ccs.course_proposal_id
      and ce.user_id = auth.uid()
      and ce.status in ('active', 'completed')
  )
  or exists (
    select 1 from public.course_cohorts cc
    where cc.course_proposal_id = ccs.course_proposal_id and cc.mentor_id = auth.uid()
  )
  or public.is_super_admin(auth.uid())
  or public.has_permission(auth.uid(), 'content_review');

revoke all on public.session_quiz_questions_for_student from anon, authenticated;
grant select on public.session_quiz_questions_for_student to authenticated;

-- الإجابة الصح + الشرح — بس للأسئلة اللي الطالب فعلاً قدّم محاولة عليها
-- قبل كده (مراجعة بعد التسليم)
create or replace view public.session_quiz_answer_key_for_reviewer as
  select qq.id, qq.quiz_id, qq.correct_answer, qq.explanation
  from public.session_quiz_questions qq
  where exists (
    select 1 from public.session_quiz_attempts qa where qa.quiz_id = qq.quiz_id and qa.student_id = auth.uid()
  )
  or exists (
    select 1 from public.session_quizzes sq
    join public.course_curriculum_sessions ccs on ccs.id = sq.curriculum_session_id
    join public.course_cohorts cc on cc.course_proposal_id = ccs.course_proposal_id
    where sq.id = qq.quiz_id and cc.mentor_id = auth.uid()
  )
  or public.is_super_admin(auth.uid())
  or public.has_permission(auth.uid(), 'content_review');

revoke all on public.session_quiz_answer_key_for_reviewer from anon, authenticated;
grant select on public.session_quiz_answer_key_for_reviewer to authenticated;

-- ============================================================
-- submit_quiz_attempt: التصحيح الحقيقي الوحيد — السيرفر بيقرا الإجابة
-- الصح، مش العميل. تصحيح نصي case-insensitive بسيط لكل الأنواع الثلاثة
-- (mcq/true_false/short_answer) — مقصود بسيط لـV1، short_answer الحقيقي
-- محتاج مراجعة بشرية لو الإجابات معقّدة، ده خارج النطاق دلوقتي
-- ============================================================
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

  update public.session_quiz_attempts
  set score = v_score, max_score = v_max_score, passed = (v_max_score > 0 and v_score >= v_passing_score)
  where id = v_attempt_id;

  return v_attempt_id;
end;
$$;

revoke all on function public.submit_quiz_attempt(uuid, uuid, jsonb) from public;
grant execute on function public.submit_quiz_attempt(uuid, uuid, jsonb) to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد، كل حاجة idempotent. لازم يتشغّل بعد
-- 0025/0026 (معتمد على course_curriculum_sessions/course_cohorts/
-- course_enrollments.cohort_id).
