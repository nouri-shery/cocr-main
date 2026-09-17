import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPublishedProjects, getProjectById, getProjectFeedback } from "../actions/projects_actions";
import { ProjectsGrid, NewProjectForm, ProjectDetail, BackToProjects } from "../client/projects_client";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

export async function ProjectsPageContent() {
  const [projects, user] = await Promise.all([
    getPublishedProjects(),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <AppPageHeader
          title="المشاريع"
          context="مشاريع حقيقية عملها طلاب COCR — شوفها وسيب ملاحظة تساعدهم."
          actions={user ? (
            <Link href="/projects/new" className="rounded-xl bg-primary px-4 py-2.5 text-[.86rem] font-extrabold text-white">
              + مشروع جديد
            </Link>
          ) : undefined}
        />

        <ProjectsGrid projects={projects} isAuthenticated={!!user} />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

export async function NewProjectPageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/projects/new");

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[680px] px-7">
        <BackToProjects />
        <div className="mb-8 max-w-[38em]">
          <h1 className="mb-3 text-[clamp(1.6rem,3.4vw,2.2rem)] font-extrabold leading-tight tracking-tight">
            شارك مشروعك
          </h1>
          <p className="text-[.98rem] leading-relaxed text-muted-foreground">
            احفظه كمسودّة الأول، وانشره لما يكون جاهز.
          </p>
        </div>
        <NewProjectForm />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

export async function ProjectDetailContent({ id }: { id: string }) {
  const [project, user] = await Promise.all([
    getProjectById(id),
    getCurrentUser().catch(() => null),
  ]);
  if (!project) notFound();

  const feedback = await getProjectFeedback(id);
  const isOwner = user?.id === project.owner_id;

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <BackToProjects />
        <ProjectDetail project={project} isOwner={isOwner} isAuthenticated={!!user} feedback={feedback} currentUserId={user?.id ?? null} />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
