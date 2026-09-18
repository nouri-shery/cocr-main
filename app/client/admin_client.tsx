"use client";

import * as React from "react";
import {
  reviewMentorApplication, resolveReport, suspendMentor, resolveDeletionRequest, reviewCourseProposal,
  reviewProject,
  type MentorApplication, type Report, type DeletionRequest, type CourseProposal,
} from "../actions/admin_actions";
import type { ProjectWithOwner } from "../actions/projects_actions";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-50 text-gold-600",
  open: "bg-gold-50 text-gold-600",
  approved: "bg-green-50 text-green",
  reviewed: "bg-green-50 text-green",
  completed: "bg-green-50 text-green",
  resolved: "bg-green-50 text-green",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export function MentorApplicationRow({ application }: { application: MentorApplication }) {
  const [note, setNote] = React.useState(application.notes ?? "");
  const [pending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState(application.status);

  const decide = (decision: "approved" | "rejected") => {
    startTransition(async () => {
      const res = await reviewMentorApplication(application.id, decision, note);
      if (!res.error) setStatus(decision);
    });
  };

  const suspend = () => {
    startTransition(async () => {
      const res = await suspendMentor(application.id, note);
      if (!res.error) setStatus("suspended");
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <b className="text-[.95rem] font-extrabold">{application.applicant?.display_name ?? "طالب"}</b>
        <span className={cn("rounded-full px-3 py-1 text-[.76rem] font-bold", STATUS_STYLE[status])}>{status}</span>
      </div>
      <p className="text-[.85rem] text-muted-foreground">التراك: <b className="text-foreground">{application.track}</b></p>
      {application.motivation && <p className="mt-1 text-[.85rem] text-muted-foreground">{application.motivation}</p>}
      {application.prior_projects && (
        <p className="mt-1 text-[.85rem] text-muted-foreground">مشاريع سابقة: {application.prior_projects}</p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[.8rem] text-muted-foreground sm:grid-cols-3">
        <span>{application.gender === "female" ? "بنت" : "ولد"} — {application.age} سنة</span>
        <span>عايزة تعلّم سن {application.student_age_min}–{application.student_age_max}</span>
        <span>إيميل ولي الأمر: {application.guardian_email}</span>
      </div>
      <p className="mt-1 text-[.78rem] text-muted-foreground">
        التدريب: {application.leads_training_completed_at ? "خلّصه" : "لسه ماخلصوش"}
      </p>

      {status === "pending" && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة (اختياري)"
            rows={2}
            className="rounded-xl border border-border p-2.5 text-[.85rem] outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => decide("approved")}
              className="rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
            >
              موافقة
            </button>
            <button
              disabled={pending}
              onClick={() => decide("rejected")}
              className="rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-slate-600 disabled:opacity-60"
            >
              رفض
            </button>
          </div>
        </div>
      )}

      {status === "approved" && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="سبب التعليق (اختياري)"
            rows={2}
            className="rounded-xl border border-border p-2.5 text-[.85rem] outline-none focus:border-primary"
          />
          <button
            disabled={pending}
            onClick={suspend}
            className="self-start rounded-xl border border-destructive/30 px-4 py-2 text-[.85rem] font-bold text-destructive disabled:opacity-60"
          >
            علّقي حساب المينتور
          </button>
        </div>
      )}
    </div>
  );
}

export function CourseProposalRow({ proposal }: { proposal: CourseProposal }) {
  const [note, setNote] = React.useState(proposal.notes ?? "");
  const [pending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState(proposal.status);

  const decide = (decision: "approved" | "rejected") => {
    startTransition(async () => {
      const res = await reviewCourseProposal(proposal.id, decision, note);
      if (!res.error) setStatus(decision);
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <b className="text-[.95rem] font-extrabold">{proposal.title}</b>
        <span className={cn("rounded-full px-3 py-1 text-[.76rem] font-bold", STATUS_STYLE[status])}>{status}</span>
      </div>
      <p className="text-[.85rem] text-muted-foreground">
        المينتور: <b className="text-foreground">{proposal.mentor?.display_name ?? "مينتور"}</b> · التراك: <b className="text-foreground">{proposal.track}</b>
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[.85rem] text-muted-foreground">{proposal.description}</p>

      {status === "pending" && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة (اختياري)"
            rows={2}
            className="rounded-xl border border-border p-2.5 text-[.85rem] outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => decide("approved")}
              className="rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
            >
              موافقة
            </button>
            <button
              disabled={pending}
              onClick={() => decide("rejected")}
              className="rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-slate-600 disabled:opacity-60"
            >
              رفض
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeletionRequestRow({ request }: { request: DeletionRequest }) {
  const [pending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState(request.status);

  const resolve = (next: "completed" | "cancelled") => {
    startTransition(async () => {
      const res = await resolveDeletionRequest(request.id, next);
      if (!res.error) setStatus(next);
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <b className="text-[.95rem] font-extrabold">{request.requester?.display_name ?? "مستخدم"}</b>
        <span className={cn("rounded-full px-3 py-1 text-[.76rem] font-bold", STATUS_STYLE[status])}>{status}</span>
      </div>
      {request.reason && <p className="mt-1 text-[.85rem] text-muted-foreground">{request.reason}</p>}

      {status === "pending" && (
        <div className="mt-3 flex gap-2">
          <button
            disabled={pending}
            onClick={() => resolve("completed")}
            className="rounded-xl bg-destructive px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
          >
            اتعمل الحذف
          </button>
          <button
            disabled={pending}
            onClick={() => resolve("cancelled")}
            className="rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-slate-600 disabled:opacity-60"
          >
            إلغاء الطلب
          </button>
        </div>
      )}
    </div>
  );
}

export function ReportRow({ report }: { report: Report }) {
  const [pending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState(report.status);

  const resolve = (next: "reviewed" | "resolved") => {
    startTransition(async () => {
      const res = await resolveReport(report.id, next);
      if (!res.error) setStatus(next);
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <b className="text-[.95rem] font-extrabold">{report.reason}</b>
        <span className={cn("rounded-full px-3 py-1 text-[.76rem] font-bold", STATUS_STYLE[status])}>{status}</span>
      </div>
      <p className="text-[.85rem] text-muted-foreground">
        النوع: <b className="text-foreground">{report.target_type}</b> — ID: {report.target_id ?? "—"}
      </p>
      {report.details && <p className="mt-1 text-[.85rem] text-muted-foreground">{report.details}</p>}
      <p className="mt-1 text-[.78rem] text-muted-foreground">بلّغ عنه: {report.reporter?.display_name ?? "مستخدم"}</p>

      {status === "open" && (
        <div className="mt-3 flex gap-2">
          <button
            disabled={pending}
            onClick={() => resolve("reviewed")}
            className="rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
          >
            اتراجع
          </button>
          <button
            disabled={pending}
            onClick={() => resolve("resolved")}
            className="rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-slate-600 disabled:opacity-60"
          >
            اتقفل
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* مراجعة مشاريع التخرّج — كل قرار (موافقة/رفض) بيتسجّل history record
 * جديد في project_reviews، مفيش overwrite لأي قرار قديم */
/* ------------------------------------------------------------------ */
export function ProjectReviewQueue({ projects }: { projects: ProjectWithOwner[] }) {
  const [items, setItems] = React.useState(projects);

  if (items.length === 0) return <p className="text-[.9rem] text-muted-foreground">مفيش مشاريع مستنية مراجعة دلوقتي.</p>;

  return (
    <div className="flex flex-col gap-3">
      {items.map((p) => (
        <ProjectReviewRow key={p.id} project={p} onDecided={() => setItems((cur) => cur.filter((x) => x.id !== p.id))} />
      ))}
    </div>
  );
}

function ProjectReviewRow({ project, onDecided }: { project: ProjectWithOwner; onDecided: () => void }) {
  const [note, setNote] = React.useState("");
  const [studentScore, setStudentScore] = React.useState("");
  const [mentorScore, setMentorScore] = React.useState("");
  const [mentorId, setMentorId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const decide = (decision: "approved" | "rejected") => {
    setError(null);
    startTransition(async () => {
      const res = await reviewProject(project.id, {
        decision,
        reviewerNote: note,
        studentScore: studentScore ? Number(studentScore) : null,
        mentorScore: mentorScore ? Number(mentorScore) : null,
        mentorId: project.mentor_id ? null : (mentorId.trim() || null),
      });
      if (res.error) setError(res.error);
      else onDecided();
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <b className="text-[.95rem] font-extrabold">{project.title}</b>
        <span className="rounded-full bg-gold-50 px-3 py-1 text-[.76rem] font-bold text-gold-600">مستني مراجعة</span>
      </div>
      <p className="text-[.85rem] text-muted-foreground">
        الطالب: <b className="text-foreground">{project.owner?.display_name ?? "طالب"}</b> · الكورس: <b className="text-foreground">{project.course_id ?? "—"}</b>
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[.85rem] text-muted-foreground">{project.description}</p>
      {project.skills.length > 0 && (
        <p className="mt-1 text-[.8rem] text-muted-foreground">المهارات: {project.skills.join("، ")}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-3 text-[.82rem]" dir="ltr">
        {project.project_link && <a href={project.project_link} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">Demo ↗</a>}
        {project.github_url && <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">GitHub ↗</a>}
        {project.video_url && <a href={project.video_url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">Video ↗</a>}
      </div>
      <p className="mt-2 text-[.78rem] text-muted-foreground">
        المنتور المحسوب تلقائيًا: {project.mentor_id ? <b className="text-foreground">{project.mentor_id}</b> : "مفيش (صفر أو أكتر من منتور محتمل — حددي واحد تحت لو عندك معلومة)"}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[.8rem] font-bold text-slate-600">
          تقييم استفادة الطالب من الكورس (1-5، اختياري)
          <input
            type="number" min={1} max={5} value={studentScore}
            onChange={(e) => setStudentScore(e.target.value)}
            className="h-10 rounded-lg border border-border px-2.5 text-[.85rem] outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-[.8rem] font-bold text-slate-600">
          تقييم أداء المنتور (1-5، اختياري)
          <input
            type="number" min={1} max={5} value={mentorScore}
            onChange={(e) => setMentorScore(e.target.value)}
            className="h-10 rounded-lg border border-border px-2.5 text-[.85rem] outline-none focus:border-primary"
          />
        </label>
      </div>

      {!project.mentor_id && (
        <label className="mt-2 flex flex-col gap-1 text-[.8rem] font-bold text-slate-600">
          تحديد المنتور يدويًا (UUID — اختياري، لو معروف)
          <input
            value={mentorId} onChange={(e) => setMentorId(e.target.value)} dir="ltr" placeholder="مفيش مطابقة تلقائية واضحة"
            className="h-10 rounded-lg border border-border px-2.5 text-[.85rem] outline-none focus:border-primary"
          />
        </label>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ملاحظة — لازم تتكتب لو هترفضي"
        rows={2}
        className="mt-3 w-full rounded-xl border border-border p-2.5 text-[.85rem] outline-none focus:border-primary"
      />
      {error && <p className="mt-1.5 text-[.82rem] font-semibold text-destructive">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          disabled={pending}
          onClick={() => decide("approved")}
          className="rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
        >
          موافقة ونشر
        </button>
        <button
          disabled={pending}
          onClick={() => decide("rejected")}
          className="rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-slate-600 disabled:opacity-60"
        >
          رفض
        </button>
      </div>
    </div>
  );
}
