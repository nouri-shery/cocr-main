# Supabase migrations

هذا المجلد فيه SQL حقيقي لازم يتشغّل على مشروع Supabase الفعلي قبل ما ميزات
Milestone 2 (enrollment/profile/projects/feedback الحقيقية) و Milestone 3
(courses/lessons/lesson_progress الحقيقية) تشتغل. الكود في التطبيق مكتوب
بالفعل عشان يستخدم الجداول دي — بدونها هيرجع نتايج فاضية بس مش هيكسر (empty
states بدل errors)، لكن مفيش حفظ حقيقي هيحصل.

## إزاي تشغّله

**الطريقة الأسهل — Supabase Dashboard:**
1. افتح مشروعك على supabase.com → **SQL Editor**.
2. افتح كل ملف رقمي بالترتيب (`0001_milestone2_foundation.sql` بعدين
   `0002_milestone3_learning_system.sql` بعدين `0003_first_real_lesson.sql`)،
   انسخ محتوى كل واحد بالكامل.
3. الصقه في الـ SQL Editor ودوس **Run** — واحد بعد التاني بالترتيب.
4. المفروض يظهر "Success" — لو ظهر أي error، ابعته.

`0003_first_real_lesson.sql` بيضيف أول درس حقيقي ("يعني إيه Web Page؟") لكورس
`fe-basics` — **لازم يتشغّل يدويًا** لأن `authenticated`/`anon` معندهمش
INSERT grant على `catalog_lessons` عمدًا (المحتوى admin-managed).

`0002_milestone3_learning_system.sql` اتصحح مرتين: أول مرة اكتشفنا إن
`courses`/`course_modules`/`lessons`/`lesson_progress` موجودين بالفعل
(schema حقيقي بـ uuid ids عمله فريق الـ backend، مش مستخدم في أي كود لسه)،
وتاني مرة اكتشفنا إن `courses` فيها `creator_id`/`reviewer_id` (كل واحد
`references auth.users`) تحت `CHECK (creator_id IS DISTINCT FROM reviewer_id)`
بيرفض NULL/NULL — يعني مفيش صف ممكن يتضاف في `courses` من غير creator حقيقي
وreviewer حقيقي مختلف عنه، وده workflow authoring/review مش موجود في الكود
خالص لحد دلوقتي. **قررنا صراحةً إننا منستخدمش test accounts ولا نخترع
UUIDs ولا نضعّف الـ constraint ده** — فالجداول الأربعة دي فضلت **من غير أي
لمس خالص** في النسخة النهائية.

بدالها، النسخة الحالية بتعمل جدولين جداد مستقلين تمامًا:
`catalog_lessons` و`catalog_lesson_progress` — مربوطين بنفس الـ `course_id`
النصّي (text) اللي `course_enrollments` بيستخدمه من M2، بدون أي علاقة
بـ`courses` الحقيقي. **مفيش أي دروس حقيقية بتتضاف** — الجدولين بيتعملوا فاضيين
تمامًا.

**مهم بعد ما الـmigration دي تتشغّل:** كود التطبيق (`app/actions/lessons_actions.ts`
وما يتعلق بيه) لسه مكتوب على أساس اسم جدول قديم (`lessons`/`lesson_progress`)
— محتاج تحديث منفصل يشاور على `catalog_lessons`/`catalog_lesson_progress`
قبل ما ميزة الدروس تشتغل فعليًا من الواجهة، حتى بعد نجاح الـmigration.

**أو عن طريق الـ CLI** (لو عندك Supabase CLI متوصّل بالمشروع):
```bash
supabase link --project-ref <project-ref>
supabase db push
```

## أمان الـ migration

- كل الجمل بتستخدم `if not exists` / `drop policy if exists` — يعني تقدر
  تشغّله أكتر من مرة من غير ما يكسر حاجة (idempotent).
- الـ backfill (نقل بيانات `user_metadata` القديمة لـ `profiles` و
  `course_enrollments`) بيستخدم `on conflict ... do nothing` — الحسابات
  الموجودة قبل كده مش هتتأثر أو تتكرر.
- **معملتش أي test فعلي للـ SQL ده على قاعدة بيانات حقيقية** (معنديش
  service-role key ولا Docker محلي لتشغيل Supabase local stack) — الصياغة
  دقيقة ومبنية على أنماط Supabase الموثّقة رسميًا (trigger على `auth.users`،
  RLS بـ `auth.uid()`، إلخ)، لكن لازم تتأكد بعد التشغيل إن كل حاجة شغالة زي
  المتوقع.
