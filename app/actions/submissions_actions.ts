"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCourseById } from "./landing_page_actions";

/** أسماء العرض بتتجاب من profiles_public (view ضيّق id+display_name بس)،
 * مش embed مباشر عن طريق profiles — RLS بتاعة profiles بقت مقصورة على
 * صاحب الصف بس */
async function fetchDisplayNames(
  supabase: Awaited<ReturnType<typeof createClient>>, ids: string[],
): Promise<Record<string, string | null>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles_public").select("id, display_name").in("id", unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name]));
}

export interface Submission {
  id: string;
  course_id: string;
  lesson_id: string | null;
  content: string;
  file_url: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;
}

export interface CoursemateSubmission extends Submission {
  student: { display_name: string | null } | null;
}

export interface SubmissionSaveResult {
  error: string | null;
}

/** تسليم الطالب الحالي للدرس ده بالذات (لو موجود) */
export async function getMySubmissionForLesson(courseId: string, lessonId: string): Promise<Submission | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("course_submissions")
    .select("id, course_id, lesson_id, content, file_url, status, submitted_at, created_at")
    .eq("student_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  return data ?? null;
}

/** بيحفظ مسودة أو يبعت التسليم النهائي.
 * ملحوظة (اتكشفت أثناء اختبار حقيقي): مكانتش upsert({onConflict:
 * "student_id,lesson_id"}) — لأ لأنها مش موجودة أصلًا كـ unique constraint
 * حقيقي على course_submissions (اتأكد بالتجربة: PostgREST بيرجّع 42P10 "no
 * unique or exclusion constraint matching the ON CONFLICT specification")،
 * يعني كل تسليم كان بيفشل فعليًا بالخطأ العام "حصل خطأ، جرّب تاني بعد
 * شوية." من أول تسليم لأي طالب جديد. اتصلّحت بنفس نمط check-then-write
 * اللي saveGraduationSubmission بيستخدمه، من غير الاعتماد على constraint
 * مش مؤكد وجوده. */
export async function saveSubmission(
  courseId: string, lessonId: string, content: string, submit: boolean,
): Promise<SubmissionSaveResult> {
  const trimmed = content.trim().slice(0, 4000);
  if (submit && trimmed.length < 10) return { error: "اكتبي وصف أطول لشغلك قبل ما تسلّمي." };

  const course = await getCourseById(courseId);
  if (!course) return { error: "الكورس ده مش موجود." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك." };

  const { data: existing } = await supabase
    .from("course_submissions")
    .select("id")
    .eq("student_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const row = {
    course_id: courseId,
    course_category: course.category,
    lesson_id: lessonId,
    student_id: user.id,
    content: trimmed,
    status: submit ? "submitted" : "draft",
    submitted_at: submit ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = existing
    ? await supabase.from("course_submissions").update(row).eq("id", existing.id)
    : await supabase.from("course_submissions").insert(row);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  return { error: null };
}

/** شغل زمايل نفس الكورس اللي اتسلّم فعلاً (مش مسودات) — لدرس معيّن بس */
export async function getCoursemateSubmissionsForLesson(lessonId: string): Promise<CoursemateSubmission[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("course_submissions")
    .select("id, course_id, lesson_id, content, file_url, status, submitted_at, created_at, student_id")
    .eq("lesson_id", lessonId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  const submissions = (data as (Submission & { student_id: string })[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, submissions.map((s) => s.student_id));
  return submissions.map(({ student_id, ...s }) => ({ ...s, student: { display_name: names[student_id] ?? null } }));
}

export interface MentorInboxSubmission extends Submission {
  course_category: string;
  student: { display_name: string | null } | null;
  feedback_given: boolean;
}

/** كل التسليمات المسلَّمة اللي المنتور الحالي مسموحله يراجعها — RLS نفسها
 * (course_submissions_select_mentor) بتفلتر على تراكه المعتمد، مفيش فلترة
 * إضافية لازمة هنا */
export async function getSubmissionsForMentor(): Promise<MentorInboxSubmission[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: submissions } = await supabase
    .from("course_submissions")
    .select("id, course_id, course_category, lesson_id, content, file_url, status, submitted_at, created_at, student_id")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  if (!submissions || submissions.length === 0) return [];

  const [{ data: myFeedback }, names] = await Promise.all([
    supabase.from("submission_feedback").select("submission_id").eq("mentor_id", user.id),
    fetchDisplayNames(supabase, (submissions as { student_id: string }[]).map((s) => s.student_id)),
  ]);

  const reviewedIds = new Set((myFeedback ?? []).map((f) => f.submission_id));

  return (submissions as (Omit<MentorInboxSubmission, "feedback_given" | "student"> & { student_id: string })[]).map(({ student_id, ...s }) => ({
    ...s, student: { display_name: names[student_id] ?? null }, feedback_given: reviewedIds.has(s.id),
  }));
}

export interface FeedbackSaveResult {
  error: string | null;
}

export interface SubmissionFeedbackItem {
  id: string;
  mentor_id: string;
  rating: number | null;
  comment: string;
  created_at: string;
}

/** الفيدباك اللي وصل على تسليم معيّن — الطالب صاحب التسليم بس يشوفه (RLS) */
export async function getFeedbackForSubmission(submissionId: string): Promise<SubmissionFeedbackItem[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("submission_feedback")
    .select("id, mentor_id, rating, comment, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** هل الطالب الحالي قيّم المينتور ده قبل كده في نفس الكورس؟ */
export async function getMyMentorRating(courseId: string, mentorId: string): Promise<number | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("mentor_ratings")
    .select("rating")
    .eq("course_id", courseId)
    .eq("mentor_id", mentorId)
    .eq("student_id", user.id)
    .maybeSingle();

  return data?.rating ?? null;
}

/** الطالب بيقيّم المينتور اللي راجع تسليمه — بيقفل حلقة الـ peer learning.
 * unique(course_id, mentor_id, student_id) في الداتابيز بيمنع تكرار التقييم */
export async function rateMentor(
  courseId: string, lessonId: string, mentorId: string, rating: number, comment: string,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك." };

  const { error } = await supabase
    .from("mentor_ratings")
    .insert({ course_id: courseId, mentor_id: mentorId, student_id: user.id, rating, comment: comment.trim().slice(0, 1000) });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  return { error: null };
}

export interface GraduationSubmission {
  id: string;
  course_id: string;
  content: string;
  file_url: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;
}

/** مشروع التخرّج بتاع الكورس ده — صف واحد بس لكل (طالب, كورس)، مختلف عن
 * تسليمات الدروس لأن lesson_id بيبقى null وis_graduation_project = true.
 * مش معتمدين على upsert onConflict زي saveSubmission لأن unique(student_id,
 * lesson_id) مابيمنعش صفوف متكررة لما lesson_id يبقى null (بوستجرس بيعتبر
 * كل NULL مختلف عن التاني في unique constraint) — بنعمل check يدوي بدله. */
export async function getMyGraduationSubmission(courseId: string): Promise<GraduationSubmission | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("course_submissions")
    .select("id, course_id, content, file_url, status, submitted_at, created_at")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .eq("is_graduation_project", true)
    .maybeSingle();

  return data ?? null;
}

export async function saveGraduationSubmission(
  courseId: string, content: string, link: string, submit: boolean,
): Promise<SubmissionSaveResult> {
  const trimmed = content.trim().slice(0, 4000);
  if (submit && trimmed.length < 10) return { error: "اكتبي وصف أطول لمشروعك قبل ما تسلّمي." };

  const course = await getCourseById(courseId);
  if (!course) return { error: "الكورس ده مش موجود." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك." };

  const trimmedLink = link.trim().slice(0, 500) || null;

  const { data: existing } = await supabase
    .from("course_submissions")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .eq("is_graduation_project", true)
    .maybeSingle();

  const row = {
    course_id: courseId,
    course_category: course.category,
    lesson_id: null,
    is_graduation_project: true,
    student_id: user.id,
    content: trimmed,
    file_url: trimmedLink,
    status: submit ? "submitted" : "draft",
    submitted_at: submit ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = existing
    ? await supabase.from("course_submissions").update(row).eq("id", existing.id)
    : await supabase.from("course_submissions").insert(row);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/courses/${courseId}`);
  return { error: null };
}

export async function submitMentorFeedback(
  submissionId: string, rating: number, comment: string,
): Promise<FeedbackSaveResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك." };

  const { error } = await supabase
    .from("submission_feedback")
    .insert({
      submission_id: submissionId,
      mentor_id: user.id,
      rating,
      comment: comment.trim().slice(0, 2000),
    });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath("/mentor/submissions");
  return { error: null };
}
