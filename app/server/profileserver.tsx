import { redirect } from "next/navigation";
import { ProfileClient } from "../client/profile_client";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getCourses, getMentors } from "../actions/landing_page_actions";
import { getOpportunities } from "../actions/opportunities_actions";
import { getMyProfile, getMyEnrollments } from "../actions/profile_actions";
import { getMyProjects } from "../actions/projects_actions";

export async function ProfilePageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/profile");

  const [courses, mentors, opportunities, profile, enrollments, projects] = await Promise.all([
    getCourses(),
    getMentors(),
    getOpportunities(),
    getMyProfile(),
    getMyEnrollments(),
    getMyProjects(),
  ]);

  const name = profile?.display_name || (user.user_metadata?.full_name as string | undefined) || user.email || "طالب COCR";
  const bio = profile?.bio ?? "";
  const skills = profile?.skills ?? [];
  const startedCourses = enrollments
    .map((e) => courses.find((c) => c.id === e.course_id))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const mentorById = Object.fromEntries(mentors.map((m) => [m.id, m]));

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-10 max-w-[38em]">
          <span className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
            الملف الشخصي
          </span>
          <h1 className="mb-4 text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold leading-tight tracking-tight">
            بياناتك
          </h1>
        </div>

        <ProfileClient
          name={name}
          email={user.email ?? ""}
          bio={bio}
          skills={skills}
          startedCourses={startedCourses}
          mentorById={mentorById}
          opportunities={opportunities}
          projects={projects}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
