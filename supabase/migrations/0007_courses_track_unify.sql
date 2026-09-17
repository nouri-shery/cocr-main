-- Milestone 7 — توحيد الـ Tracks: تبني الاتفاقية الحية (Option B).
--
-- القرار: بعد introspection كامل + impact analysis (اتراجع في الشات، مش
-- افتراض)، اتأكد إن فيه مسارين متعارضين للـ track:
--   1) enum course_track (programming / graphic_design / ai_tools) —
--      مستخدم بس في عمود courses.track، وcourses فاضي تمامًا (0 صف مؤكد
--      وقت الكتابة)، ومفيش أي كود في الريبو بيستخدم اسم النوع ده أو
--      بيقرا عمود track خالص (اتفحص بـ grep كامل قبل الكتابة).
--   2) نص حر front-end / cybersecurity / app-dev / embedded — ده اللي
--      فعليًا شغّال في mentor_applications.track، course_submissions
--      .course_category، course_sessions.course_category، ونفس الاتفاقية
--      بالظبط اللي متعرّفة في app/types/types.ts (CourseCategory).
--
-- القرار: نتبنى الاتفاقية الحية (2) في courses.track بدل الـ enum —
-- صفر داتا هتتفقد (الجدول فاضي)، صفر تغيير مطلوب في الكود (مفيش حد
-- بيقرا العمود ده أصلاً)، وصفر تغيير في الـ 3 جداول التانية.
--
-- النوع القديم course_track نفسه مبيتشالش هنا عمدًا (DROP TYPE قرار
-- منفصل وواعي لوحده) — بيفضل موجود من غير استخدام، مسجّل كـ tech debt
-- زي معاملة favorites/saved_items بالظبط في 0006.

begin;

alter table public.courses
  alter column track type text using track::text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_track_check' and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_track_check
      check (track in ('front-end', 'cybersecurity', 'app-dev', 'embedded'));
  end if;
end $$;

commit;

-- ملحوظة تشغيل: begin/commit واحد، كل الجمل idempotent (الـ constraint
-- محاط بـ existence check يدوي لأن PostgreSQL مادعمش ADD CONSTRAINT IF
-- NOT EXISTS). مفيش أي INSERT/UPDATE على بيانات حقيقية في الملف ده،
-- ومفيش تغيير مطلوب في أي كود TypeScript (courses.track مش مقروء حاليًا
-- في أي مسار حي).
