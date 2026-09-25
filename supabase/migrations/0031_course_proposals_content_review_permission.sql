-- course_proposals: تصحيح صلاحية المراجعة — content_review مش
-- mentor_application_review -----------------------------------------------
--
-- migration 0011 الأصلية بنت مراجعة الكورسات على صلاحية
-- mentor_application_review (نفس صلاحية طلبات المينتورز) لأنها كانت أقرب
-- حاجة موجودة وقتها. دلوقتي عندنا content_review فعلاً كصلاحية حقيقية
-- منفصلة في جدول permissions (اتأكّدت من الداتابيز الحية)، وهي الأصح
-- منطقيًا لمراجعة محتوى كورس (منهج، نتائج تعلّم، مشروع تخرّج) — مراجعة
-- كورس ومراجعة طلب انضمام كمينتور فعلين مختلفين تمامًا، ومحتاجين يبقوا
-- صلاحيتين منفصلتين. الملف ده بيصحّح الـ RLS بس عشان يتطابق مع تصميم
-- الليلة دي كله.

begin;

drop policy if exists "course_proposals_select_own_or_staff" on public.course_proposals;
create policy "course_proposals_select_own_or_staff"
  on public.course_proposals for select
  to authenticated
  using (
    mentor_id = auth.uid()
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

drop policy if exists "course_proposals_update_staff_only" on public.course_proposals;
create policy "course_proposals_update_staff_only"
  on public.course_proposals for update
  to authenticated
  using (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'content_review'))
  with check (public.is_super_admin(auth.uid()) or public.has_permission(auth.uid(), 'content_review'));

-- policy الإدخال (0011): approved mentor في تراك الكورس يدخل proposal — من غير
-- قيد على status. بعد 0025 (اللي زوّدت published) ده معناه إن أي منتور معتمد
-- يدخل كورس بحالة published مباشرة ويتخطّى المراجعة كلها وبعدها يعمل دفعات
-- ويسجّل طلاب. اتأكّد بتجربة فعلية. دلوقتي الإدخال draft بس.
drop policy if exists "course_proposals_insert_own_approved_mentor" on public.course_proposals;
create policy "course_proposals_insert_own_approved_mentor"
  on public.course_proposals for insert
  to authenticated
  with check (auth.uid() = mentor_id and status = 'draft' and public.is_approved_mentor(track));

-- المينتور صاحب الكورس محتاج يعدّل بياناته وهو draft/needs_changes —
-- الـ policy القديمة فوق ستاف بس، مفيش policy للمالك خالص قبل كده (كان
-- شغّال بالصدفة بس من خلال INSERT، أي تعديل بعد الإنشاء كان مستحيل!)
-- with check بتقفل القيمة النهائية المسموحة على draft/needs_changes
-- (تعديل عادي) أو submitted (تقديم فعلي) بس — مش أي حالة تانية، وإلا
-- المينتور كان يقدر يقفز مباشرة لـ published من غير مراجعة خالص
-- (نفس فئة ثغرة 0020 بالظبط)
drop policy if exists "course_proposals_update_own_draftable" on public.course_proposals;
create policy "course_proposals_update_own_draftable"
  on public.course_proposals for update
  to authenticated
  using (mentor_id = auth.uid() and status in ('draft', 'needs_changes'))
  with check (mentor_id = auth.uid() and status in ('draft', 'needs_changes', 'submitted'));

-- publishCourse() (approved -> published) مستقلة عن السياسة فوق — الكورس
-- هنا في حالة approved مش draft/needs_changes، والمينتور صاحبه بس يقدر
-- ينشره. with check بيقفل الانتقال على published بالظبط، مش أي حاجة تانية
drop policy if exists "course_proposals_publish_own_approved" on public.course_proposals;
create policy "course_proposals_publish_own_approved"
  on public.course_proposals for update
  to authenticated
  using (mentor_id = auth.uid() and status = 'approved')
  with check (mentor_id = auth.uid() and status = 'published');

-- ============================================================
-- تصحيح جوهري (اتكشف بتجربة فعلية على نسخة محلية): الـ policies التلاتة فوق
-- لوحدها مش كفاية. في Postgres، USING بتتقيّم بـ OR عبر كل الـ policies
-- المسموحة للأمر (الصف القديم لازم يعدّي policy واحدة على الأقل)، وWITH CHECK
-- كمان بـ OR عبر كل الـ policies (الصف الجديد يعدّي policy واحدة على الأقل)
-- — مش بالأزواج. يعني كورس draft (يعدّي USING بتاع update_own_draftable) اتنقل
-- لـ published (يعدّي WITH CHECK بتاع publish_own_approved) = المنتور ينشر
-- كورسه بنفسه من غير أي مراجعة. RLS مبتقدرش تربط القديم بالجديد، فالانتقالات
-- بتتفرض بـ trigger (نفس أسلوب باقي guards الحزمة).
--
-- المنتور صاحب الكورس (مش الستاف): الانتقالات المسموحة بس
--   draft | needs_changes -> submitted     approved -> published
-- وتعديل المحتوى في نفس الحالة. مينفعش يغيّر mentor_id ولا أعمدة المراجعة
-- (reviewed_by / reviewed_at / notes) ولا يحوّل track لتراك مش معتمد فيه.
-- الستاف بيعدّي (قراراتهم بتتحكم فيها صلاحياتهم + التطبيق).
-- ============================================================
create or replace function public.course_proposals_guard_transitions()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- مفيش سياق مستخدم (SQL editor / صيانة يدوية)
  if v_uid is null then
    return new;
  end if;

  if public.is_super_admin(v_uid)
    or public.has_permission(v_uid, 'content_review')
    or public.has_permission(v_uid, 'mentor_application_review')
  then
    return new;
  end if;

  if new.mentor_id is distinct from old.mentor_id then
    raise exception 'مينفعش تغيّري صاحب الكورس.';
  end if;

  if new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.notes is distinct from old.notes
  then
    raise exception 'بيانات المراجعة بتتعدّل من فريق COCR بس.';
  end if;

  if new.track is distinct from old.track and not public.is_approved_mentor(new.track) then
    raise exception 'انتي مش معتمدة كمينتور في التراك ده.';
  end if;

  if new.status is distinct from old.status and not (
    (old.status in ('draft', 'needs_changes') and new.status = 'submitted')
    or (old.status = 'approved' and new.status = 'published')
  ) then
    raise exception 'الانتقال من % لـ % مش مسموح.', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists course_proposals_guard_transitions_trg on public.course_proposals;
create trigger course_proposals_guard_transitions_trg
  before update on public.course_proposals
  for each row
  execute function public.course_proposals_guard_transitions();

commit;

-- ملحوظة تشغيل: begin/commit واحد، drop+create policy idempotent. لازم
-- يتشغّل بعد 0011 (موجودة بالفعل) — مفيش ترتيب جديد مطلوب مع باقي
-- migrations الليلة دي.
