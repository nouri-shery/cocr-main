-- opportunities: إسقاط policies قديمة كانت بتلف على تصميم migration 0019 --
--
-- اتأكّدنا من الداتابيز الحية: قبل ما نلمس opportunities الليلة، كان فيه
-- بالفعل policies حقيقية (مش متتبّعة في أي migration) بتسمح بكتابة مباشرة:
--
-- 1) "opportunities researcher insert" (INSERT, with check researcher_id =
--    auth.uid()) — مفيش أي فحص صلاحية opportunity_review خالص. أي مستخدم
--    مسجّل دخول (مش بس فريق COCR) كان يقدر يـ insert فرصة مباشرة بنفسه.
--
-- 2) "opportunities admin all" (ALL commands, is_super_admin أو
--    has_permission('opportunity_review')) — بتسمح بأي عملية من غير أي
--    فحص تضارب مصالح. عضو فريق عنده الصلاحية كان يقدر يوافق على فرصة هو
--    نفسه بحثها مباشرة عن طريق UPDATE، بالف على COI check اللي جوّه
--    review_opportunity() (migration 0019) بالكامل.
--
-- migration 0023 سحبت GRANT الـ INSERT/UPDATE/DELETE من authenticated على
-- opportunities، فالـ policies دي بقت غير قابلة للوصول فعليًا (مفيش GRANT
-- = مفيش تنفيذ للأمر أصلًا، الـ policy مبتتقيّمش). الملف ده بيسقطهم صراحة
-- عشان أي GRANT مستقبلي (حتى لو بنية حسنة) ميرجّعش الثغرة دي تلقائيًا من
-- غير حد يلاحظ. كل الكتابة الشرعية على opportunities دلوقتي عن طريق
-- الدوال بس (propose_opportunity/advance_opportunity_stage/review_opportunity
-- — migration 0019)، فمفيش داعي لأي INSERT/UPDATE/ALL policy مباشرة خالص.

begin;

drop policy if exists "opportunities researcher insert" on public.opportunities;
drop policy if exists "opportunities admin all" on public.opportunities;

commit;

-- ملحوظة تشغيل: begin/commit واحد، drop policy if exists آمن يتكرر. مفيش
-- لمس لأي policy SELECT (opportunities public read / researcher read /
-- opportunities_select_published / opportunities_select_reviewer) — دول
-- كلهم قراءة بس، سليمين.
