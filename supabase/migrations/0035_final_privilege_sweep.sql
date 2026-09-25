-- Final privilege sweep — آخر خطوة، بعد كل الجداول والـ functions ---------
--
-- السبب الجذري لمجموعة كبيرة من المشاكل اللي اتكشفت (اتأكّد من
-- L_default_acl في الأودت الحي): Supabase بيدّي anon و authenticated (وservice_role)
-- كل الصلاحيات تلقائيًا على أي جدول/view/function جديد في schema public، من
-- غير أي GRANT. يعني:
--   - أي view أحادي الجدول بيتعمل بيبقى قابل للكتابة من anon.
--   - "revoke all on function ... from public" مبتشيلش المنح المباشر لـ anon/
--     authenticated، فدوال "داخلية بس" كانت هتفضل قابلة للنداء من أي حد.
--   - TRUNCATE/REFERENCES/TRIGGER ممنوحين على كل الجداول (TRUNCATE مش
--     بيتفلتر بـ RLS، بس الـ Data API مبيعرّضوش، فده hygiene مش ثغرة).
-- الملفات الفردية بقت بتعمل revoke صريح، والملف ده بيقفل الباقي كله وبيمنع
-- تكرار المشكلة.
--
-- مفيش أي تغيير في أي داتا. كل الاختبارات اللي اتعملت على نسخة محلية بتاعة
-- الداتابيز الحية اتكرّرت بعد الملف ده.

begin;

-- ============================================================
-- 1) جداول/views: anon مبيكتبش خالص، authenticated بيفقد TRUNCATE/TRIGGER/
--    REFERENCES بس (الـ RLS بتفضل هي الحاكمة على INSERT/UPDATE/DELETE)
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm', 'p')
  loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', r.relname);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', r.relname);
  end loop;
end $$;

-- ============================================================
-- 2) functions
--    - anon: مفيش EXECUTE إلا لدوال الـ policies اللي بتتقيّم لـ anon (أدوار
--      public) ودالة التحقق العامة من الشهادة
--    - trigger functions + الدوال الداخلية: مفيش EXECUTE لحد من الـ API
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname, p.prorettype = 'trigger'::regtype as is_trigger
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    if r.is_trigger or r.proname in ('notify_user', 'award_achievement', 'evaluate_cohort_completion', 'assert_curriculum_editable') then
      execute format('revoke all on function %s from authenticated', r.sig);
    end if;
  end loop;
end $$;

-- دوال بتتنادى جوّه policies بتتقيّم لـ anon (roles = public) أو دالة عامة
grant execute on function public.has_permission(uuid, text) to anon, authenticated;
grant execute on function public.has_role(uuid, role_name) to anon, authenticated;
grant execute on function public.is_super_admin(uuid) to anon, authenticated;
grant execute on function public.is_assigned_mentor(uuid, uuid) to anon, authenticated;
grant execute on function public.is_approved_mentor(text) to anon, authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ============================================================
-- 3) default privileges — أي حاجة تتعمل بعد كده من SQL Editor
--    (الافتراضي الحالي بيدّي anon/authenticated كل حاجة)
-- ============================================================
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد، idempotent.
--
-- بعد الملف ده: أي function جديدة لازم يتعمل لها GRANT EXECUTE صريح
-- للدور المطلوب (authenticated لدالة RPC أو دالة بتتستخدم جوّه policy)،
-- وأي جدول/view عام للقراءة لازم GRANT SELECT صريح لـ anon. ده مقصود:
-- الافتراضي بقى "مفيش وصول" بدل "وصول كامل".
