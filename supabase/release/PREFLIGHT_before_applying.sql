-- PREFLIGHT — قراءة فقط (SELECT بس) — شغّليه قبل أي تطبيق وابعتي لي النتيجة -----
-- بيتأكد إن الداتابيز الحية لسه مطابقة للافتراضات اللي الحزمة اتختبرت عليها
-- (اللي اتاخدت من الأودتات الثلاثة)، وبيجاوب على سؤالين كانوا مفتوحين:
--   1) pgcrypto مثبّتة في أنهي schema؟ (بيحدد هل bug إصدار الشهادات حقيقي دلوقتي)
--   2) الـ views لسه قابلة للكتابة من anon؟ (بيأكّد ثغرة profiles_public/sessions_public)

select jsonb_build_object(
  'pg_version', version(),
  'pgcrypto_schema', (select extnamespace::regnamespace::text from pg_extension where extname = 'pgcrypto'),
  'gen_random_bytes_lives_in', (select coalesce(jsonb_agg(pronamespace::regnamespace::text), '[]'::jsonb) from pg_proc where proname = 'gen_random_bytes'),
  'anon_can_write_views', jsonb_build_object(
    'profiles_public_update', has_table_privilege('anon', 'public.profiles_public', 'UPDATE'),
    'profiles_public_delete', has_table_privilege('anon', 'public.profiles_public', 'DELETE'),
    'sessions_public_update', has_table_privilege('anon', 'public.sessions_public', 'UPDATE')
  ),
  'view_security_invoker', (select coalesce(jsonb_object_agg(relname, coalesce(reloptions::text, 'default (owner-privileged)')), '{}'::jsonb) from pg_class where relnamespace = 'public'::regnamespace and relname in ('profiles_public', 'sessions_public')),
  -- السياسات اللي الحزمة هتستبدلها بالاسم: لازم كلها موجودة بالظبط
  'expected_policies_present', (
    select coalesce(jsonb_object_agg(p.tp, exists (select 1 from pg_policies x where x.schemaname = 'public' and x.tablename || '.' || x.policyname = p.tp)), '{}'::jsonb)
    from (values
      ('mentor_applications.mentor_applications own insert'),
      ('guardian_approvals.guardian_approvals self insert'),
      ('course_enrollments.enrollments_insert_own'),
      ('course_submissions.course_submissions_select_mentor'),
      ('course_submissions.course_submissions_insert_own_enrolled'),
      ('submission_feedback.submission_feedback_insert_mentor'),
      ('course_sessions.course_sessions_insert_mentor'),
      ('course_proposals.course_proposals_insert_own_approved_mentor'),
      ('course_proposals.course_proposals_select_own_or_staff'),
      ('course_proposals.course_proposals_update_staff_only'),
      ('notifications.notifications own'),
      ('notifications.notifications own update'),
      ('moderation_log.moderation_log_select_staff_only'),
      ('opportunities.opportunities researcher insert'),
      ('opportunities.opportunities admin all')
    ) as p(tp)
  ),
  -- الأسماء اللي الحزمة هتعملها: لازم مفيش حاجة بنفس الاسم دلوقتي (غير notifications، هتتبنّى)
  'names_that_must_be_free', (
    select coalesce(jsonb_agg(c.relname), '[]'::jsonb) from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relname in ('saved_items','achievements','user_achievements','course_curriculum_sessions','course_cohorts','session_recordings','session_attendance',
                        'session_quizzes','session_quiz_questions','session_quiz_attempts','session_quiz_attempt_answers','session_tasks','graduation_project_reviews',
                        'published_courses_public','published_curriculum_public','session_quiz_questions_for_student','session_quiz_answer_key_for_reviewer')
  ),
  'notifications_columns', (select coalesce(jsonb_agg(column_name order by ordinal_position), '[]'::jsonb) from information_schema.columns where table_schema = 'public' and table_name = 'notifications'),
  -- عدّادات للمقارنة بالأودت (لو اتغيّرت كتير بلّغيني قبل التطبيق)
  'counts', jsonb_build_object(
    'course_enrollments', (select count(*) from public.course_enrollments),
    'course_enrollments_completed', (select count(*) from public.course_enrollments where completed_at is not null),
    'certificates', (select count(*) from public.certificates),
    'mentor_applications', (select jsonb_object_agg(status::text, n) from (select status, count(*) n from public.mentor_applications group by status) s),
    'course_proposals', (select count(*) from public.course_proposals),
    'course_submissions', (select count(*) from public.course_submissions),
    'course_sessions', (select count(*) from public.course_sessions),
    'projects_by_status', (select jsonb_object_agg(status, n) from (select status, count(*) n from public.projects group by status) s),
    'notifications', (select count(*) from public.notifications),
    'quiz_attempts_legacy', (select count(*) from public.quiz_attempts),
    'quiz_questions_legacy', (select count(*) from public.quiz_questions)
  )
) as preflight;
