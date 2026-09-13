"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Sprout, Lock, Users2, UserCircle } from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GrowthLadder } from "./landing_client";
import { getOnboarding, GOALS, INTEREST_TO_OPPORTUNITY_CATEGORY, INTEREST_TO_COURSE_CATEGORY, type OnboardingData } from "../lib/onboarding";
import type { OpportunityListing, Course, Mentor, GrowthRung } from "../types/types";
import type { Project } from "../actions/projects_actions";

const ACCENT: Record<string, { bg: string }> = {
  blue: { bg: "#E9EEFC" },
  gold: { bg: "#FBF1DC" },
  green: { bg: "#E6F3EB" },
  ink: { bg: "#E9E7E2" },
};

/** بادچات الإنجازات — الشكل موجود، البيانات لسه Placeholder لحد ما يبقى فيه تتبّع حقيقي */
const ACHIEVEMENT_SLOTS = [
  { label: "أول كورس", icon: "build" as const },
  { label: "أول مشروع", icon: "hammer" as const },
  { label: "أول فرصة", icon: "target" as const },
  { label: "مساهمة", icon: "heart" as const },
];

type Recommendation =
  | { kind: "opportunity"; item: OpportunityListing }
  | { kind: "course"; item: Course };

export function DashboardClient({
  rungs, opportunities, courses, mentors, startedCourses, projects,
}: {
  rungs: GrowthRung[]; opportunities: OpportunityListing[]; courses: Course[]; mentors: Mentor[];
  startedCourses: Course[]; projects: Project[];
}) {
  const [onboarding, setOnboarding] = React.useState<OnboardingData | null>(null);
  const [mentorModalOpen, setMentorModalOpen] = React.useState(false);

  React.useEffect(() => {
    setOnboarding(getOnboarding());
  }, []);

  const recommendations = React.useMemo<Recommendation[]>(() => {
    const interests = onboarding?.interests ?? [];
    if (interests.length === 0) {
      return [
        ...opportunities.slice(0, 2).map((item): Recommendation => ({ kind: "opportunity", item })),
        ...courses.slice(0, 2).map((item): Recommendation => ({ kind: "course", item })),
      ];
    }
    const oppCats = Array.from(new Set(interests.flatMap((i) => INTEREST_TO_OPPORTUNITY_CATEGORY[i])));
    const courseCats = Array.from(new Set(interests.flatMap((i) => INTEREST_TO_COURSE_CATEGORY[i])));
    const matchedOpps = opportunities.filter((o) => oppCats.includes(o.category)).slice(0, 2);
    const matchedCourses = courses.filter((c) => courseCats.includes(c.category)).slice(0, 2);
    const fallback = [
      ...opportunities.slice(0, 2).map((item): Recommendation => ({ kind: "opportunity", item })),
      ...courses.slice(0, 2).map((item): Recommendation => ({ kind: "course", item })),
    ];
    const merged = [
      ...matchedOpps.map((item): Recommendation => ({ kind: "opportunity", item })),
      ...matchedCourses.map((item): Recommendation => ({ kind: "course", item })),
    ];
    return merged.length > 0 ? merged : fallback;
  }, [onboarding, opportunities, courses]);

  const mentorById = React.useMemo(() => Object.fromEntries(mentors.map((m) => [m.id, m])), [mentors]);
  const goalLabel = onboarding?.goal ? GOALS.find((g) => g.id === onboarding.goal)?.label : null;

  return (
    <div>
      {/* الخطوة الجاية */}
      <section className="mb-10 rounded-3xl border border-primary/20 bg-blue-tint p-6">
        <div className="mb-2 flex items-center gap-2 text-[.8rem] font-extrabold text-primary">
          <Sprout className="h-4 w-4" /> الخطوة الجاية ليك
        </div>
        <p className="mb-4 text-[1.05rem] font-extrabold leading-relaxed">
          {goalLabel
            ? `بناءً على هدفك: "${goalLabel}"، ابدأ من هنا —`
            : "لسه معملتش الأونبوردينج؟ يومّنا نعرف نرشّحلك أدق."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/opportunities" className="rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white">
            استكشف الفرص
          </Link>
          <Link href="/courses" className="rounded-xl border border-primary/30 bg-white px-5 py-2.5 text-[.9rem] font-extrabold text-primary">
            استكشف الكورسات
          </Link>
        </div>
      </section>

      {/* ترشيحات مخصصة ليك */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-[1.2rem] font-extrabold">ترشيحات مخصصة ليك 🎯</h2>
          <span className="rounded-full bg-blue-tint px-3 py-1 text-[.72rem] font-bold text-primary">بناءً على اهتماماتك</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendations.map((rec) => {
            const a = ACCENT[rec.item.accent];
            const isCourse = rec.kind === "course";
            const href = isCourse ? (rec.item as Course).href : `/opportunities/${rec.item.id}`;
            const subtitle = isCourse ? mentorById[(rec.item as Course).mentorId]?.name : (rec.item as OpportunityListing).organization;
            return (
              <Link
                key={`${rec.kind}-${rec.item.id}`}
                href={href}
                className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: a.bg }}>
                    <Icon3D name={rec.item.icon} className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-sand px-2.5 py-1 text-[.68rem] font-bold text-slate-500">
                    {isCourse ? "كورس" : "فرصة"}
                  </span>
                </div>
                <p className="text-[.92rem] font-extrabold leading-snug">{rec.item.title}</p>
                {subtitle && <p className="mt-1 text-[.78rem] text-muted-foreground">{subtitle}</p>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* المفتكرة + الملف الشخصي + التواصل مع مينتور */}
      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <Link
          href="/saved"
          className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-tint text-primary">
            <Icon3D name="heart" className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold">المفتكرة</p>
            <p className="text-[.82rem] text-muted-foreground">الفرص اللي حفظتها عشان ترجع لها</p>
          </div>
        </Link>

        <Link
          href="/profile"
          className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-tint text-primary">
            <UserCircle className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold">ملفك الشخصي</p>
            <p className="text-[.82rem] text-muted-foreground">بياناتك، مهاراتك، وكورساتك</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMentorModalOpen(true)}
          className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-blue-tint p-5 text-start transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(30,69,196,.25)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-primary">
            <Icon3D name="mentor" className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold text-primary">تواصل مع مينتور 🤝</p>
            <p className="text-[.82rem] text-primary/70">اتعرف على المينتورز اللي ممكن يساعدوك</p>
          </div>
        </button>
      </section>

      {/* استمر في التعلم — بيانات حقيقية من الكورسات اللي بدأتها فعلاً */}
      <section className="mb-10">
        <h2 className="mb-4 text-[1.2rem] font-extrabold">استمر في التعلم</h2>
        {startedCourses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-sand px-6 py-10 text-center">
            <Icon3D name="build" className="h-12 w-12 opacity-70" />
            <p className="font-bold">لسه مبدأتش كورس</p>
            <p className="max-w-[26em] text-[.86rem] text-muted-foreground">لما تبدأ كورس، هيظهر هنا وتقدر تكمّل منه في أي وقت.</p>
            <Link href="/courses" className="mt-1 rounded-xl bg-primary px-5 py-2 text-[.86rem] font-extrabold text-white">
              استكشف الكورسات
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {startedCourses.map((c) => {
              const a = ACCENT[c.accent];
              return (
                <Link
                  key={c.id}
                  href={c.href}
                  className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
                >
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-full" style={{ background: a.bg }}>
                    <Icon3D name={c.icon} className="h-5 w-5" />
                  </span>
                  <p className="text-[.92rem] font-extrabold leading-snug">{c.title}</p>
                  <p className="mt-1 text-[.78rem] text-muted-foreground">{mentorById[c.mentorId]?.name}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* مشاريعك — بيانات حقيقية من جدول projects */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[1.2rem] font-extrabold">مشاريعك</h2>
          <Link href="/projects/new" className="text-[.84rem] font-bold text-primary">+ مشروع جديد</Link>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-sand px-6 py-10 text-center">
            <Icon3D name="hammer" className="h-12 w-12 opacity-70" />
            <p className="font-bold">لسه معملتش مشروع</p>
            <p className="max-w-[26em] text-[.86rem] text-muted-foreground">اعمل مشروعك الأول واعرضه — ده اللي بيفرقك في أي إنترفيو.</p>
            <Link href="/projects/new" className="mt-1 rounded-xl bg-primary px-5 py-2 text-[.86rem] font-extrabold text-white">
              أنشئ مشروع
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

      {/* رحلتك */}
      <section className="mb-10">
        <h2 className="mb-6 text-[1.2rem] font-extrabold">رحلتك</h2>
        <GrowthLadder rungs={rungs} />
      </section>

      {/* إنجازاتك — قريبًا */}
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

      <MentorCtaDialog open={mentorModalOpen} onOpenChange={setMentorModalOpen} mentors={mentors} />
    </div>
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
          <Users2 className="h-4 w-4" /> شوف المينتورز في الكورسات
        </Link>
      </DialogContent>
    </Dialog>
  );
}
