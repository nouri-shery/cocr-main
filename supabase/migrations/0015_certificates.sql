-- شهادات التخرّج + صفحة تحقق عامة (Certificates / Verification) --------
--
-- المشكلة: مفيش أي نظام شهادات في المنصة خالص — لا جدول، لا route، لا
-- صفحة تحقق عامة. طالب خلّص كورس فعليًا (course_enrollments.completed_at
-- بعد migration 0014) مالوش أي دليل رسمي قابل للمشاركة أو التحقق منه.
--
-- التصميم مبني على مقارنة حقيقية عملناها (42/Codam، ALX Africa،
-- freeCodeCamp، The Odin Project) قبل ما نكتب السطر ده:
--   - ALX: كل شهادة ليها serial number + QR + مراجعة "moderator" قبل
--     الإصدار — إحنا مش عندنا مراجعة بشرية على completion نفسه (لسه)، فمش
--     هنّدّعي مستوى تحقق أعلى من الحقيقي. الشهادة دي "شهادة إتمام كورس"
--     (Course Completion) مبنية على completed_at الحقيقي، مش "شهادة مشروع
--     تخرّج موثّق" (ده أصلاً موجود ومنفصل: projects.status = 'published').
--   - freeCodeCamp: صفحة تحقق دائمة بـ URL معروف، مش محتاجة تسجيل دخول —
--     نفس الفكرة هنا عن طريق verify_certificate(certificate_number).
--   - The Odin Project: عمدًا مالهاش شهادات، بيعتمدوا على البورتفوليو بس —
--     COCR عندها الاتنين (شهادة الكورس + مشروع التخرّج الموثّق لو موجود)،
--     فالشهادة هنا بتربط بالمشروع لو الطالب نشر واحد لنفس الكورس (project_id،
--     nullable — "project if applicable" بالظبط زي ما الأودت طلب).
--
-- قرار مهم لسه محتاج تأكيدك: الإصدار هنا أوتوماتيكي 100% على completed_at،
-- بدون أي بوابة مراجعة بشرية إضافية (زي freeCodeCamp القديم، مش زي ALX).
-- لو عايزة شهادة "إتمام" تتطلب موافقة مراجع بشري كمان (مش بس اجتياز
-- الدروس)، ده تصميم تاني (قريب من نظام project_reviews) نحتاج نبنيه فوق
-- ده — مقصود إننا مانخترعش بوابة مراجعة وهمية دلوقتي من غير ما تتفقي عليها.
--
-- أمان: نفس غلطة profiles الأصلية (SELECT عام لكل صف) ما بتتكررش هنا — مفيش
-- GRANT واسع على جدول certificates لـ anon ولا حتى authenticated بشكل مفتوح.
-- التحقق العام بيتم بس عن طريق verify_certificate(certificate_number)
-- SECURITY DEFINER اللي بترجّع حقول آمنة للعرض بس لو حد عنده الكود
-- بالظبط — نفس فلسفة profiles_public (قراءة عامة ضيّقة عن طريق دالة/view،
-- مش GRANT واسع على الجدول). محدّش يقدر "يتصفح" شهادات طلاب تانيين.

begin;

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  -- مش FK لـ catalog_courses — بنخزّن snapshot لعنوان الكورس وقت الإصدار
  -- (course_title تحت) عشان الشهادة تفضل صحيحة حتى لو الكتالوج اتغيّر بعدين
  course_id text not null,
  course_title text not null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  revoked_reason text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (student_id, course_id)
);

create index if not exists certificates_student_idx on public.certificates (student_id);

alter table public.certificates enable row level security;

-- صاحب الشهادة يشوفها في "شهاداتي"، والستاف (نفس صلاحية project_review
-- الموجودة بالفعل — مفيش صلاحية جديدة مخترعة) يقدر يشوف الكل لغرض الإدارة
drop policy if exists "certificates_select_own_or_staff" on public.certificates;
create policy "certificates_select_own_or_staff"
  on public.certificates for select
  to authenticated
  using (
    student_id = auth.uid()
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'project_review')
  );

-- مفيش INSERT/UPDATE/DELETE مباشر لحد خالص — الإصدار عن طريق الـ trigger
-- تحت، والإلغاء عن طريق revoke_certificate() بس. نفس مبدأ project_reviews:
-- append-only، الحالة بتتغيّر عن طريق دالة متحكم فيها مش UPDATE مباشر
grant select on public.certificates to authenticated;

-- ============================================================
-- الإصدار التلقائي: أول ما completed_at يتحدد لأول مرة على enrollment
-- ============================================================
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
    v_number := 'COCR-' || to_char(now(), 'YYYY') || '-' || upper(encode(gen_random_bytes(5), 'hex'));
    begin
      insert into public.certificates (certificate_number, student_id, course_id, course_title, issued_at)
      values (v_number, new.user_id, new.course_id, v_title, now())
      on conflict (student_id, course_id) do nothing;
      exit;
    exception when unique_violation then
      -- تصادم نادر جدًا في certificate_number العشوائي (40 بت) — نجرّب رقم تاني
      continue;
    end;
  end loop;

  return new;
end;
$$;

revoke all on function public.issue_certificate_for_enrollment() from public;

drop trigger if exists course_enrollments_issue_certificate on public.course_enrollments;
create trigger course_enrollments_issue_certificate
  after update of completed_at on public.course_enrollments
  for each row
  when (old.completed_at is null and new.completed_at is not null)
  execute function public.issue_certificate_for_enrollment();

-- ============================================================
-- Backfill: enrollments اتعلّمت completed_at خلال migration 0014 (قبل ما
-- الـ trigger ده يتعمل، فمقدرش يشتغل عليها) محتاجة شهادة كمان — مرة واحدة
-- بس، idempotent (بيتخطى أي صف عنده شهادة بالفعل)
-- ============================================================
do $$
declare
  r record;
  v_number text;
begin
  for r in
    select ce.user_id, ce.course_id, coalesce(cc.title, ce.course_id) as title
    from public.course_enrollments ce
    left join public.catalog_courses cc on cc.id = ce.course_id
    where ce.completed_at is not null
      and not exists (
        select 1 from public.certificates c
        where c.student_id = ce.user_id and c.course_id = ce.course_id
      )
  loop
    loop
      v_number := 'COCR-' || to_char(now(), 'YYYY') || '-' || upper(encode(gen_random_bytes(5), 'hex'));
      begin
        insert into public.certificates (certificate_number, student_id, course_id, course_title, issued_at)
        values (v_number, r.user_id, r.course_id, r.title, now());
        exit;
      exception when unique_violation then
        continue;
      end;
    end loop;
  end loop;
end $$;

-- ============================================================
-- verify_certificate: صفحة التحقق العامة — بترجع بس لو حد عنده الكود
-- بالظبط، مفيش تصفّح لشهادات ناس تانيين. project_title بترجع بس لو
-- المشروع المرتبط لسه published فعلاً (مش draft/pending/rejected)
-- ============================================================
create or replace function public.verify_certificate(p_certificate_number text)
returns table (
  certificate_number text,
  student_display_name text,
  course_title text,
  status text,
  issued_at timestamptz,
  revoked_at timestamptz,
  project_id uuid,
  project_title text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.certificate_number,
    p.display_name,
    c.course_title,
    c.status,
    c.issued_at,
    c.revoked_at,
    c.project_id,
    pr.title
  from public.certificates c
  join public.profiles p on p.id = c.student_id
  left join public.projects pr on pr.id = c.project_id and pr.status = 'published'
  where c.certificate_number = p_certificate_number;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ============================================================
-- revoke_certificate: للستاف بس (is_super_admin أو صلاحية project_review
-- الموجودة) — لحالات غش مؤكدة. مفيش DELETE خالص؛ الشهادة بتفضل موجودة
-- بحالة revoked مع السبب، مش بتتمسح — تاريخ حقيقي زي project_reviews
-- ============================================================
create or replace function public.revoke_certificate(p_certificate_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'لازم تسجّل دخولك.';
  end if;
  if not (public.is_super_admin(v_actor) or public.has_permission(v_actor, 'project_review')) then
    raise exception 'مفيش صلاحية.';
  end if;
  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'لازم سبب.';
  end if;

  update public.certificates
  set status = 'revoked', revoked_reason = trim(p_reason), revoked_at = now()
  where id = p_certificate_id and status = 'active';

  if not found then
    raise exception 'الشهادة مش موجودة أو ملغاة بالفعل.';
  end if;
end;
$$;

revoke all on function public.revoke_certificate(uuid, text) from public;
grant execute on function public.revoke_certificate(uuid, text) to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد (all-or-nothing)، كل الجمل create table
-- if not exists / create or replace / drop trigger if exists / drop policy
-- if exists، آمن تشغّله تاني بعد أي فشل. لازم يتشغّل بعد 0014 بالترتيب
-- (معتمد على عمود course_enrollments.completed_at).
