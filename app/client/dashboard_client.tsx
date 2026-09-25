"use client";

import * as React from "react";
import Link from "next/link";
import { UserCircle, ArrowLeft, Video, Calendar } from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { JourneyCompact, type JourneySignals } from "./journey_client";
import type { OpportunityListing, Course, Mentor } from "../types/types";
import type { Project, RecentFeedback } from "../actions/projects_actions";
import type { LessonSummary } from "../actions/lessons_actions";
import type { NextMove, UpcomingSessionCard } from "../server/dashboardserver";

export interface StartedCourseProgress {
  course: Course;
  completed: number;
  total: number;
  nextLesson: LessonSummary | null;
}

const ACCENT: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "#E9EEFC", fg: "#1E45C4" },
  gold: { bg: "#FBF1DC", fg: "#B8801F" },
  green: { bg: "#E6F3EB", fg: "#1E7A4E" },
  ink: { bg: "#E9E7E2", fg: "#3E403F" },
};

export function DashboardClient({
  opportunities, mentors, startedCourses, currentLearning, nextMoves, upcomingSession, otherUpcomingSessions, stats, journeySignals, projects, recentFeedback,
}: {
  opportunities: OpportunityListing[];
  mentors: Mentor[];
  startedCourses: StartedCourseProgress[];
  currentLearning: StartedCourseProgress | null;
  nextMoves: NextMove[];
  upcomingSession: UpcomingSessionCard | null;
  otherUpcomingSessions: UpcomingSessionCard[];
  stats: { enrollments: number; publishedProjects: number; feedbackGiven: number; achievements: number; certificates: number };
  journeySignals: JourneySignals;
  projects: Project[];
  recentFeedback: RecentFeedback[];
}) {
  const [mentorModalOpen, setMentorModalOpen] = React.useState(false);

  // "استمر في التعلم" بتعرض باقي الكورسات المبدوءة غير اللي ظاهر أصلاً في
  // الـhero — تجنّبًا لتكرار نفس الكورس مرتين في نفس الصفحة
  const otherStartedCourses = startedCourses.filter((c) => c.course.id !== currentLearning?.course.id);

  return (
    <div className="flex flex-col gap-10">
      {/* 1. مين انت + فين رحلتك + خطوتك الجاية — بلوك واحد فوق بدل sections
          منفصلة بنفس الوزن، عشان أول حاجة تشوفها تبقى واضحة ومركّزة */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <JourneyCompact signals={journeySignals} />
          <Link href="/profile" className="shrink-0 text-[.78rem] font-bold text-primary whitespace-nowrap">
            رحلتك الكاملة ←
          </Link>
        </div>
        {(stats.enrollments > 0 || stats.publishedProjects > 0 || stats.feedbackGiven > 0) && (
          <p className="text-[.84rem] font-bold text-slate-500">
            {[
              stats.enrollments > 0 && `${stats.enrollments} كورس بدأته`,
              stats.publishedProjects > 0 && `${stats.publishedProjects} مشروع منشور`,
              stats.feedbackGiven > 0 && `${stats.feedbackGiven} ملاحظة قدّمتها`,
              stats.achievements > 0 && `${stats.achievements} إنجاز`,
              stats.certificates > 0 && `${stats.certificates} شهادة`,
            ].filter(Boolean).join(" · ")}
          </p>
        )}
        <CurrentLearningHero learning={currentLearning} />

        {/* حاجات مستنياك — كل كارت هنا فعل حقيقي فعلاً متاح دلوقتي، مفيش كارت
            وهمي بيتعرض عشان بس يملي مساحة */}
        {(nextMoves.length > 0 || upcomingSession) && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingSession && <UpcomingSessionActionCard session={upcomingSession} />}
            {nextMoves.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-tint">
                  <Icon3D name={m.icon} className="h-6 w-6" />
                </span>
                <span className="flex-1 text-[.9rem] font-extrabold leading-snug">{m.label}</span>
                <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 2. استمر في التعلم — باقي الكورسات المبدوءة */}
      {otherStartedCourses.length > 0 && (
        <section>
          <h2 className="mb-4 text-[1.2rem] font-extrabold">استمر في التعلم</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherStartedCourses.map(({ course: c, completed, total, nextLesson }) => {
              const a = ACCENT[c.accent];
              const isComplete = total > 0 && completed >= total;
              const href = nextLesson ? `/courses/${c.id}/lessons/${nextLesson.id}` : c.href;
              return (
                <Link
                  key={c.id}
                  href={href}
                  className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
                >
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-full" style={{ background: a.bg }}>
                    <Icon3D name={c.icon} className="h-5 w-5" />
                  </span>
                  <p className="text-[.92rem] font-extrabold leading-snug">{c.title}</p>
                  {total > 0 && (
                    <div className="mt-3 flex flex-col gap-1">
                      <p className="text-[.76rem] font-bold text-slate-500">
                        {isComplete ? "الكورس مكتمل 🎉" : `${completed} من ${total} دروس`}
                      </p>
                      <Progress value={Math.round((completed / total) * 100)} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. جدولك — كل السيشنز الجاية (غير اللي ظاهرة أصلاً فوق كـ"حاجة
          مستنياك")، بيانات حقيقية من course_sessions */}
      {otherUpcomingSessions.length > 0 && (
        <section>
          <h2 className="mb-4 text-[1.2rem] font-extrabold">جدولك</h2>
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-white">
            {otherUpcomingSessions.map((s) => {
              const date = new Date(s.scheduledAt);
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex min-w-[140px] flex-col">
                    <span className="text-[.82rem] font-extrabold text-primary">
                      {date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "short" })}
                    </span>
                    <span className="text-[.76rem] font-bold text-slate-500">
                      {date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[.88rem] font-extrabold">{s.title}</p>
                    <p className="truncate text-[.76rem] text-muted-foreground">{s.courseTitle}</p>
                  </div>
                  {s.zoomLink ? (
                    <a
                      href={s.zoomLink} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[.78rem] font-extrabold text-white"
                    >
                      ادخل السيشن
                    </a>
                  ) : (
                    <Link href={s.href} className="shrink-0 text-[.78rem] font-bold text-primary underline">
                      افتح الكورس
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. مشاريعك — بيانات حقيقية من جدول projects. أعداد المسودّات/المنشورة
          حقيقية (status الحقيقي بس — مفيش حالة "قيد المراجعة" في الـschema
          دلوقتي، فمش بنعرضها) */}
      <section>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[1.2rem] font-extrabold">مشاريعك</h2>
          <div className="flex items-center gap-3">
            {projects.length > 3 && (
              <Link href="/projects" className="text-[.84rem] font-bold text-slate-500 hover:text-foreground">شوف كل مشاريعك</Link>
            )}
            <Link href="/projects/new" className="text-[.84rem] font-bold text-primary">+ مشروع جديد</Link>
          </div>
        </div>
        {projects.length > 0 && (
          <p className="mb-4 text-[.82rem] font-semibold text-slate-500">
            {projects.filter((p) => p.status === "draft").length} مسودّة · {projects.filter((p) => p.status === "published").length} منشورة
          </p>
        )}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-sand px-6 py-10 text-center">
            <Icon3D name="hammer" className="h-12 w-12 opacity-70" />
            <p className="font-bold">لسه معملتش مشروع</p>
            <p className="max-w-[26em] text-[.86rem] text-muted-foreground">
              المشاريع هي المكان اللي بتشارك فيه اللي بنيته — اعمل أول مشروع من اللي اتعلمته.
            </p>
            <Link href="/projects/new" className="mt-1 rounded-xl bg-primary px-5 py-2 text-[.86rem] font-extrabold text-white">
              اعمل أول مشروع
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-sand">
                    <Icon3D name="hammer" className="h-5 w-5" />
                  </span>
                  <span className={
                    p.status === "published"
                      ? "rounded-full bg-green-50 px-2.5 py-1 text-[.68rem] font-bold text-green"
                      : p.status === "pending_review"
                        ? "rounded-full bg-blue-tint px-2.5 py-1 text-[.68rem] font-bold text-primary"
                        : p.status === "rejected"
                          ? "rounded-full bg-destructive/10 px-2.5 py-1 text-[.68rem] font-bold text-destructive"
                          : "rounded-full bg-muted px-2.5 py-1 text-[.68rem] font-bold text-muted-foreground"
                  }>
                    {p.status === "published" ? "منشور" : p.status === "pending_review" ? "مستنية مراجعة" : p.status === "rejected" ? "محتاج تعديل" : "مسودّة"}
                  </span>
                </div>
                <p className="text-[.92rem] font-extrabold leading-snug">{p.title}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 5. آخر Feedback وصلك — بيانات حقيقية من project_feedback، بيظهر بس لو موجود فعلاً */}
      {recentFeedback.length > 0 && (
        <section>
          <h2 className="mb-4 text-[1.2rem] font-extrabold">آخر Feedback وصلك</h2>
          <div className="flex flex-col gap-3">
            {recentFeedback.map((f) => (
              <Link
                key={f.id}
                href={`/projects/${f.project.id}`}
                className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
              >
                <p className="text-[.78rem] font-extrabold text-primary">{f.project.title}</p>
                <p className="mt-1.5 text-[.9rem] leading-relaxed">{f.body}</p>
                <p className="mt-2 text-[.76rem] text-muted-foreground">
                  {f.author?.display_name || "طالب في COCR"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* الرحلة الكاملة (JourneyFull) موجودة في البروفايل بس دلوقتي — هنا
          كان في نسخة مكررة، اتشالت عشان الداشبورد تفضل عن "الخطوة الجاية"
          مش تكرار لصفحة تانية */}

      {/* 7. فرص ممكن تهمك — محتوى منسّق حقيقي، لكن مش مُدّعى إنه personalized */}
      <section>
        <h2 className="mb-4 text-[1.2rem] font-extrabold">فرص ممكن تهمك</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.slice(0, 3).map((o) => {
            const a = ACCENT[o.accent];
            return (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
              >
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-full" style={{ background: a.bg }}>
                  <Icon3D name={o.icon} className="h-5 w-5" />
                </span>
                <p className="text-[.92rem] font-extrabold leading-snug">{o.title}</p>
                <p className="mt-1 text-[.78rem] text-muted-foreground">{o.organization}</p>
              </Link>
            );
          })}
        </div>
        <Link href="/opportunities" className="mt-4 inline-block text-[.86rem] font-bold text-primary">
          شوف كل الفرص ←
        </Link>
      </section>

      {/* روابط سريعة ثانوية — مش أقسام رئيسية في الصفحة */}
      <section className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-6 text-[.86rem] font-bold text-muted-foreground">
        <Link href="/saved" className="flex items-center gap-1.5 hover:text-foreground">
          <Icon3D name="heart" className="h-4 w-4" /> المفتكرة
        </Link>
        <span className="text-border">·</span>
        <Link href="/profile" className="flex items-center gap-1.5 hover:text-foreground">
          <UserCircle className="h-4 w-4" /> ملفك الشخصي
        </Link>
        <span className="text-border">·</span>
        <button type="button" onClick={() => setMentorModalOpen(true)} className="flex items-center gap-1.5 hover:text-foreground">
          <Icon3D name="mentor" className="h-4 w-4" /> تواصل مع مينتور
        </button>
      </section>

      <MentorCtaDialog open={mentorModalOpen} onOpenChange={setMentorModalOpen} mentors={mentors} />
    </div>
  );
}

/** كارت السيشن الجاي — بيانات حقيقية من course_sessions، بيظهر بس لو فيه
 * سيشن فعلاً محجوز جاي في كورس الطالب متسجّل فيه */
function UpcomingSessionActionCard({ session }: { session: UpcomingSessionCard }) {
  const date = new Date(session.scheduledAt);
  const dateLabel = date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "short" });
  const timeLabel = date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-blue-tint p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white">
          <Calendar className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[.9rem] font-extrabold leading-snug">{session.title}</p>
          <p className="truncate text-[.76rem] text-muted-foreground">{session.courseTitle}</p>
        </div>
      </div>
      <p className="text-[.82rem] font-bold text-primary">{dateLabel} · {timeLabel}</p>
      {session.zoomLink ? (
        <a
          href={session.zoomLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[.85rem] font-extrabold text-white"
        >
          <Video className="h-4 w-4" /> ادخل السيشن
        </a>
      ) : (
        <Link href={session.href} className="text-center text-[.82rem] font-bold text-primary underline">
          افتح الكورس
        </Link>
      )}
    </div>
  );
}

/** الـsection الأولى والأهم — الكورس اللي الطالب بيتعلمه دلوقتي فعليًا */
function CurrentLearningHero({ learning }: { learning: StartedCourseProgress | null }) {
  if (!learning) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-sand px-6 py-12 text-center">
        <Icon3D name="build" className="h-14 w-14 opacity-70" />
        <p className="text-[1.1rem] font-extrabold">لسه ما بدأتش رحلة تعلم</p>
        <p className="max-w-[26em] text-[.9rem] text-muted-foreground">اختار كورس وابدأ أول خطوة فيه.</p>
        <Link href="/courses" className="mt-2 rounded-xl bg-primary px-6 py-3 text-[.92rem] font-extrabold text-white">
          اكتشف الكورسات
        </Link>
      </section>
    );
  }

  const { course, completed, total, nextLesson } = learning;
  const a = ACCENT[course.accent];
  const isComplete = total > 0 && completed >= total;
  const href = nextLesson ? `/courses/${course.id}/lessons/${nextLesson.id}` : course.href;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-white">
      <div className="flex flex-col items-start gap-4 p-7" style={{ background: `linear-gradient(180deg, ${a.bg}, #fff 85%)` }}>
        <div className="flex items-center gap-2 text-[.78rem] font-extrabold" style={{ color: a.fg }}>
          <Icon3D name={course.icon} className="h-4 w-4" /> بتتعلم دلوقتي
        </div>
        <h2 className="text-[clamp(1.25rem,2.6vw,1.6rem)] font-extrabold leading-tight">{course.title}</h2>

        {nextLesson ? (
          <div>
            <p className="text-[.92rem] font-extrabold text-slate-700">
              الدرس {nextLesson.order_index} · {nextLesson.title}
            </p>
            {nextLesson.summary && <p className="mt-1 text-[.86rem] text-muted-foreground">{nextLesson.summary}</p>}
          </div>
        ) : isComplete ? (
          <p className="text-[.92rem] font-extrabold text-green">خلصت كل الدروس المتاحة في الكورس ده 🎉</p>
        ) : (
          <p className="text-[.9rem] text-muted-foreground">لسه مفيش دروس متاحة للكورس ده — هنضيفها قريب.</p>
        )}

        {total > 0 && (
          <div className="flex w-full max-w-[320px] flex-col gap-1.5">
            <p className="text-[.8rem] font-bold text-slate-500">{completed} من {total} دروس</p>
            <Progress value={Math.round((completed / total) * 100)} />
          </div>
        )}

        <Link
          href={href}
          className="mt-1 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[.92rem] font-extrabold text-white"
          style={{ background: a.fg }}
        >
          {nextLesson ? "كمّل الدرس" : "افتح الكورس"}
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MentorCtaDialog — معلومات بس، مفيش نظام حجز/طلب حقيقي لسه          */
/* ------------------------------------------------------------------ */
function MentorCtaDialog({
  open, onOpenChange, mentors,
}: { open: boolean; onOpenChange: (open: boolean) => void; mentors: Mentor[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2 text-[1.1rem] font-extrabold">
            تواصل مع مينتور 🤝
          </DialogTitle>
          <DialogDescription className="text-[.9rem] leading-relaxed">
            المينتورز في COCR ناس سبقوك بسنة أو اتنين في نفس المسار، وبيراجعوا تسليمات الكورسات.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5">
          {mentors.map((m) => {
            const a = ACCENT[m.accent];
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[.75rem] font-extrabold"
                  style={{ background: a.bg }}
                  aria-hidden
                >
                  {m.initial}
                </span>
                <div>
                  <p className="text-[.88rem] font-extrabold">{m.name}</p>
                  <p className="text-[.76rem] text-muted-foreground">{m.track} · {m.gapLabel}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-sand p-3.5 text-[.82rem] leading-relaxed text-muted-foreground">
          دلوقتي في مرحلة الـ Beta مفيش نظام حجز مباشر مع مينتور لسه — بس تقدر تتعرف عليهم أكتر من صفحة كل كورس، وهما اللي بيراجعوا تسليماتك فيه.
        </div>

        <Link
          href="/courses"
          onClick={() => onOpenChange(false)}
          className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-primary text-[.9rem] font-extrabold text-white"
        >
          شوف المينتورز في الكورسات
        </Link>
      </DialogContent>
    </Dialog>
  );
}
