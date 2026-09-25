-- Emergency lockdown — ثغرات حيّة مؤكّدة في الداتابيز الشغّالة دلوقتي -----
--
-- مستقل تمامًا: مفيش تغيير في أي داتا ولا في شكل أي جدول، ومعتمد بس على
-- حاجات موجودة فعلًا في الداتابيز الحية. لازم يتطبّق أول ملف في الحزمة
-- (ترتيبه الأبجدي بين 0016 و0017 بالظبط).
--
-- كل بند اتأكّد بـ (أ) نتيجة audit فعلية من الداتابيز الحية، و(ب) تجربة
-- فعلية على نسخة محلية مطابقة أثبتت إن الهجوم بينجح قبل الملف وبيتمنع بعده.
--
-- 1) profiles_public / sessions_public: views auto-updatable، مالكها postgres،
--    من غير security_invoker، و anon + authenticated عندهم INSERT/UPDATE/DELETE
--    عليهم. أي زائر من غير تسجيل دخول يقدر يعدّل display_name أو يمسح
--    بروفايلات/سيشنز، لأن الكتابة من خلال view بتتنفّذ بصلاحيات مالكها
--    وبتتخطّى RLS الجدول الأصلي. الإصلاح: سحب الكتابة (الـ SELECT سليم).
-- 2) mentor_applications: الإدخال كان بيفحص applicant_id بس، فأي مستخدم يدخل
--    طلب بـ status='approved' ويبقى "مينتور معتمد" فورًا ويقرا تسليمات كل
--    الطلاب في التراك. الإصلاح: الإدخال pending ومن غير مراجعة.
-- 3) guardian_approvals: نفس الفئة — القاصر يقدر يوافق لنفسه بحالة approved.
-- 4) profiles: authenticated عنده INSERT/DELETE و anon عنده كتابة كاملة،
--    والتطبيق بيعمل select/update بس — سحب اللي مالوش استخدام (defense-in-depth).
-- 5) mentor_profiles.assigned_course_ids: policy التعديل الذاتي مفيهاش قيود
--    أعمدة، فمينتور يكتب أي كورس قديم ويبقى is_assigned_mentor عليه. التطبيق
--    مبيلمسش الجدول ده. الإصلاح: تعديل bio بس.

begin;

do $$
declare
  v text;
begin
  foreach v in array array['profiles_public', 'sessions_public', 'project_reviews_for_owner', 'project_reviews_for_mentor']
  loop
    if to_regclass('public.' || v) is not null then
      execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon, authenticated', v);
    end if;
  end loop;
  foreach v in array array['project_reviews_for_owner', 'project_reviews_for_mentor']
  loop
    if to_regclass('public.' || v) is not null then
      execute format('revoke all on public.%I from anon', v);
    end if;
  end loop;
end $$;

drop policy if exists "mentor_applications own insert" on public.mentor_applications;
drop policy if exists "mentor_applications_insert_own_pending" on public.mentor_applications;
create policy "mentor_applications_insert_own_pending"
  on public.mentor_applications for insert
  to authenticated
  with check (
    applicant_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

do $$
begin
  if to_regclass('public.guardian_approvals') is not null then
    drop policy if exists "guardian_approvals self insert" on public.guardian_approvals;
    drop policy if exists "guardian_approvals_insert_self_pending" on public.guardian_approvals;
    create policy "guardian_approvals_insert_self_pending"
      on public.guardian_approvals for insert
      to authenticated
      with check (
        profile_id = auth.uid()
        and status = 'pending'
        and reviewed_by is null
        and reviewed_at is null
      );
  end if;
end $$;

revoke insert, update, delete, truncate, references, trigger on public.profiles from anon;
revoke insert, delete, truncate, references, trigger on public.profiles from authenticated;

do $$
begin
  if to_regclass('public.mentor_profiles') is not null then
    revoke insert, update, delete, truncate, references, trigger on public.mentor_profiles from anon;
    revoke insert, update, delete, truncate, references, trigger on public.mentor_profiles from authenticated;
    grant update (bio) on public.mentor_profiles to authenticated;
  end if;
end $$;

commit;

-- ملحوظة تشغيل: begin/commit واحد، idempotent. مفيش أي تأثير على تدفّق
-- التطبيق: بيقرا من الـ views بس، وبيدخل mentor_applications بالـ status
-- الافتراضي (pending)، ومبيلمسش guardian_approvals ولا mentor_profiles.
