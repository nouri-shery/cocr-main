-- Scheduled Sessions (توسيع course_sessions) + التسجيلات + الحضور --------
--
-- course_sessions (موجودة من migration 0004) بتبقى الـ Scheduled Session
-- الحقيقية — سطر واحد لكل انعقاد فعلي، جوّه دفعة معيّنة، بمحتوى منسوخ
-- (snapshot) من course_curriculum_sessions وقت الجدولة، مش join حي بيه —
-- عشان تعديل المنهج بعد كده ميغيّرش سيشنز اتجدولت أو خلصت بالفعل.
--
-- ملحوظة مهمة: الجدول ده كان ناقص أي UPDATE policy خالص من الأول (اتفحص
-- في الأودت) — يعني منتور ملوش طريقة يصحح غلطة كتابة أو ميعاد بعد ما ينشئ
-- السيشن. ده بيتصلح هنا كجزء من نفس الشغل، مش بس عشان الدفعات.

begin;

-- ============================================================
-- 1) توسيع course_sessions
-- ============================================================
alter table public.course_sessions
  add column if not exists cohort_id uuid references public.course_cohorts(id) on delete cascade,
  add column if not exists curriculum_session_id uuid references public.course_curriculum_sessions(id) on delete set null,
  add column if not exists objectives text[],
  add column if not exists session_type text,
  add column if not exists preparation text,
  add column if not exists live_activity text,
  add column if not exists post_session_task_brief text,
  add column if not exists resources text[],
  add column if not exists expected_deliverable text,
  add column if not exists status text not null default 'scheduled',
  add column if not exists updated_at timestamptz not null default now();

alter table public.course_sessions drop constraint if exists course_sessions_status_check;
alter table public.course_sessions add constraint course_sessions_status_check
  check (status in ('scheduled', 'completed', 'cancelled'));

-- course_id كان NOT NULL — سيشنز الدفعات الجديدة بتستخدم cohort_id بدلها،
-- مش نص catalog قديم
alter table public.course_sessions alter column course_id drop not null;

-- course_category كان NOT NULL (0004) — سيشنز الدفعات مبتحملش تراك قديم. اتكشف
-- بتجربة فعلية (insert سيشن دفعة كان بيفشل). المسار القديم لسه لازم يملاه.
alter table public.course_sessions alter column course_category drop not null;
alter table public.course_sessions drop constraint if exists course_sessions_category_required_legacy;
alter table public.course_sessions add constraint course_sessions_category_required_legacy
  check (cohort_id is not null or course_category is not null);

alter table public.course_sessions drop constraint if exists course_sessions_exactly_one_target;
alter table public.course_sessions add constraint course_sessions_exactly_one_target
  check (
    (course_id is not null and cohort_id is null)
    or (course_id is null and cohort_id is not null)
  );

-- ============================================================
-- 2) RLS إضافية للدفعات — الأصلية (0004) بتغطي course_id القديم بس
-- ============================================================
-- policy الإدخال القديمة (0004): approved mentor في نفس التراك يعمل سيشن. من غير
-- القيد ده كانت هتسمح لأي منتور معتمد يزرع سيشن (بلينك زوم) جوّه دفعة منتور
-- تاني — والطلاب هيشوفوها. اتأكّد بتجربة فعلية. بتتحصر على المسار القديم.
drop policy if exists "course_sessions_insert_mentor" on public.course_sessions;
create policy "course_sessions_insert_mentor"
  on public.course_sessions for insert
  to authenticated
  with check (auth.uid() = mentor_id and cohort_id is null and is_approved_mentor(course_category));

drop policy if exists "course_sessions_select_cohort_enrolled" on public.course_sessions;
create policy "course_sessions_select_cohort_enrolled"
  on public.course_sessions for select
  to authenticated
  using (cohort_id is not null and public.is_cohort_member(cohort_id));

drop policy if exists "course_sessions_insert_cohort_mentor" on public.course_sessions;
create policy "course_sessions_insert_cohort_mentor"
  on public.course_sessions for insert
  to authenticated
  with check (
    auth.uid() = mentor_id
    and cohort_id is not null
    and public.is_cohort_mentor(cohort_id)
  );

-- تصحيح الثغرة: مفيش UPDATE policy خالص من قبل — المنتور دلوقتي يقدر
-- يعدّل سيشنه بس وهي لسه scheduled (مش بعد ما تخلص فعليًا)
drop policy if exists "course_sessions_update_own_scheduled" on public.course_sessions;
create policy "course_sessions_update_own_scheduled"
  on public.course_sessions for update
  to authenticated
  using (auth.uid() = mentor_id and status = 'scheduled')
  with check (auth.uid() = mentor_id);

grant update on public.course_sessions to authenticated;

-- حارس: التعديل مسموح للمحتوى/الميعاد، مش لهوية السيشن نفسها (المنتور/
-- الدفعة/الكورس/القالب المرتبط) — نفس مبدأ course_submissions (0022)
create or replace function public.course_sessions_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.mentor_id is distinct from old.mentor_id
    or new.cohort_id is distinct from old.cohort_id
    or new.course_id is distinct from old.course_id
    or new.curriculum_session_id is distinct from old.curriculum_session_id
  then
    raise exception 'مينفعش تغيّري المنتور أو الدفعة أو الكورس المرتبط بالسيشن دي.';
  end if;
  -- مينفعش سيشن تتعلّم مكتملة قبل ميعادها (وإلا المنتور يقدر يقفل حضور وإتمام
  -- لسيشنز لسه ماحصلتش)
  if new.status = 'completed' and old.status is distinct from 'completed' and new.scheduled_at > now() then
    raise exception 'مينفعش تعلّمي السيشن كمكتملة قبل ميعادها.';
  end if;
  return new;
end;
$$;

drop trigger if exists course_sessions_guard_immutable_trg on public.course_sessions;
create trigger course_sessions_guard_immutable_trg
  before update on public.course_sessions
  for each row
  execute function public.course_sessions_guard_immutable();

-- ============================================================
-- 3) session_recordings — التحكم في الوصول جوّه الجدول نفسه، مش
-- "unlisted" كموديل أمان. youtube_unlisted قيمة provider ممكنة، دي
-- اختيار استضافة V1 (تكلفة/بنية تحتية)، مش هي حدود الوصول الفعلية —
-- الحدود الفعلية هي RLS تحت
-- ============================================================
create table if not exists public.session_recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  provider text not null check (provider in ('youtube_unlisted', 'vimeo_private', 's3_signed', 'other')),
  external_url text not null,
  access_policy text not null default 'cohort_enrolled' check (access_policy in ('cohort_enrolled', 'mentor_and_leaders_only')),
  available_from timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists session_recordings_session_idx on public.session_recordings (session_id);

alter table public.session_recordings enable row level security;

drop policy if exists "session_recordings_select_authorized" on public.session_recordings;
create policy "session_recordings_select_authorized"
  on public.session_recordings for select
  to authenticated
  using (
    (
      available_from <= now()
      and (expires_at is null or expires_at > now())
      and exists (
        select 1 from public.course_sessions cs
        where cs.id = session_recordings.session_id
          and (
            cs.mentor_id = auth.uid()
            or (
              session_recordings.access_policy = 'cohort_enrolled'
              and public.is_cohort_member(cs.cohort_id)
            )
          )
      )
    )
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

drop policy if exists "session_recordings_insert_mentor" on public.session_recordings;
create policy "session_recordings_insert_mentor"
  on public.session_recordings for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.course_sessions cs
      where cs.id = session_recordings.session_id and cs.mentor_id = auth.uid()
    )
  );

-- مفيش UPDATE/DELETE لحد دلوقتي عمدًا — تسجيل اتضاف يفضل زي ما هو، أي
-- تصحيح لازم يعدّي على الستاف يدوي (V1 بسيط، مش محتاجين دورة حياة معقّدة)
revoke all on public.session_recordings from anon, authenticated;
grant select, insert on public.session_recordings to authenticated;

-- ============================================================
-- 4) session_attendance — بيتسجّل من المنتور بعد كل سيشن لايف (مفيش
-- تكامل حقيقي مع أي أداة فيديو يقدر يتتبّع الحضور أوتوماتيك)
-- ============================================================
create table if not exists public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('present', 'late', 'absent', 'excused')),
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index if not exists session_attendance_session_idx on public.session_attendance (session_id);

alter table public.session_attendance enable row level security;

drop policy if exists "attendance_select_own_or_mentor_or_staff" on public.session_attendance;
create policy "attendance_select_own_or_mentor_or_staff"
  on public.session_attendance for select
  to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from public.course_sessions cs where cs.id = session_attendance.session_id and cs.mentor_id = auth.uid())
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

-- المنتور بس يسجّل حضور طالب فعلاً مسجّل في نفس الدفعة بتاعة السيشن، ومش
-- سيشن ملغية. النسخة الأولى كانت بتعمل join على course_enrollments جوّه الـ
-- policy، والمنتور مش شايف enrollments طلابه (RLS) فالـ subquery كانت بترجّع
-- صفر وتسجيل الحضور كان مستحيل (وبالتالي الإتمام كله). اتأكّد بتجربة فعلية.
drop policy if exists "attendance_insert_mentor" on public.session_attendance;
create policy "attendance_insert_mentor"
  on public.session_attendance for insert
  to authenticated
  with check (
    recorded_by = auth.uid()
    and exists (
      select 1 from public.course_sessions cs
      where cs.id = session_attendance.session_id
        and cs.mentor_id = auth.uid()
        and cs.cohort_id is not null
        and cs.status <> 'cancelled'
        and public.is_my_cohort_student(cs.cohort_id, session_attendance.student_id)
    )
  );

drop policy if exists "attendance_update_mentor" on public.session_attendance;
create policy "attendance_update_mentor"
  on public.session_attendance for update
  to authenticated
  using (exists (select 1 from public.course_sessions cs where cs.id = session_attendance.session_id and cs.mentor_id = auth.uid()))
  with check (
    exists (
      select 1 from public.course_sessions cs
      where cs.id = session_attendance.session_id
        and cs.mentor_id = auth.uid()
        and cs.cohort_id is not null
        and public.is_my_cohort_student(cs.cohort_id, session_attendance.student_id)
    )
  );

-- هوية سجل الحضور ثابتة: مينفعش يتنقل لطالب أو سيشن تانية بعد ما اتسجّل
create or replace function public.session_attendance_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.session_id is distinct from old.session_id or new.student_id is distinct from old.student_id then
    raise exception 'مينفعش تغيّري الطالب أو السيشن في سجل حضور موجود.';
  end if;
  return new;
end;
$$;

drop trigger if exists session_attendance_guard_immutable_trg on public.session_attendance;
create trigger session_attendance_guard_immutable_trg
  before update on public.session_attendance
  for each row
  execute function public.session_attendance_guard_immutable();

revoke all on public.session_attendance from anon, authenticated;
grant select, insert, update on public.session_attendance to authenticated;

-- ============================================================
-- إشعار سيشن جديدة: مسار الدفعات كمان (0018 كانت بتغطّي course_id بس، فطلاب
-- الدفعات مكانوش بيوصلهم أي إشعار)
-- ============================================================
create or replace function public.trg_notify_session_scheduled()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student record;
begin
  begin
    if new.cohort_id is not null then
      for v_student in
        select user_id from public.course_enrollments where cohort_id = new.cohort_id and status = 'active'
      loop
        perform public.notify_user(v_student.user_id, 'session_scheduled', 'سيشن جديدة اتحجزت', new.title, '/dashboard');
      end loop;
    else
      for v_student in
        select user_id from public.course_enrollments where course_id = new.course_id
      loop
        perform public.notify_user(v_student.user_id, 'session_scheduled', 'سيشن جديدة اتحجزت', new.title, '/courses/' || new.course_id);
      end loop;
    end if;
  exception when others then
    raise warning 'trg_notify_session_scheduled failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.trg_notify_session_scheduled() from public, anon, authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد، كل حاجة idempotent. لازم يتشغّل بعد
-- 0025 (معتمد على course_cohorts/course_enrollments.cohort_id).
