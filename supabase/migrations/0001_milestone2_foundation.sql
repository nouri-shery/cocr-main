-- Milestone 2 foundation: profiles, course_enrollments, projects, project_feedback.
--
-- ليه الجداول دي بس؟
-- - profiles: مصدر واحد حقيقي لـ bio/skills بدل user_metadata، وهو الجدول
--   الوحيد اللي ممكن نعمل منه join لاسم المستخدم (auth.users مش متاحة مباشرة
--   للـ client عن طريق RLS، فلازم نسخة عامة من الاسم هنا).
-- - course_enrollments: تسجيل حقيقي لبدء الكورس بدل user_metadata، مع
--   unique constraint بيمنع التسجيل المكرر على مستوى الداتابيز نفسه (مش بس
--   الواجهة) وبيحل الـ race condition اللي كان موجود مع user_metadata.
-- - لا يوجد course_progress: الكورسات الحالية عندها لسه lessons count بس
--   (رقم)، مفيش lesson entities حقيقية (id/title/ترتيب) نقدر نتتبّع إكمالها.
--   عمل جدول progress دلوقتي هيبقى فاضي دايمًا أو محتاج نخترع lessons وهمية —
--   الاتنين ممنوعين صراحةً. الـ enrollment نفسه هو أبسط "تقدّم حقيقي" متاح
--   دلوقتي (بدأ / لسه). لازم نموذج محتوى حقيقي للكورس (lessons جدول) قبل ما
--   نقدر نعمل نسبة تقدّم حقيقية.
-- - projects + project_feedback: نظام مشاريع حقيقي بسيط، بدون mentor system
--   مخترع — أي مستخدم مسجّل يقدر يسيب feedback على مشروع منشور مش بتاعه.

-- تصحيح مهم (بعد فحص الـ schema الحقيقي فعليًا مع المستخدم): public.profiles
-- مش جدول بسيط اتعمل بالصدفة — هي جزء حقيقي ومقصود من COCR، ببنية أوسع بكتير
-- (display_name, account_status pending_approval, interests, goal,
-- grade_or_education_stage, language...) وليها trigger حقيقي شغّال بالفعل
-- (handle_new_user) بيعمل كمان insert في profile_sensitive (تاريخ ميلاد/بيانات
-- ولي أمر) وguardian_approvals (لو فيه طلب دور Mentor/Teacher). الملف ده
-- **ميلمسش الـ trigger أو الجدول ده خالص** — بس بيضيف الأعمدة الجديدة اللي
-- Milestone 2 محتاجاها (bio, skills) واللي مش موجودة في النظام الأصلي.
--
-- اكتشفنا كمان إن signUpWithEmail (components/homecomponent/auth/actions.ts)
-- كان بيحط الاسم في مفتاح user_metadata.full_name، لكن الـ trigger الحقيقي
-- بيقرا من مفتاح مختلف (display_name) — يعني كل حساب اتسجّل من خلال التطبيق
-- ده لحد دلوقتي أصلاً عنده profiles.display_name فاضي (''). ده اتصلح في نفس
-- الوقت في signUpWithEmail، وهنا بنعمل UPDATE واحد آمن ومحدود (بس للصفوف اللي
-- display_name فيها فاضي فعلاً) عشان نرجّع الاسم الصحيح من user_metadata
-- للحسابات اللي اتأثرت بالمشكلة دي قبل الإصلاح.

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- profiles — إضافات بس، من غير أي لمس للجدول أو الـ trigger الأصلي
-- ============================================================
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] not null default '{}';

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- تصحيح أمان عاجل: التشغيلة الناجحة اللي فاتت منحت anon (أي حد على
-- الإنترنت من غير تسجيل دخول) SELECT على الجدول كله — يعني interests/goal/
-- country/governorate/account_status لأي طالب (تحت 18 سنة) كانت مقروءة من
-- غير أي مصادقة. اتأكدنا من الاختراق ده فعليًا (curl بالـ anon key لوحده
-- رجّع بيانات حقيقية). الإصلاح: نلغي المنحة الواسعة ونديله بس id+display_name
-- (المطلوبين لعرض اسم صاحب مشروع منشور للزوار) — أي حاجة تانية محتاجة تسجيل
-- دخول فعلي.
revoke select on public.profiles from anon;
grant select (id, display_name) on public.profiles to anon;
grant select on public.profiles to authenticated;
grant update (bio, skills, updated_at) on public.profiles to authenticated;

-- إصلاح الأسماء الفاضية اللي سببها الـ bug في signUpWithEmail (بس للصفوف
-- المتأثرة فعلاً — مفيش لمس لأي display_name اتحط فعلاً بأي طريقة)
update public.profiles p
set display_name = u.raw_user_meta_data->>'full_name'
from auth.users u
where p.id = u.id
  and p.display_name = ''
  and coalesce(u.raw_user_meta_data->>'full_name', '') <> '';

-- ============================================================
-- course_enrollments
-- ============================================================
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- مش foreign key: الكتالوج static TypeScript array مش جدول لسه (Milestone 3
  -- بتاع الـ Teacher هو اللي هيحوّله لجدول حقيقي)
  course_id text not null,
  started_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.course_enrollments enable row level security;

drop policy if exists "enrollments_select_own" on public.course_enrollments;
create policy "enrollments_select_own"
  on public.course_enrollments for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "enrollments_insert_own" on public.course_enrollments;
create policy "enrollments_insert_own"
  on public.course_enrollments for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.course_enrollments to authenticated;

-- Backfill آمن من user_metadata.startedCourses (idempotent)
insert into public.course_enrollments (user_id, course_id, started_at)
select
  u.id,
  sc->>'id',
  coalesce((sc->>'startedAt')::timestamptz, now())
from auth.users u,
     jsonb_array_elements(coalesce(u.raw_user_meta_data->'startedCourses', '[]'::jsonb)) as sc
on conflict (user_id, course_id) do nothing;

-- ============================================================
-- projects
-- ============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  -- بيشاور على profiles مش auth.users مباشرة، عشان PostgREST يقدر يعمل embed
  -- (owner:profiles(full_name)) في queries الـ project — profiles.id نفسها
  -- FK لـ auth.users بـ on delete cascade، فالحماية عند حذف حساب لسه شغالة
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  skills text[] not null default '{}',
  project_link text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner_id);
create index if not exists projects_status_idx on public.projects (status);

alter table public.projects enable row level security;

drop policy if exists "projects_select_published_or_own" on public.projects;
create policy "projects_select_published_or_own"
  on public.projects for select
  using (status = 'published' or owner_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects for delete
  to authenticated
  using (auth.uid() = owner_id);

grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

-- ============================================================
-- project_feedback
-- ============================================================
create table if not exists public.project_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- زي owner_id فوق — بيشاور على profiles عشان الـ embed (author:profiles(...))
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists project_feedback_project_idx on public.project_feedback (project_id);

alter table public.project_feedback enable row level security;

drop policy if exists "feedback_select_visible_projects" on public.project_feedback;
create policy "feedback_select_visible_projects"
  on public.project_feedback for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_feedback.project_id
        and (p.status = 'published' or p.owner_id = auth.uid())
    )
  );

-- أي مستخدم مسجّل (مش مالك المشروع) يقدر يسيب feedback على مشروع منشور —
-- مفيش نظام mentor مخترع، أي طالب يقدر يساعد طالب تاني (near-peer)
drop policy if exists "feedback_insert_on_published_not_own" on public.project_feedback;
create policy "feedback_insert_on_published_not_own"
  on public.project_feedback for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.projects p
      where p.id = project_feedback.project_id
        and p.status = 'published'
        and p.owner_id <> auth.uid()
    )
  );

drop policy if exists "feedback_delete_own" on public.project_feedback;
create policy "feedback_delete_own"
  on public.project_feedback for delete
  to authenticated
  using (auth.uid() = author_id);

grant select on public.project_feedback to anon, authenticated;
grant insert, delete on public.project_feedback to authenticated;

commit;
