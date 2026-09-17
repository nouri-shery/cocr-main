-- Milestone 6 — ربط الأونبوردينج والعناصر المحفوظة بالحساب الحقيقي (مش
-- localStorage)، وفتح باب mentor_ratings (موجود من 0004 بدون أي واجهة)،
-- وتصحيح صلاحية قراءة moderation_log.
--
-- ملحوظة مهمة: profiles.interests/goal/grade_or_education_stage أعمدة
-- حقيقية موجودة بالفعل من قبل (نفس الأعمدة اللي 0001/0005 حذّروا من تسريبها)
-- — اتأكدنا من شكلها الحي (interests: text[] فاضي، goal/grade_or_education_stage:
-- text فاضيين) قبل ما نكتب فيها. الملف ده مبيعملش create column جديد ليهم،
-- بس بيوسّع الـ GRANT UPDATE المقصور حاليًا على bio/skills بس.

begin;

-- ============================================================
-- توسيع GRANT UPDATE على profiles عشان الطالب يقدر يحفظ بيانات الأونبوردينج
-- (مرحلته الدراسية، اهتماماته، هدفه) على حسابه فعليًا — بدل localStorage اللي
-- بيتمسح مع أي جهاز/متصفح جديد ومش شايفه الفريق ولا المينتور خالص. باقي
-- الأعمدة الحساسة (account_status, country, governorate, language,
-- weekly_available_time) فاضلين برّه الـ GRANT عمدًا — مفيش أي مسار في
-- الكود لازم يكتب فيهم، والتضييق ده تصحيح أمان مقصود من 0001 مش هيتلمس.
-- ============================================================
revoke update on public.profiles from authenticated;
grant update (bio, skills, updated_at, interests, goal, grade_or_education_stage) on public.profiles to authenticated;

-- ============================================================
-- saved_items — بديل حقيقي لـ localStorage["cocr-saved-opportunities"].
--
-- ملحوظة معمارية مهمة (اتفحصت قبل ما الجدول ده يتعمل، مش افتراض): فيه
-- جدول public.favorites حقيقي وموجود بالفعل (id, student_id, opportunity_id
-- uuid not null, created_at) — بس opportunity_id بتاعه FK حقيقي على جدول
-- opportunities حقيقي في الداتابيز، والتطبيق الحالي أصلاً مابيستخدمش الجدول
-- ده خالص — الفرص المعروضة في /opportunities كلها بيانات ثابتة (static)
-- في الكود بـ ids نصيّة (زي "uwc-scholarship")، مش uuid. يعني favorites
-- اتبنى لنظام فرص حقيقي (DB-backed) لسه المنتج مارجعش يستخدمه، فمينفعش
-- نكتب فيه الـ ids الثابتة الحالية أصلاً (type mismatch uuid).
--
-- القرار هنا: saved_items منفصل عن favorites بقصد، مش تكرار عشوائي —
-- بيغطّي اللي المنتج فعليًا شغّال بيه دلوقتي (ids ثابتة للفرص + uuid حقيقي
-- للمشاريع، عمود item_id نصّي واحد للاتنين). لما الفرص تتحوّل لجدول حقيقي
-- (خطوة P1/P2 منفصلة)، الوقتها القرار الصح هيبقى نرجّع نستخدم favorites
-- الحقيقي ونشيل saved_items بدل ما نسيب جدولين متوازيين للأبد — ده مسجّل
-- كـ tech debt واضح، مش حل نهائي.
-- ============================================================
create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('opportunity', 'project')),
  item_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create index if not exists saved_items_user_idx on public.saved_items (user_id);

alter table public.saved_items enable row level security;

drop policy if exists "saved_items_select_own" on public.saved_items;
create policy "saved_items_select_own"
  on public.saved_items for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saved_items_insert_own" on public.saved_items;
create policy "saved_items_insert_own"
  on public.saved_items for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "saved_items_delete_own" on public.saved_items;
create policy "saved_items_delete_own"
  on public.saved_items for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.saved_items to authenticated;

-- ============================================================
-- moderation_log: تصحيح صلاحية قراءة زيادة عن اللزوم — كانت مقصورة على
-- is_super_admin() بس، رغم إن حاملين صلاحية mentor_application_review أو
-- safety_report_access بيقدروا يعملوا الأكشنز اللي بتتسجّل في اللوج ده
-- أصلاً. النتيجة: staff عنده صلاحية محدودة كان يقدر يوافق/يرفض طلب أو
-- يحل بلاغ، لكن مايقدرش يشوف لوج الأكشن اللي هو نفسه عمله. ده تضييق
-- زيادة عن قصد التصميم الأصلي، مش تسريب — بنصلّحه هنا بس.
-- ============================================================
drop policy if exists "moderation_log_select_staff_only" on public.moderation_log;
create policy "moderation_log_select_staff_only"
  on public.moderation_log for select
  to authenticated
  using (
    public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'mentor_application_review')
    or public.has_permission(auth.uid(), 'safety_report_access')
  );

commit;

-- ملحوظة تشغيل: begin/commit واحد، كل الجمل idempotent. الـ GRANT UPDATE
-- بيتعمله revoke+grant (نفس نمط 0001) عشان يبقى القائمة النهائية للأعمدة
-- المسموحة واضحة ومش تراكمية. مفيش أي INSERT/UPDATE على بيانات مستخدمين
-- حقيقية في الملف ده.
