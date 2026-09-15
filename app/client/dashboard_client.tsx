"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, UserCircle, CheckCircle2, Circle, ArrowLeft, Star } from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { OpportunityListing, Course, Mentor } from "../types/types";
import type { Project, RecentFeedback } from "../actions/projects_actions";
import type { LessonSummary } from "../actions/lessons_actions";
import type { NextMove, JourneyMilestone } from "../server/dashboardserver";

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

/** بادچات الإنجازات — الشكل موجود، البيانات لسه Placeholder لحد ما يبقى فيه تتبّع حقيقي */
const ACHIEVEMENT_SLOTS = [
  { label: "أول كورس", icon: "build" as const },
  { label: "أول مشروع", icon: "hammer" as const },
  { label: "أول فرصة", icon: "target" as const },
  { label: "مساهمة", icon: "heart" as const },
];

export function DashboardClient({
  opportunities, mentors, startedCourses, currentLearning, nextMoves, journey, projects, recentFeedback,
}: {
  opportunities: OpportunityListing[];
  mentors: Mentor[];
  startedCourses: StartedCourseProgress[];
  currentLearning: StartedCourseProgress | null;
  nextMoves: NextMove[];
  journey: JourneyMilestone[];
  projects: Project[];
  recentFeedback: RecentFeedback[];
}) {
  const [mentorModalOpen, setMentorModalOpen] = React.useState(false);

  // "استمر في التعلم" بتعرض باقي الكورسات المبدوءة غير اللي ظاهر أصلاً في
  // الـhero — تجنّبًا لتكرار نفس الكورس مرتين في نفس الصفحة
  const otherStartedCourses = startedCourses.filter((c) => c.course.id !== currentLearning?.course.id);

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Current Learning — أهم section في الصفحة */}
      <CurrentLearningHero learning={currentLearning} />

      {/* 2. خطوتك الجاية — actions حقيقية بتتغيّر حسب حالة الطالب */}
      {nextMoves.length > 0 && (
        <section>
          <h2 className="mb-4 text-[1.2rem] font-extrabold">خطوتك الجاية</h2>
          <div className="flex flex-wrap gap-3">
            {nextMoves.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[.9rem] font-extrabold text-white transition-all hover:-translate-y-0.5"
              >
                {m.label} <ArrowLeft className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. استمر في التعلم — باقي الكورسات المبدوءة */}
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

      {/* 4. مشاريعك — بيانات حقيقية من جدول projects */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[1.2rem] font-extrabold">مشاريعك</h2>
          <Link href="/projects/new" className="text-[.84rem] font-bold text-primary">+ مشروع جديد</Link>
        </div>
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
                      : "rounded-full bg-muted px-2.5 py-1 text-[.68rem] font-bold text-muted-foreground"
                  }>
                    {p.status === "published" ? "منشور" : "مسودّة"}
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

      {/* 6. رحلتك في COCR — milestones محسوبة من بيانات حقيقية، مش XP/ranking */}
      <section>
        <h2 className="mb-4 text-[1.2rem] font-extrabold">رحلتك في COCR</h2>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {journey.map((m) => (
            <li key={m.label} className="flex items-center gap-3 px-5 py-3.5">
              {m.done ? <CheckCircle2 className="h-5 w-5 text-green" /> : <Circle className="h-5 w-5 text-slate-300" />}
              <span className={m.done ? "text-[.92rem] font-bold" : "text-[.92rem] font-bold text-muted-foreground"}>
                {m.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

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

      {/* 8. إنجازاتك — قريبًا، من غير أي رقم مُلفَّق */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-[1.2rem] font-extrabold">إنجازاتك</h2>
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[.72rem] font-bold text-muted-foreground">
            <Lock className="h-3 w-3" /> قريبًا
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACHIEVEMENT_SLOTS.map((a) => (
            <div key={a.label} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white px-3 py-5 text-center opacity-60">
              <Icon3D name={a.icon} className="h-9 w-9" />
              <span className="text-[.78rem] font-bold text-muted-foreground">{a.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[.78rem] text-slate-400">
          <Star className="me-1 inline h-3 w-3" />
          الإنجازات دي هتشتغل بمجرد ما يبقى فيه تتبّع حقيقي لتقدّمك — مش أرقام مُلفَّقة.
        </p>
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
