"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface LessonSummary {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  content_type: "text" | "video" | "link";
  order_index: number;
}

export interface LessonDetail extends LessonSummary {
  content: string;
}

export interface CourseProgress {
  completed: number;
  total: number;
}

/** الـ syllabus (بدون المحتوى الفعلي) — متاح للزوار والمستخدمين، صفحة تفاصيل الكورس */
export async function getCourseSyllabus(courseId: string): Promise<LessonSummary[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("catalog_lessons")
    .select("id, course_id, title, summary, content_type, order_index")
    .eq("course_id", courseId)
    .eq("published", true)
    .order("order_index", { ascending: true });

  return (data as LessonSummary[] | null) ?? [];
}

/** درس واحد بمحتواه الكامل — لازم تسجيل دخول (RLS بيرفض anon على عمود content) */
export async function getLessonWithContent(lessonId: string): Promise<LessonDetail | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("catalog_lessons")
    .select("id, course_id, title, summary, content_type, content, order_index")
    .eq("id", lessonId)
    .eq("published", true)
    .maybeSingle();

  return data as LessonDetail | null;
}

/** IDs الدروس اللي المستخدم الحالي خلّصها في كورس معيّن */
export async function getMyCompletedLessonIds(courseId: string): Promise<string[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("catalog_lesson_progress")
    .select("lesson_id")
    .eq("user_id", user.id)
    .eq("course_id", courseId);

  return (data ?? []).map((r) => r.lesson_id as string);
}

/** تقدّم المستخدم في كورس واحد — من عدد الدروس المنشورة الحقيقية مقابل المكتمل */
export async function getCourseProgress(courseId: string): Promise<CourseProgress> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const { count: total } = await supabase
    .from("catalog_lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("published", true);

  if (!user) return { completed: 0, total: total ?? 0 };

  const { count: completed } = await supabase
    .from("catalog_lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("course_id", courseId);

  return { completed: completed ?? 0, total: total ?? 0 };
}

/**
 * تقدّم المستخدم في أكتر من كورس مرة واحدة (للـ Dashboard) — استعلامين بس
 * (مش N+1) بعدين تجميع في الكود.
 */
export async function getMyProgressForCourses(courseIds: string[]): Promise<Record<string, CourseProgress>> {
  const result: Record<string, CourseProgress> = {};
  if (courseIds.length === 0) return result;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const { data: lessonRows } = await supabase
    .from("catalog_lessons")
    .select("id, course_id")
    .in("course_id", courseIds)
    .eq("published", true);

  const totalByCourse: Record<string, number> = {};
  const lessonIdsByCourse: Record<string, Set<string>> = {};
  for (const row of lessonRows ?? []) {
    const cid = row.course_id as string;
    totalByCourse[cid] = (totalByCourse[cid] ?? 0) + 1;
    (lessonIdsByCourse[cid] ??= new Set()).add(row.id as string);
  }

  const completedByCourse: Record<string, number> = {};
  if (user) {
    const { data: progressRows } = await supabase
      .from("catalog_lesson_progress")
      .select("course_id, lesson_id")
      .eq("user_id", user.id)
      .in("course_id", courseIds);

    for (const row of progressRows ?? []) {
      const cid = row.course_id as string;
      // بنعتبره مكتمل بس لو الدرس لسه منشور (متسقّ مع getCourseProgress)
      if (lessonIdsByCourse[cid]?.has(row.lesson_id as string)) {
        completedByCourse[cid] = (completedByCourse[cid] ?? 0) + 1;
      }
    }
  }

  for (const courseId of courseIds) {
    result[courseId] = { completed: completedByCourse[courseId] ?? 0, total: totalByCourse[courseId] ?? 0 };
  }
  return result;
}

/** أول درس منشور لسه مكملوش — لزرار "كمّل الكورس" في الداشبورد وصفحة الكورس */
export async function getNextLessonForCourse(courseId: string): Promise<LessonSummary | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: lessons }, completedIds] = await Promise.all([
    supabase
      .from("catalog_lessons")
      .select("id, course_id, title, summary, content_type, order_index")
      .eq("course_id", courseId)
      .eq("published", true)
      .order("order_index", { ascending: true }),
    getMyCompletedLessonIds(courseId),
  ]);

  const completedSet = new Set(completedIds);
  const next = (lessons ?? []).find((l) => !completedSet.has(l.id as string));
  return (next as LessonSummary | undefined) ?? null;
}

/** تعليم درس كمكتمل — لازم يكون المستخدم مسجّل في الكورس (enrolled) فعلاً، الـ RLS بيتأكد من ده */
export async function completeLesson(lessonId: string, courseId: string): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("catalog_lesson_progress")
    .insert({ user_id: user.id, course_id: courseId, lesson_id: lessonId });

  // 23505 = unique_violation (خلّصه قبل كده) — مش فشل حقيقي
  if (error && error.code !== "23505") return { ok: false };

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
