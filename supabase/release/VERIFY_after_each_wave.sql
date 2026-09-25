-- VERIFY — قراءة فقط (SELECT بس)، شغّليه في SQL Editor بعد كل موجة -------
-- كل صف = فحص واحد. passed = true معناه الحالة الفعلية للداتابيز مطابقة
-- للمتوقع بعد الموجة دي. wave = الموجة اللي الفحص ده بيتوقع يعدّي بعدها
-- (الفحوصات بتاعت موجة أكبر من اللي طبّقتيها هتطلع false — ده طبيعي).
--   W1 = 0016b, 0016c, 0020-0024
--   W2 = 0017-0019
--   W3 = 0025-0034
--   W4 = 0035
-- مفيش أي تعديل على أي حاجة: مفيش insert/update/delete/DDL.

with checks(wave, name, passed) as (
  values
  -- ================= W1 =================
  ('W1', 'anon cannot write through profiles_public',
    coalesce(not (has_table_privilege('anon', to_regclass('public.profiles_public'), 'UPDATE') or has_table_privilege('anon', to_regclass('public.profiles_public'), 'DELETE') or has_table_privilege('anon', to_regclass('public.profiles_public'), 'INSERT')), false)),
  ('W1', 'authenticated cannot write through profiles_public',
    coalesce(not (has_table_privilege('authenticated', to_regclass('public.profiles_public'), 'UPDATE') or has_table_privilege('authenticated', to_regclass('public.profiles_public'), 'DELETE') or has_table_privilege('authenticated', to_regclass('public.profiles_public'), 'INSERT')), false)),
  ('W1', 'nobody can write through sessions_public',
    coalesce(not (has_table_privilege('anon', to_regclass('public.sessions_public'), 'UPDATE') or has_table_privilege('authenticated', to_regclass('public.sessions_public'), 'UPDATE') or has_table_privilege('anon', to_regclass('public.sessions_public'), 'INSERT') or has_table_privilege('authenticated', to_regclass('public.sessions_public'), 'DELETE')), false)),
  ('W1', 'anon can still READ profiles_public',
    coalesce(has_table_privilege('anon', to_regclass('public.profiles_public'), 'SELECT'), false)),
  ('W1', 'mentor_applications INSERT policy forces pending (self-approve closed)',
    exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_applications' and cmd='INSERT' and with_check like '%pending%')
    and not exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_applications' and policyname='mentor_applications own insert')),
  ('W1', 'guardian_approvals INSERT policy forces pending',
    exists (select 1 from pg_policies where schemaname='public' and tablename='guardian_approvals' and cmd='INSERT' and with_check like '%pending%')),
  ('W1', 'profiles: authenticated has no INSERT/DELETE, anon no write',
    coalesce(not (has_table_privilege('authenticated', to_regclass('public.profiles'), 'INSERT') or has_table_privilege('authenticated', to_regclass('public.profiles'), 'DELETE') or has_table_privilege('anon', to_regclass('public.profiles'), 'UPDATE') or has_table_privilege('anon', to_regclass('public.profiles'), 'DELETE')), false)),
  ('W1', 'mentor_profiles: only bio is updatable',
    coalesce(not has_table_privilege('authenticated', to_regclass('public.mentor_profiles'), 'UPDATE') and has_column_privilege('authenticated', to_regclass('public.mentor_profiles'), 'bio', 'UPDATE') and not has_column_privilege('authenticated', to_regclass('public.mentor_profiles'), 'assigned_course_ids', 'UPDATE'), false)),
  ('W1', 'saved_items table exists with RLS',
    coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.saved_items')), false)),
  ('W1', 'certificate issuing no longer depends on pgcrypto',
    coalesce(position('gen_random_bytes' in pg_get_functiondef(to_regprocedure('public.issue_certificate_for_enrollment()'))) = 0, false)),
  ('W1', 'projects INSERT policy forces draft (0020)',
    exists (select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='projects_insert_own' and with_check like '%draft%')),
  ('W1', 'mentor_ratings INSERT policy checks an approved mentor (0020)',
    exists (select 1 from pg_policies where schemaname='public' and tablename='mentor_ratings' and policyname='mentor_ratings_insert_own' and with_check like '%mentor_applications%')),
  ('W1', 'course_submissions identity guard trigger exists (0022)',
    exists (select 1 from pg_trigger where tgrelid = to_regclass('public.course_submissions') and tgname = 'course_submissions_guard_immutable_trg')),
  ('W1', 'anon has no write on opportunities/courses/favorites/mentor_applications (0023)',
    coalesce(not (has_table_privilege('anon', to_regclass('public.opportunities'), 'INSERT') or has_table_privilege('anon', to_regclass('public.courses'), 'INSERT') or has_table_privilege('anon', to_regclass('public.favorites'), 'INSERT') or has_table_privilege('anon', to_regclass('public.mentor_applications'), 'INSERT')), false)),
  ('W1', 'authenticated cannot write opportunities/courses directly (0023)',
    coalesce(not (has_table_privilege('authenticated', to_regclass('public.opportunities'), 'INSERT') or has_table_privilege('authenticated', to_regclass('public.courses'), 'INSERT')), false)),
  ('W1', 'dangerous untracked opportunities policies are gone (0024)',
    not exists (select 1 from pg_policies where schemaname='public' and tablename='opportunities' and policyname in ('opportunities researcher insert', 'opportunities admin all'))),

  -- ================= W2 =================
  ('W2', 'notifications has link + read_at (adopted live table)',
    (select count(*) = 2 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name in ('link', 'read_at'))),
  ('W2', 'notifications: only read_at is updatable by authenticated',
    coalesce(not has_table_privilege('authenticated', to_regclass('public.notifications'), 'UPDATE') and has_column_privilege('authenticated', to_regclass('public.notifications'), 'read_at', 'UPDATE') and not has_column_privilege('authenticated', to_regclass('public.notifications'), 'title', 'UPDATE'), false)),
  ('W2', 'notify_user is NOT callable by anon/authenticated',
    coalesce(not (has_function_privilege('anon', to_regprocedure('public.notify_user(uuid,text,text,text,text)'), 'EXECUTE') or has_function_privilege('authenticated', to_regprocedure('public.notify_user(uuid,text,text,text,text)'), 'EXECUTE')), false)),
  ('W2', 'award_achievement is NOT callable by anon/authenticated',
    coalesce(not (has_function_privilege('anon', to_regprocedure('public.award_achievement(uuid,text)'), 'EXECUTE') or has_function_privilege('authenticated', to_regprocedure('public.award_achievement(uuid,text)'), 'EXECUTE')), false)),
  ('W2', 'achievements + user_achievements have RLS',
    coalesce((select bool_and(relrowsecurity) from pg_class where oid in (to_regclass('public.achievements'), to_regclass('public.user_achievements'))), false)),

  -- ================= W3 =================
  ('W3', 'all cohort tables exist with RLS enabled',
    coalesce((select count(*) = 11 and bool_and(relrowsecurity) from pg_class where relnamespace = 'public'::regnamespace and relname in ('course_curriculum_sessions','course_cohorts','session_recordings','session_attendance','session_quizzes','session_quiz_questions','session_quiz_attempts','session_quiz_attempt_answers','session_tasks','graduation_project_reviews','saved_items')), false)),
  ('W3', 'live legacy quiz_* tables untouched (no cohort_id, still legacy shape)',
    exists (select 1 from information_schema.columns where table_schema='public' and table_name='quiz_questions' and column_name='correct_option')
    and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='quiz_attempts' and column_name='cohort_id')),
  ('W3', 'course_enrollments.course_id is nullable (cohort enrollments possible)',
    coalesce((select is_nullable = 'YES' from information_schema.columns where table_schema='public' and table_name='course_enrollments' and column_name='course_id'), false)),
  ('W3', 'certificates.course_id is nullable + exactly-one-target constraint',
    coalesce((select is_nullable = 'YES' from information_schema.columns where table_schema='public' and table_name='certificates' and column_name='course_id'), false)
    and exists (select 1 from pg_constraint where conrelid = to_regclass('public.certificates') and conname = 'certificates_exactly_one_target')),
  ('W3', 'legacy direct enrollment policy replaced (cohort seat-limit bypass closed)',
    not exists (select 1 from pg_policies where schemaname='public' and tablename='course_enrollments' and policyname='enrollments_insert_own')
    and exists (select 1 from pg_policies where schemaname='public' and tablename='course_enrollments' and policyname='enrollments_insert_own_legacy_course')),
  ('W3', 'legacy mentor policies no longer see cohort rows',
    exists (select 1 from pg_policies where schemaname='public' and tablename='course_submissions' and policyname='course_submissions_select_mentor' and qual like '%cohort_id IS NULL%')
    and exists (select 1 from pg_policies where schemaname='public' and tablename='submission_feedback' and policyname='submission_feedback_insert_mentor' and with_check like '%cohort_id IS NULL%')
    and exists (select 1 from pg_policies where schemaname='public' and tablename='course_sessions' and policyname='course_sessions_insert_mentor' and with_check like '%cohort_id IS NULL%')),
  ('W3', 'course_proposals: mentor cannot self-publish (transition trigger present)',
    exists (select 1 from pg_trigger where tgrelid = to_regclass('public.course_proposals') and tgname = 'course_proposals_guard_transitions_trg')
    and exists (select 1 from pg_policies where schemaname='public' and tablename='course_proposals' and policyname='course_proposals_insert_own_approved_mentor' and with_check like '%draft%')),
  ('W3', 'cohort lifecycle + curriculum freeze triggers present',
    (select count(*) = 5 from pg_trigger where not tgisinternal and tgname in ('course_cohorts_guard_trg','course_curriculum_sessions_freeze_trg','session_tasks_freeze_trg','session_quizzes_freeze_trg','session_quiz_questions_freeze_trg'))),
  ('W3', 'evaluate_cohort_completion is NOT callable by API roles',
    coalesce(not (has_function_privilege('anon', to_regprocedure('public.evaluate_cohort_completion(uuid,uuid)'), 'EXECUTE') or has_function_privilege('authenticated', to_regprocedure('public.evaluate_cohort_completion(uuid,uuid)'), 'EXECUTE')), false)),
  ('W3', 'enroll_in_cohort / submit_quiz_attempt / submit_graduation_review callable by authenticated only',
    coalesce(has_function_privilege('authenticated', to_regprocedure('public.enroll_in_cohort(uuid)'), 'EXECUTE') and not has_function_privilege('anon', to_regprocedure('public.enroll_in_cohort(uuid)'), 'EXECUTE')
      and has_function_privilege('authenticated', to_regprocedure('public.submit_quiz_attempt(uuid,uuid,jsonb)'), 'EXECUTE') and not has_function_privilege('anon', to_regprocedure('public.submit_quiz_attempt(uuid,uuid,jsonb)'), 'EXECUTE')
      and has_function_privilege('authenticated', to_regprocedure('public.submit_graduation_review(uuid,text,text,jsonb)'), 'EXECUTE') and not has_function_privilege('anon', to_regprocedure('public.submit_graduation_review(uuid,text,text,jsonb)'), 'EXECUTE'), false)),
  ('W3', 'new views are read-only for API roles',
    coalesce(not (has_table_privilege('anon', to_regclass('public.published_courses_public'), 'UPDATE') or has_table_privilege('authenticated', to_regclass('public.published_courses_public'), 'UPDATE')
      or has_table_privilege('anon', to_regclass('public.session_quiz_answer_key_for_reviewer'), 'UPDATE') or has_table_privilege('authenticated', to_regclass('public.session_quiz_answer_key_for_reviewer'), 'UPDATE')
      or has_table_privilege('authenticated', to_regclass('public.session_quiz_questions_for_student'), 'INSERT')), false)),
  ('W3', 'existing completed enrollments got status=completed (backfill), none left inconsistent',
    case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='course_enrollments' and column_name='status') then (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.course_enrollments where completed_at is not null and status <> ''completed''', false, true, '')))[1]::text::int = 0 else false end),

  -- ================= W4 =================
  ('W4', 'no table/view in public grants INSERT/UPDATE/DELETE/TRUNCATE to anon',
    not exists (select 1 from information_schema.role_table_grants where table_schema='public' and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE'))),
  ('W4', 'no table/view in public grants TRUNCATE/TRIGGER/REFERENCES to authenticated',
    not exists (select 1 from information_schema.role_table_grants where table_schema='public' and grantee='authenticated' and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES'))),
  ('W4', 'no trigger function is executable by anon/authenticated',
    not exists (select 1 from pg_proc p where p.pronamespace='public'::regnamespace and p.prorettype='trigger'::regtype and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE')))),
  ('W4', 'anon EXECUTE limited to the policy helpers + verify_certificate',
    (select coalesce(array_agg(p.proname::text order by p.proname::text), '{}') = array['has_permission','has_role','is_approved_mentor','is_assigned_mentor','is_super_admin','verify_certificate']
       from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' and has_function_privilege('anon', p.oid, 'EXECUTE'))),
  ('W4', 'default privileges no longer hand anon/authenticated new functions',
    not exists (select 1 from pg_default_acl d where d.defaclnamespace='public'::regnamespace and d.defaclobjtype='f' and (d.defaclacl::text like '%anon=X%' or d.defaclacl::text like '%authenticated=X%')))
)
select wave, name, passed from checks order by wave, name;
