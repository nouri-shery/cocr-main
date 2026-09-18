-- Milestone 11 — عمود gender حقيقي على profiles (الطالب يختاره بنفسه في
-- الأونبوردينج، اختياري ومش مفروض)، وجدول course_proposals جديد عشان
-- المينتور يطلب يعمل كورس بدل ما يكون عنده INSERT مباشر على catalog_courses
-- (مفيش صلاحية INSERT عليه غير الأدمن/seed أصلًا).

begin;

-- ============================================================
-- profiles.gender — عمود جديد، اختياري، بيتملى من الطالب نفسه في
-- الأونبوردينج فقط (مفيش تخمين ولا قيمة افتراضية). بيتستخدم بس عشان نختار
-- شكل الأفاتار التوضيحي، مش بيانات حساسة بتتشارك مع حد.
-- ============================================================
alter table public.profiles add column if not exists gender text check (gender in ('male', 'female'));

revoke update on public.profiles from authenticated;
grant update (bio, skills, updated_at, interests, goal, grade_or_education_stage, gender) on public.profiles to authenticated;

-- ============================================================
-- course_proposals — طلب مينتور إنه يعمل كورس جديد. مش INSERT مباشر على
-- catalog_courses (مفيش صلاحية للمينتور عليه أصلًا، admin/seed بس)، ده طلب
-- staff يراجعه ويقرر. نفس صلاحية مراجعة طلبات الانضمام كمينتور
-- (mentor_application_review) بنستخدمها هنا كمان، بدل ما نخترع صلاحية جديدة
-- لحاجة قريبة مفهوميًا.
-- ============================================================
create table if not exists public.course_proposals (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  description text not null check (char_length(description) between 20 and 2000),
  track text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists course_proposals_mentor_idx on public.course_proposals (mentor_id);

alter table public.course_proposals enable row level security;

drop policy if exists "course_proposals_select_own_or_staff" on public.course_proposals;
create policy "course_proposals_select_own_or_staff"
  on public.course_proposals for select
  to authenticated
  using (
    auth.uid() = mentor_id
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'mentor_application_review')
  );

drop policy if exists "course_proposals_insert_own_approved_mentor" on public.course_proposals;
create policy "course_proposals_insert_own_approved_mentor"
  on public.course_proposals for insert
  to authenticated
  with check (
    auth.uid() = mentor_id
    and public.is_approved_mentor(track)
  );

drop policy if exists "course_proposals_update_staff_only" on public.course_proposals;
create policy "course_proposals_update_staff_only"
  on public.course_proposals for update
  to authenticated
  using (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'mentor_application_review'))
  with check (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'mentor_application_review'));

grant select, insert, update on public.course_proposals to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد، كل الجمل idempotent. مفيش أي تغيير على
-- بيانات مستخدمين حقيقية. is_approved_mentor(track) نفس الدالة الحقيقية
-- المستخدمة بالفعل في course_sessions (0004) — بتتأكد إن المينتور معتمد
-- فعليًا في نفس تراك الكورس اللي بيطلبه.
