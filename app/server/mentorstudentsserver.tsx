import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { getSubmissionsForMentor } from "../actions/submissions_actions";
import { groupByStudent } from "../lib/mentor-students";
import { MentorShell } from "./mentorshell";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

/** طلابي — قايمة كاملة، حقيقية من نفس التسليمات اللي المينتور شايفها
 * (course_submissions status='submitted')، مجمّعة على مستوى الطالب */
export async function MentorStudentsContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/mentor/students");

  const application = await getMyMentorApplication();
  if (application?.status !== "approved") redirect("/become-a-mentor");

  const submissions = await getSubmissionsForMentor();
  const students = groupByStudent(submissions);

  return (
    <>
    <main className="relative overflow-hidden bg-sugar-white pb-[100px] pt-[52px]">
      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <MentorShell active="/mentor/students" />
        <AppPageHeader title="طلابي" context="كل طالب سلّم حاجة في تراكك، وآخر نشاط ليه." />

        {students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-blue-50 px-6 py-10 text-center text-[.9rem] text-muted-foreground">
            لسه مفيش طلاب سلّموا حاجة في تراكك.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {students.map((st, i) => (
              <div
                key={st.id}
                className="animate-fade-up flex items-center gap-3 rounded-2xl border border-border bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.18)]"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-tint text-[.9rem] font-extrabold text-primary">
                  {st.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[.9rem] font-extrabold">{st.name}</p>
                  <p className="text-[.78rem] text-muted-foreground">
                    {st.totalCount} تسليم · آخر نشاط {new Date(st.lastActivityAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                  </p>
                </div>
                {st.pendingCount > 0 && (
                  <span className="shrink-0 rounded-full bg-gold-50 px-2.5 py-1 text-[.74rem] font-extrabold text-gold-600">
                    {st.pendingCount} مستني
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
