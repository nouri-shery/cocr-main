-- دورة حياة الدفعة + تجميد المنهج بعد نشر أي دفعة -----------------------
--
-- مشكلتين اتكشفوا في الأودت (وأكّدتهم تجربة على نسخة محلية):
--
-- 1) course_cohorts: بعد "published" مفيش أي حاجة تنقل الدفعة لـ in_progress/
--    completed/cancelled (مفيش policy ولا كود)، والـ policy الوحيدة للتعديل
--    (draft) كانت WITH CHECK بمالك بس — يعني المنتور يقدر من draft يقفز
--    لأي حالة، ويغيّر course_proposal_id لكورس تاني. RLS مبتقدرش تقارن
--    القديم بالجديد، فالانتقالات بتتفرض بـ trigger (نفس أسلوب
--    course_enrollments/course_sessions/course_submissions guards).
--
--    الانتقالات المسموحة:
--      draft -> published (بشرط الكورس لسه published) | cancelled
--      published -> in_progress | cancelled
--      in_progress -> completed | cancelled
--    وبعد draft: باقي الأعمدة (تواريخ، مقاعد، جدول...) مقفولة. الستاف
--    (content_review) يقدر يعمل cancelled بس.
--
-- 2) عقد الإتمام (0033) بيقرا الأعلام is_required والكويزات والمهام حيّة من
--    قوالب المنهج وقت التقييم. لو المنهج اتعدّل بعد ما دفعة اتنشرت، شروط
--    إتمام طلاب مسجّلين فعلًا تتغيّر في نص الطريق. الحل: أي INSERT/UPDATE/
--    DELETE على المنهج (قوالب، مهام، كويزات، أسئلة) بيتمنع طول ما فيه أي
--    دفعة منشورة/شغّالة/مكتملة على الكورس ده. (المنتور أصلاً مبيقدرش يعدّل
--    كورس published بالـ RLS — ده الحماية الثانية لو الكورس رجع needs_changes
--    بواسطة الستاف.)
--
-- قرار موثّق: سيشن اتلغت (cancelled) ولا اتعوّضت لا بتتحسب في الحضور
-- الإجباري. المنتور لازم يجدول سيشن جديدة لنفس القالب (مفيش unique بيمنع
-- ده). الإتمام بيدوّر على سيشن مكتملة لكل قالب إجباري.

begin;

-- ============================================================
-- 1) course_cohorts guard
-- ============================================================
create or replace function public.course_cohorts_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_proposal_status text;
begin
  -- مفيش سياق مستخدم (SQL editor / صيانة يدوية) — مش هنمنع
  if v_uid is null then
    return new;
  end if;

  if new.course_proposal_id is distinct from old.course_proposal_id
    or new.mentor_id is distinct from old.mentor_id
  then
    raise exception 'مينفعش تغيّري الكورس أو المنتور بتاع الدفعة.';
  end if;

  if new.status is distinct from old.status then
    -- غير المنتور صاحب الدفعة (ستاف): الإلغاء بس
    if v_uid is distinct from old.mentor_id and new.status <> 'cancelled' then
      raise exception 'فريق COCR يقدر يلغي الدفعة بس.';
    end if;

    if not (
      (old.status = 'draft' and new.status in ('published', 'cancelled'))
      or (old.status = 'published' and new.status in ('in_progress', 'cancelled'))
      or (old.status = 'in_progress' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'الانتقال من % لـ % مش مسموح.', old.status, new.status;
    end if;

    if new.status = 'published' then
      select status into v_proposal_status from public.course_proposals where id = new.course_proposal_id;
      if v_proposal_status is distinct from 'published' then
        raise exception 'الكورس لازم يكون منشور عشان تفتحي دفعة للتسجيل.';
      end if;
    end if;
  end if;

  -- التفاصيل تتعدّل وهي draft بس (طلاب مسجّلين فيها = مفيش تغيير مواعيد/مقاعد)
  if old.status <> 'draft' and (
    new.name is distinct from old.name
    or new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
    or new.schedule is distinct from old.schedule
    or new.timezone is distinct from old.timezone
    or new.max_seats is distinct from old.max_seats
    or new.enrollment_deadline is distinct from old.enrollment_deadline
  ) then
    raise exception 'تفاصيل الدفعة بتتعدّل وهي draft بس.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists course_cohorts_guard_trg on public.course_cohorts;
create trigger course_cohorts_guard_trg
  before update on public.course_cohorts
  for each row
  execute function public.course_cohorts_guard();

-- ============================================================
-- 2) تجميد المنهج
-- ============================================================
create or replace function public.assert_curriculum_editable(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.course_cohorts
    where course_proposal_id = p_proposal_id and status in ('published', 'in_progress', 'completed')
  ) then
    raise exception 'المنهج مقفول: فيه دفعة منشورة أو شغّالة أو خلصت على الكورس ده.';
  end if;
end;
$$;

revoke all on function public.assert_curriculum_editable(uuid) from public, anon, authenticated;

create or replace function public.trg_freeze_curriculum()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record := case when tg_op = 'DELETE' then old else new end;
  v_proposal uuid;
begin
  if tg_table_name = 'course_curriculum_sessions' then
    v_proposal := v_row.course_proposal_id;
  elsif tg_table_name in ('session_tasks', 'session_quizzes') then
    select course_proposal_id into v_proposal
    from public.course_curriculum_sessions where id = v_row.curriculum_session_id;
  elsif tg_table_name = 'session_quiz_questions' then
    select ccs.course_proposal_id into v_proposal
    from public.session_quizzes sq
    join public.course_curriculum_sessions ccs on ccs.id = sq.curriculum_session_id
    where sq.id = v_row.quiz_id;
  end if;

  if v_proposal is not null then
    perform public.assert_curriculum_editable(v_proposal);
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.trg_freeze_curriculum() from public, anon, authenticated;

drop trigger if exists course_curriculum_sessions_freeze_trg on public.course_curriculum_sessions;
create trigger course_curriculum_sessions_freeze_trg
  before insert or update or delete on public.course_curriculum_sessions
  for each row execute function public.trg_freeze_curriculum();

drop trigger if exists session_tasks_freeze_trg on public.session_tasks;
create trigger session_tasks_freeze_trg
  before insert or update or delete on public.session_tasks
  for each row execute function public.trg_freeze_curriculum();

drop trigger if exists session_quizzes_freeze_trg on public.session_quizzes;
create trigger session_quizzes_freeze_trg
  before insert or update or delete on public.session_quizzes
  for each row execute function public.trg_freeze_curriculum();

drop trigger if exists session_quiz_questions_freeze_trg on public.session_quiz_questions;
create trigger session_quiz_questions_freeze_trg
  before insert or update or delete on public.session_quiz_questions
  for each row execute function public.trg_freeze_curriculum();

commit;

-- ملحوظة تشغيل: begin/commit واحد، idempotent. لازم يتطبّق بعد 0025-0033.
