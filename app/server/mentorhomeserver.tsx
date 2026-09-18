import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Calendar, ClipboardCheck, Star, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { avatarUrl } from "../lib/avatar-gallery";
import { groupByStudent } from "../lib/mentor-students";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { getSubmissionsForMentor, getMyMentorRatingSummary } from "../actions/submissions_actions";
import { getUpcomingSessionsForMentor } from "../actions/course_sessions_actions";
import { SubmissionReviewRow } from "../client/mentor_inbox_client";
import { MentorShell } from "./mentorshell";
import { SiteFooter } from "./landingserver";

const TRACK_LABEL: Record<string, string> = {
  "front-end": "Front-End",
  cybersecurity: "Cybersecurity",
  "app-dev": "App Dev",
  embedded: "Embedded",
};

/** نظرة عامة على مساحة المينتور — ملخص بس، كل قسم تفصيلي له صفحته الخاصة
 * (طلابي/جدولي/الكورسات/التسليمات) عشان الصفحة دي متتحولش لكل حاجة في
 * مكان واحد. كل الأرقام هنا حقيقية 100%. */
export async function MentorHomeContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/mentor");

  const application = await getMyMentorApplication();
  if (application?.status !== "approved") redirect("/become-a-mentor");

  const [submissions, ratingSummary, upcomingSessionRows] = await Promise.all([
    getSubmissionsForMentor(),
    getMyMentorRatingSummary(),
    getUpcomingSessionsForMentor(),
  ]);

  const students = groupByStudent(submissions);
  const pendingCount = submissions.filter((s) => !s.feedback_given).length;
  const pendingSubmissions = submissions.filter((s) => !s.feedback_given).slice(0, 2);

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
  const firstName = displayName.split(" ")[0] || "";
  const trackLabel = TRACK_LABEL[application.track] ?? application.track;

  return (
    <>
    <main className="relative overflow-hidden bg-sugar-white pb-[100px] pt-[52px]">
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <MentorShell active="/mentor" />

        {/* الهيرو — هوية COCR الحقيقية: نفس primary blue بتاع باقي المنصة، مفيش لون تاني مُخترع */}
        <section className="animate-fade-up relative mb-8 overflow-hidden rounded-3xl border border-border bg-white p-7">
          <span aria-hidden className="animate-soft-pulse absolute -left-6 -top-6">
            <Icon3D name="mentor" className="h-40 w-40" />
          </span>
          <div className="relative z-[1] flex flex-wrap items-center gap-5">
            <img
              src={avatarUrl(user.id, application.gender)}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border-2 border-white shadow-sm transition-transform duration-300 hover:scale-105 hover:rotate-2"
            />
            <div>
              <p className="text-[.85rem] font-bold text-primary">
                {firstName ? `أهلًا يا ${firstName} 👋` : "أهلًا بيك"} — مينتور معتمد في تراك {trackLabel}
              </p>
              <h1 className="mt-1 text-[1.35rem] font-extrabold leading-tight">دي مساحتك — منها تتابع طلابك، وتراجع تسليماتهم، وتعمل سيشناتك</h1>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-8">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard delay={60} icon={<ClipboardCheck className="h-4.5 w-4.5" />} value={String(pendingCount)} label="تسليمات مستنياك" href="/mentor/submissions" tone={pendingCount > 0} />
            <StatCard delay={110} icon={<Users className="h-4.5 w-4.5" />} value={String(students.length)} label="طلاب تعاملت معاهم" href="/mentor/students" tone={students.length > 0} />
            <StatCard delay={160} icon={<Calendar className="h-4.5 w-4.5" />} value={String(upcomingSessionRows.length)} label="سيشنز جاية" href="/mentor/sessions" tone={upcomingSessionRows.length > 0} />
            <StatCard
              delay={210}
              icon={<Star className="h-4.5 w-4.5" />}
              value={ratingSummary.average !== null ? `${ratingSummary.average} / 5` : "—"}
              label={ratingSummary.count > 0 ? `من ${ratingSummary.count} تقييم` : "لسه مفيش تقييمات"}
              tone={false}
            />
          </div>

          <section className="animate-fade-up" style={{ animationDelay: "260ms" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[1.1rem] font-extrabold">تسليمات مستنياك</h2>
              {submissions.length > 0 && (
                <Link href="/mentor/submissions" className="group flex items-center gap-1.5 text-[.84rem] font-bold text-primary">
                  شوف كل التسليمات <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                </Link>
              )}
            </div>
            {pendingSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-blue-50 px-6 py-8 text-center text-[.9rem] text-muted-foreground">
                مفيش تسليمات مستنياك مراجعة دلوقتي.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingSubmissions.map((s) => <SubmissionReviewRow key={s.id} submission={s} />)}
              </div>
            )}
          </section>

          {/* قريبًا — عناصر حقيقية في خطة المنصة، بس محتاجة قرار
              backend/architecture/سلامة قبل ما تُبنى، مش هنمثّلها ببيانات
              وهمية أو زرار مالوش تأثير */}
          <section className="animate-fade-up rounded-2xl border border-dashed border-border bg-blue-50 p-5" style={{ animationDelay: "310ms" }}>
            <h2 className="mb-3 text-[.9rem] font-extrabold text-muted-foreground">قريبًا في مساحة المينتور</h2>
            <ul className="flex flex-col gap-2 text-[.82rem] text-muted-foreground">
              <li>• رسائل مباشرة مع الطلاب — محتاجة قرار أمان صريح الأول (منصة فيها قصّر)، مش مجرد فيتشر تقني</li>
              <li>• تذكير تلقائي بالإيميل للطلاب — محتاج نظام إيميل لسه مش موجود</li>
              <li>• مراجعة مشاريع الطلاب من هنا — نظام المشاريع لسه منفصل عمدًا عن نظام المينتور</li>
              <li>• تقارير وتحليلات — محتاجة نحدد الأرقام المفيدة فعلًا الأول، مش نعمل رسومات لمجرد الشكل</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

function StatCard({ icon, value, label, tone, href, delay }: { icon: React.ReactNode; value: string; label: string; tone: boolean; href?: string; delay?: number }) {
  const inner = (
    <div
      className={
        tone
          ? "flex h-full flex-col gap-1.5 rounded-2xl border border-primary/30 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(30,69,196,.35)]"
          : "flex h-full flex-col gap-1.5 rounded-2xl border border-border bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.18)]"
      }
    >
      <span className={tone ? "grid h-9 w-9 place-items-center rounded-full bg-blue-tint text-primary" : "grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-slate-500"}>
        {icon}
      </span>
      <p className={tone ? "text-[1.4rem] font-extrabold text-primary" : "text-[1.4rem] font-extrabold"}>{value}</p>
      <p className="text-[.78rem] font-bold text-muted-foreground">{label}</p>
    </div>
  );
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay ?? 0}ms` }}>
      {href ? <Link href={href}>{inner}</Link> : inner}
    </div>
  );
}
