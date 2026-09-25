import { redirect } from "next/navigation";
import { ProfileClient } from "../client/profile_client";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";
import { getCourses, getMentors } from "../actions/landing_page_actions";
import { getOpportunities } from "../actions/opportunities_actions";
import { getMyProfile, getMyEnrollments } from "../actions/profile_actions";
import { getMyProjects, getMyGivenFeedback, getMyGivenFeedbackCount } from "../actions/projects_actions";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { getMyProgressForCourses } from "../actions/lessons_actions";
import { getMySavedItemIds } from "../actions/saved_actions";
import { getUpcomingSessionsListForCourses } from "../actions/course_sessions_actions";
import { getMyAchievements } from "../actions/achievements_actions";
import { getMyCertificates } from "../actions/certificates_actions";
import type { JourneySignals } from "../client/journey_client";
import type { ActivityEvent } from "../client/profile_client";

export async function ProfilePageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/profile");

  const [
    courses, mentors, opportunities, profile, enrollments, projects,
    mentorApplication, givenFeedback, givenFeedbackCount, savedOpportunityIds,
    achievements, certificates,
  ] = await Promise.all([
    getCourses(),
    getMentors(),
    getOpportunities(),
    getMyProfile(),
    getMyEnrollments(),
    getMyProjects(),
    getMyMentorApplication(),
    getMyGivenFeedback(5),
    getMyGivenFeedbackCount(),
    getMySavedItemIds("opportunity"),
    getMyAchievements(),
    getMyCertificates(),
  ]);

  const name = profile?.display_name || (user.user_metadata?.full_name as string | undefined) || user.email || "طالب COCR";
  const bio = profile?.bio ?? "";
  const skills = profile?.skills ?? [];
  const startedCourses = enrollments
    .map((e) => courses.find((c) => c.id === e.course_id))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const mentorById = Object.fromEntries(mentors.map((m) => [m.id, m]));
  const progressByCourse = startedCourses.length > 0
    ? await getMyProgressForCourses(startedCourses.map((c) => c.id))
    : {};
  const savedOpportunities = opportunities.filter((o) => savedOpportunityIds.includes(o.id));

  // جدولي — سيشنز حقيقية جاية للكورسات اللي بدأتها، نفس البيانات المستخدمة
  // في الداشبورد
  const upcomingSessionRows = await getUpcomingSessionsListForCourses(startedCourses.map((c) => c.id), 8);
  const upcomingSessions = upcomingSessionRows.map((s) => ({
    id: s.id,
    title: s.title,
    courseTitle: courses.find((c) => c.id === s.course_id)?.title ?? "",
    scheduledAt: s.scheduled_at,
    zoomLink: s.zoom_link,
  }));

  // "عضو منذ" — حقيقي من auth.users.created_at، مفيش جدول جديد ولا تخمين
  const memberSince = user.created_at;

  const isApprovedMentor = mentorApplication?.status === "approved";
  const journeySignals: JourneySignals = {
    hasEnrollment: enrollments.length > 0,
    hasPublishedProject: projects.some((p) => p.status === "published"),
    hasGivenFeedback: givenFeedback.length > 0,
    isApprovedMentor,
  };

  // نشاطك — أحداث حقيقية من نفس البيانات اللي جبناها فوق، مرتّبة بالتاريخ،
  // مفيش جدول activity منفصل ولا حدث مُلفَّق
  const activity: ActivityEvent[] = [
    ...enrollments.map((e) => ({
      date: e.started_at,
      label: `بدأت كورس ${courses.find((c) => c.id === e.course_id)?.title ?? e.course_id}`,
      href: `/courses/${e.course_id}`,
    })),
    ...projects.filter((p) => p.status === "published").map((p) => ({
      date: p.updated_at,
      label: `نشرت مشروع "${p.title}"`,
      href: `/projects/${p.id}`,
    })),
    ...givenFeedback.map((f) => ({
      date: f.created_at,
      label: `سبت ملاحظة على "${f.project.title}"`,
      href: `/projects/${f.project.id}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <>
    <main className="relative overflow-hidden bg-sugar-white pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <AppPageHeader title="بياناتك" context="الملف الشخصي — رحلتك وشغلك ومساهماتك في COCR." />

        <ProfileClient
          name={name}
          email={user.email ?? ""}
          bio={bio}
          skills={skills}
          stage={profile?.grade_or_education_stage ?? null}
          gender={profile?.gender ?? null}
          userId={user.id}
          avatarId={profile?.avatar_id ?? null}
          interests={profile?.interests ?? []}
          goal={profile?.goal ?? null}
          startedCourses={startedCourses}
          progressByCourse={progressByCourse}
          mentorById={mentorById}
          projects={projects}
          givenFeedback={givenFeedback}
          givenFeedbackCount={givenFeedbackCount}
          savedOpportunities={savedOpportunities}
          upcomingSessions={upcomingSessions}
          memberSince={memberSince}
          journeySignals={journeySignals}
          activity={activity}
          isApprovedMentor={isApprovedMentor}
          achievements={achievements}
          certificates={certificates}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
