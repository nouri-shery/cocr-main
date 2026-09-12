import { redirect } from "next/navigation";
import { ProfileClient } from "../client/profile_client";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getCourses, getMentors } from "../actions/landing_page_actions";
import { getOpportunities } from "../actions/opportunities_actions";

export async function ProfilePageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/profile");

  const [courses, mentors, opportunities] = await Promise.all([
    getCourses(),
    getMentors(),
    getOpportunities(),
  ]);

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "طالب COCR";
  const bio = (user.user_metadata?.bio as string | undefined) ?? "";
  const skills = (user.user_metadata?.skills as string[] | undefined) ?? [];
  const startedCourseIds: { id: string; startedAt: string }[] = user.user_metadata?.startedCourses ?? [];
  const startedCourses = startedCourseIds
    .map((sc) => courses.find((c) => c.id === sc.id))
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
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
