"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Send, Rocket, Calendar } from "lucide-react";
import {
  updateCourseDraft, updateCourseFinalProject, submitCourseForReview, publishCourse,
  type CourseProposal, type CourseDraftInput,
} from "../actions/course_proposals_actions";
import {
  addCurriculumSession, updateCurriculumSession, deleteCurriculumSession, reorderCurriculumSessions,
  type CurriculumSession, type CurriculumSessionInput, type SessionType,
} from "../actions/course_curriculum_sessions_actions";
import { createCohort, publishCohort, type CourseCohort, type CohortInput } from "../actions/course_cohorts_actions";
import { PROPOSAL_STATUS_LABEL, PROPOSAL_STATUS_STYLE } from "./mentor_home_client";
import { cn } from "@/lib/utils";

const TRACKS = [
  { id: "front-end", label: "Front-End" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "app-dev", label: "App Dev" },
  { id: "embedded", label: "Embedded" },
];

const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  workshop: "ورشة لايف",
  practice: "تدريب عملي",
  project_review: "مراجعة مشروع",
  qa: "أسئلة وأجوبة",
  assessment: "تقييم",
  final_review: "مراجعة نهائية",
};

const TABS = [
  { id: "details", label: "تفاصيل" },
  { id: "curriculum", label: "المنهج" },
  { id: "project", label: "مشروع التخرّج" },
  { id: "cohorts", label: "الدفعات" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const inputClass = "h-11 rounded-xl border border-border px-3 text-[.88rem] outline-none focus:border-primary";
const textareaClass = "rounded-xl border border-border p-3 text-[.88rem] outline-none focus:border-primary";

export function CourseBuilderClient({
  course, sessions, cohorts,
}: { course: CourseProposal; sessions: CurriculumSession[]; cohorts: CourseCohort[] }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabId>("details");
  const editable = course.status === "draft" || course.status === "needs_changes";
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitCourseForReview(course.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  const publish = () => {
    setError(null);
    startTransition(async () => {
      const res = await publishCourse(course.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
        <span className={cn("rounded-full px-3 py-1.5 text-[.8rem] font-extrabold", PROPOSAL_STATUS_STYLE[course.status])}>
          {PROPOSAL_STATUS_LABEL[course.status]}
        </span>
        <div className="flex gap-2">
          {editable && (
            <button
              disabled={pending} onClick={submit}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> قدّم للمراجعة
            </button>
          )}
          {course.status === "approved" && (
            <button
              disabled={pending} onClick={publish}
              className="flex items-center gap-1.5 rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60"
            >
              <Rocket className="h-4 w-4" /> انشر الكورس
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-[.85rem] font-semibold text-destructive">{error}</p>}
      {course.notes && (course.status === "needs_changes" || course.status === "rejected") && (
        <div className="rounded-2xl bg-sand p-4">
          <p className="text-[.82rem] font-bold text-slate-600">ملاحظة الفريق:</p>
          <p className="mt-1 text-[.88rem] text-muted-foreground">{course.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-white p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id} type="button" onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "rounded-xl bg-primary px-4 py-2 text-[.84rem] font-extrabold text-white"
                : "rounded-xl px-4 py-2 text-[.84rem] font-bold text-muted-foreground hover:bg-blue-50"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" && <DetailsTab course={course} editable={editable} />}
      {tab === "curriculum" && <CurriculumTab courseId={course.id} sessions={sessions} editable={editable} />}
      {tab === "project" && <ProjectTab course={course} editable={editable} />}
      {tab === "cohorts" && <CohortsTab course={course} cohorts={cohorts} />}
    </div>
  );
}

function DetailsTab({ course, editable }: { course: CourseProposal; editable: boolean }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(course.title);
  const [description, setDescription] = React.useState(course.description);
  const [track, setTrack] = React.useState(course.track);
  const [outcomes, setOutcomes] = React.useState(course.learning_outcomes.join("\n"));
  const [skills, setSkills] = React.useState(course.skills.join(", "));
  const [ageMin, setAgeMin] = React.useState(course.age_min?.toString() ?? "");
  const [ageMax, setAgeMax] = React.useState(course.age_max?.toString() ?? "");
  const [prerequisites, setPrerequisites] = React.useState(course.prerequisites ?? "");
  const [weeklyWorkloadHours, setWeeklyWorkloadHours] = React.useState(course.weekly_workload_hours?.toString() ?? "");
  const [level, setLevel] = React.useState(course.level ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: CourseDraftInput = {
      title, description, track,
      learningOutcomes: outcomes.split("\n").map((s) => s.trim()).filter(Boolean),
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      ageMin: ageMin ? Number(ageMin) : null,
      ageMax: ageMax ? Number(ageMax) : null,
      prerequisites,
      weeklyWorkloadHours: weeklyWorkloadHours ? Number(weeklyWorkloadHours) : null,
      level,
    };
    startTransition(async () => {
      const res = await updateCourseDraft(course.id, input);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">عنوان الكورس</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">الوصف</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editable} required rows={3} className={textareaClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[.85rem] font-bold text-slate-600">التراك</span>
          <select value={track} onChange={(e) => setTrack(e.target.value)} disabled={!editable} className={inputClass}>
            {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[.85rem] font-bold text-slate-600">المستوى</span>
          <select value={level} onChange={(e) => setLevel(e.target.value)} disabled={!editable} className={inputClass}>
            <option value="">اختار</option>
            <option value="مبتدئ">مبتدئ</option>
            <option value="متوسط">متوسط</option>
            <option value="متقدم">متقدم</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">نتائج التعلّم — كل سطر نتيجة (بعد الكورس ده، الطالب هيقدر...)</span>
        <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} disabled={!editable} rows={4} placeholder={"يبني صفحة ويب متجاوبة\nيستخدم Git للعمل الجماعي"} className={textareaClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">المهارات (افصل بينهم بفاصلة)</span>
        <input value={skills} onChange={(e) => setSkills(e.target.value)} disabled={!editable} className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-[.85rem] font-bold text-slate-600">الفئة العمرية</span>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} disabled={!editable} placeholder="من" className={inputClass} />
            <input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} disabled={!editable} placeholder="لحد" className={inputClass} />
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[.85rem] font-bold text-slate-600">ساعات مجهود أسبوعية متوقّعة</span>
          <input type="number" min={0} step="0.5" value={weeklyWorkloadHours} onChange={(e) => setWeeklyWorkloadHours(e.target.value)} disabled={!editable} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">متطلبات سابقة (اختياري)</span>
        <textarea value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} disabled={!editable} rows={2} className={textareaClass} />
      </label>
      {error && <p className="text-[.82rem] font-semibold text-destructive">{error}</p>}
      {editable && (
        <button type="submit" disabled={pending} className="self-start rounded-xl bg-primary px-5 py-2.5 text-[.85rem] font-extrabold text-white disabled:opacity-60">
          {pending ? "بيتحفظ..." : "احفظ"}
        </button>
      )}
    </form>
  );
}

function CurriculumTab({ courseId, sessions, editable }: { courseId: string; sessions: CurriculumSession[]; editable: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState<string | null>(null); // "new" or session id
  const [pending, startTransition] = React.useTransition();

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sessions.length) return;
    const ids = sessions.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    startTransition(async () => {
      await reorderCurriculumSessions(courseId, ids);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteCurriculumSession(id, courseId);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {sessions.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-blue-50 px-6 py-8 text-center text-[.9rem] text-muted-foreground">
          لسه مفيش سيشنز في المنهج — كل سيشن هي: تحضير → ورشة لايف → تدريب → كويز قصير → مهمة → فيدباك.
        </p>
      )}
      {sessions.map((s, i) => (
        <div key={s.id} className="rounded-2xl border border-border bg-white p-4">
          {showForm === s.id ? (
            <SessionForm
              courseId={courseId} initial={s}
              onDone={() => { setShowForm(null); router.refresh(); }}
              onCancel={() => setShowForm(null)}
            />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-tint text-[.72rem] font-extrabold text-primary">{i + 1}</span>
                  <b className="text-[.92rem] font-extrabold">{s.title}</b>
                </div>
                <p className="mt-1 text-[.78rem] text-muted-foreground">{SESSION_TYPE_LABEL[s.session_type]} · {s.duration_minutes} دقيقة</p>
                {s.objectives.length > 0 && <p className="mt-1 text-[.8rem] text-muted-foreground">أهداف: {s.objectives.join("، ")}</p>}
              </div>
              {editable && (
                <div className="flex shrink-0 items-center gap-1">
                  <button disabled={pending || i === 0} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-cream disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button disabled={pending || i === sessions.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-cream disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button onClick={() => setShowForm(s.id)} className="rounded-lg p-1.5 text-primary hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                  <button disabled={pending} onClick={() => remove(s.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {editable && (
        showForm === "new" ? (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-blue-50 p-4">
            <SessionForm courseId={courseId} onDone={() => { setShowForm(null); router.refresh(); }} onCancel={() => setShowForm(null)} />
          </div>
        ) : (
          <button
            onClick={() => setShowForm("new")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-[.86rem] font-bold text-primary hover:border-primary/40 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" /> ضيف سيشن
          </button>
        )
      )}
    </div>
  );
}

function SessionForm({
  courseId, initial, onDone, onCancel,
}: { courseId: string; initial?: CurriculumSession; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [objectives, setObjectives] = React.useState(initial?.objectives.join("\n") ?? "");
  const [sessionType, setSessionType] = React.useState<SessionType>(initial?.session_type ?? "workshop");
  const [durationMinutes, setDurationMinutes] = React.useState(initial?.duration_minutes.toString() ?? "60");
  const [preparation, setPreparation] = React.useState(initial?.preparation ?? "");
  const [liveActivity, setLiveActivity] = React.useState(initial?.live_activity ?? "");
  const [postSessionTaskBrief, setPostSessionTaskBrief] = React.useState(initial?.post_session_task_brief ?? "");
  const [resources, setResources] = React.useState(initial?.resources.join("\n") ?? "");
  const [expectedDeliverable, setExpectedDeliverable] = React.useState(initial?.expected_deliverable ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: CurriculumSessionInput = {
      title, sessionType,
      objectives: objectives.split("\n").map((s) => s.trim()).filter(Boolean),
      durationMinutes: Number(durationMinutes),
      preparation, liveActivity, postSessionTaskBrief,
      resources: resources.split("\n").map((s) => s.trim()).filter(Boolean),
      expectedDeliverable,
    };
    startTransition(async () => {
      const res = initial
        ? await updateCurriculumSession(initial.id, courseId, input)
        : await addCurriculumSession(courseId, input);
      if (res.error) setError(res.error);
      else onDone();
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="عنوان السيشن" className={inputClass} />
        <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)} className={inputClass}>
          {(Object.keys(SESSION_TYPE_LABEL) as SessionType[]).map((t) => <option key={t} value={t}>{SESSION_TYPE_LABEL[t]}</option>)}
        </select>
        <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="دقايق" className={inputClass} />
      </div>
      <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={2} placeholder={"الأهداف — سطر لكل هدف"} className={textareaClass} />
      <div className="grid gap-3 sm:grid-cols-2">
        <textarea value={preparation} onChange={(e) => setPreparation(e.target.value)} rows={2} placeholder="التحضير قبل السيشن" className={textareaClass} />
        <textarea value={liveActivity} onChange={(e) => setLiveActivity(e.target.value)} rows={2} placeholder="النشاط اللايف" className={textareaClass} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <textarea value={postSessionTaskBrief} onChange={(e) => setPostSessionTaskBrief(e.target.value)} rows={2} placeholder="مهمة بعد السيشن" className={textareaClass} />
        <textarea value={expectedDeliverable} onChange={(e) => setExpectedDeliverable(e.target.value)} rows={2} placeholder="المخرج المتوقّع" className={textareaClass} />
      </div>
      <textarea value={resources} onChange={(e) => setResources(e.target.value)} rows={2} placeholder={"مصادر — سطر لكل رابط/مصدر"} className={textareaClass} />
      {error && <p className="text-[.82rem] font-semibold text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-xl bg-primary px-5 py-2 text-[.85rem] font-extrabold text-white disabled:opacity-60">
          {pending ? "بيتحفظ..." : "احفظ السيشن"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-border px-5 py-2 text-[.85rem] font-bold text-slate-600">إلغاء</button>
      </div>
    </form>
  );
}

function ProjectTab({ course, editable }: { course: CourseProposal; editable: boolean }) {
  const router = useRouter();
  const [brief, setBrief] = React.useState(course.final_project_brief ?? "");
  const [deliverables, setDeliverables] = React.useState(course.final_project_deliverables ?? "");
  const [rubric, setRubric] = React.useState<{ key: string; value: number }[]>(
    Object.entries(course.final_project_rubric ?? {}).map(([key, value]) => ({ key, value })),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const total = rubric.reduce((a, r) => a + (r.value || 0), 0);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rubricObj = Object.fromEntries(rubric.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value]));
    startTransition(async () => {
      const res = await updateCourseFinalProject(course.id, { brief, rubric: rubricObj, deliverables });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">مطلوب مشروع التخرّج</span>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} disabled={!editable} required rows={4} className={textareaClass} />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-[.85rem] font-bold text-slate-600">معايير التقييم (الوزن الكلي لازم يبقى 100%)</span>
        {rubric.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={r.key} disabled={!editable}
              onChange={(e) => setRubric((cur) => cur.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x))}
              placeholder="المعيار" className={cn(inputClass, "flex-1")}
            />
            <input
              type="number" min={0} max={100} value={r.value} disabled={!editable}
              onChange={(e) => setRubric((cur) => cur.map((x, idx) => idx === i ? { ...x, value: Number(e.target.value) } : x))}
              placeholder="%" className={cn(inputClass, "w-24")}
            />
            {editable && (
              <button type="button" onClick={() => setRubric((cur) => cur.filter((_, idx) => idx !== i))} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {editable && (
          <button type="button" onClick={() => setRubric((cur) => [...cur, { key: "", value: 0 }])} className="self-start text-[.82rem] font-bold text-primary">
            + ضيف معيار
          </button>
        )}
        <p className={cn("text-[.8rem] font-bold", total === 100 ? "text-green" : "text-destructive")}>المجموع: {total}%</p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">المخرجات المطلوبة (اختياري)</span>
        <textarea value={deliverables} onChange={(e) => setDeliverables(e.target.value)} disabled={!editable} rows={2} className={textareaClass} />
      </label>
      {error && <p className="text-[.82rem] font-semibold text-destructive">{error}</p>}
      {editable && (
        <button type="submit" disabled={pending} className="self-start rounded-xl bg-primary px-5 py-2.5 text-[.85rem] font-extrabold text-white disabled:opacity-60">
          {pending ? "بيتحفظ..." : "احفظ"}
        </button>
      )}
    </form>
  );
}

function CohortsTab({ course, cohorts }: { course: CourseProposal; cohorts: CourseCohort[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (course.status !== "published" && cohorts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-blue-50 px-6 py-8 text-center text-[.9rem] text-muted-foreground">
        هتقدر تعمل دفعات بعد ما الكورس يتوافق عليه وتنشره.
      </p>
    );
  }

  const publish = (id: string) => {
    startTransition(async () => {
      await publishCohort(id);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {cohorts.map((c) => (
        <div key={c.id} className="rounded-2xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b className="text-[.92rem] font-extrabold">{c.name}</b>
            <span className={cn("rounded-full px-2.5 py-1 text-[.72rem] font-extrabold", c.status === "published" ? "bg-green-50 text-green" : "bg-muted text-muted-foreground")}>
              {c.status === "draft" ? "مسودّة" : c.status === "published" ? "مفتوح للتسجيل" : c.status === "in_progress" ? "جارية" : c.status === "completed" ? "خلصت" : "اتلغت"}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[.8rem] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> {c.start_date} → {c.end_date} · {c.max_seats} مقعد
          </p>
          {c.status === "draft" && (
            <button disabled={pending} onClick={() => publish(c.id)} className="mt-3 rounded-xl bg-green px-4 py-2 text-[.85rem] font-bold text-white disabled:opacity-60">
              افتح التسجيل
            </button>
          )}
        </div>
      ))}

      {course.status === "published" && (
        showForm ? (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-blue-50 p-4">
            <CohortForm courseId={course.id} onDone={() => { setShowForm(false); router.refresh(); }} onCancel={() => setShowForm(false)} />
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-[.86rem] font-bold text-primary hover:border-primary/40 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" /> دفعة جديدة
          </button>
        )
      )}
    </div>
  );
}

const DAYS = [
  { id: "saturday", label: "سبت" }, { id: "sunday", label: "حد" }, { id: "monday", label: "اتنين" },
  { id: "tuesday", label: "تلات" }, { id: "wednesday", label: "أربع" }, { id: "thursday", label: "خميس" }, { id: "friday", label: "جمعة" },
];

function CohortForm({ courseId, onDone, onCancel }: { courseId: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [time, setTime] = React.useState("18:00");
  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [maxSeats, setMaxSeats] = React.useState("15");
  const [enrollmentDeadline, setEnrollmentDeadline] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const toggleDay = (id: string) => setSelectedDays((cur) => cur.includes(id) ? cur.filter((d) => d !== id) : [...cur, id]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: CohortInput = {
      name, startDate, endDate,
      schedule: selectedDays.map((day) => ({ day, time })),
      timezone: "Africa/Cairo",
      maxSeats: Number(maxSeats),
      enrollmentDeadline: enrollmentDeadline ? new Date(enrollmentDeadline).toISOString() : null,
    };
    startTransition(async () => {
      const res = await createCohort(courseId, input);
      if (res.error) setError(res.error);
      else onDone();
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="اسم الدفعة — مثال: دفعة سبت/تلات 6 مساءً" className={inputClass} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputClass} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className={inputClass} />
      </div>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <label key={d.id} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[.8rem] font-semibold", selectedDays.includes(d.id) ? "border-primary bg-blue-tint text-primary" : "border-border text-slate-600")}>
            <input type="checkbox" checked={selectedDays.includes(d.id)} onChange={() => toggleDay(d.id)} className="hidden" />
            {d.label}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        <input type="number" min={1} value={maxSeats} onChange={(e) => setMaxSeats(e.target.value)} placeholder="أقصى عدد مقاعد" className={inputClass} />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.82rem] font-bold text-slate-600">آخر موعد للتسجيل (اختياري)</span>
        <input type="date" value={enrollmentDeadline} onChange={(e) => setEnrollmentDeadline(e.target.value)} className={inputClass} />
      </label>
      {error && <p className="text-[.82rem] font-semibold text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-xl bg-primary px-5 py-2 text-[.85rem] font-extrabold text-white disabled:opacity-60">
          {pending ? "بيتعمل..." : "أنشئ الدفعة"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-border px-5 py-2 text-[.85rem] font-bold text-slate-600">إلغاء</button>
      </div>
    </form>
  );
}
