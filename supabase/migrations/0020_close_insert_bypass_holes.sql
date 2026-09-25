-- إصلاح أمني حرج: INSERT policies كانت بتسمح بتزوير حالة ثقة أولية -------
--
-- اتلقى أثناء self-review لشغل الليلة (مش حاجة اتعملت النهاردة — موجودة
-- من migration 0001 الأصلية، ومحدش لقاها في أي أودت قبل كده بما فيهم
-- أودتات الليلة دي نفسها):
--
-- 1) projects_insert_own (0001) بتتحقق بس إن owner_id = auth.uid()،
--    مفيش أي قيد على status وقت الـ INSERT. يعني عميل يقدر يستدعي
--    supabase.from('projects').insert({..., status: 'published'}) مباشرة
--    (مش من خلال واجهة التطبيق، بس ممكن من console/API call مباشر بجلسة
--    حقيقية) ويطلع "مشروع تخرّج موثّق" من غير أي مراجعة ليدر خالص — كسر
--    كامل للضمان اللي كل نظام project_reviews اتبنى عشانه.
--
-- 2) enrollments_insert_own (0001) بتتحقق بس إن user_id = auth.uid()،
--    مفيش أي قيد على completed_at وقت الـ INSERT (العمود ده مضاف في
--    migration 0014 بتاعت الليلة). عميل يقدر يزوّر completed_at من أول
--    insert للـ enrollment ويفتح تسليم مشروع التخرّج من غير ما يخلّص أي
--    درس فعلي — قبل حتى ما نظام الشهادات/الإنجازات يتفعّل (اللي أصلاً
--    مربوط بـ AFTER UPDATE مش AFTER INSERT، فمكانش حتى هيمنح شهادة، بس
--    كان هيفتح البوابة غلط).
--
-- 3) course_submissions_insert_own_enrolled (0004) كانت بتتحقق بس من
--    enrollment، مفيش تحقق إن is_graduation_project=true فعلاً مسموح بيه
--    (يعني الطالب يقدر يسلّم "مشروع تخرّج" من غير ما يخلّص الكورس أصلاً).
--    الأثر محدود (لسه محتاج مراجعة منتور بشرية، مفيش شهادة/نشر تلقائي)،
--    بس بنسدّها برضو عشان تبقى متسقة مع البوابة اللي الواجهة بتفترضها.
--
-- 4) mentor_ratings_insert_own (0004) كانت بتتحقق بس إن auth.uid()=student_id
--    — بتسمح للطالب يـ insert تقييم لأي mentor_id عشوائي، حتى لو مش منتور
--    معتمد أصلاً. ده موثّق كمشكلة معروفة في تعليق migration 0013 نفسها
--    ("لازم يتصلح في migration منفصلة") — الملف ده هو تلك الـ migration.
--    الأثر الحقيقي: mentor_ratings هي مصدر auto-resolve المنتور في
--    projects_guard_and_resolve_mentor() (0013)، فتقييم مزوّر كان يقدر
--    يخلّي الداتابيز تعيّن mentor_id عشوائي على مشروع الطالب — وده كان بيدّي
--    UUID عشوائي صلاحية SELECT على المشروع عن طريق projects_select_mentor.
--    الإصلاح: نتحقق إن mentor_id فعلاً منتور معتمد بنفس تراك الكورس (مش
--    بالضرورة "المنتور اللي اتعيّن للطالب ده تحديدًا" — ده محتاج جدول
--    تعيين صريح مش موجود لسه، قرار منفصل).
--
-- الإصلاح في الأربعة كلهم بسيط ومباشر: قيد إضافي على القيمة الابتدائية/
-- المرجعية المسموحة في WITH CHECK. مفيش تغيير على أي صف موجود، ومفيش
-- تغيير على أي سلوك تطبيق حالي — واجهة التطبيق أصلاً دايمًا بتلتزم
-- بالقيود دي، فالتضييق ده مبيكسرش أي استخدام حقيقي موجود.

begin;

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects for insert
  to authenticated
  with check (auth.uid() = owner_id and status = 'draft');

drop policy if exists "enrollments_insert_own" on public.course_enrollments;
create policy "enrollments_insert_own"
  on public.course_enrollments for insert
  to authenticated
  with check (auth.uid() = user_id and completed_at is null);

drop policy if exists "course_submissions_insert_own_enrolled" on public.course_submissions;
create policy "course_submissions_insert_own_enrolled"
  on public.course_submissions for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and exists (
      select 1 from public.course_enrollments ce
      where ce.user_id = auth.uid() and ce.course_id = course_submissions.course_id
    )
    and (
      coalesce(is_graduation_project, false) = false
      or exists (
        select 1 from public.course_enrollments ce
        where ce.user_id = auth.uid()
          and ce.course_id = course_submissions.course_id
          and ce.completed_at is not null
      )
    )
  );

drop policy if exists "mentor_ratings_insert_own" on public.mentor_ratings;
create policy "mentor_ratings_insert_own"
  on public.mentor_ratings for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and exists (
      select 1
      from public.catalog_courses cc
      join public.mentor_applications ma
        on ma.applicant_id = mentor_ratings.mentor_id
        and ma.status = 'approved'::mentor_application_status
        and ma.track = cc.category
      where cc.id = mentor_ratings.course_id
    )
  );

commit;

-- ملحوظة تشغيل: begin/commit واحد. كل drop+create policy idempotent وآمن
-- تتشغّل تاني. الأولوية القصوى بين كل الـ migrations المعلّقة الليلة —
-- دي مش فيتشر جديد، دي بوابات كانت مفتوحة من زمان لازم تتقفل الأول.
