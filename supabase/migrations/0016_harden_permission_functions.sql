-- تحصين has_permission()/is_super_admin() — نتيجة الأودت الأمني (Day 1) ---
--
-- اتأكّدنا (سحبنا التعريف الحقيقي من الداتابيز الحية) إن الدالتين دول —
-- اللي كل نظام الصلاحيات (admin/mentor review/project review/certificates)
-- مبني عليهم بالكامل — بيقروا من جداول بأسماء غير مؤهّلة بالكامل
-- (admin_permissions مش public.admin_permissions). ده مبدئيًا بيفتح باب
-- "search_path hijacking عن طريق temp table" المعروف في Postgres (توثيق
-- Postgres الرسمي بينصح صراحة بتأهيل كل اسم جدول جوّه أي SECURITY DEFINER
-- function). عمليًا الثغرة دي مش قابلة للاستغلال من خلال التطبيق الحالي
-- (Supabase REST/RPC مش بيسمح بتنفيذ SQL خام زي CREATE TEMP TABLE)، لكن
-- التحصين ده defense-in-depth حقيقي مش رفاهية — الدالتين دول حرفيًا بوابة
-- كل الصلاحيات في المنصة.
--
-- كمان بنقفل EXECUTE بشكل صريح على authenticated بس (بدل الافتراضي في
-- Postgres اللي بيمنح EXECUTE لأي حد/PUBLIC على أي دالة جديدة تلقائيًا) —
-- بغض النظر عن حالتهم الحالية في الداتابيز، عشان نضمن الحالة النهائية
-- الصح مهما كانت البداية.
--
-- ملحوظة: has_role() نفسها (اللي is_super_admin بتنادي عليها) لسه محتاجة
-- مراجعة منفصلة — مش هنعمل لها CREATE OR REPLACE من غير ما نشوف تعريفها
-- الحالي كامل الأول، عشان منغيّرش منطق مش عارفينه. لو نوع role_name مش في
-- سكيمة public بالظبط، الملف ده هيفشل بأمان (begin/commit واحد، rollback
-- تلقائي) ومحتاج تصحيح اسم السكيمة.

begin;

create or replace function public.has_permission(uid uuid, target_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_permissions ap
    join public.permissions p on p.id = ap.permission_id
    where ap.user_id = uid and p.name = target_permission
  );
$$;

revoke all on function public.has_permission(uuid, text) from public;
grant execute on function public.has_permission(uuid, text) to authenticated;

create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_role(uid, 'super_admin'::public.role_name);
$$;

revoke all on function public.is_super_admin(uuid) from public;
grant execute on function public.is_super_admin(uuid) to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد (all-or-nothing). لو role_name مش في
-- public، الملف كله هيتلغي تلقائي من غير أي تغيير جزئي — آمن تصححي
-- السكيمة وتجربي تاني.
