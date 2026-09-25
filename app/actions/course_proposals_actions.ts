"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CourseProposalStatus =
  | "draft" | "submitted" | "content_review" | "technical_review"
  | "needs_changes" | "approved" | "published" | "archived" | "rejected";

export interface CourseProposal {
  id: string;
  title: string;
  description: string;
  track: string;
  status: CourseProposalStatus;
  notes: string | null;
  created_at: string;
  learning_outcomes: string[];
  skills: string[];
  age_min: number | null;
  age_max: number | null;
  prerequisites: string | null;
  weekly_workload_hours: number | null;
  level: string | null;
  final_project_brief: string | null;
  final_project_rubric: Record<string, number> | null;
  final_project_deliverables: string | null;
}

export interface CourseProposalResult {
  error: string | null;
  id?: string;
}

const COLUMNS = "id, title, description, track, status, notes, created_at, learning_outcomes, skills, age_min, age_max, prerequisites, weekly_workload_hours, level, final_project_brief, final_project_rubric, final_project_deliverables";

/** كورسات المينتور الحالي (بكل حالاتها — draft لحد published) — RLS بتفلتر على صاحب الكورس بس */
export async function getMyCourseProposals(): Promise<CourseProposal[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("course_proposals")
    .select(COLUMNS)
    .eq("mentor_id", user.id)
    .order("created_at", { ascending: false });

  return (data as CourseProposal[] | null) ?? [];
}

/** كورس واحد — لبناء المنهج، الـ RLS بتتأكد إنه بتاع المينتور ده أو staff */
export async function getCourseProposalById(id: string): Promise<CourseProposal | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.from("course_proposals").select(COLUMNS).eq("id", id).maybeSingle();
  return data as CourseProposal | null;
}

export interface CourseDraftInput {
  title: string;
  description: string;
  track: string;
  learningOutcomes: string[];
  skills: string[];
  ageMin: number | null;
  ageMax: number | null;
  prerequisites: string;
  weeklyWorkloadHours: number | null;
  level: string;
}

function validateDraft(input: CourseDraftInput): string | null {
  if (input.title.trim().length < 3) return "اكتب عنوان أوضح للكورس.";
  if (input.description.trim().length < 20) return "اشرح فكرة الكورس بتفصيل أكتر.";
  if (!input.track) return "اختار التراك.";
  if (input.learningOutcomes.length === 0) return "لازم نتيجة تعلّم حقيقية واحدة على الأقل — إيه اللي الطالب هيقدر يعمله بعد الكورس ده؟";
  if (input.ageMin !== null && input.ageMax !== null && input.ageMax < input.ageMin) return "السن الأقصى لازم يكون أكبر من أو يساوي الأدنى.";
  return null;
}

/** بداية كورس جديد — status='draft'، مفيش مراجعة لسه، المينتور لسه بيبني */
export async function createDraftCourse(input: CourseDraftInput): Promise<CourseProposalResult> {
  const validationError = validateDraft(input);
  if (validationError) return { error: validationError };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك." };

  const { data, error } = await supabase
    .from("course_proposals")
    .insert({
      mentor_id: user.id,
      title: input.title.trim().slice(0, 200),
      description: input.description.trim().slice(0, 2000),
      track: input.track,
      learning_outcomes: input.learningOutcomes,
      skills: input.skills,
      age_min: input.ageMin,
      age_max: input.ageMax,
      prerequisites: input.prerequisites.trim().slice(0, 1000) || null,
      weekly_workload_hours: input.weeklyWorkloadHours,
      level: input.level || null,
    })
    .select("id")
    .single();

  if (error) return { error: "حصل خطأ — تأكد إنك مينتور معتمد في التراك ده." };
  revalidatePath("/mentor/courses");
  return { error: null, id: data.id };
}

/** تعديل كورس لسه draft أو needs_changes — الـ RLS نفسها بتمنع أي تعديل
 * بعد ما يدخل مراجعة أو يتنشر */
export async function updateCourseDraft(id: string, input: CourseDraftInput): Promise<CourseProposalResult> {
  const validationError = validateDraft(input);
  if (validationError) return { error: validationError };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("course_proposals")
    .update({
      title: input.title.trim().slice(0, 200),
      description: input.description.trim().slice(0, 2000),
      track: input.track,
      learning_outcomes: input.learningOutcomes,
      skills: input.skills,
      age_min: input.ageMin,
      age_max: input.ageMax,
      prerequisites: input.prerequisites.trim().slice(0, 1000) || null,
      weekly_workload_hours: input.weeklyWorkloadHours,
      level: input.level || null,
    })
    .eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/mentor/courses/${id}`);
  return { error: null };
}

export interface FinalProjectInput {
  brief: string;
  rubric: Record<string, number>;
  deliverables: string;
}

/** مشروع التخرّج بتاع الكورس ده — جزء من الـ draft، منفصل بس عشان الفورم
 * أوضح (خطوة لوحدها في بناء الكورس) */
export async function updateCourseFinalProject(id: string, input: FinalProjectInput): Promise<CourseProposalResult> {
  const totalWeight = Object.values(input.rubric).reduce((a, b) => a + b, 0);
  if (input.brief.trim().length < 20) return { error: "اشرح مطلوب مشروع التخرّج بتفصيل أكتر." };
  if (Object.keys(input.rubric).length === 0) return { error: "لازم معيار تقييم واحد على الأقل." };
  if (totalWeight !== 100) return { error: `مجموع أوزان معايير التقييم لازم يكون 100%، دلوقتي ${totalWeight}%.` };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("course_proposals")
    .update({
      final_project_brief: input.brief.trim().slice(0, 3000),
      final_project_rubric: input.rubric,
      final_project_deliverables: input.deliverables.trim().slice(0, 1000) || null,
    })
    .eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/mentor/courses/${id}`);
  return { error: null };
}

/** تقديم الكورس للمراجعة — draft/needs_changes -> submitted. RLS بتتأكد
 * إن الكورس بتاع المينتور فعلاً وهو لسه في حالة قابلة للتقديم */
export async function submitCourseForReview(id: string): Promise<CourseProposalResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { count } = await supabase
    .from("course_curriculum_sessions")
    .select("id", { count: "exact", head: true })
    .eq("course_proposal_id", id);

  if (!count || count === 0) return { error: "لازم تضيف سيشن واحدة على الأقل في المنهج قبل التقديم." };

  const { data: proposal } = await supabase
    .from("course_proposals")
    .select("final_project_brief")
    .eq("id", id)
    .maybeSingle();

  if (!proposal?.final_project_brief) return { error: "لازم تحدد مشروع التخرّج قبل التقديم." };

  const { error } = await supabase
    .from("course_proposals")
    .update({ status: "submitted" })
    .eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/mentor/courses/${id}`);
  revalidatePath("/mentor/courses");
  return { error: null };
}

/** نشر كورس معتمد — approved -> published. المينتور نفسه بس، بعد
 * ما فريق COCR يوافق. من هنا بس تقدر تعمل دفعات (cohorts) */
export async function publishCourse(id: string): Promise<CourseProposalResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("course_proposals")
    .update({ status: "published" })
    .eq("id", id)
    .eq("status", "approved");

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/mentor/courses/${id}`);
  revalidatePath("/mentor/courses");
  return { error: null };
}
