"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCourseById } from "./landing_page_actions";

export interface CourseSession {
  id: string;
  course_id: string;
  mentor_id: string;
  title: string;
  scheduled_at: string;
  zoom_link: string | null;
  recording_url: string | null;
  created_at: string;
}

export interface SessionSaveResult {
  error: string | null;
}

/** السيشنز المجدولة للكورس ده — RLS (course_sessions_select_enrolled_or_mentor
 * من 0004) بتفلتر تلقائي: المينتور صاحب السيشن، أو طالب متسجّل فعليًا في
 * الكورس (course_enrollments) بس يشوفها. زائر مش عامل تسجيل دخول يرجّعله
 * مصفوفة فاضية. */
export async function getSessionsForCourse(courseId: string): Promise<CourseSession[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("course_sessions")
    .select("id, course_id, mentor_id, title, scheduled_at, zoom_link, recording_url, created_at")
    .eq("course_id", courseId)
    .order("scheduled_at", { ascending: true });
  return data ?? [];
}

/** أقرب سيشن لايف جاي للطالب — عبر كل الكورسات اللي هو متسجّل فيها فعليًا.
 * نفس RLS بتاعة getSessionsForCourse (enrolled-or-mentor)، هنا بس بنبحث في
 * أكتر من كورس مرة واحدة عشان نعرضها في الداشبورد. */
export async function getUpcomingSessionForCourses(courseIds: string[]): Promise<CourseSession | null> {
  if (courseIds.length === 0) return null;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("course_sessions")
    .select("id, course_id, mentor_id, title, scheduled_at, zoom_link, recording_url, created_at")
    .in("course_id", courseIds)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** كل سيشنز المينتور — جايّة وسابقة، بدون فلتر تاريخ، لصفحة "جدولي" الكاملة.
 * نفس RLS بتاعة الباقي، هنا بس بنجيب الكل مش أقرب حاجة بس */
export async function getAllSessionsForMentor(): Promise<CourseSession[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("course_sessions")
    .select("id, course_id, mentor_id, title, scheduled_at, zoom_link, recording_url, created_at")
    .eq("mentor_id", user.id)
    .order("scheduled_at", { ascending: false });
  return data ?? [];
}

/** كل السيشنز الجاية للطالب (مش أقرب واحدة بس) — لجدول مواعيد حقيقي في
 * الداشبورد، نفس RLS وبيانات getUpcomingSessionForCourses */
export async function getUpcomingSessionsListForCourses(courseIds: string[], limit = 5): Promise<CourseSession[]> {
  if (courseIds.length === 0) return [];
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("course_sessions")
    .select("id, course_id, mentor_id, title, scheduled_at, zoom_link, recording_url, created_at")
    .in("course_id", courseIds)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

/** السيشنز الجايّة اللي المينتور الحالي عاملها schedule بنفسه — عبر كل
 * كورساته، مش كورس واحد بس. RLS الأصلية بتاعة course_sessions بتسمح
 * للمينتور صاحب السيشن يشوفها عادي. */
export async function getUpcomingSessionsForMentor(): Promise<CourseSession[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("course_sessions")
    .select("id, course_id, mentor_id, title, scheduled_at, zoom_link, recording_url, created_at")
    .eq("mentor_id", user.id)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(5);
  return data ?? [];
}

/** مفيش UPDATE policy على course_sessions (0004 بتاعد INSERT وSELECT بس) —
 * يعني لينك الزوم لازم يتحدد وقت الإنشاء، مش ممكن يتضاف بعدين. عشان كده
 * لينك الزوم مطلوب هنا، مش اختياري. */
export async function scheduleCourseSession(
  courseId: string, title: string, scheduledAt: string, zoomLink: string,
): Promise<SessionSaveResult> {
  const trimmedTitle = title.trim().slice(0, 200);
  if (trimmedTitle.length < 3) return { error: "اكتب عنوان أوضح للسيشن." };
  if (!scheduledAt) return { error: "حدد معاد السيشن." };
  const trimmedLink = zoomLink.trim().slice(0, 500);
  if (!trimmedLink) return { error: "لازم لينك الزوم — مش ممكن يتضاف بعد إنشاء السيشن." };

  const course = await getCourseById(courseId);
  if (!course) return { error: "الكورس ده مش موجود." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك." };

  const { error } = await supabase
    .from("course_sessions")
    .insert({
      course_id: courseId,
      course_category: course.category,
      mentor_id: user.id,
      title: trimmedTitle,
      scheduled_at: new Date(scheduledAt).toISOString(),
      zoom_link: trimmedLink,
    });

  if (error) return { error: "حصل خطأ — تأكد إنك مينتور معتمد في تراك الكورس ده." };
  revalidatePath(`/courses/${courseId}`);
  return { error: null };
}
