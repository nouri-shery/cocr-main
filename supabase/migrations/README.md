# Supabase migrations

هذا المجلد فيه SQL حقيقي لازم يتشغّل على مشروع Supabase الفعلي قبل ما ميزات
Milestone 2 (enrollment/profile/projects/feedback الحقيقية) تشتغل. الكود في
التطبيق مكتوب بالفعل عشان يستخدم الجداول دي — بدونها هيرجع نتايج فاضية بس مش
هيكسر (empty states بدل errors)، لكن مفيش حفظ حقيقي هيحصل.

## إزاي تشغّله

**الطريقة الأسهل — Supabase Dashboard:**
1. افتح مشروعك على supabase.com → **SQL Editor**.
2. افتح ملف `0001_milestone2_foundation.sql` من المجلد ده، انسخ محتواه بالكامل.
3. الصقه في الـ SQL Editor ودوس **Run**.
4. المفروض يظهر "Success. No rows returned" — لو ظهر أي error، ابعته.

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
