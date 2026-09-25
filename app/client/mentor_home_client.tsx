"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Video, Send } from "lucide-react";
import { scheduleCourseSession, type SessionSaveResult } from "../actions/course_sessions_actions";
import { createDraftCourse, type CourseProposalResult } from "../actions/course_proposals_actions";
import type { Course } from "../types/types";

const initialState: SessionSaveResult = { error: null };
const initialProposalState: CourseProposalResult = { error: null };

/** فورم إنشاء سيشن مباشر من مساحة المينتور — بيستخدم نفس server action
 * الحقيقية اللي شغالة من صفحة الكورس (scheduleCourseSession)، هنا بس واجهة
 * أسرع بدل ما يضطر يروح لصفحة الكورس عشان يعمل schedule */
export function CreateSessionForm({ myCourses }: { myCourses: Course[] }) {
  const [courseId, setCourseId] = React.useState(myCourses[0]?.id ?? "");
  const [done, setDone] = React.useState(false);
  const action = React.useCallback(async (_prev: SessionSaveResult, formData: FormData): Promise<SessionSaveResult> => {
    const title = String(formData.get("title") ?? "");
    const scheduledAt = String(formData.get("scheduledAt") ?? "");
    const zoomLink = String(formData.get("zoomLink") ?? "");
    const res = await scheduleCourseSession(courseId, title, scheduledAt, zoomLink);
    if (!res.error) setDone(true);
    return res;
  }, [courseId]);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (myCourses.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-blue-50 px-5 py-6 text-center text-[.86rem] text-muted-foreground">
        مفيش كورسات في تراكك دلوقتي — لما يضاف كورس في تراكك تقدر تعمل schedule لسيشن ليه.
      </p>
    );
  }

  if (done) {
    return (
      <p className="rounded-2xl border border-primary/30 bg-blue-tint px-5 py-4 text-center text-[.86rem] font-bold text-primary">
        تم إنشاء السيشن ✓ — هتلاقيه في قسم &quot;سيشناتك&quot; وفي صفحة الكورس.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[.82rem] font-bold text-slate-600">الكورس</span>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="h-11 rounded-xl border border-border px-3 text-[.88rem] outline-none focus:border-primary"
        >
          {myCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.82rem] font-bold text-slate-600">عنوان السيشن</span>
        <input name="title" required minLength={3} placeholder="مثال: مراجعة سريعة على أساسيات HTML"
          className="h-11 rounded-xl border border-border px-3 text-[.88rem] outline-none focus:border-primary" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.82rem] font-bold text-slate-600">المعاد</span>
        <input name="scheduledAt" type="datetime-local" required
          className="h-11 rounded-xl border border-border px-3 text-[.88rem] outline-none focus:border-primary" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.82rem] font-bold text-slate-600">لينك الزوم</span>
        <input name="zoomLink" required placeholder="https://zoom.us/j/..."
          className="h-11 rounded-xl border border-border px-3 text-[.88rem] outline-none focus:border-primary" />
        <span className="text-[.74rem] text-muted-foreground">لينك الزوم لازم يتحدد الآن — مش ممكن يتضاف بعد إنشاء السيشن.</span>
      </label>
      {state.error && <p className="text-[.82rem] font-semibold text-destructive">{state.error}</p>}
      <button
        type="submit" disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[.88rem] font-extrabold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(30,69,196,.6)] disabled:pointer-events-none disabled:opacity-60"
      >
        <Video className="h-4 w-4" /> {pending ? "بيتعمل..." : "أنشئ السيشن"}
      </button>
    </form>
  );
}

export const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  draft: "مسودّة",
  submitted: "اتبعت للمراجعة",
  content_review: "قيد مراجعة المحتوى",
  technical_review: "قيد المراجعة الفنية",
  needs_changes: "محتاج تعديل",
  approved: "اتوافق عليه",
  published: "منشور",
  archived: "مؤرشف",
  rejected: "اتفض",
};
export const PROPOSAL_STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-gold-50 text-gold-600",
  content_review: "bg-gold-50 text-gold-600",
  technical_review: "bg-gold-50 text-gold-600",
  needs_changes: "bg-gold-50 text-gold-600",
  approved: "bg-green-50 text-green",
  published: "bg-green-50 text-green",
  archived: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

/** بداية كورس جديد — مسودّة بس لسه (draft)، المينتور بعد كده بيبني المنهج
 * كامل قبل ما يقدّمه للمراجعة. مختلف عن الفورم القديمة اللي كانت بتبعت
 * pitch بسيط وخلاص — دلوقتي بداية مساحة بناء كورس حقيقية */
export function CreateCourseProposalForm({ track }: { track: string }) {
  const router = useRouter();
  const action = React.useCallback(async (_prev: CourseProposalResult, formData: FormData): Promise<CourseProposalResult> => {
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const res = await createDraftCourse({
      title, description, track,
      learningOutcomes: [description.trim().slice(0, 200)].filter(Boolean),
      skills: [], ageMin: null, ageMax: null, prerequisites: "", weeklyWorkloadHours: null, level: "",
    });
    if (!res.error && res.id) router.push(`/mentor/courses/${res.id}`);
    return res;
  }, [track, router]);
  const [state, formAction, pending] = useActionState(action, initialProposalState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[.82rem] font-bold text-slate-600">عنوان الكورس</span>
        <input name="title" required minLength={3} placeholder="مثال: مقدمة في React"
          className="h-11 rounded-xl border border-border px-3 text-[.88rem] outline-none focus:border-primary" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.82rem] font-bold text-slate-600">فكرة الكورس</span>
        <textarea name="description" required rows={3} placeholder="هيغطّي إيه، ومناسب لمين؟"
          className="rounded-xl border border-border p-3 text-[.88rem] outline-none focus:border-primary" />
      </label>
      <p className="text-[.76rem] text-muted-foreground">هتقدر تكمّل نتائج التعلّم والمنهج والمشروع النهائي في الخطوة الجاية.</p>
      {state.error && <p className="text-[.82rem] font-semibold text-destructive">{state.error}</p>}
      <button
        type="submit" disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[.88rem] font-extrabold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(30,69,196,.6)] disabled:pointer-events-none disabled:opacity-60"
      >
        <Send className="h-4 w-4" /> {pending ? "بيتعمل..." : "ابدأ بناء الكورس"}
      </button>
    </form>
  );
}
