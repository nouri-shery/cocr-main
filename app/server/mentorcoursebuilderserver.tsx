import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { getCourseProposalById } from "../actions/course_proposals_actions";
import { getCurriculumSessions } from "../actions/course_curriculum_sessions_actions";
import { getCohortsForCourse } from "../actions/course_cohorts_actions";
import { CourseBuilderClient } from "../client/course_builder_client";
import { MentorShell } from "./mentorshell";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

export async function MentorCourseBuilderContent({ id }: { id: string }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/mentor/courses/${id}`);

  const application = await getMyMentorApplication();
  if (application?.status !== "approved") redirect("/become-a-mentor");

  const course = await getCourseProposalById(id);
  if (!course) notFound();

  const [sessions, cohorts] = await Promise.all([
    getCurriculumSessions(id),
    getCohortsForCourse(id),
  ]);

  return (
    <>
    <main className="relative overflow-hidden bg-sugar-white pb-[100px] pt-[52px]">
      <div className="relative z-[2] mx-auto max-w-[900px] px-7">
        <MentorShell active="/mentor/courses" />
        <AppPageHeader title={course.title || "بناء الكورس"} context="خطّط → علّم → راجع → طوّر — منهج حقيقي، مش مجرد مقالات." />
        <CourseBuilderClient course={course} sessions={sessions} cohorts={cohorts} />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
