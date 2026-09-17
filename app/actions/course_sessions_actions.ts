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
