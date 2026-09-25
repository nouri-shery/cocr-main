"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface GraduationSubmissionForReview {
  id: string;
  content: string;
  file_url: string | null;
  submitted_at: string | null;
  student_id: string;
  cohort_id: string;
  student: { display_name: string | null } | null;
  latest_decision: string | null;
}

async function fetchDisplayNames(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {} as Record<string, string | null>;
  const { data } = await supabase.from("profiles_public").select("id, display_name").in("id", unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name])) as Record<string, string | null>;
}

/** مشاريع تخرّج (دفعات جديدة) مستنية قرار المنتور — مقدَّمة (submitted)،
 * وآخر قرار مراجعة ليها (لو موجود) مش "approved" نهائي بعد */
export async function getGraduationSubmissionsForMentor(): Promise<GraduationSubmissionForReview[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: submissions } = await supabase
    .from("course_submissions")
    .select("id, content, file_url, submitted_at, student_id, cohort_id")
    .eq("is_graduation_project", true)
    .eq("status", "submitted");

  const rows = submissions ?? [];
  if (rows.length === 0) return [];

  const { data: reviews } = await supabase
    .from("graduation_project_reviews")
    .select("submission_id, decision, created_at")
    .in("submission_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false });

  const latestDecisionBySubmission = new Map<string, string>();
  for (const r of reviews ?? []) {
    if (!latestDecisionBySubmission.has(r.submission_id)) latestDecisionBySubmission.set(r.submission_id, r.decision);
  }

  const pending = rows.filter((r) => latestDecisionBySubmission.get(r.id) !== "approved");
  const names = await fetchDisplayNames(supabase, pending.map((p) => p.student_id));

  return pending.map((r) => ({
    ...r,
    student: { display_name: names[r.student_id] ?? null },
    latest_decision: latestDecisionBySubmission.get(r.id) ?? null,
  }));
}

export interface GraduationReviewDecisionInput {
  decision: "under_review" | "changes_requested" | "approved" | "rejected";
  note: string;
  rubricScores: Record<string, number>;
}

export async function reviewGraduationSubmission(
  submissionId: string, input: GraduationReviewDecisionInput,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.rpc("submit_graduation_review", {
    p_submission_id: submissionId,
    p_decision: input.decision,
    p_note: input.note.trim() || null,
    p_rubric_scores: Object.keys(input.rubricScores).length > 0 ? input.rubricScores : null,
  });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath("/mentor");
  return { error: null };
}
