"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hammer, ArrowRight, Pencil, Trash2, ExternalLink, Send } from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { AuthPrompt } from "./auth-prompt";
import { ReportButton } from "./report_dialog";
import {
  createProject, updateProject, setProjectStatus, deleteProject,
  submitFeedback, deleteFeedback,
  type Project, type ProjectWithOwner, type ProjectFeedback, type ProjectActionResult,
} from "../actions/projects_actions";

const initialState: ProjectActionResult = { error: null };

/* ------------------------------------------------------------------ */
/* ProjectsGrid — صفحة /projects (كل المشاريع المنشورة)                */
/* ------------------------------------------------------------------ */
export function ProjectsGrid({ projects, isAuthenticated }: { projects: ProjectWithOwner[]; isAuthenticated: boolean }) {
  const router = useRouter();
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);

  const handleNewProject = () => {
    if (!isAuthenticated) { setAuthPromptOpen(true); return; }
    router.push("/projects/new");
  };

  return (
    <div>
      {/* لزوار مش مسجّلين بس — المستخدمين المسجّلين عندهم نفس الـaction فوق في عنوان الصفحة */}
      {!isAuthenticated && (
        <div className="mb-8 flex justify-end">
          <button
            onClick={handleNewProject}
            className="rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white"
          >
            + شارك مشروعك
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Hammer className="h-12 w-12 text-slate-300" />
          <p className="text-[1.05rem] font-extrabold">لسه مفيش مشاريع منشورة</p>
          <p className="max-w-[26em] text-[.9rem] text-muted-foreground">كن أول واحد يشارك مشروع مع مجتمع COCR.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-22px_rgba(22,24,31,.35)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-tint text-primary">
                <Icon3D name="hammer" className="h-6 w-6" />
              </span>
              <p className="text-[1.02rem] font-extrabold leading-snug">{p.title}</p>
              <p className="line-clamp-2 flex-1 text-[.86rem] leading-relaxed text-muted-foreground">{p.description}</p>
              {p.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.skills.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-full bg-sand px-2.5 py-1 text-[.7rem] font-bold text-slate-600">{s}</span>
                  ))}
                </div>
              )}
              <p className="border-t border-dashed border-border pt-3 text-[.78rem] font-semibold text-slate-400">
                {p.owner?.display_name ?? "طالب COCR"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <AuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        title="عايز تشارك مشروعك؟"
        description="اعمل حساب مجاني في COCR عشان تقدر تنشئ مشروع وتشاركه مع المجتمع."
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectForm — بيتستخدم في /projects/new والتعديل في /projects/[id]  */
/* ------------------------------------------------------------------ */
export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-3xl border border-border bg-white p-6">
      <ProjectFields />
      {state.error && <p className="text-[.85rem] font-semibold text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex min-h-[48px] items-center justify-center rounded-2xl bg-primary text-[.95rem] font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "لحظة..." : "احفظ كمسودّة"}
      </button>
      <p className="text-center text-[.78rem] text-slate-400">هتقدر تنشره بعد كده من صفحة المشروع.</p>
    </form>
  );
}

function ProjectFields({ project }: { project?: Project }) {
  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.84rem] font-bold text-slate-600">عنوان المشروع</span>
        <input
          name="title"
          defaultValue={project?.title}
          required
          minLength={3}
          maxLength={120}
          placeholder="مثال: موقع لمتجر صغير"
          className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.84rem] font-bold text-slate-600">وصف المشروع</span>
        <textarea
          name="description"
          defaultValue={project?.description}
          rows={4}
          maxLength={2000}
          placeholder="إيه المشروع، وعملته إزاي، وإيه اللي اتعلمته منه..."
          className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.84rem] font-bold text-slate-600">المهارات (افصل بينهم بفاصلة)</span>
        <input
          name="skills"
          defaultValue={project?.skills.join(", ")}
          placeholder="مثال: HTML, CSS, JavaScript"
          className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.84rem] font-bold text-slate-600">لينك المشروع (اختياري)</span>
        <input
          name="project_link"
          type="url"
          defaultValue={project?.project_link ?? ""}
          placeholder="https://..."
          dir="ltr"
          className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
        />
      </label>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectDetail — عرض/تعديل/نشر/حذف المشروع + الـ feedback            */
/* ------------------------------------------------------------------ */
export function ProjectDetail({
  project, isOwner, isAuthenticated, feedback, currentUserId,
}: {
  project: Project; isOwner: boolean; isAuthenticated: boolean; feedback: ProjectFeedback[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateProject.bind(null, project.id), initialState,
  );
  const [publishPending, startPublishTransition] = React.useTransition();
  const [deletePending, startDeleteTransition] = React.useTransition();

  const wasPending = React.useRef(false);
  React.useEffect(() => {
    if (wasPending.current && !updatePending && !updateState.error) setEditing(false);
    wasPending.current = updatePending;
  }, [updatePending, updateState.error]);

  const handlePublishToggle = () => {
    startPublishTransition(async () => {
      await setProjectStatus(project.id, project.status === "published" ? "draft" : "published");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!window.confirm("متأكد إنك عايز تمسح المشروع ده؟ الإجراء ده نهائي.")) return;
    startDeleteTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.ok) router.push("/projects");
    });
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white">
      <div className="relative grid h-[140px] place-items-center bg-blue-tint">
        <Icon3D name="hammer" className="h-16 w-16" />
      </div>

      <div className="flex flex-col gap-4 p-[28px]">
        {isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sand p-3">
            <span className="flex items-center gap-1.5 text-[.82rem] font-bold text-slate-600">
              حالة المشروع: {project.status === "published" ? "منشور 🌍" : "مسودّة 🔒"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[.8rem] font-bold text-slate-600"
              >
                <Pencil className="h-3.5 w-3.5" /> {editing ? "إلغاء" : "تعديل"}
              </button>
              <button
                onClick={handlePublishToggle}
                disabled={publishPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-[.8rem] font-bold text-white disabled:opacity-60"
              >
                {publishPending ? "لحظة..." : project.status === "published" ? "رجّعه مسودّة" : "انشره"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deletePending}
                className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-white px-3 py-1.5 text-[.8rem] font-bold text-destructive disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" /> احذف
              </button>
            </div>
          </div>
        )}

        {editing ? (
          <form action={updateAction} className="flex flex-col gap-4">
            <ProjectFields project={project} />
            {updateState.error && <p className="text-[.85rem] font-semibold text-destructive">{updateState.error}</p>}
            <button
              type="submit"
              disabled={updatePending}
              className="flex min-h-[46px] items-center justify-center rounded-2xl bg-primary text-[.9rem] font-extrabold text-white disabled:opacity-60"
            >
              {updatePending ? "لحظة..." : "احفظ التعديلات"}
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold leading-tight">{project.title}</h1>
              {!isOwner && isAuthenticated && <ReportButton targetType="project" targetId={project.id} compact />}
            </div>
            <p className="whitespace-pre-line text-[1rem] leading-[1.9] text-muted-foreground">
              {project.description || "مفيش وصف لسه."}
            </p>
            {project.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.skills.map((s) => (
                  <span key={s} className="rounded-full bg-blue-tint px-3 py-1 text-[.8rem] font-bold text-primary">{s}</span>
                ))}
              </div>
            )}
            {project.project_link && (
              <Link
                href={project.project_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 rounded-xl border border-border px-4 py-2 text-[.88rem] font-bold text-primary"
              >
                شوف المشروع <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </>
        )}
      </div>

      <FeedbackSection projectId={project.id} feedback={feedback} isOwner={isOwner} isAuthenticated={isAuthenticated} currentUserId={currentUserId} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FeedbackSection                                                    */
/* ------------------------------------------------------------------ */
function FeedbackSection({
  projectId, feedback, isOwner, isAuthenticated, currentUserId,
}: {
  projectId: string; feedback: ProjectFeedback[]; isOwner: boolean; isAuthenticated: boolean;
  currentUserId: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitFeedback.bind(null, projectId), initialState);
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);
  const [items, setItems] = React.useState(feedback);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  // الـ prop بيتحدّث بعد revalidatePath (تعليق جديد اتبعت، أو حد تاني حذف
  // تعليقه) — لازم نزامن الحالة المحلية معاه بدل ما تفضل قديمة
  React.useEffect(() => {
    setItems(feedback);
  }, [feedback]);

  const handleDelete = (feedbackId: string) => {
    setDeletingId(feedbackId);
    startTransition(async () => {
      const res = await deleteFeedback(feedbackId, projectId);
      if (res.ok) setItems((prev) => prev.filter((f) => f.id !== feedbackId));
      setDeletingId(null);
    });
  };

  return (
    <div className="border-t border-dashed border-border p-[28px]">
      <h2 className="mb-4 text-[1rem] font-extrabold">الملاحظات ({items.length})</h2>

      {items.length === 0 && (
        <p className="mb-4 text-[.88rem] text-muted-foreground">لسه مفيش ملاحظات على المشروع ده.</p>
      )}

      <div className="mb-5 flex flex-col gap-3">
        {items.map((f) => (
          <div key={f.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="mb-1 text-[.8rem] font-bold text-slate-600">{f.author?.display_name ?? "طالب COCR"}</p>
              <p className="text-[.88rem] text-muted-foreground">{f.body}</p>
            </div>
            {currentUserId === f.author_id && (
              <button
                onClick={() => handleDelete(f.id)}
                disabled={deletingId === f.id}
                aria-label="امسحي الملاحظة"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!isOwner && (
        isAuthenticated ? (
          <form ref={formRef} action={formAction} className="flex flex-col gap-2.5">
            <textarea
              name="body"
              required
              minLength={3}
              maxLength={1000}
              rows={3}
              placeholder="اكتب ملاحظة تساعد صاحب المشروع..."
              className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
            />
            {state.error && <p className="text-[.82rem] font-semibold text-destructive">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="flex min-h-[44px] w-fit items-center gap-2 rounded-xl bg-primary px-5 text-[.88rem] font-extrabold text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> {pending ? "لحظة..." : "ابعت ملاحظة"}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAuthPromptOpen(true)}
            className="rounded-xl border border-border px-5 py-2.5 text-[.88rem] font-bold text-slate-600"
          >
            سجّل دخولك عشان تسيب ملاحظة
          </button>
        )
      )}

      <AuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        title="عايز تسيب ملاحظة؟"
        description="اعمل حساب مجاني في COCR عشان تقدر تساعد زميلك بملاحظتك."
      />
    </div>
  );
}

export function BackToProjects() {
  return (
    <Link href="/projects" className="mb-8 inline-flex items-center gap-2 text-[.9rem] font-bold text-primary">
      <ArrowRight className="h-4 w-4" /> رجوع لكل المشاريع
    </Link>
  );
}
