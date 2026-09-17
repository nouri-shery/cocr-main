import { redirect } from "next/navigation";
import { DashboardClient } from "../client/dashboard_client";
import { getCourses, getMentors } from "../actions/landing_page_actions";
import { getOpportunities } from "../actions/opportunities_actions";
import { getMyEnrollments } from "../actions/profile_actions";
import { getMyProjects, getMyRecentFeedback, getMyGivenFeedbackCount } from "../actions/projects_actions";
import { getMyProgressForCourses, getNextLessonForCourse } from "../actions/lessons_actions";
import { getMyMentorApplication } from "../actions/mentor_actions";
import type { JourneySignals } from "../client/journey_client";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

export interface NextMove {
  label: string;
  href: string;
}

export async function DashboardPageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/dashboard");

  const [opportunities, courses, mentors, enrollments, projects, recentFeedback, givenFeedbackCount, mentorApplication] = await Promise.all([
    getOpportunities(),
    getCourses(),
    getMentors(),
    getMyEnrollments(),
    getMyProjects(),
    getMyRecentFeedback(3),
    getMyGivenFeedbackCount(),
    getMyMentorApplication(),
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

  // رحلتك في COCR — نفس المفهوم المستخدم في البروفايل (journey_client)،
  // إشارات حقيقية بس، مفيش XP ولا ترتيب مُلفَّق
  const journeySignals: JourneySignals = {
    hasEnrollment: enrollments.length > 0,
    hasPublishedProject: projects.some((p) => p.status === "published"),
    hasGivenFeedback: givenFeedbackCount > 0,
    isApprovedMentor: mentorApplication?.status === "approved",
  };

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <AppPageHeader title={`أهلًا يا ${firstName} 👋`} context="دي رحلتك في COCR — إيه اللي عملته وإيه الخطوة الجاية." />

        <DashboardClient
          opportunities={opportunities}
          mentors={mentors}
          startedCourses={startedCoursesWithProgress}
          currentLearning={currentLearning}
          nextMoves={nextMoves}
          journeySignals={journeySignals}
          projects={projects}
          recentFeedback={recentFeedback}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
