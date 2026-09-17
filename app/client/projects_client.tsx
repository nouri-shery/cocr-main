"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hammer, ArrowRight, ArrowLeft, Pencil, Trash2, ExternalLink, Send, Check } from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { AuthPrompt } from "./auth-prompt";
import { ReportButton } from "./report_dialog";
import { cn } from "@/lib/utils";
import {
  createProject, updateProject, setProjectStatus, deleteProject,
  submitFeedback, deleteFeedback,
  type Project, type ProjectWithOwner, type ProjectFeedback, type ProjectActionResult,
} from "../actions/projects_actions";
import type { IconName } from "../types/types";

const initialState: ProjectActionResult = { error: null };

/* ------------------------------------------------------------------ */
/* زرار "شارك مشروعك" — بيتستخدم في الـhero وفي الـempty state. لزوار
 * مش مسجّلين بيفتح دعوة تسجيل بدل ما يودّي لصفحة هيتحوّل منها فورًا */
/* ------------------------------------------------------------------ */
export function ShareProjectCta({
  isAuthenticated, className, children = "+ شارك مشروعك",
}: { isAuthenticated: boolean; className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);

  const handleClick = () => {
    if (!isAuthenticated) { setAuthPromptOpen(true); return; }
    router.push("/projects/new");
  };

  return (
    <>
      <button onClick={handleClick} className={className}>{children}</button>
      <AuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        title="عايز تشارك مشروعك؟"
        description="اعمل حساب مجاني في COCR عشان تقدر تنشئ مشروع وتشاركه مع المجتمع."
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* preview بصري لكل كارت — مفيش عمود صورة في الـschema دلوقتي، فبدل ما
 * نستخدم صورة وهمية، كل مشروع بياخد غلاف مجرّد ثابت (مش عشوائي — نفس
 * المشروع دايمًا بياخد نفس الغلاف) مبني من توكنز الألوان الموجودة فعلاً،
 * وأيقونة بتتحدد من كلمات المهارات الحقيقية بتاعته لما ينفع */
/* ------------------------------------------------------------------ */
const COVER_VARIANTS = [
  { from: "from-blue-tint", ring: "text-primary" },
  { from: "from-gold-50", ring: "text-gold-600" },
  { from: "from-green-50", ring: "text-green" },
  { from: "from-sand", ring: "text-slate-600" },
] as const;

const SKILL_ICON_RULES: [RegExp, IconName][] = [
  [/design|figma|ui[\s/]|ux|تصميم/i, "compass"],
  [/python|ai\b|ml\b|machine|data|ذكاء/i, "bulb"],
  [/security|cyber|امن/i, "shield"],
  [/arduino|robot|embedded|iot|hardware|chip|مدمج/i, "chip"],
  [/flutter|swift|kotlin|android|ios|mobile|app\b/i, "phone"],
  [/html|css|js|javascript|typescript|react|web|frontend|node/i, "code"],
];

function pickCoverIcon(skills: string[]): IconName {
  for (const [pattern, icon] of SKILL_ICON_RULES) {
    if (skills.some((s) => pattern.test(s))) return icon;
  }
  return "hammer";
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function ProjectCover({ project, featured }: { project: ProjectWithOwner; featured?: boolean }) {
  const variant = COVER_VARIANTS[hashString(project.id) % COVER_VARIANTS.length];
  const icon = pickCoverIcon(project.skills);
  return (
    <div className={cn(
      "relative grid place-items-center overflow-hidden rounded-2xl bg-gradient-to-br to-white",
      variant.from,
      featured ? "aspect-[16/10]" : "aspect-[4/3]",
    )}>
      <Icon3D
        name={icon}
        aria-hidden
        className={cn(
          "absolute -bottom-4 -start-3 opacity-[.14] transition-transform duration-500 group-hover:scale-105",
          featured ? "h-32 w-32" : "h-24 w-24",
        )}
      />
      <span className={cn(
        "relative grid place-items-center rounded-full bg-white shadow-[0_6px_18px_-8px_rgba(22,24,31,.25)]",
        featured ? "h-16 w-16" : "h-12 w-12",
      )}>
        <Icon3D name={icon} className={cn(featured ? "h-8 w-8" : "h-6 w-6", variant.ring)} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectCard — الوحدة الأساسية لعرض مشروع، سواء في الـfeatured spotlight
 * أو في الشبكة العادية */
/* ------------------------------------------------------------------ */
function ProjectCard({ project, featured }: { project: ProjectWithOwner; featured?: boolean }) {
  const initial = (project.owner?.display_name ?? "ط").trim().charAt(0).toUpperCase();
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex h-full flex-col gap-4 rounded-3xl border border-border bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_40px_-22px_rgba(22,24,31,.28)]"
    >
      <ProjectCover project={project} featured={featured} />

      <div className="flex flex-1 flex-col gap-2.5 px-1">
        <p className={cn("font-extrabold leading-snug", featured ? "text-[1.25rem]" : "text-[1.04rem]")}>
          {project.title}
        </p>
        <p className={cn(
          "flex-1 leading-relaxed text-muted-foreground",
          featured ? "line-clamp-3 text-[.92rem]" : "line-clamp-2 text-[.86rem]",
        )}>
          {project.description || "مفيش وصف لسه."}
        </p>

        {project.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.skills.slice(0, featured ? 6 : 4).map((s) => (
              <span key={s} className="rounded-full border border-border px-2.5 py-1 text-[.7rem] font-bold text-slate-600">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between gap-3 border-t border-dashed border-border pt-3">
          <span className="flex items-center gap-2 text-[.78rem] font-semibold text-slate-500">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sand text-[.68rem] font-extrabold text-slate-600">
              {initial}
            </span>
            {project.owner?.display_name ?? "طالب COCR"}
          </span>
          <span className="flex items-center gap-1 text-[.78rem] font-extrabold text-primary">
            شوف المشروع
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectsGrid — صفحة /projects (كل المشاريع المنشورة): featured spotlight
 * (لو البيانات كفاية) + فلاتر مهارات مبنية من البيانات الحقيقية بس +
 * شبكة portfolio */
/* ------------------------------------------------------------------ */
export function ProjectsGrid({ projects, isAuthenticated }: { projects: ProjectWithOwner[]; isAuthenticated: boolean }) {
  const [activeSkill, setActiveSkill] = React.useState<string | null>(null);

  const skillChips = React.useMemo(() => {
    const freq = new Map<string, number>();
    for (const p of projects) {
      for (const s of p.skills) freq.set(s, (freq.get(s) ?? 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([skill]) => skill);
  }, [projects]);

  const showFilters = projects.length >= 4 && skillChips.length >= 2;
  const showFeatured = !activeSkill && projects.length >= 4;

  const featured = showFeatured ? projects.slice(0, 3) : [];
  const featuredIds = new Set(featured.map((p) => p.id));
  const rest = projects.filter((p) => !featuredIds.has(p.id));
  const visible = activeSkill ? rest.filter((p) => p.skills.includes(activeSkill)) : rest;

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-white px-6 py-20 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-blue-tint">
          <Hammer className="h-7 w-7 text-primary" />
        </span>
        <p className="text-[1.1rem] font-extrabold">لسه مفيش مشاريع هنا</p>
        <p className="max-w-[24em] text-[.92rem] text-muted-foreground">يمكن مشروعك يكون أول واحد.</p>
        <ShareProjectCta
          isAuthenticated={isAuthenticated}
          className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {featured.length > 0 && (
        <section>
          <h2 className="mb-4 text-[1rem] font-extrabold text-slate-600">مختارات من مشاريع الطلاب</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <ProjectCard project={featured[0]} featured />
            {featured.length > 1 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {featured.slice(1).map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSkill(null)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[.8rem] font-bold transition-colors",
              activeSkill === null ? "border-primary bg-primary text-white" : "border-border text-slate-600 hover:border-slate-300",
            )}
          >
            الكل
          </button>
          {skillChips.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSkill((cur) => (cur === s ? null : s))}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[.8rem] font-bold transition-colors",
                activeSkill === s ? "border-primary bg-primary text-white" : "border-border text-slate-600 hover:border-slate-300",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-white px-6 py-14 text-center">
          <p className="text-[.98rem] font-extrabold">مفيش مشاريع بالمهارة دي لسه</p>
          <p className="text-[.86rem] text-muted-foreground">جرّب فلتر تاني أو شوف كل المشاريع.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
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
/* ProjectDetail — بيوجّه لصفحة مختلفة بصريًا حسب مين بيشوف: صاحب المشروع
 * بيشوف workspace (تعديل/حالة/checklist)، أي حد تاني بيشوف portfolio
 * (عرض/storytelling). نفس البيانات، عرض مختلف تمامًا حسب الغرض */
/* ------------------------------------------------------------------ */
export function ProjectDetail({
  project, isOwner, isAuthenticated, feedback, currentUserId,
}: {
  project: ProjectWithOwner; isOwner: boolean; isAuthenticated: boolean; feedback: ProjectFeedback[];
  currentUserId: string | null;
}) {
  return isOwner
    ? <ProjectWorkspace project={project} feedback={feedback} currentUserId={currentUserId} />
    : <ProjectPortfolio project={project} feedback={feedback} isAuthenticated={isAuthenticated} currentUserId={currentUserId} />;
}

/* ------------------------------------------------------------------ */
/* ProjectWorkspace — واجهة صاحب المشروع: حالة حقيقية، آخر تحديث حقيقي،
 * checklist مبني من الحقول الموجودة فعلاً بس (مفيش "submit for review"
 * وهمية — الحالة الوحيدة الحقيقية دلوقتي draft/published) */
/* ------------------------------------------------------------------ */
function ProjectWorkspace({
  project, feedback, currentUserId,
}: { project: ProjectWithOwner; feedback: ProjectFeedback[]; currentUserId: string | null }) {
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

  const checklist = [
    { label: "عنوان المشروع", done: project.title.trim().length > 0 },
    { label: "وصف المشروع", done: project.description.trim().length > 0 },
    { label: "المهارات المستخدمة", done: project.skills.length > 0 },
    { label: "لينك المشروع", done: !!project.project_link },
  ];
  const readyCount = checklist.filter((c) => c.done).length;
  const lastUpdated = new Date(project.updated_at).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-3xl border border-border bg-white">
        <div className="relative grid h-[120px] place-items-center bg-blue-tint">
          <Icon3D name="hammer" className="h-14 w-14" />
        </div>

        <div className="flex flex-col gap-4 p-[28px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[.8rem] font-bold text-slate-500">
            <span className={cn(
              "rounded-full px-2.5 py-1",
              project.status === "published" ? "bg-green-50 text-green" : "bg-gold-50 text-gold-600",
            )}>
              {project.status === "published" ? "منشور 🌍" : "مسودّة 🔒"}
            </span>
            <span>· {project.status === "published" ? "عام — أي حد يقدر يشوفه" : "خاص — إنت بس اللي شايفه"}</span>
            <span>· آخر تحديث {lastUpdated}</span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            {!editing && <h1 className="text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold leading-tight">{project.title}</h1>}
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
              <p className="whitespace-pre-line text-[1rem] leading-[1.9] text-muted-foreground">
                {project.description || "لسه مفيش وصف — دوس تعديل وضيف واحد."}
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
      </div>

      {!editing && (
        <div className="rounded-2xl border border-dashed border-border bg-white p-5">
          <p className="mb-3 text-[.85rem] font-extrabold text-slate-600">
            {readyCount === checklist.length ? "المشروع جاهز 🎉" : `المشروع جاهز (${readyCount}/${checklist.length})`}
          </p>
          <div className="flex flex-col gap-1.5">
            {checklist.map((c) => (
              <span key={c.label} className={cn("flex items-center gap-2 text-[.85rem]", c.done ? "text-slate-600" : "text-slate-400")}>
                {c.done ? <Check className="h-4 w-4 shrink-0 text-green" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />}
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <FeedbackSection projectId={project.id} feedback={feedback} isOwner isAuthenticated currentUserId={currentUserId} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectPortfolio — واجهة عامة (زائر/طالب تاني): storytelling، مش
 * workspace. مفيش أي حاجة خاصة (حالة المشروع، أزرار تعديل) بتظهر هنا —
 * أصلاً RLS مش بترجّع مسودّات لغير صاحبها، فالصفحة دي منشور بس */
/* ------------------------------------------------------------------ */
function ProjectPortfolio({
  project, feedback, isAuthenticated, currentUserId,
}: { project: ProjectWithOwner; feedback: ProjectFeedback[]; isAuthenticated: boolean; currentUserId: string | null }) {
  const ownerInitial = (project.owner?.display_name ?? "ط").trim().charAt(0).toUpperCase();
  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-white">
        <div className="relative grid h-[180px] place-items-center bg-gradient-to-br from-blue-tint to-white">
          <Icon3D name="hammer" className="h-20 w-20 opacity-90" />
        </div>

        <div className="flex flex-col gap-6 p-[32px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[clamp(1.6rem,3.4vw,2.3rem)] font-extrabold leading-tight">{project.title}</h1>
              <p className="mt-2.5 flex items-center gap-2 text-[.92rem] text-muted-foreground">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-[.7rem] font-extrabold text-slate-600">
                  {ownerInitial}
                </span>
                بناه <b className="font-extrabold text-foreground">{project.owner?.display_name ?? "طالب COCR"}</b>
              </p>
            </div>
            {isAuthenticated && <ReportButton targetType="project" targetId={project.id} compact />}
          </div>

          {project.project_link && (
            <Link
              href={project.project_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white transition-transform hover:-translate-y-0.5"
            >
              افتح المشروع <ExternalLink className="h-4 w-4" />
            </Link>
          )}

          <div className="border-t border-dashed border-border pt-6">
            <h2 className="mb-2.5 text-[.78rem] font-extrabold tracking-[.1em] text-gold-600">عن المشروع</h2>
            <p className="whitespace-pre-line text-[1rem] leading-[1.9] text-muted-foreground">
              {project.description || "مفيش وصف لسه."}
            </p>
          </div>

          {project.skills.length > 0 && (
            <div className="border-t border-dashed border-border pt-6">
              <h2 className="mb-3 text-[.78rem] font-extrabold tracking-[.1em] text-gold-600">التقنيات المستخدمة</h2>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((s) => (
                  <span key={s} className="rounded-full border border-border px-3 py-1 text-[.8rem] font-bold text-slate-600">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <FeedbackSection projectId={project.id} feedback={feedback} isOwner={false} isAuthenticated={isAuthenticated} currentUserId={currentUserId} />
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
