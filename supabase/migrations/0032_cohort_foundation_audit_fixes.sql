-- تصحيحات من self-audit شامل على migrations 0025-0031 --------------------
--
-- 1) session_recordings.created_by وsession_attendance.recorded_by كانوا
--    NOT NULL مع ON DELETE SET NULL — تناقض حقيقي: حذف بروفايل المنتور
--    اللي رفع تسجيل أو سجّل حضور كان هيفشل بـ constraint violation (مستحيل
--    تتمسح NULL في عمود NOT NULL)، يعني حساب أي منتور علّم أي سيشن
--    مستحيل يتحذف للأبد. الإصلاح: العمودين بقوا nullable (نفس نمط
--    project_reviews.reviewer_id الموجود بالفعل — حذف حساب المراجع
--    مايمسحش السجل التاريخي، بس بيفضل الاسم فاضي).
--
-- 2) enrollments_insert_own_cohort (0025) كانت بتتحقق من عدد المقاعد
--    بـ count(*) < max_seats جوّه RLS عادية — مفيش قفل صف (row lock).
--    طالبين يضغطوا "انضمام" في نفس اللحظة على آخر مقعد ممكن الاتنين
--    يعدّوا الفحص قبل ما أي حد منهم يـ commit، فالدفعة تتسجّل بعدد أكبر
--    من max_seats. مختلف عن quiz_attempts/session_attendance اللي عندهم
--    unique constraint بيحمي من نفس المشكلة — مفيش قيد فريد بيحمي عدد
--    المقاعد هنا. الإصلاح: enroll_in_cohort() SECURITY DEFINER بتعمل
--    SELECT ... FOR UPDATE على صف الدفعة الأول (نفس تقنية
--    submit_project_review بالظبط)، وبعدها بس تعدّ وتسجّل — atomic
--    فعليًا، مش مجرد فحص وأمل. الـ INSERT المباشر عن طريق RLS بقى مقصور
--    على المسار القديم (course_id) بس، الدفعات الجديدة (cohort_id) لازم
--    تعدّي على الدالة دي.

begin;

alter table public.session_recordings alter column created_by drop not null;
alter table public.session_attendance alter column recorded_by drop not null;

-- INSERT المباشر بقى للمسار القديم (course_id) بس — الدفعات الجديدة
-- لازم تعدّي على enroll_in_cohort() عشان تتجنّب الـ race condition
-- (0025 بقت بتعمل نفس الشغل ده — الجزء ده idempotent وبيفضل عشان الملف يفضل
-- صالح لو اتطبّق لوحده على نسخة اتطبّق عليها 0025 القديمة)
drop policy if exists "enrollments_insert_own" on public.course_enrollments;
drop policy if exists "enrollments_insert_own_cohort" on public.course_enrollments;
drop policy if exists "enrollments_insert_own_legacy_course" on public.course_enrollments;
create policy "enrollments_insert_own_legacy_course" on public.course_enrollments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and completed_at is null
    and status = 'active'
    and course_id is not null
    and cohort_id is null
  );

create or replace function public.enroll_in_cohort(p_cohort_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student uuid := auth.uid();
  v_status text;
  v_deadline timestamptz;
  v_max_seats int;
  v_current_count int;
  v_enrollment_id uuid;
begin
  if v_student is null then
    raise exception 'لازم تسجّلي دخولك.';
  end if;

  -- row lock حقيقي على صف الدفعة — أي محاولة تسجيل تانية لنفس الدفعة
  -- هتستنى هنا لحد ما المحاولة دي تخلص كاملة (commit/rollback)
  select status, enrollment_deadline, max_seats
  into v_status, v_deadline, v_max_seats
  from public.course_cohorts
  where id = p_cohort_id
  for update;

  if v_status is null then
    raise exception 'الدفعة دي مش موجودة.';
  end if;
  if v_status <> 'published' then
    raise exception 'التسجيل في الدفعة دي مقفول دلوقتي.';
  end if;
  if v_deadline is not null and v_deadline <= now() then
    raise exception 'معاد التسجيل في الدفعة دي فات.';
  end if;

  select count(*) into v_current_count
  from public.course_enrollments
  where cohort_id = p_cohort_id and status = 'active';

  if v_current_count >= v_max_seats then
    raise exception 'الدفعة دي كاملة العدد.';
  end if;

  insert into public.course_enrollments (user_id, cohort_id, status)
  values (v_student, p_cohort_id, 'active')
  returning id into v_enrollment_id;

  return v_enrollment_id;
end;
$$;

revoke all on function public.enroll_in_cohort(uuid) from public, anon;
grant execute on function public.enroll_in_cohort(uuid) to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد، كل حاجة idempotent. لازم يتشغّل بعد
-- 0025/0026 (معتمد على course_cohorts/session_recordings/session_attendance).
-- app layer محتاج يتحدّث كمان: أي كود بيعمل insert مباشر على
-- course_enrollments بـcohort_id لازم يتحوّل لاستدعاء enroll_in_cohort()
-- بدله — ده أول حاجة هتتعمل لما نبني صفحة انضمام الطالب للدفعة.
