"use client";

import * as React from "react";
import Link from "next/link";
import {
  reviewMentorApplication, resolveReport, suspendMentor, resolveDeletionRequest, reviewCourseProposal,
  reviewProject, proposeOpportunity, advanceOpportunityStage, reviewOpportunityDecision,
  type MentorApplication, type Report, type DeletionRequest, type CourseProposal, type OpportunityInReview,
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
  needs_changes: "bg-gold-50 text-gold-600",
  cancelled: "bg-muted text-muted-foreground",
};

const DAY_LABEL: Record<string, string> = {
  saturday: "سبت", sunday: "حد", monday: "اتنين", tuesday: "تلات",
  wednesday: "أربع", thursday: "خميس", friday: "جمعة",
};

export function MentorApplicationRow({ application }: { application: MentorApplication }) {
  const [note, setNote] = React.useState(application.notes ?? "");
  const [pending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState(application.status);

  const decide = (decision: "approved" | "rejected" | "needs_changes") => {
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

      {application.expertise_areas.length > 0 && (
        <p className="mt-2 text-[.8rem] text-muted-foreground">
          مجالاته: <b className="text-foreground">{application.expertise_areas.join("، ")}</b>
        </p>
      )}
      {(application.portfolio_url || application.github_url) && (
        <p className="mt-1 flex gap-3 text-[.8rem]" dir="ltr">
          {application.portfolio_url && <a href={application.portfolio_url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">Portfolio ↗</a>}
          {application.github_url && <a href={application.github_url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">GitHub ↗</a>}
        </p>
      )}
      {(application.preferred_days.length > 0 || application.preferred_time || application.weekly_availability_hours || application.preferred_cohort_size) && (
        <p className="mt-1 text-[.78rem] text-muted-foreground">
          {application.preferred_days.length > 0 && `أيام: ${application.preferred_days.map((d) => DAY_LABEL[d] ?? d).join("، ")}`}
          {application.preferred_time && ` · وقت: ${application.preferred_time}`}
          {application.weekly_availability_hours && ` · ${application.weekly_availability_hours} ساعة/أسبوع`}
          {application.preferred_cohort_size && ` · دفعة مفضّلة: ${application.preferred_cohort_size}`}
        </p>
      )}

      {status === "pending" && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة — لازم لو هترجّعي الطلب لتعديل"
            rows={2}
            className="rounded-xl border border-border p-2.5 text-[.85rem] outline-none focus:border-primary"
          />
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending}
              onClick={() => decide("approved")}
              className="rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
            >
              موافقة
            </button>
            <button
              disabled={pending}
              onClick={() => decide("needs_changes")}
              className="rounded-xl border border-gold-600/40 px-4 py-2 text-[.85rem] font-bold text-gold-600 disabled:opacity-60"
            >
              محتاج تعديل
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

const COURSE_STATUS_LABEL: Record<string, string> = {
  submitted: "اتبعت للمراجعة",
  content_review: "قيد مراجعة المحتوى",
  technical_review: "قيد المراجعة الفنية",
};

/** كارت ملخّص بس — المراجعة التفصيلية (المنهج كامل) في صفحة مستقلة، مش
 * ممكن تتعمل في كارت صغير */
export function CourseProposalCard({ proposal }: { proposal: CourseProposal }) {
  return (
    <Link
      href={`/admin/course-proposals/${proposal.id}`}
      className="block rounded-2xl border border-border bg-white p-4 transition-colors hover:border-primary/40"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <b className="text-[.95rem] font-extrabold">{proposal.title}</b>
        <span className="rounded-full bg-gold-50 px-3 py-1 text-[.76rem] font-bold text-gold-600">
          {COURSE_STATUS_LABEL[proposal.status] ?? proposal.status}
        </span>
      </div>
      <p className="text-[.85rem] text-muted-foreground">
        المينتور: <b className="text-foreground">{proposal.mentor?.display_name ?? "مينتور"}</b> · التراك: <b className="text-foreground">{proposal.track}</b>
      </p>
    </Link>
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

/* ------------------------------------------------------------------ */
/* مراجعة الفرص — بايبلاين research -> official_source_check ->
 * independent_review -> published (migration 0019). الباحث نفسه بيقدّم
 * مراحل التحضير، ومراجع مختلف (COI متفروض من الداتابيز) بيوافق أو يرجّعها */
/* ------------------------------------------------------------------ */
const OPPORTUNITY_STATUS_LABEL: Record<string, string> = {
  research: "بحث",
  official_source_check: "التحقق من المصدر",
  independent_review: "مراجعة نهائية",
};

const OPPORTUNITY_NEXT_STATUS: Record<string, string> = {
  research: "official_source_check",
  official_source_check: "independent_review",
};

const OPPORTUNITY_CATEGORIES = [
  { id: "competition", label: "مسابقة" },
  { id: "stem", label: "STEM" },
  { id: "writing", label: "كتابة" },
  { id: "speaking", label: "إلقاء" },
  { id: "leadership", label: "قيادة" },
  { id: "grant", label: "منحة" },
];

export function OpportunityReviewQueue({ opportunities }: { opportunities: OpportunityInReview[] }) {
  const [items, setItems] = React.useState(opportunities);
  const [showForm, setShowForm] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button" onClick={() => setShowForm((v) => !v)}
        className="self-start rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-primary"
      >
        {showForm ? "إلغاء" : "+ فرصة جديدة"}
      </button>
      {showForm && <NewOpportunityForm onCreated={() => window.location.reload()} />}

      {items.length === 0 ? (
        <p className="text-[.9rem] text-muted-foreground">مفيش فرص في مراحل التحضير/المراجعة دلوقتي.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((o) => (
            <OpportunityReviewRow
              key={o.id}
              opportunity={o}
              onAdvanced={() => setItems((cur) => cur.map((x) => (
                x.id === o.id ? { ...x, status: OPPORTUNITY_NEXT_STATUS[x.status] ?? x.status } : x
              )))}
              onDecided={() => setItems((cur) => cur.filter((x) => x.id !== o.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityReviewRow({
  opportunity, onAdvanced, onDecided,
}: { opportunity: OpportunityInReview; onAdvanced: () => void; onDecided: () => void }) {
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const advance = () => {
    setError(null);
    startTransition(async () => {
      const res = await advanceOpportunityStage(opportunity.id);
      if (res.error) setError(res.error);
      else onAdvanced();
    });
  };

  const decide = (decision: "approved" | "needs_rework") => {
    setError(null);
    startTransition(async () => {
      const res = await reviewOpportunityDecision(opportunity.id, decision, note);
      if (res.error) setError(res.error);
      else onDecided();
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <b className="text-[.95rem] font-extrabold">{opportunity.title}</b>
        <span className="rounded-full bg-gold-50 px-3 py-1 text-[.76rem] font-bold text-gold-600">
          {OPPORTUNITY_STATUS_LABEL[opportunity.status] ?? opportunity.status}
        </span>
      </div>
      <p className="text-[.85rem] text-muted-foreground">
        {opportunity.provider} · الباحث: <b className="text-foreground">{opportunity.researcher?.display_name ?? "—"}</b>
      </p>
      <p className="mt-1 text-[.82rem]" dir="ltr">
        <a href={opportunity.official_source_url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
          المصدر الرسمي ↗
        </a>
      </p>

      {opportunity.status === "independent_review" ? (
        <>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="سبب الإرجاع — لازم لو هترجّعيها للباحث"
            className="mt-3 w-full rounded-xl border border-border p-2.5 text-[.85rem] outline-none focus:border-primary"
          />
          {error && <p className="mt-1.5 text-[.82rem] font-semibold text-destructive">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              disabled={pending} onClick={() => decide("approved")}
              className="rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
            >
              وافقي وانشري
            </button>
            <button
              disabled={pending} onClick={() => decide("needs_rework")}
              className="rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-slate-600 disabled:opacity-60"
            >
              محتاجة تعديل
            </button>
          </div>
        </>
      ) : (
        <>
          {error && <p className="mt-2 text-[.82rem] font-semibold text-destructive">{error}</p>}
          <button
            disabled={pending} onClick={advance}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
          >
            قدّمها للمرحلة الجاية
          </button>
        </>
      )}
    </div>
  );
}

function NewOpportunityForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = React.useState("");
  const [provider, setProvider] = React.useState("");
  const [opportunityType, setOpportunityType] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [officialSourceUrl, setOfficialSourceUrl] = React.useState("");
  const [category, setCategory] = React.useState("competition");
  const [minAge, setMinAge] = React.useState("");
  const [maxAge, setMaxAge] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await proposeOpportunity({
        title, provider, opportunityType, summary, officialSourceUrl, category,
        minAge: minAge ? Number(minAge) : null,
        maxAge: maxAge ? Number(maxAge) : null,
        deadline: deadline || null,
      });
      if (res.error) setError(res.error);
      else onCreated();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الفرصة"
          className="h-10 rounded-lg border border-border px-3 text-[.85rem] outline-none focus:border-primary"
        />
        <input
          required value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="الجهة المنظّمة"
          className="h-10 rounded-lg border border-border px-3 text-[.85rem] outline-none focus:border-primary"
        />
        <input
          required value={opportunityType} onChange={(e) => setOpportunityType(e.target.value)}
          placeholder="نوع الفرصة (مثال: منحة دراسية)"
          className="h-10 rounded-lg border border-border px-3 text-[.85rem] outline-none focus:border-primary"
        />
        <select
          value={category} onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-lg border border-border px-3 text-[.85rem] outline-none focus:border-primary"
        >
          {OPPORTUNITY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input
          type="number" min={0} value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="أصغر سن"
          className="h-10 rounded-lg border border-border px-3 text-[.85rem] outline-none focus:border-primary"
        />
        <input
          type="number" min={0} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="أكبر سن"
          className="h-10 rounded-lg border border-border px-3 text-[.85rem] outline-none focus:border-primary"
        />
        <input
          type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
          className="h-10 rounded-lg border border-border px-3 text-[.85rem] outline-none focus:border-primary"
        />
        <input
          required type="url" dir="ltr" value={officialSourceUrl} onChange={(e) => setOfficialSourceUrl(e.target.value)}
          placeholder="رابط المصدر الرسمي"
          className="h-10 rounded-lg border border-border px-3 text-[.85rem] outline-none focus:border-primary"
        />
      </div>
      <textarea
        required value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="ملخّص الفرصة"
        className="rounded-lg border border-border p-3 text-[.85rem] outline-none focus:border-primary"
      />
      {error && <p className="text-[.8rem] font-semibold text-destructive">{error}</p>}
      <button
        type="submit" disabled={pending}
        className="self-start rounded-xl bg-primary px-5 py-2.5 text-[.85rem] font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "لحظة..." : "ابدأ البحث"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* مراجعة كورس تفصيلية — بعد ما شفت المنهج كامل في الصفحة، هنا بس القرار */
/* ------------------------------------------------------------------ */
export function CourseReviewDecision({ proposalId }: { proposalId: string }) {
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const decide = (decision: "approved" | "needs_changes" | "rejected") => {
    setError(null);
    startTransition(async () => {
      const res = await reviewCourseProposal(proposalId, decision, note);
      if (res.error) setError(res.error);
      else setDone(decision);
    });
  };

  if (done) {
    return (
      <p className="rounded-2xl border border-primary/30 bg-blue-tint px-5 py-4 text-center text-[.9rem] font-bold text-primary">
        تم — القرار اتسجّل ✓
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ملاحظة — لازم لو هترجّعي الكورس لتعديل أو ترفضيه"
        rows={3}
        className="w-full rounded-xl border border-border p-3 text-[.85rem] outline-none focus:border-primary"
      />
      {error && <p className="mt-2 text-[.82rem] font-semibold text-destructive">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={pending} onClick={() => decide("approved")} className="rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60">
          موافقة
        </button>
        <button disabled={pending} onClick={() => decide("needs_changes")} className="rounded-xl border border-gold-600/40 px-4 py-2 text-[.85rem] font-bold text-gold-600 disabled:opacity-60">
          محتاج تعديل
        </button>
        <button disabled={pending} onClick={() => decide("rejected")} className="rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-slate-600 disabled:opacity-60">
          رفض
        </button>
      </div>
    </div>
  );
}
