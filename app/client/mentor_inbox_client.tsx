"use client";

import * as React from "react";
import { submitMentorFeedback, type MentorInboxSubmission } from "../actions/submissions_actions";
import { Check } from "lucide-react";

export function SubmissionReviewRow({ submission }: { submission: MentorInboxSubmission }) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(submission.feedback_given);
  const [error, setError] = React.useState<string | null>(null);

  const send = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitMentorFeedback(submission.id, rating, comment);
      if (res.error) { setError(res.error); return; }
      setDone(true);
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.18)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <b className="text-[.9rem] font-extrabold">{submission.student?.display_name ?? "طالب"}</b>
        <span className="text-[.76rem] text-muted-foreground">{submission.course_id}</span>
      </div>
      <p className="whitespace-pre-wrap text-[.86rem] text-muted-foreground">{submission.content}</p>

      {done ? (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[.78rem] font-bold text-green">
          <Check className="h-3.5 w-3.5" /> اتراجع
        </span>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="h-10 w-32 rounded-xl border border-border px-2.5 text-[.85rem] outline-none focus:border-primary"
          >
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
          </select>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="ملاحظة للطالب (اختياري)"
            className="rounded-xl border border-border p-2.5 text-[.85rem] outline-none focus:border-primary"
          />
          {error && <p className="text-[.82rem] font-semibold text-destructive">{error}</p>}
          <button
            disabled={pending}
            onClick={send}
            className="self-start rounded-xl bg-primary px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
          >
            {pending ? "بيتبعت..." : "ابعتي التقييم"}
          </button>
        </div>
      )}
    </div>
  );
}
