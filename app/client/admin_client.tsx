"use client";

import * as React from "react";
import {
  reviewMentorApplication, resolveReport, suspendMentor, resolveDeletionRequest,
  type MentorApplication, type Report, type DeletionRequest,
} from "../actions/admin_actions";
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
