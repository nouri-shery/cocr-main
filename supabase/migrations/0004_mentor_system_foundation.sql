-- Milestone 5 foundation: نظام المينتور + تسليمات الكورسات + تقييمات + بلاغات
-- + جلسات لايف (زوم) + لوحة أدمن داخلية بسيطة.
--
-- تصحيح مهم بعد فحص أمان نهائي: mentor_applications و reports كانوا
-- موجودين بالفعل في الداتابيز الحقيقية (نظام أصلي أقدم من الشغل ده)، بشكل
-- مختلف وأبسط من اللي اتفترض هنا أول مرة (create table if not exists كانت
-- بتعمل no-op بصمت، وده اللي فجّر أول تشغيل بـ "column user_id does not
-- exist"). النسخة دي بقت بتتعامل مع الجدولين الحقيقيين بـ ALTER بس، وبتسيب
-- الـ RLS الأصلية بتاعتهم زي ما هي تمامًا (مبنية على has_permission()/
-- is_super_admin() الحقيقيين، مش على أي عمود is_staff مخترع). العمود
-- profiles.is_staff اتشال خالص من هنا — مفيش داعي ليه، النظام الحقيقي بيعتمد
-- على has_permission('mentor_application_review' | 'safety_report_access')
-- أو is_super_admin() بس.
--
-- مفيش أي لمس لـ courses/course_modules/lessons/lesson_progress الحقيقيين،
-- ومفيش أي لمس لـ guardian_approvals — نظام موافقة الأدمن هنا مستقل تمامًا
-- عنه بقرار صريح من المستخدمة.
--
-- نفس اتفاقية course_id بتاعة course_enrollments/catalog_lessons: عمود
-- text عادي (مش foreign key) بيطابق الـ static catalog ids (fe-basics, ...)
-- لأنه لسه مفيش جدول courses حقيقي نقدر نشاور عليه.
--
-- الجدول العام projects (الـ showcase العام) متلموسش خالص هنا — نظام
-- course_submissions ده حاجة تانية خالص، مقصودة تبقى منفصلة (خاص لحد ما
-- يتسلّم، بيتراجع من المنتور، وظاهر لزمايل نفس الكورس بس).

begin;

-- ============================================================
-- mentor_applications — جدول حقيقي موجود بالفعل (id, applicant_id, status
-- enum, reviewed_by, reviewed_at, notes, created_at). بنضيف بس الأعمدة
-- الجديدة المطلوبة للفورم الموسّع، من غير ما نلمس شكله الأصلي أو الـ RLS
-- بتاعته. مفيش CHECK constraints جديدة على الأعمدة دي — التحقق بيتم في
-- الكود (applyToBeMentor) عشان نقدر نرجّع رسالة خطأ واضحة لكل حقل لوحده،
-- وعشان مانضيفش قيد ممكن يتصادم مع صفوف قديمة موجودة فعلاً في الجدول
-- الحقيقي من قبل الشغل ده.
-- ============================================================
alter table public.mentor_applications add column if not exists track text;
alter table public.mentor_applications add column if not exists motivation text not null default '';
alter table public.mentor_applications add column if not exists prior_projects text not null default '';
alter table public.mentor_applications add column if not exists gender text;
alter table public.mentor_applications add column if not exists age integer;
alter table public.mentor_applications add column if not exists student_age_min integer;
alter table public.mentor_applications add column if not exists student_age_max integer;
alter table public.mentor_applications add column if not exists guardian_email text;
alter table public.mentor_applications add column if not exists guardian_consent_confirmed boolean not null default false;
alter table public.mentor_applications add column if not exists agreed_to_safety_policy boolean not null default false;
alter table public.mentor_applications add column if not exists agreed_to_zoom_sessions boolean not null default false;
alter table public.mentor_applications add column if not exists agreed_to_followup_commitment boolean not null default false;
alter table public.mentor_applications add column if not exists leads_training_completed_at timestamptz;

-- إضافة suspended لنوع mentor_application_status الحقيقي (ENUM فعلي، مش
-- CHECK constraint — عشان كده add value مش drop/add constraint). approved
-- يقدر يوصل بعدها لـ suspended. is_approved_mentor() بتتحقق status='approved'
-- بس، فتعليق المينتور بيسحب صلاحياته فورًا من غير أي تعديل تاني في الكود.
-- ملحوظة: الجملة دي آمنة جوّا begin/commit طول ما مفيش استخدام لـ 'suspended'
-- في نفس الـ transaction (ومفيش هنا).
alter type public.mentor_application_status add value if not exists 'suspended';

-- بيتحقق إن auth.uid() الحالي عنده mentor_applications معتمد (approved) بنفس
-- التراك المطلوب. security invoker (مش definer) — يعني بيشتغل تحت RLS بتاعة
-- mentor_applications نفسها (الحقيقية، الأصلية)، فمفيش تسريب بيانات.
create or replace function public.is_approved_mentor(check_track text)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.mentor_applications ma
    where ma.applicant_id = auth.uid()
      and ma.status = 'approved'::mentor_application_status
      and ma.track = check_track
  );
$$;

grant execute on function public.is_approved_mentor(text) to authenticated;

-- ============================================================
-- course_submissions — منفصل تمامًا عن جدول projects العام. جدول جديد
-- بالكامل (اتأكد إنه مش موجود قبل كده في الفحص النهائي)
-- ============================================================
create table if not exists public.course_submissions (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  -- تصنيف الكورس (front-end, cybersecurity, ...) — منسوخ وقت الإنشاء من
  -- الكتالوج الثابت في الكود (مفيش جدول courses حقيقي نشاور عليه)، عشان
  -- RLS تقدر تتحقق إن المنتور المعتمد بتاعها بنفس التراك بدون join لجدول مش موجود
  course_category text not null,
  lesson_id uuid references public.catalog_lessons(id) on delete set null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  is_graduation_project boolean not null default false,
  content text not null default '' check (char_length(content) <= 4000),
  file_url text,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_submissions_course_idx on public.course_submissions (course_id, status);
create index if not exists course_submissions_student_idx on public.course_submissions (student_id);

-- تسليم واحد بس للطالب لكل درس (مش graduation project) — بيمنع مسودات مكرّرة.
-- مشروع التخرّج (lesson_id فاضي) متقيّدش هنا، بيتراقب على مستوى الكود بدل كده
create unique index if not exists course_submissions_student_lesson_uidx
  on public.course_submissions (student_id, lesson_id)
  where lesson_id is not null;

alter table public.course_submissions enable row level security;

drop policy if exists "course_submissions_select_own" on public.course_submissions;
create policy "course_submissions_select_own"
  on public.course_submissions for select
  to authenticated
  using (auth.uid() = student_id);

-- زمايل نفس الكورس (مسجّلين فعليًا) بيشوفوا بس اللي اتسلّم فعلاً، مش المسودات
drop policy if exists "course_submissions_select_coursemates" on public.course_submissions;
create policy "course_submissions_select_coursemates"
  on public.course_submissions for select
  to authenticated
  using (
    status = 'submitted'
    and exists (
      select 1 from public.course_enrollments ce
      where ce.user_id = auth.uid() and ce.course_id = course_submissions.course_id
    )
  );

-- المنتور المعتمد بنفس تراك الكورس بيشوف كل التسليمات المسلَّمة (submitted) —
-- مش بس اللي هو مسجّل فيها كطالب زي زمايل الكورس
drop policy if exists "course_submissions_select_mentor" on public.course_submissions;
create policy "course_submissions_select_mentor"
  on public.course_submissions for select
  to authenticated
  using (status = 'submitted' and public.is_approved_mentor(course_category));

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
  );

drop policy if exists "course_submissions_update_own" on public.course_submissions;
create policy "course_submissions_update_own"
  on public.course_submissions for update
  to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

grant select, insert, update on public.course_submissions to authenticated;

-- ============================================================
-- submission_feedback — تقييم المنتور لتسليم الطالب (خاص، مش لزمايله)
-- ============================================================
create table if not exists public.submission_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.course_submissions(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists submission_feedback_submission_idx on public.submission_feedback (submission_id);

alter table public.submission_feedback enable row level security;

-- صاحب التسليم + المنتور اللي قيّم + super admin بس، مفيش رؤية لزمايل الكورس هنا
drop policy if exists "submission_feedback_select_owner_or_mentor" on public.submission_feedback;
create policy "submission_feedback_select_owner_or_mentor"
  on public.submission_feedback for select
  to authenticated
  using (
    auth.uid() = mentor_id
    or exists (
      select 1 from public.course_submissions cs
      where cs.id = submission_feedback.submission_id and cs.student_id = auth.uid()
    )
    or public.is_super_admin(auth.uid())
  );

-- مش بس auth.uid() = mentor_id (ده كان هيسمح لأي حد يدّعي إنه منتور) — لازم
-- يبقى فعلاً منتور معتمد بنفس تراك الكورس بتاع التسليم ده
drop policy if exists "submission_feedback_insert_mentor" on public.submission_feedback;
create policy "submission_feedback_insert_mentor"
  on public.submission_feedback for insert
  to authenticated
  with check (
    auth.uid() = mentor_id
    and exists (
      select 1 from public.course_submissions cs
      where cs.id = submission_feedback.submission_id
        and public.is_approved_mentor(cs.course_category)
    )
  );

grant select, insert on public.submission_feedback to authenticated;

-- ============================================================
-- mentor_ratings — تقييم الطالب للمنتور
-- ============================================================
create table if not exists public.mentor_ratings (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (course_id, mentor_id, student_id)
);

create index if not exists mentor_ratings_mentor_idx on public.mentor_ratings (mentor_id);

alter table public.mentor_ratings enable row level security;

drop policy if exists "mentor_ratings_select_own_or_about_me" on public.mentor_ratings;
create policy "mentor_ratings_select_own_or_about_me"
  on public.mentor_ratings for select
  to authenticated
  using (
    auth.uid() = student_id
    or auth.uid() = mentor_id
    or public.is_super_admin(auth.uid())
  );

drop policy if exists "mentor_ratings_insert_own" on public.mentor_ratings;
create policy "mentor_ratings_insert_own"
  on public.mentor_ratings for insert
  to authenticated
  with check (auth.uid() = student_id);

grant select, insert on public.mentor_ratings to authenticated;

-- ============================================================
-- reports — جدول حقيقي موجود بالفعل (id, reporter_id, target_type text,
-- target_id uuid, reason, status enum, reviewed_by, reviewed_at, created_at).
-- بنضيف بس عمود details الاختياري، ومتلموسش الـ RLS الأصلية بتاعته خالص —
-- هي أصلاً reporter_id=auth.uid() للـ select/insert، و
-- has_permission('safety_report_access') أو is_super_admin() للفريق.
-- ============================================================
alter table public.reports add column if not exists details text;

-- ============================================================
-- course_sessions — لينك الزوم + التسجيل (تخزين رابط بس، مفيش تكامل حقيقي
-- مع Zoom API مطلوب دلوقتي حسب الـ PRD). جدول جديد بالكامل.
-- ============================================================
create table if not exists public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  -- نفس فكرة course_submissions.course_category — منسوخة وقت الإنشاء من
  -- الكتالوج الثابت، عشان RLS تتحقق من تراك المنتور من غير جدول courses حقيقي
  course_category text not null,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  scheduled_at timestamptz not null,
  zoom_link text,
  recording_url text,
  created_at timestamptz not null default now()
);

create index if not exists course_sessions_course_idx on public.course_sessions (course_id, scheduled_at);

alter table public.course_sessions enable row level security;

drop policy if exists "course_sessions_select_enrolled_or_mentor" on public.course_sessions;
create policy "course_sessions_select_enrolled_or_mentor"
  on public.course_sessions for select
  to authenticated
  using (
    auth.uid() = mentor_id
    or exists (
      select 1 from public.course_enrollments ce
      where ce.user_id = auth.uid() and ce.course_id = course_sessions.course_id
    )
  );

-- نفس التشديد: لازم يبقى منتور معتمد فعليًا بنفس تراك الكورس، مش بس
-- auth.uid() = mentor_id
drop policy if exists "course_sessions_insert_mentor" on public.course_sessions;
create policy "course_sessions_insert_mentor"
  on public.course_sessions for insert
  to authenticated
  with check (auth.uid() = mentor_id and public.is_approved_mentor(course_category));

grant select, insert on public.course_sessions to authenticated;

commit;

-- ملحوظة تشغيل: begin/commit واحد (all-or-nothing)، كل الجمل create table if
-- not exists / add column if not exists / add value if not exists / drop
-- policy if exists — آمن تتشغّل تاني لو حصل فشل جزئي. مفيش أي INSERT/UPDATE
-- على بيانات موجودة في الملف ده. الوصول للوحة /admin بيتحدد بنظام الصلاحيات
-- الحقيقي الموجود بالفعل (has_permission()/is_super_admin()) — لازم حسابك
-- يكون عنده صلاحية 'mentor_application_review' أو 'safety_report_access' أو
-- دور super_admin مسجّل مسبقًا في admin_permissions/has_role، مش حاجة
-- بتتحط من هنا.
