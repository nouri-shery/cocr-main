-- Graduation Project Review — منفصل عن Projects العام، append-only --------
--
-- مشروع التخرّج بيتسلّم في course_submissions (is_graduation_project=true،
-- موجود بالفعل) — الجديد هنا بس سجل المراجعة الرسمي، نفس فلسفة
-- project_reviews بالظبط: append-only، القرار الحالي = آخر صف. الحالة
-- دي مقصودة للدفعات الجديدة بس (cohort_id) — الكورسات القديمة الثابتة
-- لسه بتستخدم submission_feedback العادي زي ما هي.
--
-- مشروع التخرّج (خاص، أكاديمي) يفضل منفصل تمامًا عن Projects (عام،
-- portfolio) — الربط الوحيد عمود projects.graduation_submission_id
-- الاختياري، لو الطالب قرر بعدين ينشر نفس الشغل كـ showcase عام (عن
-- طريق نظام projects/project_reviews الموجود، مش بديل له).

begin;

create table if not exists public.graduation_project_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.course_submissions(id) on delete restrict,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('under_review', 'changes_requested', 'approved', 'rejected')),
  rubric_scores jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists graduation_project_reviews_submission_idx
  on public.graduation_project_reviews (submission_id, created_at desc);

alter table public.graduation_project_reviews enable row level security;

-- الطالب (صاحب المشروع) يشوف تاريخ مراجعته بالكامل بما فيه درجات
-- الروبريك — قرار مختلف عمدًا عن project_reviews اللي بتخفي الدرجات عن
-- الطالب (هناك الموضوع حساسية سياسات فريق، هنا الروبريك تعليمي/تغذية
-- راجعة مقصودة تتشاف)
drop policy if exists "gpr_select_student_or_mentor_or_staff" on public.graduation_project_reviews;
create policy "gpr_select_student_or_mentor_or_staff"
  on public.graduation_project_reviews for select
  to authenticated
  using (
    exists (
      select 1 from public.course_submissions cs
      where cs.id = graduation_project_reviews.submission_id and cs.student_id = auth.uid()
    )
    or exists (
      select 1 from public.course_submissions cs
      join public.course_cohorts cc on cc.id = cs.cohort_id
      where cs.id = graduation_project_reviews.submission_id and cc.mentor_id = auth.uid()
    )
    or public.is_super_admin(auth.uid())
    or public.has_permission(auth.uid(), 'content_review')
  );

-- مفيش INSERT مباشر لحد خالص — submit_graduation_review() بس تحت
revoke all on public.graduation_project_reviews from anon, authenticated;
grant select on public.graduation_project_reviews to authenticated;

-- ============================================================
-- submit_graduation_review — الطريق الوحيد لتسجيل قرار مراجعة. مقصور
-- على تسليمات الدفعات الجديدة (cohort_id) — نفس منطق submit_project_review
-- بالظبط: فحص صلاحية يدوي، منع تضارب مصالح (المراجع مايكونش هو الطالب)،
-- سبب إجباري لو رفض/طلب تعديل
-- ============================================================
create or replace function public.submit_graduation_review(
  p_submission_id uuid,
  p_decision text,
  p_note text default null,
  p_rubric_scores jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reviewer uuid := auth.uid();
  v_student uuid;
  v_status text;
  v_is_graduation boolean;
  v_cohort_id uuid;
  v_cohort_mentor uuid;
  v_is_leader boolean;
begin
  if v_reviewer is null then
    raise exception 'لازم تسجّل دخولك.';
  end if;
  if p_decision not in ('under_review', 'changes_requested', 'approved', 'rejected') then
    raise exception 'invalid decision';
  end if;

  select student_id, is_graduation_project, cohort_id, status
  into v_student, v_is_graduation, v_cohort_id, v_status
  from public.course_submissions
  where id = p_submission_id;

  if v_student is null then
    raise exception 'التسليم ده مش موجود.';
  end if;
  if not coalesce(v_is_graduation, false) then
    raise exception 'التسليم ده مش مشروع تخرّج.';
  end if;
  if v_cohort_id is null then
    raise exception 'المراجعة الرسمية دي للدفعات الجديدة بس — الكورسات القديمة الثابتة لسه بتستخدم submission_feedback.';
  end if;
  -- مراجعة رسمية على تسليم لسه draft (الطالب ماسلّمهوش) مالهاش معنى، وكانت
  -- ممكن تخلّي المنتور يوافق على شغل مش متسلّم
  if v_status is distinct from 'submitted' then
    raise exception 'الطالب لسه ماسلّمش المشروع ده.';
  end if;
  if v_student = v_reviewer then
    raise exception 'مينفعش تراجعي مشروعك انتي نفسك.';
  end if;

  v_is_leader := public.is_super_admin(v_reviewer) or public.has_permission(v_reviewer, 'content_review');
  select mentor_id into v_cohort_mentor from public.course_cohorts where id = v_cohort_id;

  if not (v_is_leader or v_reviewer = v_cohort_mentor) then
    raise exception 'الإجراء ده لمنتور الدفعة أو فريق COCR بس.';
  end if;

  if p_decision in ('changes_requested', 'rejected') and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'لازم توضّحي السبب عشان الطالب يعرف يظبطه.';
  end if;

  insert into public.graduation_project_reviews (submission_id, reviewer_id, decision, rubric_scores, note)
  values (p_submission_id, v_reviewer, p_decision, p_rubric_scores, nullif(trim(coalesce(p_note, '')), ''));
end;
$$;

revoke all on function public.submit_graduation_review(uuid, text, text, jsonb) from public, anon;
grant execute on function public.submit_graduation_review(uuid, text, text, jsonb) to authenticated;

-- ============================================================
-- projects: ربط اختياري لمشروع تخرّج اتحوّل لعرض عام — عمود تتبّع بس،
-- الناشر لسه لازم يعدّي على نظام projects/project_reviews الموجود
-- زي ما هو، مفيش تغيير في منطقه
-- ============================================================
alter table public.projects
  add column if not exists graduation_submission_id uuid references public.course_submissions(id) on delete set null;

-- ============================================================
-- تجميد مشروع التخرّج بعد الموافقة: من غير ده الطالب كان يقدر يعدّل محتوى
-- مشروع اتوافق عليه (وأصدر شهادة) بعد الحقيقة، وسجل المراجعة بيشاور على
-- تسليم محتواه اتغيّر. نفس دالة حارس الهوية (0022/0028) + شرط التجميد.
-- ============================================================
create or replace function public.course_submissions_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.student_id is distinct from old.student_id
    or new.course_id is distinct from old.course_id
    or new.cohort_id is distinct from old.cohort_id
    or new.course_category is distinct from old.course_category
    or new.lesson_id is distinct from old.lesson_id
    or new.session_task_id is distinct from old.session_task_id
    or new.is_graduation_project is distinct from old.is_graduation_project
  then
    raise exception 'مينفعش تغيّري نوع أو انتماء التسليم بعد إنشائه.';
  end if;

  if old.is_graduation_project and old.cohort_id is not null and (
    select gpr.decision from public.graduation_project_reviews gpr
    where gpr.submission_id = old.id
    order by gpr.created_at desc
    limit 1
  ) = 'approved' then
    raise exception 'مشروع التخرّج اتوافق عليه وبقى مقفول — مينفعش يتعدّل.';
  end if;

  return new;
end;
$$;

commit;

-- ملحوظة تشغيل: begin/commit واحد. لازم يتشغّل بعد 0025/0028 (معتمد على
-- course_cohorts وcourse_submissions.cohort_id/is_graduation_project).
--
-- ملحوظة مهمة برّه نطاق الملف ده عمدًا: منطق "إتمام الكورس" الحالي
-- (migration 0014، completed_at) لسه مبني على الدروس القديمة بس. إتمام
-- كورس دفعة جديدة (حضور + كويزات + مهام + مشروع تخرّج معتمد) نظام تاني
-- لسه معملوش، ومحتاج قرار إضافي: هل كل سيشن في المنهج إجباري للإتمام
-- ولا فيه سيشنز اختيارية؟ ده قرار منتج مش تقني، هينحل في فيز منفصلة.
