-- course_submissions: نفس فئة ثغرة 0020، بس من ناحية UPDATE مش INSERT ----
--
-- course_submissions_insert_own_enrolled (اتصلحت في 0020) بتمنع إنشاء صف
-- graduation submission من غير إتمام الكورس فعليًا. بس course_submissions_update_own
-- (0004) بتتحقق بس إن auth.uid() = student_id — الـ GRANT UPDATE على
-- الجدول ده table-wide (مش column-restricted زي profiles/notifications)،
-- فـ RLS's WITH CHECK وحدها مش قادرة تمنع تغيير أي عمود تاني في نفس الصف.
--
-- يعني طالب كان يقدر ياخد صف تسليم درس عادي عنده بالفعل ويعمله UPDATE
-- يحوّله لـ is_graduation_project=true (أو يغيّر course_id/lesson_id)
-- من غير ما يمر على أي تحقق إتمام خالص — بيلف على فحص 0020 بالكامل من
-- باب UPDATE بدل INSERT.
--
-- الإصلاح: trigger بيمنع تغيير أي عمود "هوية" للتسليم بعد إنشائه —
-- student_id/course_id/course_category/lesson_id/is_graduation_project —
-- نفس فكرة projects_guard_and_resolve_mentor_trg (0013) بالظبط بس
-- أبسط (مفيش حاجة تتغيّر، مش مسموح تتغيّر خالص). الكود الحقيقي
-- (saveSubmission/saveGraduationSubmission) أصلاً بيعمل check-then-write
-- على نفس الصف بنفس النوع، عمره ما بيحاول يغيّر نوع تسليم موجود — فالقيد
-- ده مش هيكسر أي استخدام حقيقي.

begin;

create or replace function public.course_submissions_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.student_id is distinct from old.student_id
    or new.course_id is distinct from old.course_id
    or new.course_category is distinct from old.course_category
    or new.lesson_id is distinct from old.lesson_id
    or new.is_graduation_project is distinct from old.is_graduation_project
  then
    raise exception 'مينفعش تغيّري نوع أو انتماء التسليم بعد إنشائه.';
  end if;
  return new;
end;
$$;

drop trigger if exists course_submissions_guard_immutable_trg on public.course_submissions;
create trigger course_submissions_guard_immutable_trg
  before update on public.course_submissions
  for each row
  execute function public.course_submissions_guard_immutable();

commit;

-- ملحوظة تشغيل: begin/commit واحد، create or replace / drop trigger if
-- exists — آمن تتشغّل تاني. مستقلة عن 0020، الترتيب بينهم مش مهم.
