-- Milestone 9 — توثيق قرار: moderation_log هو الكانونيكال، مش moderation_actions.
--
-- السياق: اتكشف وقت Phase 0 introspection إن فيه جدولين موجودين فعليًا،
-- شكلهم شبه بعض تقريبًا (moderator/actor_id, target_type, target_id, action,
-- reason, created_at)، ومكانش واضح مين الكانونيكال — اتسجّل كـ KNOWN-OPEN
-- في الـ Architecture Freeze checklist.
--
-- القرار (بعد فحص الكود كامل، مش تخمين): moderation_log هو المستخدم فعليًا —
-- logModeration() في admin_actions.ts بتكتب فيه على كل قرار مينتور (موافقة/
-- رفض/تعليق)، وRLS بتاعته اتصلّحت في 0006. moderation_actions مالوش أي
-- استخدام في الكود خالص (اتفحص بـ grep كامل) — نفس حالة الجداول التانية
-- المهجورة (courses/lessons القديمة).
--
-- القرار: ADOPT moderation_log كمصدر وحيد. moderation_actions بيتسيب من غير
-- استخدام (مش DROP — قرار حذف منفصل وواعي لوحده لو حد أكّد مفيش استخدام
-- تاني ليه)، بس بيتوثّق هنا كـ deprecated عشان أي حد يراجع السكيما بعدين
-- يلاقي القرار واضح من غير لبس.

begin;

comment on table public.moderation_actions is
  'DEPRECATED (2026-09) — غير مستخدم في الكود خالص. الجدول الكانونيكال الفعلي هو moderation_log (كل قرارات المينتور بتتسجّل فيه عن طريق admin_actions.ts). مسيبناه من غير حذف كـ tech debt موثّق، مش حل نهائي.';

commit;

-- ملحوظة تشغيل: DDL توثيقي بس (comment on table) — مفيش أي تغيير في البيانات
-- ولا في RLS ولا في أي عمود. آمن 100% ويرجع يتنفّذ تاني من غير مشاكل.
