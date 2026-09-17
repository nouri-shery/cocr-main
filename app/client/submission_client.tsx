"use client";

import * as React from "react";
import {
  saveSubmission, rateMentor, saveGraduationSubmission,
  type Submission, type CoursemateSubmission, type SubmissionFeedbackItem, type GraduationSubmission,
} from "../actions/submissions_actions";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportButton } from "./report_dialog";

export function LessonSubmissionSection({
  courseId, lessonId, initialSubmission, coursemateSubmissions, feedback, myRatingByMentor,
}: {
  courseId: string; lessonId: string;
  initialSubmission: Submission | null;
  coursemateSubmissions: CoursemateSubmission[];
  feedback: SubmissionFeedbackItem[];
  myRatingByMentor: Record<string, number | null>;
}) {
  const [submission, setSubmission] = React.useState(initialSubmission);
  const [content, setContent] = React.useState(initialSubmission?.content ?? "");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const save = (submit: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await saveSubmission(courseId, lessonId, content, submit);
      if (res.error) { setError(res.error); return; }
      setSubmission({
        id: submission?.id ?? "temp", course_id: courseId, lesson_id: lessonId,
        content, file_url: null,
        status: submit ? "submitted" : "draft",
        submitted_at: submit ? new Date().toISOString() : null,
        created_at: submission?.created_at ?? new Date().toISOString(),
      });
    });
  };

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="rounded-3xl border border-border bg-white p-6">
        <h2 className="mb-3 text-[1.05rem] font-extrabold">تسليم المهمة</h2>

        {submission?.status === "submitted" ? (
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[.78rem] font-bold text-green">
              <Check className="h-3.5 w-3.5" /> اتسلّم
            </span>
            <p className="whitespace-pre-wrap text-[.9rem] leading-relaxed text-muted-foreground">{submission.content}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="احكيلنا عن شغلك في المهمة دي، أو حطي لينك المشروع لو عندك."
              className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
            />
            {error && <p className="text-[.85rem] font-semibold text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => save(true)}
                className="rounded-xl bg-primary px-5 py-2.5 text-[.88rem] font-extrabold text-white disabled:opacity-60"
              >
                {pending ? "بيتبعت..." : "سلّمي المهمة"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => save(false)}
                className="rounded-xl border border-border px-5 py-2.5 text-[.88rem] font-bold text-slate-600 disabled:opacity-60"
              >
                احفظي كمسودة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* فيدباك المينتور على التسليم ده + تقييمه — بيقفل حلقة الـ peer learning */}
      {feedback.length > 0 && (
        <div className="flex flex-col gap-3">
          {feedback.map((f) => (
            <MentorFeedbackCard
              key={f.id}
              feedback={f}
              courseId={courseId}
              lessonId={lessonId}
              myRating={myRatingByMentor[f.mentor_id] ?? null}
            />
          ))}
        </div>
      )}

      {coursemateSubmissions.length > 0 && (
        <div className="rounded-3xl border border-border bg-white p-6">
          <h2 className="mb-3 text-[1.05rem] font-extrabold">شغل زمايلك في الكورس</h2>
          <div className="flex flex-col gap-3">
            {coursemateSubmissions.map((s) => (
              <div key={s.id} className="rounded-2xl border border-dashed border-border p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-[.85rem] font-extrabold">{s.student?.display_name ?? "زميلك"}</b>
                  <ReportButton targetType="submission" targetId={s.id} compact />
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[.85rem] text-muted-foreground">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** مشروع التخرّج — بيظهر تحت الكورس بعد ما الطالب يخلّص كل الدروس.
 * منفصل عن تسليمات الدروس (LessonSubmissionSection): تسليم واحد لكل كورس،
 * مش لكل درس، ومعاه لينك اختياري للمشروع بدل ملف مرفوع فعليًا. */
export function GraduationProjectSection({
  courseId, initialSubmission,
}: { courseId: string; initialSubmission: GraduationSubmission | null }) {
  const [submission, setSubmission] = React.useState(initialSubmission);
  const [content, setContent] = React.useState(initialSubmission?.content ?? "");
  const [link, setLink] = React.useState(initialSubmission?.file_url ?? "");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const save = (submit: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await saveGraduationSubmission(courseId, content, link, submit);
      if (res.error) { setError(res.error); return; }
      setSubmission({
        id: submission?.id ?? "temp", course_id: courseId,
        content, file_url: link.trim() || null,
        status: submit ? "submitted" : "draft",
        submitted_at: submit ? new Date().toISOString() : null,
        created_at: submission?.created_at ?? new Date().toISOString(),
      });
    });
  };

  return (
    <div className="mt-8 rounded-3xl border border-border bg-white p-6">
      <h2 className="mb-1 text-[1.05rem] font-extrabold">مشروع التخرّج</h2>
      <p className="mb-3 text-[.85rem] text-muted-foreground">خلّصتي كل دروس الكورس — دلوقتي وقت مشروع التخرّج بتاعك.</p>

      {submission?.status === "submitted" ? (
        <div>
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[.78rem] font-bold text-green">
            <Check className="h-3.5 w-3.5" /> اتسلّم
          </span>
          <p className="whitespace-pre-wrap text-[.9rem] leading-relaxed text-muted-foreground">{submission.content}</p>
          {submission.file_url && (
            <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[.85rem] font-bold text-primary underline">
              لينك المشروع
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="احكيلنا عن مشروع التخرّج بتاعك — إيه اللي عملتيه وإزاي."
            className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
          />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            type="url"
            placeholder="لينك المشروع (اختياري) — GitHub, Drive, أو أي حاجة تانية"
            className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
          />
          {error && <p className="text-[.85rem] font-semibold text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => save(true)}
              className="rounded-xl bg-primary px-5 py-2.5 text-[.88rem] font-extrabold text-white disabled:opacity-60"
            >
              {pending ? "بيتبعت..." : "سلّمي مشروع التخرّج"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => save(false)}
              className="rounded-xl border border-border px-5 py-2.5 text-[.88rem] font-bold text-slate-600 disabled:opacity-60"
            >
              احفظي كمسودة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MentorFeedbackCard({
  feedback, courseId, lessonId, myRating,
}: { feedback: SubmissionFeedbackItem; courseId: string; lessonId: string; myRating: number | null }) {
  const [rating, setRating] = React.useState(myRating ?? 0);
  const [comment, setComment] = React.useState("");
  const [sent, setSent] = React.useState(myRating !== null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const submitRating = () => {
    if (rating < 1) { setError("اختاري تقييم الأول."); return; }
    setError(null);
    startTransition(async () => {
      const res = await rateMentor(courseId, lessonId, feedback.mentor_id, rating, comment);
      if (res.error) { setError(res.error); return; }
      setSent(true);
    });
  };

  return (
    <div className="rounded-3xl border border-border bg-white p-6">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-[1.05rem] font-extrabold">فيدباك من المينتور</h2>
        {feedback.rating != null && (
          <span className="flex items-center gap-1 text-[.8rem] font-bold text-gold-600">
            <Star className="h-3.5 w-3.5 fill-gold text-gold" /> {feedback.rating}/5
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-[.9rem] leading-relaxed text-muted-foreground">
        {feedback.comment || "مفيش تعليق إضافي."}
      </p>

      <div className="mt-4 border-t border-dashed border-border pt-4">
        {sent ? (
          <p className="flex items-center gap-1.5 text-[.85rem] font-bold text-green">
            <Check className="h-4 w-4" /> شكرًا، قيّمتي المينتور ده.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-[.86rem] font-bold text-slate-600">قيّمي المينتور اللي راجع شغلك</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} من 5`}
                  aria-pressed={rating >= n}
                  className="p-0.5"
                >
                  <Star className={cn("h-6 w-6", rating >= n ? "fill-gold text-gold" : "text-slate-300")} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="ملاحظة عن المينتور (اختياري)"
              className="rounded-xl border border-border p-2.5 text-[.86rem] outline-none focus:border-primary"
            />
            {error && <p className="text-[.82rem] font-semibold text-destructive">{error}</p>}
            <button
              type="button"
              disabled={pending}
              onClick={submitRating}
              className="self-start rounded-xl bg-primary px-4 py-2 text-[.85rem] font-extrabold text-white disabled:opacity-60"
            >
              {pending ? "لحظة..." : "ابعتي التقييم"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
