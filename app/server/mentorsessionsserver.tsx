import { redirect } from "next/navigation";
import { Calendar, Video } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { getAllSessionsForMentor } from "../actions/course_sessions_actions";
import { getCourses, getCourseById } from "../actions/landing_page_actions";
import { CreateSessionForm } from "../client/mentor_home_client";
import { MentorShell } from "./mentorshell";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

/** جدولي — كل سيشنز المينتور، جايّة وسابقة، حقيقية من course_sessions.
 * إنشاء سيشن جديد من هنا كمان بدل ما يبقى لازم يروح لصفحة الكورس */
export async function MentorSessionsContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/mentor/sessions");

  const application = await getMyMentorApplication();
  if (application?.status !== "approved") redirect("/become-a-mentor");

  const [allSessions, allCourses] = await Promise.all([getAllSessionsForMentor(), getCourses()]);
  const now = new Date().toISOString();
  const upcoming = allSessions.filter((s) => s.scheduled_at >= now).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = allSessions.filter((s) => s.scheduled_at < now);
  const myCourses = allCourses.filter((c) => c.category === application.track);
  const courseTitleById = Object.fromEntries(
    await Promise.all(
      [...new Set(allSessions.map((s) => s.course_id))].map(async (id) => [id, (await getCourseById(id))?.title ?? id] as const),
    ),
  );

  return (
    <>
    <main className="relative overflow-hidden bg-sugar-white pb-[100px] pt-[52px]">
      <div className="relative z-[2] mx-auto max-w-[1000px] px-7">
        <MentorShell active="/mentor/sessions" />
        <AppPageHeader title="جدولي" context="كل السيشنز اللي عاملها schedule بنفسك — جايّة وسابقة." />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="mb-4 text-[1.05rem] font-extrabold">جايّة</h2>
              {upcoming.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-blue-50 px-6 py-8 text-center text-[.9rem] text-muted-foreground">
                  مفيش سيشنز مجدولة ليك دلوقتي.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {upcoming.map((s, i) => {
                    const date = new Date(s.scheduled_at);
                    return (
                      <div
                        key={s.id}
                        className="animate-fade-up flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.18)]"
                        style={{ animationDelay: `${i * 45}ms` }}
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-tint">
                          <Calendar className="h-5 w-5 text-primary" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[.88rem] font-extrabold">{s.title}</p>
                          <p className="truncate text-[.76rem] text-muted-foreground">{courseTitleById[s.course_id]}</p>
                        </div>
                        <span className="shrink-0 text-[.78rem] font-bold text-primary">
                          {date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "short" })} · {date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        {s.zoom_link && (
                          <a href={s.zoom_link} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[.76rem] font-extrabold text-white">
                            <Video className="h-3.5 w-3.5" /> ادخل السيشن
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-[1.05rem] font-extrabold">سابقة</h2>
              {past.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-blue-50 px-6 py-8 text-center text-[.9rem] text-muted-foreground">
                  مفيش سيشنز سابقة لسه.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {past.map((s) => {
                    const date = new Date(s.scheduled_at);
                    return (
                      <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-blue-50 p-3.5 opacity-80">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[.86rem] font-extrabold">{s.title}</p>
                          <p className="truncate text-[.74rem] text-muted-foreground">{courseTitleById[s.course_id]}</p>
                        </div>
                        <span className="shrink-0 text-[.74rem] font-bold text-muted-foreground">
                          {date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="rounded-2xl border border-border bg-white p-5">
            <h2 className="mb-4 text-[1rem] font-extrabold">أنشئ سيشن جديد</h2>
            <CreateSessionForm myCourses={myCourses} />
          </aside>
        </div>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
