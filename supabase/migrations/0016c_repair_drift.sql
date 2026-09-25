-- Repair: حاجات لازم تكون في الداتابيز بس مش موجودة (drift مؤكّد) --------
--
-- (1) saved_items + policy moderation_log الأوسع (من 0006 — ما اتطبّقتش على
--     الحية: الجدول مش موجود رغم إن saved_actions.ts بيكتب فيه). جزء profiles
--     من 0006 اتساب عمدًا: 0011 (متطبّقة) بتغطّيه.
-- (2) issue_certificate_for_enrollment: الدالة الحية بتنادي gen_random_bytes
--     بـ search_path ثابت = public, pg_temp، و pgcrypto على Supabase عادةً في
--     schema "extensions" — فالنداء يفشل، وتجربة على نسخة محلية بنفس الترتيب
--     أكّدت: آخر درس يخلّصه أي طالب → الـ trigger يفشل → INSERT تقدّم الدرس
--     نفسه يترجع. (backfill 0015 اشتغل لأنه اتنفّذ من SQL Editor بـ
--     search_path كامل.) الإصلاح: رقم الشهادة من gen_random_uuid() (core).

begin;

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
create policy "saved_items_select_own" on public.saved_items for select to authenticated using (auth.uid() = user_id);
drop policy if exists "saved_items_insert_own" on public.saved_items;
create policy "saved_items_insert_own" on public.saved_items for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "saved_items_delete_own" on public.saved_items;
create policy "saved_items_delete_own" on public.saved_items for delete to authenticated using (auth.uid() = user_id);

revoke all on public.saved_items from anon, authenticated;
grant select, insert, delete on public.saved_items to authenticated;

drop policy if exists "moderation_log_select_staff_only" on public.moderation_log;
create policy "moderation_log_select_staff_only"
  on public.moderation_log for select
  to authenticated
  using (
    public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'mentor_application_review')
    or public.has_permission(auth.uid(), 'safety_report_access')
  );

create or replace function public.issue_certificate_for_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_number text;
begin
  select title into v_title from public.catalog_courses where id = new.course_id;
  if v_title is null then
    v_title := new.course_id;
  end if;

  loop
    v_number := 'COCR-' || to_char(now(), 'YYYY') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.certificates (certificate_number, student_id, course_id, course_title, issued_at)
      values (v_number, new.user_id, new.course_id, v_title, now())
      on conflict (student_id, course_id) do nothing;
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;

  return new;
end;
$$;

revoke all on function public.issue_certificate_for_enrollment() from public, anon, authenticated;

commit;
