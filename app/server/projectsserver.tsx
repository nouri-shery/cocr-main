import { notFound, redirect } from "next/navigation";
import {
  getPublishedProjects, getProjectById, getProjectFeedback, getMyProjects, getMyGivenFeedbackCount,
  getProjectReviewsForOwner, getProjectReviewsForMentor, recordProjectView, getProjectViewCount,
} from "../actions/projects_actions";
import { getMySavedItemIds } from "../actions/saved_actions";
import { getCourses } from "../actions/landing_page_actions";
import {
  ProjectsGrid, NewProjectForm, ProjectDetail, BackToProjects, ShareProjectCta, MyProjectsSidebar,
} from "../client/projects_client";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";

/** هيرو مخصّص لصفحة /projects بس — مش AppPageHeader المشترك، عشان الصفحة
 * دي تحديدًا محتاجة تحس إنها واجهة معرض/بورتفوليو مش مجرد عنوان صفحة
 * منتج زي باقي الصفحات. AppPageHeader نفسه متغيّرش، فباقي الصفحات
 * (dashboard/courses/...) مش متأثرة */
function ProjectsHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="mb-12 flex flex-col items-start gap-6 border-b border-border pb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-[36em]">
        <span className="mb-3 block text-[.78rem] font-extrabold tracking-[.16em] text-gold-600">مشاريع التخرّج</span>
        <h1 className="mb-4 text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold leading-[1.25] tracking-tight">
          مش كل اللي اتعلمته بيتكتب في شهادة.
          <br />
          بعضه بيتبني.
        </h1>
        <p className="text-[1rem] leading-relaxed text-muted-foreground">
          مشاريع تخرّج حقيقية لطلاب COCR، موثّقة من الفريق — شوفها، خد إلهام، واحفظ اللي عجبك.
        </p>
      </div>
      <ShareProjectCta
        isAuthenticated={isAuthenticated}
        className="flex min-h-[50px] shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-[.95rem] font-extrabold text-white transition-transform hover:-translate-y-0.5"
      />
    </div>
  );
}

export async function ProjectsPageContent({ search }: { search?: string }) {
  const [projects, user] = await Promise.all([
    getPublishedProjects(search),
    getCurrentUser().catch(() => null),
  ]);

  const [savedIds, myProjects, givenFeedbackCount] = user
    ? await Promise.all([getMySavedItemIds("project"), getMyProjects(), getMyGivenFeedbackCount()])
    : [[], [], 0];

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <ProjectsHero isAuthenticated={!!user} />

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <ProjectsGrid projects={projects} isAuthenticated={!!user} initialSavedIds={savedIds} initialSearch={search ?? ""} />
          {user && <MyProjectsSidebar projects={myProjects} givenFeedbackCount={givenFeedbackCount} />}
        </div>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

export async function NewProjectPageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/projects/new");

  const courses = await getCourses();

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[680px] px-7">
        <BackToProjects />
        <div className="mb-8 max-w-[38em]">
          <h1 className="mb-3 text-[clamp(1.6rem,3.4vw,2.2rem)] font-extrabold leading-tight tracking-tight">
            شارك مشروع تخرّجك
          </h1>
          <p className="text-[.98rem] leading-relaxed text-muted-foreground">
            احفظه كمسودّة وانت لسه بتظبطه. لما يكون جاهز (فيديو شرح + لينك جيت هاب)، ابعته لمراجعة فريق COCR — بعد الموافقة بيتنشر تلقائيًا كمشروع تخرّج موثّق.
          </p>
        </div>
        <NewProjectForm courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
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

  const isOwner = user?.id === project.owner_id;
  const isMentor = !!user && user.id === project.mentor_id;

  const [feedback, ownerReviews, mentorReviews, courses] = await Promise.all([
    getProjectFeedback(id),
    isOwner ? getProjectReviewsForOwner(id) : Promise.resolve([]),
    isMentor ? getProjectReviewsForMentor(id) : Promise.resolve([]),
    isOwner ? getCourses() : Promise.resolve([]),
  ]);

  // عداد المشاهدات مش لازم يكسر الصفحة كلها لو فشل — تحليلات بسيطة، مش
  // جوهر الصفحة
  let viewCount = 0;
  if (project.status === "published") {
    try {
      await recordProjectView(id);
      viewCount = await getProjectViewCount(id);
    } catch {
      /* تجاهل — مشاهدة واحدة ضايعة مش تستاهل كسر الصفحة */
    }
  }

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <BackToProjects />
        <ProjectDetail
          project={project}
          isOwner={isOwner}
          isMentor={isMentor}
          isAuthenticated={!!user}
          feedback={feedback}
          currentUserId={user?.id ?? null}
          ownerReviews={ownerReviews}
          mentorReviews={mentorReviews}
          viewCount={viewCount}
          courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
