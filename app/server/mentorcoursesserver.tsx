import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { getCourses } from "../actions/landing_page_actions";
import { getMyCourseProposals } from "../actions/course_proposals_actions";
import { CreateCourseProposalForm, PROPOSAL_STATUS_LABEL, PROPOSAL_STATUS_STYLE } from "../client/mentor_home_client";
import { MentorShell } from "./mentorshell";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";
import Link from "next/link";

/** الكورسات — الكورسات الحقيقية المسندة لتراكك من الكتالوج، وطلب كورس جديد
 * (request بيراجعه فريق COCR، مش نشر مباشر — مفيش صلاحية INSERT للمينتور
 * على الكتالوج نفسه) */
export async function MentorCoursesContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/mentor/courses");

  const application = await getMyMentorApplication();
  if (application?.status !== "approved") redirect("/become-a-mentor");

  const [allCourses, myProposals] = await Promise.all([getCourses(), getMyCourseProposals()]);
  const myCourses = allCourses.filter((c) => c.category === application.track);

  return (
    <>
    <main className="relative overflow-hidden bg-sugar-white pb-[100px] pt-[52px]">
      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <MentorShell active="/mentor/courses" />
        <AppPageHeader title="الكورسات" context="الكورسات المسندة لتراكك، وطلبات الكورسات الجديدة اللي بعتّها." />

        <section className="mb-8">
          <h2 className="mb-4 text-[1.05rem] font-extrabold">الكورسات المسندة لك</h2>
          {myCourses.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-blue-50 px-6 py-8 text-center text-[.9rem] text-muted-foreground">
              مفيش كورسات في تراكك دلوقتي.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myCourses.map((c, i) => (
                <Link
                  key={c.id} href={`/courses/${c.id}`}
                  className="animate-fade-up flex items-center gap-3 rounded-2xl border border-border bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.18)]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Icon3D name={c.icon} className="h-9 w-9 shrink-0" />
                  <p className="truncate text-[.86rem] font-extrabold">{c.title}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-1 text-[1.05rem] font-extrabold">اطلب كورس جديد</h2>
          <p className="mb-4 text-[.8rem] text-muted-foreground">فريق COCR هيراجع الطلب قبل ما يتنشر في الكتالوج — الموافقة هنا مش نشر تلقائي.</p>

          {myProposals.length > 0 && (
            <div className="mb-5 flex flex-col gap-2">
              {myProposals.map((p) => (
                <Link key={p.id} href={`/mentor/courses/${p.id}`} className="block rounded-xl bg-blue-50 p-3 transition-colors hover:bg-blue-tint">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[.86rem] font-extrabold">{p.title}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[.72rem] font-extrabold ${PROPOSAL_STATUS_STYLE[p.status]}`}>
                      {PROPOSAL_STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  {p.notes && <p className="mt-1.5 text-[.78rem] text-muted-foreground">ملاحظة الفريق: {p.notes}</p>}
                </Link>
              ))}
            </div>
          )}

          <CreateCourseProposalForm track={application.track} />
        </section>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
