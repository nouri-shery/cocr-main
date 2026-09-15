"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Clock, Radio, PlayCircle, Layers, Star, StarHalf, Users, UserPlus, X,
  CheckCircle2, Circle, Lock, ArrowLeft, ArrowRight, PartyPopper,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { cn } from "@/lib/utils";
import { getOnboarding, INTEREST_TO_COURSE_CATEGORY } from "../lib/onboarding";
import { AuthPrompt } from "./auth-prompt";
import { Reveal } from "./landing_client";
import { startCourse } from "../actions/profile_actions";
import { completeLesson, type LessonSummary, type LessonDetail } from "../actions/lessons_actions";
import type { Course, CourseCategory, CourseFormat, Mentor } from "../types/types";

const ACCENT: Record<string, { bg: string; fg: string; dot: string }> = {
  blue: { bg: "#E9EEFC", fg: "#1E45C4", dot: "rgba(30,69,196,.2)" },
  gold: { bg: "#FBF1DC", fg: "#B8801F", dot: "rgba(184,128,31,.22)" },
  green: { bg: "#E6F3EB", fg: "#1E7A4E", dot: "rgba(30,122,78,.2)" },
  ink: { bg: "#E9E7E2", fg: "#3E403F", dot: "rgba(22,24,31,.16)" },
};

const FORMAT_LABEL: Record<CourseFormat, string> = {
  live: "لايف (Zoom)",
  recorded: "مسجّل",
  hybrid: "مختلط (أونلاين وحضوري)",
};

const FORMAT_ICON: Record<CourseFormat, React.ElementType> = {
  live: Radio,
  recorded: PlayCircle,
  hybrid: Layers,
};

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} من 5`}>
      {Array.from({ length: full }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
      ))}
      {half && <StarHalf className="h-3.5 w-3.5 fill-gold text-gold" />}
    </span>
  );
}

function sessionsSummary(course: Course) {
  if (course.format === "hybrid") {
    const parts: string[] = [];
    if (course.onlineSessions) parts.push(`${course.onlineSessions} أونلاين`);
    if (course.offlineSessions) parts.push(`${course.offlineSessions} حضوري`);
    return parts.join(" + ");
  }
  if (course.format === "live" && course.onlineSessions) return `${course.onlineSessions} جلسات لايف`;
  return null;
}

interface CoursesExplorerProps {
  popularCourses: Course[];
  allCourses: Course[];
  categories: { id: CourseCategory; label: string }[];
  mentors: Mentor[];
  isAuthenticated: boolean;
}

export function CoursesExplorer({ popularCourses, allCourses, categories, mentors, isAuthenticated }: CoursesExplorerProps) {
  const router = useRouter();
  const [category, setCategory] = React.useState<CourseCategory>("all");
  const [format, setFormat] = React.useState<CourseFormat | "all">("all");
  const [query, setQuery] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [showSignupAlert, setShowSignupAlert] = React.useState(false);
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);
  const [interestCategories, setInterestCategories] = React.useState<CourseCategory[] | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) return; // متسجّل فعليًا — مفيش لازمة نضايقه بتنبيه التسجيل
    const onboarding = getOnboarding();
    if (onboarding && onboarding.interests.length > 0) {
      const cats = Array.from(new Set(onboarding.interests.flatMap((i) => INTEREST_TO_COURSE_CATEGORY[i])));
      setInterestCategories(cats);
      return;
    }
    const t = setTimeout(() => setShowSignupAlert(true), 900);
    return () => clearTimeout(t);
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    const onboarding = getOnboarding();
    if (onboarding && onboarding.interests.length > 0) {
      setInterestCategories(Array.from(new Set(onboarding.interests.flatMap((i) => INTEREST_TO_COURSE_CATEGORY[i]))));
    }
  }, [isAuthenticated]);

  const recommendedCourses = React.useMemo(() => {
    if (!interestCategories || interestCategories.length === 0) return [];
    return allCourses.filter((c) => interestCategories.includes(c.category)).slice(0, 3);
  }, [allCourses, interestCategories]);

  const mentorById = React.useMemo(
    () => Object.fromEntries(mentors.map((m) => [m.id, m])),
    [mentors],
  );

  const filtered = React.useMemo(() => {
    return allCourses.filter((c) => {
      const matchesCategory = category === "all" || c.category === category;
      const matchesFormat = format === "all" || c.format === format;
      const matchesQuery =
        query.trim().length === 0 ||
        c.title.includes(query.trim()) ||
        mentorById[c.mentorId]?.name.includes(query.trim());
      return matchesCategory && matchesFormat && matchesQuery;
    });
  }, [allCourses, category, format, query, mentorById]);

  const activeCourse = allCourses.find((c) => c.id === activeId) ?? null;

  return (
    <div>
      {recommendedCourses.length > 0 && (
        <section className="mb-12">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-[1.3rem] font-extrabold">ترشيحات مخصصة ليك</h2>
            <span className="rounded-full bg-blue-tint px-3 py-1 text-[.72rem] font-bold text-primary">بناءً على اهتماماتك</span>
          </div>
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {recommendedCourses.map((c, i) => (
              <Reveal key={c.id} delay={i * 60} variant="pop" className="h-full">
                <CourseCard course={c} mentor={mentorById[c.mentorId]} onExpand={() => setActiveId(c.id)} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* أشهر الكورسات */}
      <section className="mb-12">
        <h2 className="mb-5 text-[1.3rem] font-extrabold">أشهر الكورسات</h2>
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {popularCourses.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(i, 5) * 60} variant="pop" className="h-full">
              <CourseCard course={c} mentor={mentorById[c.mentorId]} onExpand={() => setActiveId(c.id)} />
            </Reveal>
          ))}
        </div>
      </section>

      <SignupPrompt show={showSignupAlert} onDismiss={() => setShowSignupAlert(false)} />

      {/* كل الكورسات + فلاتر */}
      <h2 className="mb-5 text-[1.3rem] font-extrabold">كل الكورسات</h2>

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="دور على كورس أو مينتور"
          className="h-11 rounded-full pe-9 ps-4"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[.8rem] font-semibold text-slate-500">التصنيف:</span>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-[.84rem] font-bold transition-all",
              category === c.id
                ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_rgba(30,69,196,.6)]"
                : "border-border bg-white text-slate-600 hover:border-slate-400",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-2 border-b border-dashed border-border pb-5">
        <span className="text-[.8rem] font-semibold text-slate-500">الصيغة:</span>
        {(["all", "live", "recorded", "hybrid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[.8rem] font-semibold transition-colors",
              format === f
                ? "bg-foreground text-background"
                : "border border-border text-slate-500 hover:border-slate-400",
            )}
          >
            {f === "all" ? "الكل" : FORMAT_LABEL[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[.95rem] text-muted-foreground">
          مفيش كورسات مطابقة للفلاتر دي دلوقتي — جرّب تشيل فلتر أو اتنين.
        </p>
      ) : (
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(i, 5) * 60} variant="pop" className="h-full">
              <CourseCard course={c} mentor={mentorById[c.mentorId]} onExpand={() => setActiveId(c.id)} />
            </Reveal>
          ))}
        </div>
      )}

      <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-white px-[18px] py-2 text-[.82rem] font-semibold text-muted-foreground">
        التقييمات هنا تجريبية في مرحلة الـ Beta
      </span>

      <CourseDialog
        course={activeCourse}
        mentor={activeCourse ? mentorById[activeCourse.mentorId] : undefined}
        open={activeCourse !== null}
        onOpenChange={(open) => { if (!open) setActiveId(null); }}
        onStart={() => {
          if (!isAuthenticated) { setAuthPromptOpen(true); return; }
          if (activeCourse) router.push(activeCourse.href);
        }}
      />

      <AuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        title="عايز تبدأ الكورس ده؟"
        description="اعمل حساب مجاني في COCR عشان تقدر تبدأ الكورس، وتتابع تقدّمك فيه."
      />
    </div>
  );
}

function CourseCard({
  course, mentor, onExpand,
}: { course: Course; mentor?: Mentor; onExpand: () => void }) {
  const a = ACCENT[course.accent];
  const FormatIcon = FORMAT_ICON[course.format];
  const sessions = sessionsSummary(course);

  return (
    <article
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onExpand(); } }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_26px_52px_-26px_rgba(22,24,31,.42)]"
    >
      <div className="relative grid h-[112px] place-items-center overflow-hidden" style={{ background: a.bg }}>
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${a.dot} 1.3px, transparent 0)`,
            backgroundSize: "18px 18px",
            maskImage: "radial-gradient(circle at 50% 120%, transparent 30%, #000)",
            WebkitMaskImage: "radial-gradient(circle at 50% 120%, transparent 30%, #000)",
          }}
        />
        <Badge className="absolute start-3.5 top-3.5 bg-white shadow-sm" style={{ color: a.fg }}>{course.level}</Badge>
        {course.free && (
          <span className="absolute end-3.5 top-3.5 rounded-full px-3 py-1 text-[.7rem] font-extrabold text-white" style={{ background: a.fg }}>
            مجاني
          </span>
        )}
        <Icon3D name={course.icon} className="relative z-10 h-14 w-14 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-[22px]">
        <h3 className="text-[1.05rem] font-extrabold leading-relaxed group-hover:text-primary">{course.title}</h3>
        <p className="flex-1 text-[.86rem] leading-relaxed text-muted-foreground">{course.description}</p>

        <div className="flex flex-wrap gap-3 text-[.78rem] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><Clock className="h-[15px] w-[15px]" style={{ color: a.fg }} /> {course.hours} ساعة</span>
          <span className="flex items-center gap-1.5"><FormatIcon className="h-[15px] w-[15px]" style={{ color: a.fg }} /> {FORMAT_LABEL[course.format]}</span>
        </div>
        {sessions && <p className="text-[.76rem] font-semibold text-slate-400">{sessions}</p>}

        <div className="flex items-center gap-2.5 border-t border-dashed border-border pt-3">
          <StarRating value={course.rating} />
          <b className="font-display text-[.9rem] font-extrabold">{course.rating}</b>
          <small className="text-[.74rem] font-semibold text-slate-400">({course.reviews})</small>
        </div>

        {mentor && (
          <div className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[.68rem] font-extrabold"
              style={{ background: a.bg, color: a.fg }}
              aria-hidden
            >
              {mentor.initial}
            </span>
            <span className="text-[.78rem] font-bold text-slate-500">{mentor.name}</span>
            <span className="text-[.74rem] text-slate-400">· {course.ageMin}–{course.ageMax} سنة</span>
          </div>
        )}
      </div>
    </article>
  );
}

function CourseDialog({
  course, mentor, open, onOpenChange, onStart,
}: { course: Course | null; mentor?: Mentor; open: boolean; onOpenChange: (open: boolean) => void; onStart: () => void }) {
  if (!course) return null;
  const a = ACCENT[course.accent];
  const FormatIcon = FORMAT_ICON[course.format];
  const sessions = sessionsSummary(course);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto p-0 sm:max-w-lg">
        <div className="relative grid h-[110px] place-items-center" style={{ background: a.bg }}>
          <Icon3D name={course.icon} className="h-16 w-16" />
        </div>
        <div className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pe-8">
            <Badge variant="outline" style={{ color: a.fg, borderColor: a.fg }}>{course.level}</Badge>
            {course.free && <Badge variant="outline" className="border-green/30 text-green">مجاني</Badge>}
          </div>

          <DialogHeader className="text-start">
            <DialogTitle className="text-[1.15rem] font-extrabold leading-snug">{course.title}</DialogTitle>
            <DialogDescription>{course.description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[.86rem] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" style={{ color: a.fg }} /> {course.hours} ساعة على {course.durationWeeks} أسابيع</span>
            <span className="flex items-center gap-1.5"><FormatIcon className="h-4 w-4" style={{ color: a.fg }} /> {FORMAT_LABEL[course.format]}</span>
          </div>
          {sessions && <p className="text-[.82rem] font-semibold text-slate-500">{sessions}</p>}

          <div className="flex items-center gap-2.5">
            <StarRating value={course.rating} />
            <b className="font-display text-[.92rem] font-extrabold">{course.rating}</b>
            <small className="text-[.76rem] font-semibold text-slate-400">({course.reviews} تقييم)</small>
          </div>

          <Badge variant="outline" className="w-fit text-slate-500">{course.ageMin}–{course.ageMax} سنة</Badge>

          {mentor && (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[.85rem] font-extrabold"
                style={{ background: a.bg, color: a.fg }}
                aria-hidden
              >
                {mentor.initial}
              </span>
              <div className="flex-1">
                <p className="text-[.9rem] font-extrabold">{mentor.name}</p>
                <p className="text-[.78rem] text-muted-foreground">{mentor.track} · {mentor.gapLabel}</p>
              </div>
              <div className="flex items-center gap-1 text-[.8rem] font-bold text-slate-500">
                <Users className="h-3.5 w-3.5" /> {mentor.coursesCount} كورسات
              </div>
            </div>
          )}

          <p className="text-[.72rem] text-slate-400">
            التقييمات هنا تجريبية في مرحلة الـ Beta.
          </p>
        </div>

        <DialogFooter>
          <button
            onClick={onStart}
            className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl text-[.92rem] font-extrabold text-white"
            style={{ background: a.fg }}
          >
            ابدأ الكورس
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * زرار "ابدأ الكورس" في صفحة تفاصيل الكورس — بيسجّل بداية حقيقية على حساب
 * المستخدم (مش فيك داتا). لو فيه دروس حقيقية منشورة للكورس ده، الزرار بعد
 * ما يبدأ يتحول لـ "كمّل الكورس" (بيودّي لأول درس لسه مكملوش) أو "الكورس
 * مكتمل" لو خلّص كل الدروس — كل ده مبني على lesson_progress حقيقي، مش
 * ادّعاء. لو مفيش دروس حقيقية لسه، سلوكه زي الأول بالظبط (بدأت الكورس ✅).
 */
export function StartCourseButton({
  courseId, isAuthenticated, alreadyStarted, accentFg,
  totalLessons = 0, completedLessons = 0, nextLessonId,
}: {
  courseId: string; isAuthenticated: boolean; alreadyStarted: boolean; accentFg: string;
  totalLessons?: number; completedLessons?: number; nextLessonId?: string | null;
}) {
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);
  const [started, setStarted] = React.useState(alreadyStarted);
  const [failed, setFailed] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const handleClick = () => {
    if (!isAuthenticated) { setAuthPromptOpen(true); return; }
    if (started || pending) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const result = await startCourse(courseId);
        if (result.ok) setStarted(true);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    });
  };

  if (started && totalLessons > 0 && completedLessons >= totalLessons) {
    return (
      <div
        className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-[.95rem] font-extrabold text-white"
        style={{ background: "#1E7A4E" }}
      >
        <PartyPopper className="h-4 w-4" /> الكورس مكتمل
      </div>
    );
  }

  if (started && totalLessons > 0 && nextLessonId) {
    return (
      <Link
        href={`/courses/${courseId}/lessons/${nextLessonId}`}
        className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-[.95rem] font-extrabold text-white"
        style={{ background: accentFg }}
      >
        {completedLessons > 0 ? "كمّل الكورس" : "ابدأ أول درس"}
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={pending || started}
        className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-[.95rem] font-extrabold text-white disabled:cursor-default"
        style={{ background: started ? "#1E7A4E" : accentFg, opacity: pending ? 0.7 : 1 }}
      >
        {started ? "بدأت الكورس ✅" : pending ? "لحظة..." : "ابدأ الكورس"}
      </button>
      {failed && (
        <p className="mt-2 text-[.82rem] font-semibold text-destructive">حصل خطأ، جرّب تاني بعد شوية.</p>
      )}

      <AuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        title="عايز تبدأ الكورس ده؟"
        description="اعمل حساب مجاني في COCR عشان تقدر تبدأ الكورس، وتتابع تقدّمك فيه."
      />
    </>
  );
}

/** ملخّص التقدّم (X من Y دروس) + progress bar — صفحة تفاصيل الكورس */
export function CourseProgressSummary({
  completed, total, accentFg,
}: { completed: number; total: number; accentFg: string }) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[.84rem] font-bold text-slate-600">
        <span>{completed} من {total} دروس مكتملة</span>
        <span style={{ color: accentFg }}>{pct}%</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

/** قائمة الدروس (syllabus) — صفحة تفاصيل الكورس */
export function LessonSyllabus({
  courseId, lessons, completedLessonIds, isAuthenticated, accentFg,
}: {
  courseId: string; lessons: LessonSummary[]; completedLessonIds: string[];
  isAuthenticated: boolean; accentFg: string;
}) {
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);
  const completedSet = React.useMemo(() => new Set(completedLessonIds), [completedLessonIds]);

  if (lessons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-sand px-6 py-8 text-center">
        <Icon3D name="build" className="h-10 w-10 opacity-70" />
        <p className="font-bold">لسه مفيش دروس متاحة للكورس ده</p>
        <p className="max-w-[26em] text-[.84rem] text-muted-foreground">هنضيفها قريب — تقدر تبدأ الكورس عشان تحجز مكانك دلوقتي.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {lessons.map((lesson, i) => {
          const isDone = completedSet.has(lesson.id);
          const content = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400">
                {isDone ? <CheckCircle2 className="h-5 w-5" style={{ color: accentFg }} /> : <Circle className="h-5 w-5" />}
              </span>
              <span className="flex-1 text-[.9rem] font-bold">{i + 1}. {lesson.title}</span>
              {!isAuthenticated && <Lock className="h-4 w-4 shrink-0 text-slate-400" />}
            </>
          );
          return (
            <li key={lesson.id}>
              {isAuthenticated ? (
                <Link href={`/courses/${courseId}/lessons/${lesson.id}`} className="flex items-center gap-3 bg-white px-4 py-3.5 transition-colors hover:bg-sand">
                  {content}
                </Link>
              ) : (
                <button onClick={() => setAuthPromptOpen(true)} className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-start transition-colors hover:bg-sand">
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <AuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        title="عايز تفتح الدرس ده؟"
        description="اعمل حساب مجاني في COCR عشان تقدر تفتح الدروس وتتابع تقدّمك."
      />
    </>
  );
}

/**
 * محوّل markdown خفيف لمحتوى الدرس — بيدعم بس اللي محتاجينه فعليًا (مفيش
 * محرّر/CMS جديد، ومفيش تغيير في الـschema، عمود content فاضل text عادي):
 * ## / ### عناوين، فقرات، قوائم (- أو 1.)، ```code blocks``` (بتفضل LTR حتى
 * جوّه صفحة RTL)، **bold**، *italic*، و`inline code`. كمان بيمرّر
 * <details><summary> زي ما هي (raw HTML) — الطريقة الوحيدة المستخدمة في
 * المحتوى ده لعمل "اضغط تشوف" للـ hints وإجابات الأسئلة، من غير أي نظام
 * quiz/hint تفاعلي جديد — الـ<details> عنصر HTML عادي بيتعامل مع الفتح/القفل
 * بنفسه. آمن هنا تحديدًا لأن المحتوى ده admin-authored بس (مفيش أي مستخدم
 * بيكتب فيه)، مش زي أي حقل نص بيكتبه المستخدمين في باقي الموقع.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key} dir="ltr" className="rounded bg-sand px-1.5 py-0.5 text-[.88em]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function LessonContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    // ```lang ... ``` — كود، بيفضل LTR
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { codeLines.push(lines[i]); i++; }
      i++;
      blocks.push(
        <pre
          key={key++}
          dir="ltr"
          ref={(el) => { if (el) el.scrollLeft = 0; }}
          className="overflow-x-auto rounded-xl bg-[#1E1F26] p-4 text-start text-[.86rem] leading-[1.7] text-[#E9E9EC]"
        >
          <code data-lang={lang || undefined}>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // <details><summary>عنوان</summary> ... </details> — بيتقرا كعناصر React
    // حقيقية (مش raw HTML injection) — عشان "اضغط تشوف" للـ hints/الإجابات
    // من غير أي خطر XSS حتى لو المحتوى اتغيّر من غير مراجعة كافية لاحقًا.
    if (line.trim().startsWith("<details")) {
      i++;
      let summaryText = "";
      const summaryMatch = lines[i]?.match(/^\s*<summary>(.*)<\/summary>\s*$/);
      if (summaryMatch) { summaryText = summaryMatch[1]; i++; }
      const bodyLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "</details>") { bodyLines.push(lines[i]); i++; }
      i++; // تخطي </details>
      blocks.push(
        <details key={key++} className="group rounded-xl border border-dashed border-border bg-sand p-4 open:bg-white">
          <summary className="cursor-pointer text-[.9rem] font-extrabold text-primary">{summaryText || "اضغط تشوف"}</summary>
          <div className="mt-2 text-[.95rem] leading-[1.8]">
            <LessonContent content={bodyLines.join("\n")} />
          </div>
        </details>
      );
      continue;
    }

    // ## / ### عناوين
    const headingMatch = line.match(/^(#{2,3})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = renderInline(headingMatch[2], `h${key}`);
      blocks.push(
        level === 2
          ? <h2 key={key++} className="mt-2 text-[1.2rem] font-extrabold">{text}</h2>
          : <h3 key={key++} className="mt-2 text-[1.05rem] font-extrabold">{text}</h3>
      );
      i++;
      continue;
    }

    // - / * قوائم بدون ترقيم
    if (/^[-*]\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, "")); i++; }
      blocks.push(
        <ul key={key++} className="list-disc ps-5 [&>li]:mt-1">
          {items.map((it, idx) => <li key={idx}>{renderInline(it, `ul${key}-${idx}`)}</li>)}
        </ul>
      );
      continue;
    }

    // 1. 2. 3. قوائم مرقّمة
    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s+/, "")); i++; }
      blocks.push(
        <ol key={key++} className="list-decimal ps-5 [&>li]:mt-1">
          {items.map((it, idx) => <li key={idx}>{renderInline(it, `ol${key}-${idx}`)}</li>)}
        </ol>
      );
      continue;
    }

    // A. / B. / C. اختيارات أسئلة — بتتعرض كقائمة، مش سطر واحد متلزّق
    if (/^[A-Da-d]\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[A-Da-d]\.\s+/.test(lines[i].trim())) { items.push(lines[i].trim()); i++; }
      blocks.push(
        <ul key={key++} className="flex flex-col gap-1 ps-1">
          {items.map((it, idx) => <li key={idx} className="list-none">{renderInline(it, `opt${key}-${idx}`)}</li>)}
        </ul>
      );
      continue;
    }

    // فقرة عادية — بتجمع الأسطر المتتالية
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].trim().startsWith("```") && !lines[i].trim().startsWith("<details") && !/^(#{2,3})\s/.test(lines[i]) && !/^[-*]\s+/.test(lines[i].trim()) && !/^\d+\.\s+/.test(lines[i].trim()) && !/^[A-Da-d]\.\s+/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{renderInline(paraLines.join(" "), `p${key}`)}</p>);
  }

  return <>{blocks}</>;
}

/** محتوى الدرس نفسه + التنقل والتعليم كمكتمل — صفحة /courses/[id]/lessons/[lessonId] */
export function LessonViewer({
  lesson, courseId, courseTitle, isCompleted, prevLesson, nextLesson, accentFg,
}: {
  lesson: LessonDetail; courseId: string; courseTitle: string; isCompleted: boolean;
  prevLesson: LessonSummary | null; nextLesson: LessonSummary | null; accentFg: string;
}) {
  const [done, setDone] = React.useState(isCompleted);
  const [pending, startTransition] = React.useTransition();
  const [failed, setFailed] = React.useState(false);

  const handleComplete = () => {
    if (done || pending) return;
    setFailed(false);
    startTransition(async () => {
      const result = await completeLesson(lesson.id, courseId);
      if (result.ok) setDone(true);
      else setFailed(true);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/courses/${courseId}`} className="mb-4 inline-flex items-center gap-2 text-[.88rem] font-bold text-primary">
          <ArrowRight className="h-4 w-4" /> رجوع لـ {courseTitle}
        </Link>
        <span className="mb-1.5 block text-[.78rem] font-extrabold tracking-wide text-slate-400">
          درس {lesson.order_index}
        </span>
        <h1 className="text-[clamp(1.4rem,2.8vw,1.9rem)] font-extrabold leading-tight">{lesson.title}</h1>
        {lesson.summary && <p className="mt-2 text-[.95rem] text-muted-foreground">{lesson.summary}</p>}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 text-[1rem] leading-[1.9]">
        {lesson.content_type === "video" || lesson.content_type === "link" ? (
          <a href={lesson.content} target="_blank" rel="noreferrer" className="font-bold text-primary underline">
            افتح المحتوى ↗
          </a>
        ) : lesson.content ? (
          <LessonContent content={lesson.content} />
        ) : (
          "المحتوى مش متاح لسه."
        )}
      </div>

      <button
        onClick={handleComplete}
        disabled={pending || done}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[.92rem] font-extrabold text-white disabled:cursor-default sm:w-auto sm:px-8"
        style={{ background: done ? "#1E7A4E" : accentFg, opacity: pending ? 0.7 : 1 }}
      >
        {done ? "الدرس مكتمل ✅" : pending ? "لحظة..." : "علّم الدرس كمكتمل"}
      </button>
      {failed && <p className="text-[.82rem] font-semibold text-destructive">حصل خطأ، جرّب تاني بعد شوية.</p>}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        {prevLesson ? (
          <Link href={`/courses/${courseId}/lessons/${prevLesson.id}`} className="flex items-center gap-1.5 text-[.86rem] font-bold text-slate-600 hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> الدرس السابق
          </Link>
        ) : <span />}
        {nextLesson ? (
          <Link href={`/courses/${courseId}/lessons/${nextLesson.id}`} className="flex items-center gap-1.5 text-[.86rem] font-bold text-slate-600 hover:text-foreground">
            الدرس التالي <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}

/**
 * تنبيه دخول قابل للتجاهل — بيظهر لما تدخل الصفحة، مش هيجبر الزائر على حاجة.
 * الفيتشر نفسه (اختبار + ترشيح كورسات) لسه "قريبًا" لحد ما يبقى فيه حساب حقيقي.
 */
function SignupPrompt({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-[0_20px_50px_-20px_rgba(22,24,31,.35)] transition-all duration-500 sm:inset-x-auto sm:end-6",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-tint text-primary">
        <UserPlus className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="text-[.9rem] font-extrabold">سجّل عشان نرشحلك كورسات تناسبك</p>
        <p className="mt-0.5 text-[.8rem] text-muted-foreground">بعد التسجيل هتاخد اختبار بسيط وهنرشحلك كورسات على أساسه.</p>
        <div className="mt-2.5 flex items-center gap-3">
          <Link href="/register" onClick={onDismiss} className="text-[.84rem] font-extrabold text-primary hover:underline">
            سجّل دلوقتي
          </Link>
          <button onClick={onDismiss} className="text-[.84rem] font-semibold text-muted-foreground hover:text-foreground">
            لأ، بعدين
          </button>
        </div>
      </div>
      <button onClick={onDismiss} aria-label="إغلاق" className="text-slate-400 hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

