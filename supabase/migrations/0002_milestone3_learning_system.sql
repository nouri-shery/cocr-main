-- Milestone 3, RE-CORRECTED: the real courses/course_modules/lessons/
-- lesson_progress tables are NOT used by this migration at all — confirmed
-- blocked. courses.creator_id and courses.reviewer_id both reference
-- auth.users(id) under a CHECK (creator_id IS DISTINCT FROM reviewer_id)
-- constraint that rejects NULL/NULL — meaning no row can be inserted into
-- courses without a real creator and a real, different reviewer. No such
-- authoring/review flow exists anywhere in this codebase (repo-wide search:
-- zero matches for creator/reviewer/teacher course-authoring code), and we
-- explicitly will not use test accounts, invented UUIDs, or a weakened
-- constraint to fake one. So courses — and everything chained under it
-- (course_modules, lessons) — stays completely untouched by this migration.
-- Static catalog remains the source of truth for course display until a real
-- authoring/review flow exists (a future milestone, not this one).
--
-- This migration instead adds two brand-new, independent tables that don't
-- reference courses/course_modules/lessons/lesson_progress in any way —
-- verified live that these names don't already exist, no collision:
--   catalog_lessons          — lessons keyed on the SAME text course_id that
--                               course_enrollments.course_id already uses
--                               (the static catalog ids: fe-basics, ...).
--                               No FK to any courses table, exactly matching
--                               course_enrollments' own established pattern.
--   catalog_lesson_progress  — completion tracking against catalog_lessons.
--
-- Both start completely empty — **مفيش أي lesson content بيتضاف هنا خالص**.

begin;

-- ============================================================
-- catalog_lessons
-- ============================================================
create table if not exists public.catalog_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  title text not null check (char_length(title) between 1 and 200),
  summary text not null default '',
  content_type text not null default 'text' check (content_type in ('text', 'video', 'link')),
  content text not null default '',
  order_index integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, order_index)
);

create index if not exists catalog_lessons_course_idx on public.catalog_lessons (course_id, order_index);

alter table public.catalog_lessons enable row level security;

drop policy if exists "catalog_lessons_select_published" on public.catalog_lessons;
create policy "catalog_lessons_select_published"
  on public.catalog_lessons for select
  using (published = true);

-- الـ syllabus (بدون المحتوى الفعلي) متاح لـ anon — نفس فلسفة "استكشف الأول"
grant select (id, course_id, title, summary, content_type, order_index, published) on public.catalog_lessons to anon;
grant select on public.catalog_lessons to authenticated;

-- ============================================================
-- catalog_lesson_progress
-- ============================================================
create table if not exists public.catalog_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  lesson_id uuid not null references public.catalog_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists catalog_lesson_progress_user_course_idx on public.catalog_lesson_progress (user_id, course_id);

alter table public.catalog_lesson_progress enable row level security;

drop policy if exists "catalog_progress_select_own" on public.catalog_lesson_progress;
create policy "catalog_progress_select_own"
  on public.catalog_lesson_progress for select
  to authenticated
  using (auth.uid() = user_id);

-- لازم يكون الطالب مسجّل فعليًا في الكورس (course_enrollments) قبل ما يعلّم
-- أي درس كمكتمل — وبيمنعه يلمس تقدّم مستخدم تاني
drop policy if exists "catalog_progress_insert_own_enrolled" on public.catalog_lesson_progress;
create policy "catalog_progress_insert_own_enrolled"
  on public.catalog_lesson_progress for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.course_enrollments ce
      where ce.user_id = auth.uid() and ce.course_id = catalog_lesson_progress.course_id
    )
  );

grant select, insert on public.catalog_lesson_progress to authenticated;

commit;

-- ملحوظة تشغيل: نفس الأمان زي قبل — begin/commit واحد (all-or-nothing)، كل
-- الجمل if not exists / drop policy if exists، آمن تشغّله تاني بعد أي فشل.
-- الجدولين دول مستقلين تمامًا عن courses/course_modules/lessons/lesson_progress
-- الحقيقيين — مفيش أي لمس ليهم في الملف ده خالص.
