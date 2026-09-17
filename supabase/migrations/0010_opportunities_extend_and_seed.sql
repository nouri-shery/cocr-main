-- Milestone 10 — كتالوج الفرص: من array ثابت في الكود لجدول opportunities
-- الحقيقي الموجود بالفعل (بدل ما نعمل جدول جديد زي catalog_courses).
--
-- السياق: بعد فحص كامل (اتراجع في الشات قبل الكتابة)، اتأكد إن public.
-- opportunities جدول حقيقي وقديم، بس عمود واحد بس فيه NOT NULL محتاج قيمة
-- (opportunity_type) وباقي الأعمدة اللي الـ UI الحالي محتاجها (category،
-- tags، icon/accent، duration، ageNote/deadlineNote، verified منفصل عن
-- status) مش موجودة. القرار (Option: Extend): نضيف الأعمدة الناقصة دي بس،
-- من غير ما نخترع جدول تاني زي catalog_courses — الجدول ده أصلاً موجود
-- ومخصص بالظبط للمفهوم ده، وربطه بـ favorites/student_opportunity_status
-- (uuid FK حقيقي) مش هيشتغل غير كده.
--
-- ملحوظة مهمة (فرق حقيقي عن الكورسات): opportunities.id uuid حقيقي —
-- مش نص زي أكواد الكورسات. يعني الـ URL بتاع أي فرصة (/opportunities/[id])
-- هيتغيّر من slug وصفي (زي uwc-ibdp-scholarship) لـ uuid. أي لينك قديم
-- محفوظ من حد هيرجّع 404 — تريد-أوف واعي مش سهو، مفيش بديل آمن من غير
-- بناء نظام slug منفصل مش مطلوب دلوقتي.
--
-- ملحوظة تانية: لو فيه صفوف قديمة في saved_items (item_type='opportunity')
-- بالـ slugs القديمة، هتفضل موجودة زي ما هي (مش هتتحذف) بس مش هيتقرا منها
-- بعد النهارده — الكود هيتحول يستخدم favorites بدل كده للفرص. الاحتمال
-- إن فيه بيانات حقيقية فعلاً محفوظة كده ضعيف جدًا (المنصة لسه في مرحلة
-- مبكرة)، فمقررناش نبني migration خاص لنقلها — لو ظهر إنها موجودة فعليًا،
-- دي خطوة منفصلة بعدين.

begin;

-- ============================================================
-- 1) الأعمدة الناقصة — كلها nullable أو بـ default آمن، عشان تشتغل
-- من غير ما تعتمد على إن الجدول فاضي فعلاً (مش مؤكدين عدد الصفوف الحالي)
-- ============================================================
alter table public.opportunities
  add column if not exists category text,
  add column if not exists icon text,
  add column if not exists accent text,
  add column if not exists duration text,
  add column if not exists age_note text,
  add column if not exists deadline_note text,
  add column if not exists eligibility text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists verified boolean not null default false,
  add column if not exists featured boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'opportunities_category_check' and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities add constraint opportunities_category_check
      check (category in ('competition', 'stem', 'writing', 'speaking', 'leadership', 'grant'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'opportunities_accent_check' and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities add constraint opportunities_accent_check
      check (accent in ('blue', 'gold', 'green', 'ink'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'opportunities_delivery_mode_check' and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities add constraint opportunities_delivery_mode_check
      check (delivery_mode is null or delivery_mode in ('online', 'offline', 'hybrid'));
  end if;
end $$;

-- ============================================================
-- 2) RLS — إضافة سياسة SELECT عامة للفرص المنشورة بس. سياسة permissive
-- جديدة زي دي بتتضاف فوق أي سياسة موجودة بالفعل (بوستجرس بيعمل OR بين
-- الـ permissive policies) — يعني آمنة تمامًا حتى لو فيه سياسة SELECT
-- تانية مقفولة أكتر مش عارفين تفاصيلها.
-- ============================================================
drop policy if exists "opportunities_select_published" on public.opportunities;
create policy "opportunities_select_published"
  on public.opportunities for select
  to anon, authenticated
  using (status = 'published');

grant select on public.opportunities to anon, authenticated;

-- ============================================================
-- 3) Seed — نفس الـ 9 فرص الحقيقية اللي كانت في opportunities_actions.ts
-- بالظبط (بيانات بحث حقيقي حسب التعليق الأصلي في الكود، مش مُختلَقة)،
-- من غير أي إضافة أو تغيير في المحتوى نفسه.
-- ============================================================
-- researcher_not_reviewer CHECK بتستخدم IS DISTINCT FROM (مش !=) — يعني
-- بتفشل حتى لو الاتنين null (NULL IS DISTINCT FROM NULL = false)، عكس
-- الافتراض الأول. محتاجين قيمتين حقيقيتين مختلفتين. استخدمنا حسابين
-- تجريبيين/نظاميين واضحين (مش طالب حقيقي ولا شخص حقيقي) عشان الـ seed ده
-- مش نتيجة بحث/مراجعة فعلية حصلت، هو bootstrap محتوى بس.
insert into public.opportunities (
  title, provider, opportunity_type, summary, official_source_url,
  deadline, deadline_timezone, min_age, max_age, eligible_countries,
  location, delivery_mode, funding_label, cost, requirements, required_documents,
  category, icon, accent, duration, age_note, deadline_note, eligibility, tags, verified, featured, status,
  researcher_id, reviewer_id
) values
  (
    'منحة دبلومة البكالوريا الدولية (IB) من United World Colleges', 'United World Colleges (UWC)',
    'منحة دراسية سكنية',
    'ادرس في إحدى مدارس United World Colleges واحصل على دبلومة IB الدولية وانت عايش ومتعلم مع طلاب من كل العالم — دعم مالي جزئي أو كامل متاح عن طريق اللجنة الوطنية حسب احتياج الطالب.',
    'https://eg.uwc.org/eligibility-criteria/?lang=ar',
    null, null, null, null, array['Egypt'],
    'عالمي — تقديم عن طريق اللجنة الوطنية في مصر (UWC Egypt)', 'offline', 'partially_funded',
    'دعم مالي جزئي أو كامل متاح حسب احتياج الطالب', null, null,
    'grant', 'compass', 'gold', 'سنتين — برنامج IB Diploma سكني كامل',
    'بيختلف حسب لجنة UWC ومسار التقديم — في مصر عادة مواليد 2008–2010 تقريبًا',
    'بيختلف حسب الدولة — راجع UWC Egypt',
    array['مواطن مصري أو مقيم في مصر', 'استيفاء شرط السن المعلن من UWC Egypt', 'إنهاء الصف الثالث الإعدادي أو ما يعادله، ومش في آخر سنة دراسية', 'سجل أكاديمي قوي، واهتمام بالتفاهم بين الثقافات والاستدامة', 'أكتر من 80% من الطلاب المقبولين عن طريق اللجان الوطنية بياخدوا دعم مالي جزئي أو كامل'],
    array['منحة دراسية', 'IB', 'دولي', 'قيادة', 'دعم مالي', 'مصر'],
    true, true, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  ),
  (
    'Breakthrough Junior Challenge 2026', 'Breakthrough Prize Foundation',
    'مسابقة فيديو علمي',
    'اعمل فيديو قصير بتشرح فيه مفهوم علمي معقّد بطريقة مبسّطة وممتعة — أفضل فيديو ياخد منحة دراسية كبيرة.',
    'https://breakthroughjuniorchallenge.org',
    '2026-09-15'::timestamptz, null, 13, 18, '{}',
    'عالمي', 'online', 'free', null, null, null,
    'competition', 'medal', 'gold', null, null, null,
    array['السن من 13 لـ 18 سنة', 'فيديو أصلي من إنتاجك', 'أي مجال علمي (فيزياء، أحياء، رياضيات...)'],
    array['علوم', 'فيديو', 'منحة دراسية'],
    false, true, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  ),
  (
    'Wharton Global High School Investment Competition', 'Wharton School — University of Pennsylvania',
    'مسابقة استثمار جماعية',
    'تكوّن فريق وتدير محفظة استثمار وهمية لمدة عشر أسابيع — تتعلم أساسيات الاستثمار والتحليل المالي عمليًا.',
    'https://globalyouth.wharton.upenn.edu/investment-competition/',
    '2026-09-11'::timestamptz, null, 14, 18, '{}',
    'عالمي', 'online', 'free', null, null, null,
    'competition', 'target', 'blue', null, null, null,
    array['طالب ثانوي (تقريبًا 14-18 سنة)', 'العمل في فريق من 4-5 أفراد', 'مشرف/معلّم يوافق على التسجيل'],
    array['استثمار', 'فريق', 'مالية'],
    false, false, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  ),
  (
    'International Youth Environmental Challenge 2026', 'IYEC',
    'تحدي بيئي',
    'قدّم حل مبتكر لمشكلة بيئية حقيقية في مجتمعك — بحث، مشروع، أو حملة توعية.',
    'https://www.iyec.org',
    '2026-10-15'::timestamptz, null, 13, 18, '{}',
    'عالمي', 'online', 'free', null, null, null,
    'competition', 'compass', 'green', null, null, null,
    array['السن من 13 لـ 18 سنة', 'مشروع بيئي أصلي (فردي أو جماعي)'],
    array['بيئة', 'استدامة', 'مشروع'],
    false, false, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  ),
  (
    'Conrad Challenge 2026–27', 'Conrad Foundation',
    'تحدي ابتكار STEM',
    'مسابقة ابتكار STEM بتحويل فكرتك لمنتج أو خدمة فعلية — فريق، Pitch، وخبراء بيراجعوا شغلك.',
    'https://www.conradchallenge.org',
    '2026-10-29'::timestamptz, null, 13, 18, '{}',
    'عالمي', 'hybrid', 'free', null, null, null,
    'stem', 'rocket', 'blue', null, null, null,
    array['السن من 13 لـ 18 سنة', 'فريق من 2-5 أفراد', 'فكرة ابتكارية في مجال STEM'],
    array['STEM', 'ابتكار', 'ريادة أعمال'],
    false, true, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  ),
  (
    'Journal of Emerging Investigators', 'JEI',
    'نشر بحث علمي',
    'انشر بحثك العلمي الأصلي في مجلة أكاديمية بتراجع أبحاث طلاب المرحلة المتوسطة والثانوية.',
    'https://emerginginvestigators.org',
    null, null, 13, 18, '{}',
    'عالمي', 'online', 'free', null, null, null,
    'stem', 'bulb', 'green', null, null, null,
    array['طالب في المرحلة المتوسطة أو الثانوية', 'بحث علمي أصلي بإشراف معلّم أو مرشد'],
    array['بحث', 'نشر علمي', 'مستمر'],
    false, false, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  ),
  (
    'Immerse Education Essay Competition', 'Immerse Education',
    'مسابقة مقال',
    'اكتب مقال في مجال دراسي بتحبه — أفضل المقالات بتاخد منح جزئية لبرامج Immerse الصيفية.',
    'https://www.immerse.education/essay-competition/',
    '2026-10-25'::timestamptz, null, 13, 18, '{}',
    'عالمي', 'online', 'free', null, null, null,
    'writing', 'chat', 'gold', null, null, null,
    array['السن من 13 لـ 18 سنة', 'مقال أصلي مش أطول من 500 كلمة (حسب المجال)'],
    array['كتابة', 'منحة جزئية', 'أكاديمي'],
    false, false, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  ),
  (
    'TED Summer School Public Speaking Challenge', 'TED-Ed',
    'تحدي إلقاء',
    'سجّل فيديو قصير (فكرة تستاهل الانتشار) وطوّر مهارات الإلقاء والتأثير بتاعتك.',
    'https://ed.ted.com',
    null, null, 14, 18, '{}',
    'عالمي', 'online', 'free', null, null, null,
    'speaking', 'mic', 'ink', null, null, null,
    array['السن من 14 لـ 18 سنة', 'فيديو 3-5 دقايق بفكرة أصلية'],
    array['إلقاء', 'فيديو', 'دورة قادمة'],
    false, false, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  ),
  (
    'Veya International Prize 2026–27', 'Veya',
    'جائزة قيادة شبابية',
    'مسابقة عالمية بتكرّم مبادرات الشباب في القيادة والتأثير المجتمعي.',
    'https://veya.org',
    null, null, 12, 19, '{}',
    'عالمي', 'online', 'free', null, null, null,
    'leadership', 'compass', 'ink', null, null, null,
    array['السن من 12 لـ 19 سنة', 'مبادرة أو مشروع قيادي حقيقي'],
    array['قيادة', 'مجتمع', 'عالمي'],
    false, false, 'published',
    '293c12a3-8371-4fc0-b9bf-75f26deb97a1', '7a991ba2-df16-486a-9721-078fa9cff9f2'
  );

commit;

-- ملحوظة تشغيل: begin/commit واحد. الأعمدة والـ constraints والـ policy
-- كلها idempotent (add column if not exists / existence check يدوي /
-- drop+create policy). الـ INSERT مش idempotent عمدًا (زي أي seed حقيقي)
-- — لو الملف اتشغّل تاني، هيكرر الـ 9 صفوف. لو محتاجين نعيد التشغيل لازم
-- نتأكد الأول إن مفيش صفوف موجودة بنفس العناوين.
