-- Course completion كـ state متخزّن، مش محسوب live -----------------------
--
-- المشكلة: courseCompleted (اللي بيفتح تسليم مشروع التخرّج في
-- app/server/coursesserver.tsx) كان بيتحسب كل مرة من
-- progress.completed === progress.total وقت الطلب بس — مفيش أي سجل في
-- الداتابيز بيقول "الطالب ده خلّص الكورس ده فعلاً". النتيجة: (1) لو حد
-- Admin غيّر دروس الكورس بعدين (ضاف/شال درس منشور)، إكمال قديم حقيقي ممكن
-- يختفي أو يظهر غلط، (2) مفيش أساس تخزين نقدر نبني عليه شهادات/إنجازات/
-- مستويات لاحقًا زي ما الأودت طلب.
--
-- الحل: عمود completed_at على course_enrollments، بيتحدد مرة واحدة بس (مش
-- بيترجع فاضي تاني لو اتحدد) عن طريق trigger بعد أي insert على
-- catalog_lesson_progress — نفس فلسفة project_reviews بالظبط: السيرفر هو
-- اللي بيقرر الحالة النهائية، مش الفرونت إند ولا حتى الـ action نفسها.
--
-- قرار تصميم مهم (موثّق هنا عشان يبقى واضح، مش مخفي): لو الكورس اتغيّر
-- بعد ما الطالب خلّصه (اتضاف درس جديد منشور، أو اتشال درس كان already
-- منشور)، completed_at القديم ميتلغيش ومبيتحسبش تاني. الإكمال حاجة حصلت
-- فعلاً في وقتها ومش المفروض تتلغي بأثر رجعي بسبب تعديل في الكتالوج بعد
-- كده — نفس المبدأ اللي freeCodeCamp بيتبعه مع الشهادات القديمة (بتفضل
-- موجودة ومعلّمة، مش بتتشال لو النظام اتغيّر).
--
-- تصحيح اتساق مهم (جزء لا يتجزأ من الشغل ده، مش تحسين جانبي): getCourseProgress
-- في lessons_actions.ts كان بيعد completed من كل صفوف catalog_lesson_progress
-- للطالب في الكورس، من غير ما يتأكد إن الدرس المرتبط لسه published = true —
-- بعكس getMyProgressForCourses اللي فعلاً بيفلتر على published (وتعليقها
-- بيدّعي التطابق مع getCourseProgress، وده مش صحيح). الفرق ده كان ممكن
-- يخلي completed > total لو حد Admin عمل unpublish لدرس اتخلّص قبل كده.
-- الـ trigger هنا بيستخدم نفس تعريف getMyProgressForCourses (published
-- lessons بس) عشان الحالة المتخزّنة تبقى متسقة مع الرقم المعروض فعليًا،
-- وهنصلّح getCourseProgress في نفس الـ commit ده في الكود (lessons_actions.ts).

begin;

alter table public.course_enrollments
  add column if not exists completed_at timestamptz;

-- ============================================================
-- trigger: بعد ما الطالب يعلّم درس كمكتمل، نتأكد هل ده خلّص كل الدروس
-- المنشورة في الكورس ولا لأ، ولو خلّص نسجّل completed_at.
--
-- SECURITY DEFINER ضروري هنا: authenticated عنده INSERT بس على
-- catalog_lesson_progress (migration 0002) ومفيش أي UPDATE على
-- course_enrollments (migration 0001) — وده مقصود، عشان محدش يقدر يزوّر
-- completed_at بنفسه مباشرة عن طريق طلب API. الـ trigger ده هو الطريقة
-- الوحيدة اللي completed_at بيتحدد بيها.
-- ============================================================
create or replace function public.catalog_lesson_progress_mark_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total integer;
  v_completed integer;
begin
  select count(*) into v_total
  from public.catalog_lessons
  where course_id = new.course_id and published = true;

  select count(*) into v_completed
  from public.catalog_lesson_progress clp
  join public.catalog_lessons cl
    on cl.id = clp.lesson_id and cl.published = true
  where clp.user_id = new.user_id and clp.course_id = new.course_id;

  if v_total > 0 and v_completed >= v_total then
    update public.course_enrollments
    set completed_at = coalesce(completed_at, now())
    where user_id = new.user_id and course_id = new.course_id;
  end if;

  return new;
end;
$$;

revoke all on function public.catalog_lesson_progress_mark_completion() from public;

drop trigger if exists catalog_lesson_progress_after_insert_completion on public.catalog_lesson_progress;
create trigger catalog_lesson_progress_after_insert_completion
  after insert on public.catalog_lesson_progress
  for each row
  execute function public.catalog_lesson_progress_mark_completion();

-- ============================================================
-- Backfill: أي enrollment مكتمل فعلاً دلوقتي (كل الدروس المنشورة الحالية
-- في كورسه خلّصها) ياخد completed_at = now() مرة واحدة. مش هنخترع تاريخ
-- إكمال قديم مش متسجّل عندنا فعليًا — now() هو أصدق حاجة نقدر نسجّلها،
-- وده أفضل من سيرة completed_at فاضية لطالب خلّص كل حاجة فعلاً.
-- ============================================================
update public.course_enrollments ce
set completed_at = now()
where ce.completed_at is null
  and exists (
    select 1 from public.catalog_lessons cl
    where cl.course_id = ce.course_id and cl.published = true
  )
  and not exists (
    select 1 from public.catalog_lessons cl
    where cl.course_id = ce.course_id and cl.published = true
      and not exists (
        select 1 from public.catalog_lesson_progress clp
        where clp.user_id = ce.user_id and clp.lesson_id = cl.id
      )
  );

commit;

-- ملحوظة تشغيل: begin/commit واحد (all-or-nothing)، كل الجمل
-- add column if not exists / create or replace / drop trigger if exists،
-- آمن تشغّله تاني بعد أي فشل. مفيش لمس لأي عمود أو جدول تاني.
