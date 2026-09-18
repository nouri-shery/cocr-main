-- Milestone 12 — عمود avatar_id على profiles عشان الطالب/المينتور يقدر
-- يغيّر أفاتاره بنفسه من البروفايل (مش بس التعيين التلقائي الثابت اللي
-- بيتحسب من الـid بتاعه). القيمة null = "لسه مختارش"، فالتطبيق بيرجع
-- للتعيين التلقائي زي ما هو.

begin;

alter table public.profiles add column if not exists avatar_id text;

revoke update on public.profiles from authenticated;
grant update (bio, skills, updated_at, interests, goal, grade_or_education_stage, gender, avatar_id) on public.profiles to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد، جملة idempotent واحدة بس، مفيش تغيير
-- على بيانات مستخدمين حقيقية. avatar_id مش foreign key لأي جدول — القيم
-- الصالحة (أسماء الأفاتارات) متعرّفة في كود التطبيق نفسه (app/lib/avatar-gallery.ts)
-- مش في الداتا بيز، فمفيش داعي لجدول lookup منفصل لـ11 قيمة ثابتة.
