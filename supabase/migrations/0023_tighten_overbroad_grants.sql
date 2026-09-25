-- إصلاح أمني حرج: anon كان عنده INSERT/UPDATE/DELETE/TRUNCATE على 4 جداول -
--
-- اتأكّدنا من الداتابيز الحية: courses, favorites, mentor_applications,
-- opportunities كلهم كانوا مانحين anon (زائر مش مسجّل دخول خالص — مفتاح
-- anon عام دايمًا موجود في كود الفرونت إند، أي حد يقدر يستخدمه) صلاحيات
-- INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES بالكامل، مش SELECT بس.
--
-- سواء ده كان قابل للاستغلال فعليًا دلوقتي بيعتمد على هل فيه RLS policy
-- بتسمح لـanon فعلاً على الأوامر دي (لسه مستنيين pg_policies نتأكد) — بس
-- بغض النظر عن ده، شكل الصلاحيات ده غلط من ناحية مبدأ الحد الأدنى
-- للصلاحيات (least privilege): أي تعديل مستقبلي بسيط في الـ policies (حتى
-- لو نية حسنة وضيّق) ممكن يفتح كتابة/حذف كاملة لأي حد على الإنترنت من غير
-- تسجيل دخول خالص على جدول فيه بيانات حساسة زي mentor_applications
-- (guardian_email, age, gender).
--
-- الإصلاح متحفّظ عمدًا: anon مالوش أي داعي شرعي لأي كتابة على الجداول
-- الأربعة دي خالص — بنقفلها كلها. authenticated بنقفلها بس على الجدولين
-- اللي متأكدين 100% إن مفيش أي كود تطبيق حقيقي بيكتب عليهم مباشرة
-- (opportunities — كل كتابتها بقت عن طريق الدوال في migration 0019،
-- courses — كتالوج ثابت زي catalog_courses بيتحدّث يدوي/seed بس). مش
-- بنلمس INSERT/UPDATE/DELETE بتاعة authenticated على favorites أو
-- mentor_applications في الملف ده — الستاف (اللي هم authenticated
-- كمان) محتاجين UPDATE شغّال فعليًا على mentor_applications (مراجعة
-- الطلبات، موثّق وشغّال دلوقتي)، ومش عايزين نكسره من غير ما نشوف
-- الـ policies الفعلية الأول.

begin;

revoke insert, update, delete, truncate, trigger, references
  on public.courses, public.favorites, public.mentor_applications, public.opportunities
from anon;

revoke insert, update, delete, truncate, trigger, references
  on public.opportunities, public.courses
from authenticated;

revoke truncate, trigger, references
  on public.favorites, public.mentor_applications
from authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد. REVOKE آمن يتكرر (مبيرجعش error لو
-- الصلاحية أصلاً مش موجودة). مفيش أي تغيير على SELECT لأي حد، ومفيش لمس
-- لـauthenticated INSERT/UPDATE/DELETE على favorites/mentor_applications —
-- محتاجين pg_policies الفعلية الأول قبل ما نضيّق دول.
