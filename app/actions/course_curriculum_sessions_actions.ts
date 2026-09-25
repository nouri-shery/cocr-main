"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SessionType = "workshop" | "practice" | "project_review" | "qa" | "assessment" | "final_review";

export interface CurriculumSession {
  id: string;
  course_proposal_id: string;
  order_index: number;
  title: string;
  objectives: string[];
  session_type: SessionType;
  duration_minutes: number;
  preparation: string | null;
  live_activity: string | null;
  post_session_task_brief: string | null;
  resources: string[];
  expected_deliverable: string | null;
}

export interface CurriculumSessionInput {
  title: string;
  objectives: string[];
  sessionType: SessionType;
  durationMinutes: number;
  preparation: string;
  liveActivity: string;
  postSessionTaskBrief: string;
  resources: string[];
  expectedDeliverable: string;
}

export interface CurriculumActionResult {
  error: string | null;
  id?: string;
}

const COLUMNS = "id, course_proposal_id, order_index, title, objectives, session_type, duration_minutes, preparation, live_activity, post_session_task_brief, resources, expected_deliverable";

export async function getCurriculumSessions(courseProposalId: string): Promise<CurriculumSession[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("course_curriculum_sessions")
    .select(COLUMNS)
    .eq("course_proposal_id", courseProposalId)
    .order("order_index", { ascending: true });

  return (data as CurriculumSession[] | null) ?? [];
}

function validateSession(input: CurriculumSessionInput): string | null {
  if (input.title.trim().length < 3) return "اكتب عنوان أوضح للسيشن.";
  if (input.objectives.length === 0) return "لازم هدف تعلّم واحد على الأقل للسيشن دي.";
  if (!input.durationMinutes || input.durationMinutes <= 0) return "حدد مدة السيشن بالدقايق.";
  return null;
}

/** سيشن جديدة — بتتضاف في آخر المنهج (order_index = العدد الحالي).
 * RLS بتتأكد إن الكورس بتاع المينتور ده ولسه draft/needs_changes */
export async function addCurriculumSession(
  courseProposalId: string, input: CurriculumSessionInput,
): Promise<CurriculumActionResult> {
  const validationError = validateSession(input);
  if (validationError) return { error: validationError };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { count } = await supabase
    .from("course_curriculum_sessions")
    .select("id", { count: "exact", head: true })
    .eq("course_proposal_id", courseProposalId);

  const { data, error } = await supabase
    .from("course_curriculum_sessions")
    .insert({
      course_proposal_id: courseProposalId,
      order_index: count ?? 0,
      title: input.title.trim().slice(0, 200),
      objectives: input.objectives,
      session_type: input.sessionType,
      duration_minutes: input.durationMinutes,
      preparation: input.preparation.trim().slice(0, 2000) || null,
      live_activity: input.liveActivity.trim().slice(0, 2000) || null,
      post_session_task_brief: input.postSessionTaskBrief.trim().slice(0, 1000) || null,
      resources: input.resources,
      expected_deliverable: input.expectedDeliverable.trim().slice(0, 1000) || null,
    })
    .select("id")
    .single();

  if (error) return { error: "حصل خطأ — تأكد إن الكورس لسه قابل للتعديل." };
  revalidatePath(`/mentor/courses/${courseProposalId}`);
  return { error: null, id: data.id };
}

export async function updateCurriculumSession(
  id: string, courseProposalId: string, input: CurriculumSessionInput,
): Promise<CurriculumActionResult> {
  const validationError = validateSession(input);
  if (validationError) return { error: validationError };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("course_curriculum_sessions")
    .update({
      title: input.title.trim().slice(0, 200),
      objectives: input.objectives,
      session_type: input.sessionType,
      duration_minutes: input.durationMinutes,
      preparation: input.preparation.trim().slice(0, 2000) || null,
      live_activity: input.liveActivity.trim().slice(0, 2000) || null,
      post_session_task_brief: input.postSessionTaskBrief.trim().slice(0, 1000) || null,
      resources: input.resources,
      expected_deliverable: input.expectedDeliverable.trim().slice(0, 1000) || null,
    })
    .eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/mentor/courses/${courseProposalId}`);
  return { error: null };
}

export async function deleteCurriculumSession(id: string, courseProposalId: string): Promise<CurriculumActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from("course_curriculum_sessions").delete().eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/mentor/courses/${courseProposalId}`);
  return { error: null };
}

/** إعادة ترتيب السيشنز — array من IDs بالترتيب الجديد بالكامل */
export async function reorderCurriculumSessions(
  courseProposalId: string, orderedIds: string[],
): Promise<CurriculumActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const updates = orderedIds.map((id, index) =>
    supabase.from("course_curriculum_sessions").update({ order_index: index }).eq("id", id));
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);

  if (failed) return { error: "حصل خطأ في الترتيب، جرّب تاني." };
  revalidatePath(`/mentor/courses/${courseProposalId}`);
  return { error: null };
}
