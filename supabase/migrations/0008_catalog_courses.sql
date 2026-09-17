-- Milestone 8 — كتالوج الكورسات: من array ثابت في الكود لجدول حقيقي.
--
-- السياق: getCourses/getCourseById في landing_page_actions.ts كانوا بيرجّعوا
-- array ثابت (COURSES) جوّه الكود — يعني أي تعديل في وصف كورس أو إضافة كورس
-- جديد محتاج deploy كود، ومفيش أي طاقم عنده وصول لمحتوى الكتالوج غير المطور.
-- مقابل catalog_lessons (0002/0003) اللي فعلاً DB-backed من زمان.
--
-- القرار: catalog_courses جدول جديد، بنفس الـ ids النصّية اللي كانت في الـ
-- array بالظبط (fe-basics, cyber-intro, ...) — نفس الـ convention اللي
-- catalog_lessons.course_id وcourse_enrollments.course_id وcourse_submissions
-- .course_id بيستخدموها فعلاً، فمفيش أي داتا تسجيل/تقدّم/تسليم حالية
-- هتنكسر أو تحتاج remap.
--
-- عمدًا برّه الـ scope هنا (قرار منفصل لسه): ربط mentor_id بجدول profiles/
-- mentor_applications حقيقي — المينتورز المعروضين حاليًا (آدم، مريم، ...)
-- لسه Seed في MENTORS array في نفس الملف، ومفيش تأكيد إن فيه mentors
-- حقيقيين معتمدين بالعدد ده لكل تراك. تغيير mentorId من نص Seed لـ FK حقيقي
-- قرار تاني منفصل، مش جزء من نقل محتوى الكورس نفسه.
--
-- rating/reviews: بيانات Seed موصوفة صراحة في الكود الأصلي كذا ("مش نظام
-- تقييم حقيقي لسه") وفي الـ UI ("التقييمات هنا تجريبية في مرحلة الـ Beta") —
-- بننقل نفس القيم المعروضة حاليًا زي ما هي، من غير ما نخترع أرقام جديدة.

begin;

create table if not exists public.catalog_courses (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  accent text not null check (accent in ('blue', 'gold', 'green', 'ink')),
  level text not null check (level in ('مبتدئ', 'متوسط', 'متقدم')),
  category text not null check (category in ('front-end', 'cybersecurity', 'app-dev', 'embedded')),
  duration_weeks integer not null,
  lessons_count integer not null,
  hours integer not null,
  format text not null check (format in ('live', 'recorded', 'hybrid')),
  online_sessions integer,
  offline_sessions integer,
  age_min integer not null,
  age_max integer not null,
  mentor_id text not null,
  rating numeric not null,
  reviews integer not null,
  free boolean not null default true,
  popular boolean not null default false,
  order_index integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalog_courses enable row level security;

drop policy if exists "catalog_courses_select_published" on public.catalog_courses;
create policy "catalog_courses_select_published"
  on public.catalog_courses for select
  to anon, authenticated
  using (published = true);

grant select on public.catalog_courses to anon, authenticated;

insert into public.catalog_courses
  (id, title, description, icon, accent, level, category, duration_weeks, lessons_count, hours, format,
   online_sessions, offline_sessions, age_min, age_max, mentor_id, rating, reviews, free, popular, order_index)
values
  ('fe-basics', 'أساسيات الـ Front-End', 'تبني أول صفحة كاملة بإيدك من HTML وCSS لحد أول مكوّن تفاعلي.',
   'code', 'blue', 'مبتدئ', 'front-end', 6, 18, 24, 'hybrid', 4, 2, 14, 18, 'adam', 4.8, 34, true, true, 0),
  ('cyber-intro', 'مقدمة الأمن السيبراني', 'تفهم إزاي الأنظمة بتتخترق قبل ما تتعلم تحميها.',
   'shield', 'ink', 'مبتدئ', 'cybersecurity', 5, 15, 20, 'live', 5, null, 15, 18, 'mariam', 4.7, 21, true, true, 1),
  ('first-app', 'بناء أول تطبيق موبايل', 'من فكرة على ورقة لتطبيق شغّال على تليفونك.',
   'phone', 'green', 'متوسط', 'app-dev', 8, 24, 32, 'recorded', null, null, 14, 18, 'yasmin', 4.6, 19, true, false, 2),
  ('embedded-zero', 'الأنظمة المدمجة من الصفر', 'تتعامل مع بورد حقيقي وتبني أول مشروع بيتحرّك.',
   'chip', 'gold', 'مبتدئ', 'embedded', 7, 20, 28, 'hybrid', 3, 4, 15, 18, 'karim', 4.5, 12, true, false, 3),
  ('git-teams', 'Git وشغل الفرق', 'تشتغل مع فريق من غير ما تضيّع شغلك ولا شغلهم.',
   'gears', 'blue', 'مبتدئ', 'front-end', 3, 9, 10, 'recorded', null, null, 14, 18, 'adam', 4.9, 41, true, true, 4),
  ('portfolio', 'بناء بورتفوليو وعرض شغلك', 'تحوّل مشاريعك لحاجة حد تاني يفهمها في دقيقة.',
   'medal', 'gold', 'متوسط', 'front-end', 4, 12, 14, 'live', 4, null, 14, 18, 'adam', 4.8, 27, true, false, 5)
on conflict (id) do nothing;

commit;

-- ملحوظة تشغيل: begin/commit واحد، الجدول والـ policy idempotent (if not
-- exists / drop+create)، الـ seed idempotent (on conflict do nothing) عشان
-- لو الملف اتشغّل تاني ميكررش الصفوف. مفيش أي تغيير على catalog_lessons
-- ولا أي جدول تاني — الـ ids متطابقة معاهم بالظبط، صفر remap.
