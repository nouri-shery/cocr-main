"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Hammer, ArrowRight, ArrowLeft, Pencil, Trash2, ExternalLink, Send, Check,
  Bookmark, BookmarkCheck, Eye, ShieldCheck, CodeXml, Video, Search, Clock, X,
} from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { AuthPrompt } from "./auth-prompt";
import { ReportButton } from "./report_dialog";
import { cn } from "@/lib/utils";
import { toggleSavedItem } from "../actions/saved_actions";
import {
  createProject, updateProject, submitProjectForReview, deleteProject,
  submitFeedback, deleteFeedback,
  type Project, type ProjectWithOwner, type ProjectFeedback, type ProjectActionResult,
  type OwnerProjectReview, type MentorProjectReview,
} from "../actions/projects_actions";
import type { IconName } from "../types/types";

const initialState: ProjectActionResult = { error: null };

type CourseOption = { id: string; title: string };

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "مسودّة 🔒",
  pending_review: "مستنية مراجعة الفريق ⏳",
  published: "مشروع تخرّج موثّق ✅",
  rejected: "محتاج تعديل 🔁",
};

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

function ProjectCover({
  project, featured, saved, onToggleSaved,
}: { project: ProjectWithOwner; featured?: boolean; saved: boolean; onToggleSaved: () => void }) {
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
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSaved(); }}
        aria-label={saved ? "إلغاء الحفظ" : "احفظ المشروع"}
        aria-pressed={saved}
        className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-colors hover:text-primary"
      >
        {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
      </button>
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
function ProjectCard({
  project, featured, saved, onToggleSaved,
}: { project: ProjectWithOwner; featured?: boolean; saved: boolean; onToggleSaved: () => void }) {
  const initial = (project.owner?.display_name ?? "ط").trim().charAt(0).toUpperCase();
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex h-full flex-col gap-4 rounded-3xl border border-border bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_40px_-22px_rgba(22,24,31,.28)]"
    >
      <ProjectCover project={project} featured={featured} saved={saved} onToggleSaved={onToggleSaved} />

      <div className="flex flex-1 flex-col gap-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[.68rem] font-extrabold text-green">
            <ShieldCheck className="h-3 w-3" /> موثّق
          </span>
        </div>
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
export function ProjectsGrid({
  projects, isAuthenticated, initialSavedIds, initialSearch,
}: { projects: ProjectWithOwner[]; isAuthenticated: boolean; initialSavedIds: string[]; initialSearch: string }) {
  const router = useRouter();
  const [activeSkill, setActiveSkill] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string[]>(initialSavedIds);
  const [searchInput, setSearchInput] = React.useState(initialSearch);
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);

  const toggleSaved = React.useCallback((id: string) => {
    if (!isAuthenticated) { setAuthPromptOpen(true); return; }
    setSaved((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    toggleSavedItem("project", id).then((res) => {
      if (res.error) setSaved((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    });
  }, [isAuthenticated]);

  // بحث بيتحدّث في الرابط (server-side فعليًا في getPublishedProjects)،
  // بس بـ debounce بسيط عشان مش كل ضغطة تعمل navigation
  React.useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchInput.trim()) params.set("q", searchInput.trim());
      const qs = params.toString();
      router.push(qs ? `/projects?${qs}` : "/projects", { scroll: false });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

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

  const searchBar = (
    <div className="relative">
      <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="ابحث عن مشروع، مهارة، أو اسم صاحب المشروع..."
        className="h-12 w-full rounded-2xl border border-border bg-white ps-11 pe-4 text-[.9rem] outline-none focus:border-primary"
      />
      {searchInput && (
        <button
          onClick={() => setSearchInput("")}
          aria-label="امسح البحث"
          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {searchBar}
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-white px-6 py-20 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-blue-tint">
            <Hammer className="h-7 w-7 text-primary" />
          </span>
          {initialSearch || searchInput ? (
            <>
              <p className="text-[1.1rem] font-extrabold">مفيش نتايج لـ&quot;{searchInput}&quot;</p>
              <p className="max-w-[24em] text-[.92rem] text-muted-foreground">جرّبي كلمة تانية أو امسحي البحث.</p>
            </>
          ) : (
            <>
              <p className="text-[1.1rem] font-extrabold">لسه مفيش مشاريع موثّقة هنا</p>
              <p className="max-w-[24em] text-[.92rem] text-muted-foreground">يمكن مشروعك يكون أول واحد.</p>
              <ShareProjectCta
                isAuthenticated={isAuthenticated}
                className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white"
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {searchBar}

      {featured.length > 0 && (
        <section>
          <h2 className="mb-4 text-[1rem] font-extrabold text-slate-600">مختارات من مشاريع الطلاب</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <ProjectCard project={featured[0]} featured saved={saved.includes(featured[0].id)} onToggleSaved={() => toggleSaved(featured[0].id)} />
            {featured.length > 1 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {featured.slice(1).map((p) => (
                  <ProjectCard key={p.id} project={p} saved={saved.includes(p.id)} onToggleSaved={() => toggleSaved(p.id)} />
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
            <ProjectCard key={p.id} project={p} saved={saved.includes(p.id)} onToggleSaved={() => toggleSaved(p.id)} />
          ))}
        </div>
      )}

      <AuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        title="عايز تحفظ المشروع ده؟"
        description="اعمل حساب مجاني في COCR عشان تقدر تحفظ المشاريع اللي عجباك وترجعلها بعدين."
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MyProjectsSidebar — جوّه /projects، عشان الطالب يشوف حالة مشاريعه هو
 * وهو بيتصفّح — بتستخدم نفس الـ actions المستخدمة في /profile و/dashboard،
 * مفيش منطق جديد اتكرر */
/* ------------------------------------------------------------------ */
export function MyProjectsSidebar({ projects, givenFeedbackCount }: { projects: Project[]; givenFeedbackCount: number }) {
  return (
    <aside className="hidden h-fit flex-col gap-4 rounded-3xl border border-border bg-white p-5 lg:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-[.95rem] font-extrabold">مشروعي</h2>
        <Link href="/projects/new" className="text-[.78rem] font-extrabold text-primary hover:underline">+ جديد</Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-[.82rem] text-muted-foreground">لسه معملتش مشروع تخرّج. أول ما تخلّص كورس، ابدأ بمشروعك هنا.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.slice(0, 5).map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-[.8rem] font-bold hover:border-primary/40"
            >
              <span className="truncate">{p.title || "بدون عنوان"}</span>
              <span className="shrink-0 text-[.68rem] font-extrabold text-slate-500">{STATUS_LABEL[p.status].split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="border-t border-dashed border-border pt-3 text-[.8rem] text-muted-foreground">
        ساهمت بملاحظات في <b className="text-foreground">{givenFeedbackCount}</b> مشروع لزمايلك
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectForm — بيتستخدم في /projects/new والتعديل في /projects/[id]  */
/* ------------------------------------------------------------------ */
export function NewProjectForm({ courses }: { courses: CourseOption[] }) {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-3xl border border-border bg-white p-6">
      <ProjectFields courses={courses} />
      {state.error && <p className="text-[.85rem] font-semibold text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex min-h-[48px] items-center justify-center rounded-2xl bg-primary text-[.95rem] font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "لحظة..." : "احفظ كمسودّة"}
      </button>
      <p className="text-center text-[.78rem] text-slate-400">هتقدر تبعته لمراجعة الفريق بعد كده من صفحة المشروع.</p>
    </form>
  );
}

function ProjectFields({ project, courses }: { project?: Project; courses: CourseOption[] }) {
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
        <span className="text-[.84rem] font-bold text-slate-600">الكورس اللي المشروع ده تخرّجك منه</span>
        <select
          name="course_id"
          defaultValue={project?.course_id ?? ""}
          className="h-11 rounded-xl border border-border bg-white px-3 text-[.9rem] outline-none focus:border-primary"
        >
          <option value="">اختار الكورس...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
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
        <span className="text-[.84rem] font-bold text-slate-600">لينك الديمو/المشروع (اختياري)</span>
        <input
          name="project_link"
          type="url"
          defaultValue={project?.project_link ?? ""}
          placeholder="https://..."
          dir="ltr"
          className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.84rem] font-bold text-slate-600">لينك الجيت هاب — لازم قبل الإرسال للمراجعة</span>
        <input
          name="github_url"
          type="url"
          defaultValue={project?.github_url ?? ""}
          placeholder="https://github.com/..."
          dir="ltr"
          className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[.84rem] font-bold text-slate-600">لينك فيديو يوتيوب بتشرح فيه مشروعك بنفسك — لازم قبل الإرسال للمراجعة</span>
        <input
          name="video_url"
          type="url"
          defaultValue={project?.video_url ?? ""}
          placeholder="https://youtube.com/..."
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
  project, isOwner, isMentor, isAuthenticated, feedback, currentUserId, ownerReviews, mentorReviews, viewCount, courses,
}: {
  project: ProjectWithOwner; isOwner: boolean; isMentor: boolean; isAuthenticated: boolean; feedback: ProjectFeedback[];
  currentUserId: string | null; ownerReviews: OwnerProjectReview[]; mentorReviews: MentorProjectReview[];
  viewCount: number; courses: CourseOption[];
}) {
  return isOwner
    ? <ProjectWorkspace project={project} feedback={feedback} currentUserId={currentUserId} reviews={ownerReviews} viewCount={viewCount} courses={courses} />
    : (
      <ProjectPortfolio
        project={project} feedback={feedback} isAuthenticated={isAuthenticated} currentUserId={currentUserId}
        viewCount={viewCount} isMentor={isMentor} mentorReviews={mentorReviews}
      />
    );
}

/* ------------------------------------------------------------------ */
/* ProjectWorkspace — واجهة صاحب المشروع. الحالة الحقيقية دلوقتي 4 مش 2:
 * draft (بتتعدّل بحرية) -> pending_review (مقفول، مستني الليدر) ->
 * published أو rejected. مفيش self-publish خالص — "انشره" بقت "ابعته
 * للمراجعة"، والداتابيز نفسها بترفض لو الكورس/الفيديو/الجيت هاب فاضيين */
/* ------------------------------------------------------------------ */
function ProjectWorkspace({
  project, feedback, currentUserId, reviews, viewCount, courses,
}: {
  project: ProjectWithOwner; feedback: ProjectFeedback[]; currentUserId: string | null;
  reviews: OwnerProjectReview[]; viewCount: number; courses: CourseOption[];
}) {
  const router = useRouter();
  const canEdit = project.status === "draft" || project.status === "rejected";
  // مشروع اترفض دخل مراجعة فعلًا وعنده سجل تاريخي (project_reviews) —
  // الداتابيز بترفض حذفه دلوقتي (on delete restrict)، فزرار الحذف بيظهر
  // بس للـ draft عشان الطالب ميوصلش لمحاولة هترفض بـ error خام
  const canDelete = project.status === "draft";
  const [editing, setEditing] = React.useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateProject.bind(null, project.id), initialState,
  );
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitPending, startSubmitTransition] = React.useTransition();
  const [deletePending, startDeleteTransition] = React.useTransition();

  const wasPending = React.useRef(false);
  React.useEffect(() => {
    if (wasPending.current && !updatePending && !updateState.error) setEditing(false);
    wasPending.current = updatePending;
  }, [updatePending, updateState.error]);

  const handleSubmitForReview = () => {
    setSubmitError(null);
    startSubmitTransition(async () => {
      const res = await submitProjectForReview(project.id);
      if (res.error) setSubmitError(res.error);
      else router.refresh();
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
    { label: "الكورس", done: !!project.course_id },
    { label: "لينك الجيت هاب", done: !!project.github_url },
    { label: "فيديو الشرح", done: !!project.video_url },
  ];
  const readyCount = checklist.filter((c) => c.done).length;
  const lastUpdated = new Date(project.updated_at).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const latestReview = reviews[0] ?? null;

  const statusTone: Record<Project["status"], string> = {
    draft: "bg-gold-50 text-gold-600",
    pending_review: "bg-blue-tint text-primary",
    published: "bg-green-50 text-green",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-3xl border border-border bg-white">
        <div className="relative grid h-[120px] place-items-center bg-blue-tint">
          <Icon3D name="hammer" className="h-14 w-14" />
        </div>

        <div className="flex flex-col gap-4 p-[28px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[.8rem] font-bold text-slate-500">
            <span className={cn("rounded-full px-2.5 py-1", statusTone[project.status])}>{STATUS_LABEL[project.status]}</span>
            {project.status === "published" && (
              <span className="flex items-center gap-1">· <Eye className="h-3.5 w-3.5" /> {viewCount} مشاهدة</span>
            )}
            <span>· آخر تحديث {lastUpdated}</span>
          </div>

          {project.status === "rejected" && latestReview && (
            <div className="flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-[.85rem] text-destructive">
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-extrabold">الفريق رفض المشروع في المراجعة دي</p>
                {latestReview.reviewer_note && <p className="mt-1">{latestReview.reviewer_note}</p>}
                <p className="mt-1 text-[.78rem] text-destructive/70">عدّل مشروعك وابعته للمراجعة تاني من غير حد أقصى لعدد المرات.</p>
              </div>
            </div>
          )}

          {project.status === "pending_review" && (
            <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-blue-tint p-4 text-[.85rem] text-primary">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>مشروعك مقفول من التعديل دلوقتي — مستني قرار فريق COCR.</p>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3">
            {!editing && <h1 className="text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold leading-tight">{project.title}</h1>}
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[.8rem] font-bold text-slate-600"
                >
                  <Pencil className="h-3.5 w-3.5" /> {editing ? "إلغاء" : "تعديل"}
                </button>
              )}
              {canEdit && !editing && (
                <button
                  onClick={handleSubmitForReview}
                  disabled={submitPending || readyCount < checklist.length}
                  title={readyCount < checklist.length ? "كمّل البيانات الناقصة الأول" : undefined}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[.8rem] font-bold text-white disabled:opacity-40"
                >
                  {submitPending ? "لحظة..." : "ابعته للمراجعة"}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deletePending}
                  className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-white px-3 py-1.5 text-[.8rem] font-bold text-destructive disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" /> احذف
                </button>
              )}
            </div>
          </div>
          {submitError && <p className="text-[.82rem] font-semibold text-destructive">{submitError}</p>}

          {editing ? (
            <form action={updateAction} className="flex flex-col gap-4">
              <ProjectFields project={project} courses={courses} />
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
              <div className="flex flex-wrap gap-2" dir="ltr">
                {project.project_link && (
                  <Link href={project.project_link} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 rounded-xl border border-border px-4 py-2 text-[.88rem] font-bold text-primary">
                    Demo <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                {project.github_url && (
                  <Link href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 rounded-xl border border-border px-4 py-2 text-[.88rem] font-bold text-slate-600">
                    <CodeXml className="h-3.5 w-3.5" /> GitHub
                  </Link>
                )}
                {project.video_url && (
                  <Link href={project.video_url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 rounded-xl border border-border px-4 py-2 text-[.88rem] font-bold text-slate-600">
                    <Video className="h-3.5 w-3.5" /> الفيديو
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!editing && canEdit && (
        <div className="rounded-2xl border border-dashed border-border bg-white p-5">
          <p className="mb-3 text-[.85rem] font-extrabold text-slate-600">
            {readyCount === checklist.length ? "المشروع جاهز للمراجعة 🎉" : `جاهز للإرسال (${readyCount}/${checklist.length})`}
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
// شارة الصفحة العامة — الصفحة دي بقت ممكن يفتحها مش بس زائر عام (مشروع
// منشور دايمًا)، لكن كمان منتور بيشوف مشروع طالبه وهو لسه pending_review
// أو rejected (بعد إضافة صلاحية SELECT للمنتور). لازم الشارة تعكس الحالة
// الحقيقية — عرض "موثّق" على مشروع لسه مايتوافقش عليه بيضرب مصداقية
// الـ Verified Graduation Project اللي الصفحة دي أصلًا مبنية عليها
const PORTFOLIO_BADGE: Partial<Record<Project["status"], { label: string; className: string }>> = {
  pending_review: { label: "قيد المراجعة", className: "bg-blue-tint text-primary" },
  rejected: { label: "محتاج تعديل", className: "bg-destructive/10 text-destructive" },
  published: { label: "مشروع تخرّج موثّق", className: "bg-green-50 text-green" },
};

function ProjectPortfolio({
  project, feedback, isAuthenticated, currentUserId, viewCount, isMentor, mentorReviews,
}: {
  project: ProjectWithOwner; feedback: ProjectFeedback[]; isAuthenticated: boolean; currentUserId: string | null;
  viewCount: number; isMentor: boolean; mentorReviews: MentorProjectReview[];
}) {
  const ownerInitial = (project.owner?.display_name ?? "ط").trim().charAt(0).toUpperCase();
  const badge = PORTFOLIO_BADGE[project.status];
  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-white">
        <div className="relative grid h-[180px] place-items-center bg-gradient-to-br from-blue-tint to-white">
          <Icon3D name="hammer" className="h-20 w-20 opacity-90" />
        </div>

        <div className="flex flex-col gap-6 p-[32px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              {badge && (
                <span className={cn("mb-2 flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[.76rem] font-extrabold", badge.className)}>
                  <ShieldCheck className="h-3.5 w-3.5" /> {badge.label}
                </span>
              )}
              <h1 className="text-[clamp(1.6rem,3.4vw,2.3rem)] font-extrabold leading-tight">{project.title}</h1>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[.92rem] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-[.7rem] font-extrabold text-slate-600">
                    {ownerInitial}
                  </span>
                  بناه <b className="font-extrabold text-foreground">{project.owner?.display_name ?? "طالب COCR"}</b>
                </span>
                <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {viewCount} مشاهدة</span>
              </p>
            </div>
            {isAuthenticated && <ReportButton targetType="project" targetId={project.id} compact />}
          </div>

          <div className="flex flex-wrap gap-2" dir="ltr">
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
            {project.github_url && (
              <Link href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-[.9rem] font-extrabold text-slate-600">
                <CodeXml className="h-4 w-4" /> GitHub
              </Link>
            )}
            {project.video_url && (
              <Link href={project.video_url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-[.9rem] font-extrabold text-slate-600">
                <Video className="h-4 w-4" /> شاهد الفيديو
              </Link>
            )}
          </div>

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

          {isMentor && (
            <div className="border-t border-dashed border-border pt-6">
              <h2 className="mb-2.5 text-[.78rem] font-extrabold tracking-[.1em] text-gold-600">تقييم فريق COCR لأدائك كمنتور في المشروع ده</h2>
              {mentorReviews.length === 0 || mentorReviews[0].mentor_score == null ? (
                <p className="text-[.85rem] text-muted-foreground">لسه مفيش تقييم متسجّل.</p>
              ) : (
                <p className="text-[.9rem] font-bold text-foreground">{mentorReviews[0].mentor_score} / 5</p>
              )}
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
