-- Notifications حقيقية — أحداث فعلية بس، مفيش realtime إضافي ---------
--
-- بسيطة ومباشرة: DB-backed، الطالب بيشوفها لما يفتح الصفحة (polling عادي عن
-- طريق getMyNotifications)، مفيش WebSocket ولا subscription.
--
-- 6 أحداث حقيقية، كل واحد مربوط بجدول/trigger موجود بالفعل: feedback على
-- تسليم، قرار مراجعة مشروع، إنجاز جديد (0017)، شهادة جاهزة (0015)، قرار طلب
-- مينتور، سيشن جديدة اتحجزت.
--
-- تصحيح جوهري بعد مقارنة بالداتابيز الحية (audit2): جدول notifications
-- موجود فعلًا (0 صفوف، مبني من النظام الأصلي) بأعمدة مختلفة:
--   id, user_id, type, title, body, is_read, created_at
-- من غير link ولا read_at. النسخة الأولى من الملف ده كانت create table if
-- not exists → no-op على الجدول الحي، وبعدها فشلت على read_at. القرار
-- (اتحقّق منه بتجربة على نسخة مطابقة): نتبنّى الجدول الموجود ونضيف عليه
-- الأعمدة الناقصة بس (additive، مفيش drop ولا تغيير على عمود موجود)؛ is_read
-- بيفضل موجود من غير استخدام. الـ policies الحية (own / own update) بتتبدّل
-- بنسخة مقيّدة (read_at بس)؛ policy الإدخال للستاف (notification_management)
-- بتتساب زي ما هي.
--
-- notify_user دالة داخلية: مفيش EXECUTE لأي حد (مش anon ولا authenticated —
-- default privileges بتاعة Supabase بتديهم EXECUTE مباشرة، وrevoke من public
-- لوحدها مش كفاية). وفشل الإشعار عمره ما يفشّل العملية الأصلية: كل trigger
-- محاط بـ exception handler.
--
-- ترتيب التشغيل: بعد 0004 و0013 و0015 و0017 (بيعتمد على الأربعة).

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists read_at timestamptz;

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications own" on public.notifications;
drop policy if exists "notifications own update" on public.notifications;
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own_read" on public.notifications;
create policy "notifications_update_own_read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- الصلاحيات: SELECT + تعليم read_at بس. INSERT فضل متاح لـ authenticated لأن
-- policy الستاف الحية ("notifications admin insert") بتعتمد عليه، والـ RLS
-- بتقصره على notification_management / super admin.
revoke all on public.notifications from anon, authenticated;
grant select, insert on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ============================================================
-- notify_user: داخلية بس. فشلها بيتحوّل لتحذير، مش error
-- ============================================================
create or replace function public.notify_user(p_user_id uuid, p_type text, p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, coalesce(p_body, ''), p_link);
exception when others then
  raise warning 'notify_user failed (%): %', p_type, sqlerrm;
end;
$$;

revoke all on function public.notify_user(uuid, text, text, text, text) from public, anon, authenticated;

-- 1) مينتور راجع تسليمك
create or replace function public.trg_notify_submission_feedback()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student uuid;
  v_course_id text;
begin
  begin
    select student_id, course_id into v_student, v_course_id
    from public.course_submissions where id = new.submission_id;

    if v_student is not null then
      perform public.notify_user(
        v_student, 'submission_feedback',
        'مينتور راجع تسليمك', 'في feedback جديد على تسليمك.',
        case when v_course_id is not null then '/courses/' || v_course_id else '/dashboard' end
      );
    end if;
  exception when others then
    raise warning 'trg_notify_submission_feedback failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.trg_notify_submission_feedback() from public, anon, authenticated;
drop trigger if exists submission_feedback_notify on public.submission_feedback;
create trigger submission_feedback_notify
  after insert on public.submission_feedback
  for each row execute function public.trg_notify_submission_feedback();

-- 2) قرار مراجعة مشروع (اتوثّق / محتاج تعديل)
create or replace function public.trg_notify_project_review()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid;
  v_title text;
begin
  begin
    select owner_id, title into v_owner, v_title from public.projects where id = new.project_id;
    if v_owner is not null then
      perform public.notify_user(
        v_owner,
        case when new.decision = 'approved' then 'project_approved' else 'project_rejected' end,
        case when new.decision = 'approved' then 'اتوثّق مشروعك!' else 'مشروعك محتاج تعديل' end,
        case when new.decision = 'approved'
          then coalesce(v_title, 'مشروعك') || ' بقى مشروع تخرّج موثّق.'
          else coalesce(new.reviewer_note, '')
        end,
        '/projects/' || new.project_id
      );
    end if;
  exception when others then
    raise warning 'trg_notify_project_review failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.trg_notify_project_review() from public, anon, authenticated;
drop trigger if exists project_reviews_notify on public.project_reviews;
create trigger project_reviews_notify
  after insert on public.project_reviews
  for each row execute function public.trg_notify_project_review();

-- 3) إنجاز جديد (يعتمد على 0017)
create or replace function public.trg_notify_achievement()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_title text;
begin
  begin
    select title into v_title from public.achievements where key = new.achievement_key;
    perform public.notify_user(new.user_id, 'achievement_unlocked', 'إنجاز جديد!', coalesce(v_title, new.achievement_key), '/profile');
  exception when others then
    raise warning 'trg_notify_achievement failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.trg_notify_achievement() from public, anon, authenticated;
drop trigger if exists user_achievements_notify on public.user_achievements;
create trigger user_achievements_notify
  after insert on public.user_achievements
  for each row execute function public.trg_notify_achievement();

-- 4) شهادة جاهزة (يعتمد على 0015)
create or replace function public.trg_notify_certificate()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  begin
    perform public.notify_user(
      new.student_id, 'certificate_issued', 'شهادتك جاهزة',
      'شهادة "' || new.course_title || '" جاهزة، رقمها ' || new.certificate_number || '.',
      '/verify/' || new.certificate_number
    );
  exception when others then
    raise warning 'trg_notify_certificate failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.trg_notify_certificate() from public, anon, authenticated;
drop trigger if exists certificates_notify on public.certificates;
create trigger certificates_notify
  after insert on public.certificates
  for each row execute function public.trg_notify_certificate();

-- 5) قرار طلب مينتور
create or replace function public.trg_notify_mentor_application()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  begin
    if new.status = 'approved' and old.status is distinct from 'approved' then
      perform public.notify_user(
        new.applicant_id, 'mentor_application_approved', 'اتقبلت كمينتور!',
        'طلبك اتوافق عليه، أهلًا بيك مينتور في COCR.', '/profile'
      );
    elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
      perform public.notify_user(
        new.applicant_id, 'mentor_application_rejected', 'طلب المينتور محتاج وقت تاني',
        coalesce(new.notes, ''), '/profile'
      );
    end if;
  exception when others then
    raise warning 'trg_notify_mentor_application failed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.trg_notify_mentor_application() from public, anon, authenticated;
drop trigger if exists mentor_applications_notify on public.mentor_applications;
create trigger mentor_applications_notify
  after update of status on public.mentor_applications
  for each row execute function public.trg_notify_mentor_application();

-- 6) سيشن جديدة اتحجزت — لطلاب المسار القديم (course_id). مسار الدفعات
-- (cohort_id) بيتضاف في 0026 لما العمود يبقى موجود.
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
drop trigger if exists course_sessions_notify on public.course_sessions;
create trigger course_sessions_notify
  after insert on public.course_sessions
  for each row execute function public.trg_notify_session_scheduled();

commit;

-- ملحوظة تشغيل: begin/commit واحد (all-or-nothing)، idempotent. مفيش backfill.
