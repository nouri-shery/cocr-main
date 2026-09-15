import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Clock, Radio, PlayCircle, Layers, Star, StarHalf, Users } from "lucide-react";
import { CoursesExplorer, StartCourseButton, CourseProgressSummary, LessonSyllabus, LessonViewer } from "../client/courses_client";
import { getCourses, getPopularCourses, getCourseCategories, getCourseById, getMentors, getMentorById } from "../actions/landing_page_actions";
import { getMyEnrollments } from "../actions/profile_actions";
import {
  getCourseSyllabus, getMyCompletedLessonIds, getCourseProgress, getNextLessonForCourse, getLessonWithContent,
} from "../actions/lessons_actions";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { Badge } from "@/components/ui/badge";
import type { CourseFormat } from "../types/types";

const ACCENT: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "#E9EEFC", fg: "#1E45C4" },
  gold: { bg: "#FBF1DC", fg: "#B8801F" },
  green: { bg: "#E6F3EB", fg: "#1E7A4E" },
  ink: { bg: "#E9E7E2", fg: "#3E403F" },
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

function sessionsSummary(course: { format: CourseFormat; onlineSessions?: number; offlineSessions?: number }) {
  if (course.format === "hybrid") {
    const parts: string[] = [];
    if (course.onlineSessions) parts.push(`${course.onlineSessions} أونلاين`);
    if (course.offlineSessions) parts.push(`${course.offlineSessions} حضوري`);
    return parts.join(" + ");
  }
  if (course.format === "live" && course.onlineSessions) return `${course.onlineSessions} جلسات لايف`;
  return null;
}

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

export async function CoursesPageContent() {
  const [popularCourses, allCourses, categories, mentors, user] = await Promise.all([
    getPopularCourses(),
    getCourses(),
    getCourseCategories(),
    getMentors(),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-10 max-w-[38em]">
          <span className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
            الكورسات
          </span>
          <h1 className="mb-4 text-[clamp(1.95rem,3.9vw,2.95rem)] font-extrabold leading-tight tracking-tight">
            كورسات قصيرة، كل واحد بيخلّص بحاجة عملتها
          </h1>
          <p className="text-[1.05rem] leading-[1.9] text-muted-foreground">
            مفيش كورس هنا بينتهي بفيديو — كل واحد آخره تسليم بيتراجع من مينتور.
          </p>
        </div>

        <CoursesExplorer
          popularCourses={popularCourses}
          allCourses={allCourses}
          categories={categories}
          mentors={mentors}
          isAuthenticated={!!user}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

/** بيرجع false بس لو فيه صف صريح في courses.published = false — أي حاجة تانية (مفيش صف، أو الجدول لسه مش موجود) بتفضل متاحة زي ما هي دلوقتي */
async function isCoursePublished(id: string): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.from("courses").select("published").eq("id", id).maybeSingle();
  return data?.published !== false;
}

export async function CourseDetailContent({ id }: { id: string }) {
  const [course, user, published] = await Promise.all([
    getCourseById(id),
    getCurrentUser().catch(() => null),
    isCoursePublished(id),
  ]);
  if (!course || !published) notFound();

  const [mentor, enrollments, syllabus, completedLessonIds, progress, nextLesson] = await Promise.all([
    getMentorById(course.mentorId),
    user ? getMyEnrollments() : Promise.resolve([]),
    getCourseSyllabus(course.id),
    user ? getMyCompletedLessonIds(course.id) : Promise.resolve([]),
    getCourseProgress(course.id),
    user ? getNextLessonForCourse(course.id) : Promise.resolve(null),
  ]);
  const a = ACCENT[course.accent];
  const FormatIcon = FORMAT_ICON[course.format];
  const sessions = sessionsSummary(course);
  const alreadyStarted = enrollments.some((e) => e.course_id === course.id);

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <Link href="/courses" className="mb-8 inline-flex items-center gap-2 text-[.9rem] font-bold text-primary">
          <ArrowRight className="h-4 w-4" /> رجوع لكل الكورسات
        </Link>

        <div className="overflow-hidden rounded-3xl border border-border bg-white">
          <div className="relative grid h-[160px] place-items-center" style={{ background: a.bg }}>
            <Icon3D name={course.icon} className="h-20 w-20" />
          </div>

          <div className="flex flex-col gap-4 p-[28px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="outline" style={{ color: a.fg, borderColor: a.fg }}>{course.level}</Badge>
              {course.free && <Badge variant="outline" className="border-green/30 text-green">مجاني</Badge>}
            </div>

            <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-tight">{course.title}</h1>
            <p className="text-[1rem] leading-[1.9] text-muted-foreground">{course.description}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[.9rem] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" style={{ color: a.fg }} /> {course.hours} ساعة على {course.durationWeeks} أسابيع
              </span>
              <span className="flex items-center gap-1.5">
                <FormatIcon className="h-4 w-4" style={{ color: a.fg }} /> {FORMAT_LABEL[course.format]}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" style={{ color: a.fg }} />
                {progress.total > 0 ? `${progress.total} درس متاح` : "الدروس هتضاف قريب"}
              </span>
            </div>
            {sessions && <p className="text-[.85rem] font-semibold text-slate-500">{sessions}</p>}

            <div className="flex items-center gap-2.5">
              <StarRating value={course.rating} />
              <b className="font-display text-[.92rem] font-extrabold">{course.rating}</b>
              <small className="text-[.76rem] font-semibold text-slate-400">({course.reviews} تقييم)</small>
            </div>

            <Badge variant="outline" className="w-fit text-slate-500">{course.ageMin}–{course.ageMax} سنة</Badge>

            {mentor && (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[.9rem] font-extrabold"
                  style={{ background: a.bg, color: a.fg }}
                  aria-hidden
                >
                  {mentor.initial}
                </span>
                <div className="flex-1">
                  <p className="text-[.92rem] font-extrabold">{mentor.name}</p>
                  <p className="text-[.8rem] text-muted-foreground">{mentor.track} · {mentor.gapLabel}</p>
                </div>
                <div className="flex items-center gap-1 text-[.82rem] font-bold text-slate-500">
                  <Users className="h-3.5 w-3.5" /> {mentor.coursesCount} كورسات
                </div>
              </div>
            )}

            {alreadyStarted && (
              <CourseProgressSummary completed={progress.completed} total={progress.total} accentFg={a.fg} />
            )}

            <div className="mt-2">
              <StartCourseButton
                courseId={course.id}
                isAuthenticated={!!user}
                alreadyStarted={alreadyStarted}
                accentFg={a.fg}
                totalLessons={progress.total}
                completedLessons={progress.completed}
                nextLessonId={nextLesson?.id}
              />
            </div>

            <p className="text-[.76rem] text-slate-400">
              التقييمات هنا تجريبية في مرحلة الـ Beta.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-[1.05rem] font-extrabold">محتوى الكورس</h2>
          <LessonSyllabus
            courseId={course.id}
            lessons={syllabus}
            completedLessonIds={completedLessonIds}
            isAuthenticated={!!user}
            accentFg={a.fg}
          />
        </div>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

export async function LessonPageContent({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/courses/${courseId}/lessons/${lessonId}`);

  const [course, published, lesson, syllabus, completedLessonIds] = await Promise.all([
    getCourseById(courseId),
    isCoursePublished(courseId),
    getLessonWithContent(lessonId),
    getCourseSyllabus(courseId),
    getMyCompletedLessonIds(courseId),
  ]);
  if (!course || !published || !lesson || lesson.course_id !== courseId) notFound();

  const index = syllabus.findIndex((l) => l.id === lessonId);
  const prevLesson = index > 0 ? syllabus[index - 1] : null;
  const nextLesson = index >= 0 && index < syllabus.length - 1 ? syllabus[index + 1] : null;
  const a = ACCENT[course.accent];

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <LessonViewer
          lesson={lesson}
          courseId={courseId}
          courseTitle={course.title}
          isCompleted={completedLessonIds.includes(lessonId)}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          accentFg={a.fg}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
