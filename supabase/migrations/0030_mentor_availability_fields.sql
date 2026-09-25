-- mentor_applications: بيانات كافية لتخطيط دفعة حقيقية -------------------
--
-- أعمدة وصفية بس، مفيش محرّك جدولة معقّد (زي ما اتفقنا). القيم دي بيستخدمها
-- الليدر وقت المراجعة، والمنتور نفسه وقت ما يعمل cohort لاحقًا.
--
-- mentor_applications_status حقيقي enum (مش text+check) — إضافة قيمة
-- جديدة بـALTER TYPE ADD VALUE، نفس بالظبط الطريقة اللي 'suspended'
-- اتضافت بيها في migration 0004. آمنة جوّا begin/commit طول ما مفيش
-- استخدام للقيمة الجديدة في نفس الـ transaction — ومفيش هنا.

begin;

alter type public.mentor_application_status add value if not exists 'needs_changes';

alter table public.mentor_applications
  add column if not exists expertise_areas text[] not null default '{}',
  add column if not exists portfolio_url text,
  add column if not exists github_url text,
  add column if not exists preferred_days text[] not null default '{}',
  add column if not exists preferred_time text,
  add column if not exists timezone text,
  add column if not exists weekly_availability_hours numeric,
  add column if not exists preferred_cohort_size integer;

commit;

-- ملحوظة تشغيل: begin/commit واحد. الأعمدة الجديدة بتتغطّى تلقائيًا بنفس
-- GRANT/RLS الموجودة بالفعل على الجدول (INSERT لصاحب الطلب بس، لا يوجد
-- UPDATE ذاتي — المتقدّم مايعدّلش طلبه بعد التقديم، الستاف بس اللي يقرر).
