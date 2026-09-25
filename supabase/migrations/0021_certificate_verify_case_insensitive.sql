-- verify_certificate: بحث case-insensitive -----------------------------
--
-- رقم الشهادة بيتولّد دايمًا بحروف كبيرة (COCR-2026-A1B2C3D4E5)، بس طالب
-- بيكتبه يدوي من شهادة مطبوعة/PDF ممكن يكتبه بحروف صغيرة من غير ما يقصد.
-- المطابقة كانت exact-match بس، فكان بيرجّع "مفيش شهادة بالرقم ده" غلط.
-- migration منفصلة (مش تعديل في 0015 نفسها) لأنها لو كانت اتطبّقت بالفعل،
-- تعديل الملف الأصلي مش هيغيّر حاجة في الداتابيز الحية — لازم CREATE OR
-- REPLACE جديد صريح.

begin;

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
  where upper(trim(c.certificate_number)) = upper(trim(p_certificate_number));
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد. CREATE OR REPLACE بس، مفيش تغيير في
-- الجدول أو الصلاحيات. آمن تتشغّل حتى لو 0015 لسه معملهاش.
