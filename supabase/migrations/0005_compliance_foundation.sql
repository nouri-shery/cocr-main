-- Milestone 5.1 — أساس الامتثال وحماية الطفل: تصحيح تسريب profiles، صفحات
-- سياسات (هيكل بس، من غير نص قانوني)، تتبّع موافقة بالنسخة، طلب حذف حساب،
-- سجل مراجعة (moderation log)، وتعليق حساب المينتور.
--
-- ده جاهزية تقنية، مش شهادة قانونية — مفيش هنا أي نص سياسة فعلي (privacy/
-- terms/safety) لأن ده محتاج مراجعة محامي حقيقي، مش يتكتب بالكود. كل صفوف
-- policy_documents بتتزرع status='draft' ومحتوى فاضي، والصفحة بتوريه واضح
-- إنه "قيد المراجعة القانونية".
--
-- مفيش أي لمس لـ guardian_approvals/profile_sensitive الحقيقيين، ومفيش أي
-- لمس لقيد creator_not_reviewer على courses، ومفيش إعادة منح DELETE على
-- profiles (ده كان تصحيح أمان مقصود في Milestone 2 وفاضل زي ما هو).
--
-- تصحيح مهم بعد فحص أمان نهائي: كل مكان هنا كان بيتحقق من عمود profiles.
-- is_staff (مخترع، مستقل) بقى يتحقق من نظام الصلاحيات الحقيقي الموجود
-- بالفعل في الداتابيز (has_permission()/is_super_admin()، مبني على
-- admin_permissions/permissions/has_role) — بدل ما نبني نظام تاني متوازي.
-- وبند mentor_applications_status_check/reports_target_type_check اتشال
-- خالص من هنا: mentor_applications.status نوعه ENUM حقيقي مش CHECK
-- (suspended بقت مضافة في 0004 بـ ALTER TYPE)، و reports.target_type أصلاً
-- مفيهوش أي CHECK constraint في الجدول الحقيقي، فالتحقق من opportunity
-- بيتم في الكود (union type في TypeScript) بدل ما نضيف قيد DB جديد على
-- جدول ممكن يكون فيه صفوف حقيقية موجودة قبل كده مانعرفش عنها.

begin;

-- ============================================================
-- تصحيح تسريب profiles: authenticated كان بياخد SELECT على الصف كله لأي
-- مستخدم تاني (RLS كانت using(true))، مش بس id+display_name زي anon.
-- أي طالب مسجّل دخول كان يقدر يقرا account_status/interests/goal/country/
-- governorate بتاع أي طالب تاني بطلب مباشر للـ API.
--
-- الحل الصح هنا: RLS في Postgres بتتحكم في الصفوف مش الأعمدة، فمينفعش نعمل
-- "صفي أنا كامل، صف غيري id+display_name بس" بسياسة واحدة على نفس الجدول.
-- الحل: نضيّق RLS نفسها لـ "صفك انت بس" (باقي كل الأعمدة زي ما هي)، ونعمل
-- view منفصل ضيّق (id+display_name بس) للاستخدامات اللي محتاجة تعرض اسم
-- مستخدم تاني (صاحب مشروع، مينتور، إلخ) — بدل ما نعتمد على embed تلقائي
-- عن طريق foreign key اللي مش مضمون يشتغل صح مع view من غير اختبار حي.
-- ============================================================
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_own_full" on public.profiles;
create policy "profiles_select_own_full"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- view عام وضيّق بس (id + display_name) — ده اللي أي كود محتاج يعرض اسم
-- مستخدم تاني (مش نفسه) لازم يستخدمه، بدل الجدول الأصلي
create or replace view public.profiles_public as
  select id, display_name from public.profiles;

grant select on public.profiles_public to anon, authenticated;

-- ============================================================
-- policy_documents — هيكل الصفحات القانونية بس، من غير نص فعلي
-- ============================================================
create table if not exists public.policy_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 1 and 80),
  title text not null check (char_length(title) between 1 and 200),
  version integer not null default 1 check (version >= 1),
  content text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.policy_documents enable row level security;

-- الصفحة نفسها لازم تبقى ظاهرة للكل حتى وهي draft (عشان توري بانر "قيد
-- المراجعة" بصراحة بدل ما تختفي) — status هنا علامة نضج محتوى مش تحكّم دخول
drop policy if exists "policy_documents_select_published_or_staff" on public.policy_documents;
drop policy if exists "policy_documents_select_all" on public.policy_documents;
create policy "policy_documents_select_all"
  on public.policy_documents for select
  using (true);

drop policy if exists "policy_documents_write_staff_only" on public.policy_documents;
create policy "policy_documents_write_staff_only"
  on public.policy_documents for all
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

grant select on public.policy_documents to anon, authenticated;
grant insert, update, delete on public.policy_documents to authenticated;

-- الـ ١٣ صفحة من طلب المستخدمة — draft فاضية، الصفحة نفسها هتوريها بوضوح
-- "قيد المراجعة القانونية" لحد ما نص حقيقي يتحط بعد مراجعة محامي
insert into public.policy_documents (slug, title, status)
values
  ('privacy-policy', 'سياسة الخصوصية', 'draft'),
  ('terms-of-use', 'شروط الاستخدام', 'draft'),
  ('community-guidelines', 'قواعد المجتمع', 'draft'),
  ('child-teen-safety-policy', 'سياسة أمان الأطفال والمراهقين', 'draft'),
  ('mentor-code-of-conduct', 'ميثاق سلوك المينتور', 'draft'),
  ('mentor-student-interaction-policy', 'سياسة التفاعل بين المينتور والطالب', 'draft'),
  ('reporting-moderation-policy', 'سياسة الإبلاغ والمراجعة', 'draft'),
  ('project-content-policy', 'سياسة المشاريع والمحتوى', 'draft'),
  ('zoom-live-session-safety', 'قواعد أمان جلسات Zoom المباشرة', 'draft'),
  ('account-suspension-appeals', 'تعليق الحساب والتظلّم', 'draft'),
  ('data-retention-deletion', 'الاحتفاظ بالبيانات وحذفها', 'draft'),
  ('cookie-analytics-policy', 'سياسة الكوكيز والتحليلات', 'draft'),
  ('safety-contact', 'التواصل بخصوص الأمان', 'draft')
on conflict (slug) do nothing;

-- ============================================================
-- policy_acceptances — دليل حقيقي: مين وافق على أنهي نسخة وإمتى
-- ============================================================
create table if not exists public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  policy_slug text not null,
  policy_version integer not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists policy_acceptances_user_idx on public.policy_acceptances (user_id);

alter table public.policy_acceptances enable row level security;

drop policy if exists "policy_acceptances_select_own_or_staff" on public.policy_acceptances;
create policy "policy_acceptances_select_own_or_staff"
  on public.policy_acceptances for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_super_admin(auth.uid())
  );

drop policy if exists "policy_acceptances_insert_own" on public.policy_acceptances;
create policy "policy_acceptances_insert_own"
  on public.policy_acceptances for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.policy_acceptances to authenticated;

-- ============================================================
-- account_deletion_requests — طلب حذف بدل DELETE مباشر (DELETE فاضل ممنوع
-- على profiles زي ما كان من Milestone 2، ده تصحيح أمان مقصود ومتلموسش)
-- ============================================================
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text check (char_length(reason) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists account_deletion_requests_status_idx on public.account_deletion_requests (status);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "deletion_requests_select_own_or_staff" on public.account_deletion_requests;
create policy "deletion_requests_select_own_or_staff"
  on public.account_deletion_requests for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_super_admin(auth.uid())
  );

drop policy if exists "deletion_requests_insert_own" on public.account_deletion_requests;
create policy "deletion_requests_insert_own"
  on public.account_deletion_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "deletion_requests_update_staff_only" on public.account_deletion_requests;
create policy "deletion_requests_update_staff_only"
  on public.account_deletion_requests for update
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

grant select, insert, update on public.account_deletion_requests to authenticated;

-- ============================================================
-- moderation_log — مين عمل إيه وإمتى ولية، لكل حاجة الأدمن بيعملها
-- ============================================================
create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (char_length(action) between 1 and 80),
  target_type text not null check (char_length(target_type) between 1 and 40),
  target_id text not null,
  reason text check (char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists moderation_log_created_idx on public.moderation_log (created_at desc);

alter table public.moderation_log enable row level security;

drop policy if exists "moderation_log_select_staff_only" on public.moderation_log;
create policy "moderation_log_select_staff_only"
  on public.moderation_log for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

drop policy if exists "moderation_log_insert_staff_only" on public.moderation_log;
create policy "moderation_log_insert_staff_only"
  on public.moderation_log for insert
  to authenticated
  with check (
    auth.uid() = actor_id
    and public.is_super_admin(auth.uid())
  );

grant select, insert on public.moderation_log to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد، كل الجمل idempotent وآمنة تتشغّل تاني.
-- الـ INSERT الوحيد هنا هو زرع الـ ١٣ صف الفاضية في policy_documents
-- (on conflict do nothing) — مفيش أي لمس لبيانات مستخدمين حقيقية. suspended
-- و opportunity اتضافوا فعليًا في 0004 (ALTER TYPE) وفي كود التطبيق على
-- الترتيب، مش هنا.
