import { redirect } from "next/navigation";
import { DashboardClient } from "../client/dashboard_client";
import { getCourses, getMentors } from "../actions/landing_page_actions";
import { getOpportunities } from "../actions/opportunities_actions";
import { getMyEnrollments } from "../actions/profile_actions";
import { getMyProjects, getMyRecentFeedback } from "../actions/projects_actions";
import { getMyProgressForCourses, getNextLessonForCourse } from "../actions/lessons_actions";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";

export interface NextMove {
  label: string;
  href: string;
}

export interface JourneyMilestone {
  label: string;
  done: boolean;
}

export async function DashboardPageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/dashboard");

  const [opportunities, courses, mentors, enrollments, projects, recentFeedback] = await Promise.all([
    getOpportunities(),
    getCourses(),
    getMentors(),
    getMyEnrollments(),
    getMyProjects(),
    getMyRecentFeedback(3),
  ]);

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
  const firstName = displayName.split(" ")[0] || "بطل";
  // enrollments مرتّبة started_at الأحدث الأول (getMyEnrollments) — startedCourseItems[0]
  // هو أحدث كورس بدأه الطالب فعليًا، مش افتراض
  const startedCourseItems = enrollments
    .map((e) => courses.find((c) => c.id === e.course_id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const startedCourseIds = startedCourseItems.map((c) => c.id);
  const [progressByCourse, nextLessonEntries] = await Promise.all([
    getMyProgressForCourses(startedCourseIds),
    Promise.all(startedCourseIds.map(async (id) => [id, await getNextLessonForCourse(id)] as const)),
  ]);
  const nextLessonByCourse = Object.fromEntries(nextLessonEntries);
  const startedCoursesWithProgress = startedCourseItems.map((course) => ({
    course,
    completed: progressByCourse[course.id]?.completed ?? 0,
    total: progressByCourse[course.id]?.total ?? 0,
    nextLesson: nextLessonByCourse[course.id] ?? null,
  }));

  // نفضّل كورس عنده درس حقيقي فعلي يكمّله — مش مجرد أحدث enrollment، عشان
  // الـhero يعرض حاجة قابلة للتنفيذ فعلاً بدل "لسه مفيش دروس" لو فيه كورس
  // تاني مبدوء وعنده محتوى حقيقي
  const currentLearning = startedCoursesWithProgress.find((c) => c.nextLesson) ?? startedCoursesWithProgress[0] ?? null;

  // Your Next Moves — بيتغيّر حسب حالة الطالب الحقيقية، مش قائمة ثابتة
  const nextMoves: NextMove[] = [];
  if (startedCoursesWithProgress.length === 0) {
    nextMoves.push({ label: "اكتشف كورس", href: "/courses" });
  } else {
    const withNextLesson = startedCoursesWithProgress.find((c) => c.nextLesson);
    if (withNextLesson) {
      nextMoves.push({ label: "كمّل الدرس", href: `/courses/${withNextLesson.course.id}/lessons/${withNextLesson.nextLesson!.id}` });
    }
  }
  if (projects.length === 0) {
    nextMoves.push({ label: "ابنِ أول مشروع", href: "/projects/new" });
  } else {
    const draft = projects.find((p) => p.status === "draft");
    nextMoves.push(draft ? { label: "كمّل مشروعك", href: `/projects/${draft.id}` } : { label: "افتح مشاريعك", href: "/projects" });
  }

  // Your COCR Journey — milestones محسوبة من بيانات حقيقية، مش XP/ranking
  const totalCompletedLessons = Object.values(progressByCourse).reduce((sum, p) => sum + p.completed, 0);
  const journey: JourneyMilestone[] = [
    { label: "بدأت أول كورس", done: enrollments.length > 0 },
    { label: "خلصت أول درس", done: totalCompletedLessons > 0 },
    { label: "بنيت أول مشروع", done: projects.length > 0 },
    { label: "حصلت على Feedback", done: recentFeedback.length > 0 },
  ];

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-10 max-w-[38em]">
          <span className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
            لوحة التحكم
          </span>
          <h1 className="mb-4 text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold leading-tight tracking-tight">
            أهلًا يا {firstName} 👋
          </h1>
          <p className="text-[1.05rem] leading-[1.9] text-muted-foreground">
            دي رحلتك في COCR — إيه اللي عملته وإيه الخطوة الجاية.
          </p>
        </div>

        <DashboardClient
          opportunities={opportunities}
          mentors={mentors}
          startedCourses={startedCoursesWithProgress}
          currentLearning={currentLearning}
          nextMoves={nextMoves}
          journey={journey}
          projects={projects}
          recentFeedback={recentFeedback}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
