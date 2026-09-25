-- Achievements حقيقية — مربوطة بأحداث فعلية موجودة بالفعل، مش نقط/XP ----
--
-- 8 إنجازات، كل واحد مربوط بحدث حقيقي موجود في الداتابيز بالفعل (مفيش
-- جدول جديد لتتبّع "نشاط" مصطنع). نفس أمثلة الأودت بالظبط، ماعدا
-- "Learning Streak" (محتاجة تتبّع أيام متتالية، تعقيد إضافي مؤجّل لـP2)
-- و"First Contribution" (متداخلة مع "ساعدت حد تاني" — نفس الحدث بالظبط،
-- مفيش داعي نكرر إنجاز لنفس الفعل).
--
-- التصميم: award_achievement() دالة داخلية بس (مفيش EXECUTE لحد خالص، ولا
-- حتى authenticated) — بتتنادى من جوّه triggers تانية بس، اللي بتشتغل
-- بصلاحية مالك الدالة مش المستخدم. الاستثناء الوحيد: award_first_step_achievement()
-- بتتنادى مباشرة من saveOnboardingData (مفيش حدث جدولي واضح لأول خطوة —
-- بروفايل بيتحدّث لأسباب كتير)، وآمنة تُمنح لـauthenticated لأنها بتمنح
-- إنجاز واحد بس تافه (cosmetic) لصاحب الحساب نفسه، وبعد ما تتأكد فعليًا
-- إن بياناته اتملت.

begin;

create table if not exists public.achievements (
  key text primary key,
  title text not null,
  description text not null,
  icon text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.achievements enable row level security;
drop policy if exists "achievements_select_all" on public.achievements;
create policy "achievements_select_all" on public.achievements for select using (true);
revoke all on public.achievements from anon, authenticated;
grant select on public.achievements to anon, authenticated;

insert into public.achievements (key, title, description, icon, order_index) values
  ('first_step', 'أول خطوة', 'ملّيت بياناتك وحددت اهتماماتك', 'compass', 0),
  ('first_lesson', 'أول درس', 'خلّصت أول درس ليك في COCR', 'book', 1),
  ('first_submission', 'أول تسليم', 'بعتّ أول تسليم لمينتور يراجعه', 'send', 2),
  ('first_project', 'أول مشروع', 'بدأت تبني أول مشروع ليك', 'hammer', 3),
  ('graduation', 'تخرّجت من كورس', 'خلّصت كل دروس كورس كامل', 'medal', 4),
  ('project_approved', 'مشروع موثّق', 'مشروعك اتراجع واتوثّق رسميًا', 'badge-check', 5),
  ('helped_another_student', 'ساعدت حد تاني', 'سبت أول ملاحظة على مشروع طالب تاني', 'heart-handshake', 6),
  ('became_mentor', 'بقيت مينتور', 'طلبك اتقبل وبقيت مينتور معتمد في COCR', 'star', 7)
on conflict (key) do nothing;

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null references public.achievements(key) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index if not exists user_achievements_user_idx on public.user_achievements (user_id);

alter table public.user_achievements enable row level security;
drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own"
  on public.user_achievements for select
  to authenticated
  using (auth.uid() = user_id);

-- مفيش INSERT/UPDATE/DELETE لحد خالص — الإنجازات بتتمنح بس عن طريق
-- الدوال الداخلية تحت
revoke all on public.user_achievements from anon, authenticated;
grant select on public.user_achievements to authenticated;

-- ============================================================
create or replace function public.award_achievement(p_user_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_achievements (user_id, achievement_key)
  values (p_user_id, p_key)
  on conflict (user_id, achievement_key) do nothing;
exception when others then
  -- فشل منح إنجاز عمره ما يفشّل العملية الأصلية (تسليم/إتمام/مراجعة...)
  raise warning 'award_achievement failed (%): %', p_key, sqlerrm;
end;
$$;

revoke all on function public.award_achievement(uuid, text) from public, anon, authenticated;

-- أول خطوة (onboarding) — الاستثناء الوحيد: بتتنادى مباشرة من الـ action،
-- مش من trigger. بتتأكد بنفسها إن بيانات onboarding فعلاً اتملت قبل ما تمنح
create or replace function public.award_first_step_achievement()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;
  if exists (
    select 1 from public.profiles
    where id = v_uid and (goal is not null or cardinality(interests) > 0)
  ) then
    perform public.award_achievement(v_uid, 'first_step');
  end if;
end;
$$;

revoke all on function public.award_first_step_achievement() from public, anon, authenticated;
grant execute on function public.award_first_step_achievement() to authenticated;

-- أول درس
create or replace function public.trg_award_first_lesson()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.award_achievement(new.user_id, 'first_lesson');
  return new;
end;
$$;
revoke all on function public.trg_award_first_lesson() from public, anon, authenticated;
drop trigger if exists catalog_lesson_progress_award_achievement on public.catalog_lesson_progress;
create trigger catalog_lesson_progress_award_achievement
  after insert on public.catalog_lesson_progress
  for each row execute function public.trg_award_first_lesson();

-- أول تسليم (submitted فعليًا، مش مسودة) — يغطّي حالة الإنشاء المباشر
-- بحالة submitted وحالة draft→submitted لاحقًا، الاتنين
create or replace function public.trg_award_first_submission()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'submitted' then
    perform public.award_achievement(new.student_id, 'first_submission');
  end if;
  return new;
end;
$$;
revoke all on function public.trg_award_first_submission() from public, anon, authenticated;
drop trigger if exists course_submissions_award_achievement on public.course_submissions;
create trigger course_submissions_award_achievement
  after insert or update of status on public.course_submissions
  for each row execute function public.trg_award_first_submission();

-- أول مشروع + مشروع موثّق (نفس الجدول، حدثين مختلفين)
create or replace function public.trg_award_project_achievements()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.award_achievement(new.owner_id, 'first_project');
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    perform public.award_achievement(new.owner_id, 'project_approved');
  end if;
  return new;
end;
$$;
revoke all on function public.trg_award_project_achievements() from public, anon, authenticated;
drop trigger if exists projects_award_achievement on public.projects;
create trigger projects_award_achievement
  after insert or update of status on public.projects
  for each row execute function public.trg_award_project_achievements();

-- تخرّجت من كورس — نفس نقطة migration 0014 (completed_at)، trigger منفصل
-- عمدًا عشان اهتمام كل trigger بحاجة واحدة بس
create or replace function public.trg_award_graduation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.award_achievement(new.user_id, 'graduation');
  return new;
end;
$$;
revoke all on function public.trg_award_graduation() from public, anon, authenticated;
drop trigger if exists course_enrollments_award_achievement on public.course_enrollments;
create trigger course_enrollments_award_achievement
  after update of completed_at on public.course_enrollments
  for each row
  when (old.completed_at is null and new.completed_at is not null)
  execute function public.trg_award_graduation();

-- ساعدت حد تاني (أول feedback بتديه لطالب تاني)
create or replace function public.trg_award_helped_student()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.award_achievement(new.author_id, 'helped_another_student');
  return new;
end;
$$;
revoke all on function public.trg_award_helped_student() from public, anon, authenticated;
drop trigger if exists project_feedback_award_achievement on public.project_feedback;
create trigger project_feedback_award_achievement
  after insert on public.project_feedback
  for each row execute function public.trg_award_helped_student();

-- بقيت مينتور (mentor_applications.status → approved)
create or replace function public.trg_award_became_mentor()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform public.award_achievement(new.applicant_id, 'became_mentor');
  end if;
  return new;
end;
$$;
revoke all on function public.trg_award_became_mentor() from public, anon, authenticated;
drop trigger if exists mentor_applications_award_achievement on public.mentor_applications;
create trigger mentor_applications_award_achievement
  after update of status on public.mentor_applications
  for each row execute function public.trg_award_became_mentor();

commit;

-- ملحوظة تشغيل: begin/commit واحد (all-or-nothing)، كل حاجة idempotent.
-- مفيش backfill هنا عمدًا — لو عايزة الطلاب الحاليين ياخدوا إنجازات عن
-- نشاط سابق (قبل تطبيق الـ migration ده)، ده قرار منفصل نتكلم فيه (ممكن
-- يبان "مفاجئ" لطالب يفتح حسابه يلاقي إنجازات جديدة من غير حدث واضح
-- حصل دلوقتي) — تقوليلي لو عايزاه.
