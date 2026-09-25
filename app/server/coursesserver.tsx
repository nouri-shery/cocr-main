import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Clock, Radio, PlayCircle, Layers, Star, StarHalf } from "lucide-react";
import { CoursesExplorer, StartCourseButton, CourseProgressSummary, LessonSyllabus, LessonViewer } from "../client/courses_client";
import { getCourses, getCourseCategories, getCourseById, getMentors, getMentorById } from "../actions/landing_page_actions";
import { getMyEnrollments, getMyProfile } from "../actions/profile_actions";
import { INTERESTS, type InterestId } from "../lib/onboarding";
import {
  getCourseSyllabus, getMyCompletedLessonIds, getCourseProgress, getNextLessonForCourse, getLessonWithContent,
  getMyProgressForCourses,
} from "../actions/lessons_actions";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";
import {
  getMySubmissionForLesson, getCoursemateSubmissionsForLesson,
  getFeedbackForSubmission, getMyMentorRating, getMyGraduationSubmission,
} from "../actions/submissions_actions";
import { LessonSubmissionSection, GraduationProjectSection } from "../client/submission_client";
import { getSessionsForCourse } from "../actions/course_sessions_actions";
import { CourseSessionsSection } from "../client/course_sessions_client";
import { getMyMentorApplication } from "../actions/mentor_actions";
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
  const [allCourses, categories, mentors, user] = await Promise.all([
    getCourses(),
    getCourseCategories(),
    getMentors(),
    getCurrentUser().catch(() => null),
  ]);

  const enrollments = user ? await getMyEnrollments() : [];
  const enrolledIds = enrollments.map((e) => e.course_id);
  const progressByCourse = enrolledIds.length > 0 ? await getMyProgressForCourses(enrolledIds) : {};
  const profile = user ? await getMyProfile() : null;
  const validInterestIds = new Set(INTERESTS.map((i) => i.id));
  const myInterests = (profile?.interests ?? []).filter((i): i is InterestId => validInterestIds.has(i as InterestId));

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <AppPageHeader
          title="الكورسات"
          context="مفيش كورس هنا بينتهي بفيديو — كل واحد آخره تسليم بيتراجع من مينتور."
        />

        <CoursesExplorer
          allCourses={allCourses}
          categories={categories}
          mentors={mentors}
          isAuthenticated={!!user}
          progressByCourse={progressByCourse}
          myInterests={myInterests}
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
  const enrollment = enrollments.find((e) => e.course_id === course.id);
  const alreadyStarted = !!enrollment;
  // متخزّن فعليًا (course_enrollments.completed_at) مش محسوب من progress
  // live — الـ trigger في migration 0014 هو اللي بيحدده، مش الصفحة دي
  const courseCompleted = !!enrollment?.completed_at;
  const graduationSubmission = courseCompleted && user ? await getMyGraduationSubmission(course.id) : null;

  const [courseSessions, myMentorApplication] = user
    ? await Promise.all([getSessionsForCourse(course.id), getMyMentorApplication()])
    : [[] as Awaited<ReturnType<typeof getSessionsForCourse>>, null];
  const canScheduleSession = myMentorApplication?.status === "approved" && myMentorApplication.track === course.category;

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <Link href="/courses" className="mb-8 inline-flex items-center gap-2 text-[.9rem] font-bold text-primary">
          <ArrowRight className="h-4 w-4" /> رجوع لكل الكورسات
        </Link>

        <div className="overflow-hidden rounded-3xl border border-border bg-white">
          {/* شريط علوي وظيفي بدل البلوك الزخرفي الفاضي — نفس المعلومة، مساحة أقل */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-[24px] py-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: a.bg }}>
              <Icon3D name={course.icon} className="h-6 w-6" />
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Badge variant="outline" style={{ color: a.fg, borderColor: a.fg }}>{course.level}</Badge>
              {course.free && <Badge variant="outline" className="border-green/30 text-green">مجاني</Badge>}
              <Badge variant="outline" className="text-slate-500">{course.ageMin}–{course.ageMax} سنة</Badge>
            </div>
            {!alreadyStarted && (
              <div className="flex items-center gap-1.5 text-[.82rem] text-slate-400">
                <StarRating value={course.rating} /> {course.rating} ({course.reviews})
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 p-[28px]">
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

            {mentor && (
              <p className="flex items-center gap-2 text-[.86rem] text-muted-foreground">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[.7rem] font-extrabold"
                  style={{ background: a.bg, color: a.fg }}
                  aria-hidden
                >
                  {mentor.initial}
                </span>
                مراجعة: <b className="font-extrabold text-foreground">{mentor.name}</b> · {mentor.track} · {mentor.gapLabel}
              </p>
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

        <CourseSessionsSection courseId={course.id} sessions={courseSessions} canSchedule={canScheduleSession} />

        {courseCompleted && (
          <GraduationProjectSection courseId={course.id} initialSubmission={graduationSubmission} />
        )}
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

export async function LessonPageContent({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/courses/${courseId}/lessons/${lessonId}`);

  const [course, published, lesson, syllabus, completedLessonIds, mySubmission, coursemateSubmissions] = await Promise.all([
    getCourseById(courseId),
    isCoursePublished(courseId),
    getLessonWithContent(lessonId),
    getCourseSyllabus(courseId),
    getMyCompletedLessonIds(courseId),
    getMySubmissionForLesson(courseId, lessonId),
    getCoursemateSubmissionsForLesson(lessonId),
  ]);

  // فيدباك المينتور على تسليمي أنا بس — لو مفيش تسليم لسه، مفيش داعي نسأل
  const mySubmissionFeedback = mySubmission ? await getFeedbackForSubmission(mySubmission.id) : [];
  const myRatingByMentor = Object.fromEntries(
    await Promise.all(
      mySubmissionFeedback.map(async (f) => [f.mentor_id, await getMyMentorRating(courseId, f.mentor_id)] as const),
    ),
  );
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

        <LessonSubmissionSection
          courseId={courseId}
          lessonId={lessonId}
          initialSubmission={mySubmission}
          coursemateSubmissions={coursemateSubmissions.filter((s) => s.id !== mySubmission?.id)}
          feedback={mySubmissionFeedback}
          myRatingByMentor={myRatingByMentor}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
