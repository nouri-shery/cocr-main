"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProjectWithOwner } from "./projects_actions";

export interface MentorApplication {
  id: string;
  applicant_id: string;
  track: string;
  motivation: string;
  prior_projects: string;
  gender: "male" | "female";
  age: number;
  student_age_min: number;
  student_age_max: number;
  guardian_email: string;
  leads_training_completed_at: string | null;
  status: "pending" | "approved" | "rejected" | "suspended" | "needs_changes";
  notes: string | null;
  created_at: string;
  expertise_areas: string[];
  portfolio_url: string | null;
  github_url: string | null;
  preferred_days: string[];
  preferred_time: string | null;
  timezone: string | null;
  weekly_availability_hours: number | null;
  preferred_cohort_size: number | null;
  applicant: { display_name: string | null } | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: "project" | "submission" | "mentor" | "user" | "comment" | "opportunity";
  target_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewed" | "resolved";
  created_at: string;
  reporter: { display_name: string | null } | null;
}

export interface DeletionRequest {
  id: string;
  user_id: string;
  reason: string | null;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  requester: { display_name: string | null } | null;
}

export type CourseProposalStatus =
  | "draft" | "submitted" | "content_review" | "technical_review"
  | "needs_changes" | "approved" | "published" | "archived" | "rejected";

export interface CourseProposal {
  id: string;
  mentor_id: string;
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
  mentor: { display_name: string | null } | null;
}

export interface ModerationLogEntry {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: string;
  actor: { display_name: string | null } | null;
}

const MENTOR_APPLICATION_PERMISSION = "mentor_application_review";
const SAFETY_REPORT_PERMISSION = "safety_report_access";
const PROJECT_REVIEW_PERMISSION = "project_review";
const OPPORTUNITY_REVIEW_PERMISSION = "opportunity_review";
const CONTENT_REVIEW_PERMISSION = "content_review";

/** أسماء العرض بتتجاب من profiles_public (view ضيّق id+display_name بس)،
 * مش embed مباشر عن طريق profiles — RLS بتاعة profiles بقت مقصورة على
 * صاحب الصف بس، فالـ embed العادي هيرجّع null لأي حد تاني */
async function fetchDisplayNames(
  supabase: Awaited<ReturnType<typeof createClient>>, ids: string[],
): Promise<Record<string, string | null>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles_public").select("id, display_name").in("id", unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name]));
}

/** فحوصات الصلاحية بتستخدم نظام الأدمن الحقيقي الموجود بالفعل في الداتابيز
 * (has_permission()/is_super_admin() — RPC حقيقي، مش عمود مخترع زي is_staff
 * اللي كان هنا الأول). دي فحوصات دفاعية إضافية (defense in depth)، الحماية
 * الحقيقية جوّه RLS نفسها اللي بتستخدم نفس الدالتين */
async function currentUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function isSuperAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<boolean> {
  const { data } = await supabase.rpc("is_super_admin", { uid: userId });
  return data === true;
}

async function hasPermission(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string, permission: string,
): Promise<boolean> {
  const { data } = await supabase.rpc("has_permission", { uid: userId, target_permission: permission });
  return data === true;
}

async function canReviewMentorApplications(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<boolean> {
  return (await isSuperAdmin(supabase, userId)) || (await hasPermission(supabase, userId, MENTOR_APPLICATION_PERMISSION));
}

async function canAccessReports(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<boolean> {
  return (await isSuperAdmin(supabase, userId)) || (await hasPermission(supabase, userId, SAFETY_REPORT_PERMISSION));
}

async function canReviewProjects(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<boolean> {
  return (await isSuperAdmin(supabase, userId)) || (await hasPermission(supabase, userId, PROJECT_REVIEW_PERMISSION));
}

async function canReviewOpportunities(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<boolean> {
  return (await isSuperAdmin(supabase, userId)) || (await hasPermission(supabase, userId, OPPORTUNITY_REVIEW_PERMISSION));
}

async function canReviewCourses(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<boolean> {
  return (await isSuperAdmin(supabase, userId)) || (await hasPermission(supabase, userId, CONTENT_REVIEW_PERMISSION));
}

/** بترجّع true لو المستخدم الحالي عنده أي صلاحية أدمن هنا — بيتستخدم بس
 * عشان نفتح/نقفل شل لوحة /admin، كل صفحة جواها بتعمل فحصها الدقيق لوحدها */
export async function isCurrentUserStaff(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return false;
  if (await isSuperAdmin(supabase, userId)) return true;
  if (await hasPermission(supabase, userId, MENTOR_APPLICATION_PERMISSION)) return true;
  if (await hasPermission(supabase, userId, SAFETY_REPORT_PERMISSION)) return true;
  if (await hasPermission(supabase, userId, PROJECT_REVIEW_PERMISSION)) return true;
  if (await hasPermission(supabase, userId, OPPORTUNITY_REVIEW_PERMISSION)) return true;
  if (await hasPermission(supabase, userId, CONTENT_REVIEW_PERMISSION)) return true;
  return false;
}

/** policy_documents_write_staff_only (0005) مقصورة على is_super_admin() بس —
 * مش زي باقي شاشات الأدمن اللي بتقبل permission-holders كمان، فمحتاجة فحص
 * منفصل بدل isCurrentUserStaff العام */
export async function isCurrentUserSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return false;
  return isSuperAdmin(supabase, userId);
}

async function logModeration(
  supabase: Awaited<ReturnType<typeof createClient>>, actorId: string,
  action: string, targetType: string, targetId: string, reason: string | null,
) {
  await supabase.from("moderation_log").insert({
    actor_id: actorId, action, target_type: targetType, target_id: targetId, reason,
  });
}

export async function listMentorApplications(): Promise<MentorApplication[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId || !(await canReviewMentorApplications(supabase, userId))) return [];

  const { data } = await supabase
    .from("mentor_applications")
    .select(
      "id, applicant_id, track, motivation, prior_projects, gender, age, student_age_min, student_age_max, " +
      "guardian_email, leads_training_completed_at, status, notes, created_at, expertise_areas, portfolio_url, " +
      "github_url, preferred_days, preferred_time, timezone, weekly_availability_hours, preferred_cohort_size",
    )
    .order("created_at", { ascending: false });

  const applications = (data as Omit<MentorApplication, "applicant">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, applications.map((a) => a.applicant_id));
  return applications.map((a) => ({ ...a, applicant: { display_name: names[a.applicant_id] ?? null } }));
}

export async function reviewMentorApplication(
  id: string, decision: "approved" | "rejected" | "needs_changes", note: string,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };
  if (!(await canReviewMentorApplications(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس." };
  if (decision === "needs_changes" && note.trim().length < 3) {
    return { error: "لازم توضّحي للمتقدّم إيه اللي محتاج يتعدّل." };
  }

  const { error } = await supabase
    .from("mentor_applications")
    .update({
      status: decision,
      notes: note.trim().slice(0, 500) || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  await logModeration(supabase, userId, `mentor_application_${decision}`, "mentor_application", id, note || null);
  revalidatePath("/admin/mentor-applications");
  return { error: null };
}

/** تعليق مينتور معتمد بالفعل — status='suspended' بيسحب صلاحياته فورًا لأن
 * is_approved_mentor() بتتحقق status='approved' بس، مفيش أي كود تاني لازم يتغيّر */
export async function suspendMentor(id: string, reason: string): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };
  if (!(await canReviewMentorApplications(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس." };

  const { error } = await supabase
    .from("mentor_applications")
    .update({
      status: "suspended",
      notes: reason.trim().slice(0, 500) || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  await logModeration(supabase, userId, "mentor_suspended", "mentor_application", id, reason || null);
  revalidatePath("/admin/mentor-applications");
  return { error: null };
}

const COURSE_PROPOSAL_COLUMNS = "id, mentor_id, title, description, track, status, notes, created_at, learning_outcomes, skills, age_min, age_max, prerequisites, weekly_workload_hours, level, final_project_brief, final_project_rubric, final_project_deliverables";

/** كورسات في مراحل مراجعة فعلية بس (مش draft لسه بيتبني، ولا published/
 * archived خلاص) — الـ queue اللي الليدر محتاج يشوفه */
export async function listCourseProposals(): Promise<CourseProposal[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId || !(await canReviewCourses(supabase, userId))) return [];

  const { data } = await supabase
    .from("course_proposals")
    .select(COURSE_PROPOSAL_COLUMNS)
    .in("status", ["submitted", "content_review", "technical_review"])
    .order("created_at", { ascending: true });

  const proposals = (data as Omit<CourseProposal, "mentor">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, proposals.map((p) => p.mentor_id));
  return proposals.map((p) => ({ ...p, mentor: { display_name: names[p.mentor_id] ?? null } }));
}

export interface CourseProposalForReview extends CourseProposal {
  curriculumSessions: {
    id: string; order_index: number; title: string; objectives: string[]; session_type: string;
    duration_minutes: number; preparation: string | null; live_activity: string | null;
    post_session_task_brief: string | null; resources: string[]; expected_deliverable: string | null;
  }[];
}

/** كورس واحد بالمنهج الكامل — للمراجعة التفصيلية، مش بس العنوان والوصف */
export async function getCourseProposalForReview(id: string): Promise<CourseProposalForReview | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId || !(await canReviewCourses(supabase, userId))) return null;

  const [{ data: proposal }, { data: sessions }] = await Promise.all([
    supabase.from("course_proposals").select(COURSE_PROPOSAL_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("course_curriculum_sessions")
      .select("id, order_index, title, objectives, session_type, duration_minutes, preparation, live_activity, post_session_task_brief, resources, expected_deliverable")
      .eq("course_proposal_id", id)
      .order("order_index", { ascending: true }),
  ]);

  if (!proposal) return null;
  const names = await fetchDisplayNames(supabase, [proposal.mentor_id]);
  return {
    ...(proposal as Omit<CourseProposal, "mentor">),
    mentor: { display_name: names[proposal.mentor_id] ?? null },
    curriculumSessions: sessions ?? [],
  };
}

export async function reviewCourseProposal(
  id: string, decision: "approved" | "needs_changes" | "rejected", note: string,
): Promise<{ error: string | null }> {
  const trimmedNote = note.trim().slice(0, 1000);
  if (decision !== "approved" && trimmedNote.length < 3) {
    return { error: "لازم توضّحي للمنتور إيه اللي محتاج يتعدّل أو ليه اترفض." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };
  if (!(await canReviewCourses(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس." };

  const { error, count } = await supabase
    .from("course_proposals")
    .update({
      status: decision,
      notes: trimmedNote || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }, { count: "exact" })
    .eq("id", id)
    .in("status", ["submitted", "content_review", "technical_review"]);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  if (!count) return { error: "الكورس ده مش مستني قرار مراجعة دلوقتي." };
  await logModeration(supabase, userId, `course_proposal_${decision}`, "course_proposal", id, trimmedNote || null);
  revalidatePath("/admin/course-proposals");
  revalidatePath(`/admin/course-proposals/${id}`);
  return { error: null };
}

export async function listReports(): Promise<Report[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId || !(await canAccessReports(supabase, userId))) return [];

  const { data } = await supabase
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, details, status, created_at")
    .order("created_at", { ascending: false });

  const reports = (data as Omit<Report, "reporter">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, reports.map((r) => r.reporter_id));
  return reports.map((r) => ({ ...r, reporter: { display_name: names[r.reporter_id] ?? null } }));
}

export async function resolveReport(
  id: string, status: "reviewed" | "resolved",
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };
  if (!(await canAccessReports(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس." };

  const { error } = await supabase
    .from("reports")
    .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  await logModeration(supabase, userId, `report_${status}`, "report", id, null);
  revalidatePath("/admin/reports");
  return { error: null };
}

export async function listDeletionRequests(): Promise<DeletionRequest[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId || !(await isSuperAdmin(supabase, userId))) return [];

  const { data } = await supabase
    .from("account_deletion_requests")
    .select("id, user_id, reason, status, created_at")
    .order("created_at", { ascending: false });

  const requests = (data as Omit<DeletionRequest, "requester">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, requests.map((r) => r.user_id));
  return requests.map((r) => ({ ...r, requester: { display_name: names[r.user_id] ?? null } }));
}

export async function resolveDeletionRequest(
  id: string, status: "completed" | "cancelled",
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };
  if (!(await isSuperAdmin(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس." };

  const { error } = await supabase
    .from("account_deletion_requests")
    .update({ status, processed_by: userId, processed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  await logModeration(supabase, userId, `deletion_request_${status}`, "account_deletion_request", id, null);
  revalidatePath("/admin/deletion-requests");
  return { error: null };
}

/* ------------------------------------------------------------------ */
/* مراجعة مشاريع التخرّج — صلاحية project_review منفصلة، نفس باترن باقي
 * شاشات الأدمن (mentor applications / course proposals / reports) */
/* ------------------------------------------------------------------ */

/** كل المشاريع اللي مستنية قرار الليدر دلوقتي */
export async function listPendingProjectReviews(): Promise<ProjectWithOwner[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId || !(await canReviewProjects(supabase, userId))) return [];

  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "pending_review")
    .order("updated_at", { ascending: true });

  const projects = (data as ProjectWithOwner[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, projects.map((p) => p.owner_id));
  return projects.map((p) => ({ ...p, owner: { display_name: names[p.owner_id] ?? null } }));
}

export interface ProjectReviewDecisionInput {
  decision: "approved" | "rejected";
  reviewerNote: string;
  studentScore?: number | null;
  mentorScore?: number | null;
  /** fallback يدوي — بس لو الداتابيز معرفتش تحدد منتور واضح وحيد وقت
   * الإرسال (mentor_ratings كانت فاضية أو فيها أكتر من منتور محتمل) */
  mentorId?: string | null;
}

/** موافقة/رفض مشروع — بينادي submit_project_review في الداتابيز، اللي
 * بتعمل insert في project_reviews + update على projects في transaction
 * واحدة (مستحيل يبقى فيه سجل مراجعة من غير ما الحالة تتحدّث). الدالة دي
 * نفسها مجرد RLS-checked RPC call — الحماية الحقيقية في الداتابيز، مش هنا */
export async function reviewProject(
  projectId: string, input: ProjectReviewDecisionInput,
): Promise<{ error: string | null }> {
  const trimmedNote = input.reviewerNote.trim().slice(0, 2000);
  if (input.decision === "rejected" && trimmedNote.length < 3) {
    return { error: "لازم تكتبي سبب الرفض عشان الطالب يعرف يحسّن مشروعه." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };
  if (!(await canReviewProjects(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس." };

  const { error } = await supabase.rpc("submit_project_review", {
    p_project_id: projectId,
    p_decision: input.decision,
    p_reviewer_note: trimmedNote || null,
    p_student_score: input.studentScore ?? null,
    p_mentor_score: input.mentorScore ?? null,
    p_mentor_id: input.mentorId ?? null,
  });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };

  await logModeration(supabase, userId, `project_${input.decision}`, "project", projectId, trimmedNote || null);
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}

/* ------------------------------------------------------------------ */
/* مراجعة الفرص — صلاحية opportunity_review، نفس باترن مراجعة المشاريع.
 * كل الكتابة عن طريق الدوال في migration 0019 (SECURITY DEFINER) بس */
/* ------------------------------------------------------------------ */

export interface OpportunityInReview {
  id: string;
  title: string;
  provider: string;
  official_source_url: string;
  category: string | null;
  status: string;
  researcher_id: string;
  reviewer_id: string | null;
  researcher: { display_name: string | null } | null;
}

/** كل الفرص اللي لسه في مراحل تحضير/مراجعة — مش published/expired_archive بعد */
export async function listOpportunitiesInReview(): Promise<OpportunityInReview[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId || !(await canReviewOpportunities(supabase, userId))) return [];

  const { data } = await supabase
    .from("opportunities")
    .select("id, title, provider, official_source_url, category, status, researcher_id, reviewer_id")
    .in("status", ["research", "official_source_check", "independent_review"])
    .order("title", { ascending: true });

  const rows = (data as Omit<OpportunityInReview, "researcher">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, rows.map((r) => r.researcher_id));
  return rows.map((r) => ({ ...r, researcher: { display_name: names[r.researcher_id] ?? null } }));
}

export interface ProposeOpportunityInput {
  title: string;
  provider: string;
  opportunityType: string;
  summary: string;
  officialSourceUrl: string;
  category?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  deadline?: string | null;
}

/** بداية فرصة جديدة — status='research'، الباحث الحالي بيبقى researcher_id.
 * حقول تفصيلية زيادة (icon/accent/tags/...) بتتحدّث بعدين وهي لسه في
 * مراحل التحضير، مش لازم تتملى كلها من أول لحظة */
export async function proposeOpportunity(input: ProposeOpportunityInput): Promise<{ error: string | null; id: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك.", id: null };
  if (!(await canReviewOpportunities(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس.", id: null };

  const { data, error } = await supabase.rpc("propose_opportunity", {
    p_title: input.title.trim(),
    p_provider: input.provider.trim(),
    p_opportunity_type: input.opportunityType.trim(),
    p_summary: input.summary.trim(),
    p_official_source_url: input.officialSourceUrl.trim(),
    p_category: input.category ?? null,
    p_min_age: input.minAge ?? null,
    p_max_age: input.maxAge ?? null,
    p_deadline: input.deadline ?? null,
  });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية.", id: null };
  await logModeration(supabase, userId, "opportunity_proposed", "opportunity", data as string, null);
  revalidatePath("/admin/opportunities");
  return { error: null, id: data as string };
}

/** تقديم مرحلة التحضير (research -> official_source_check -> independent_review)
 * — الباحث نفسه بس اللي يقدر يعمل ده */
export async function advanceOpportunityStage(id: string): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };

  const { error } = await supabase.rpc("advance_opportunity_stage", { p_opportunity_id: id });
  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };

  await logModeration(supabase, userId, "opportunity_stage_advanced", "opportunity", id, null);
  revalidatePath("/admin/opportunities");
  return { error: null };
}

/** المراجعة النهائية — approved (-> published مباشرة + verified) أو
 * needs_rework (-> research تاني مع سبب إجباري). مراجع لازم يكون شخص
 * مختلف عن الباحث (COI، متفروض من الداتابيز كمان) */
export async function reviewOpportunityDecision(
  id: string, decision: "approved" | "needs_rework", note: string,
): Promise<{ error: string | null }> {
  const trimmedNote = note.trim().slice(0, 1000);
  if (decision === "needs_rework" && trimmedNote.length < 3) {
    return { error: "لازم توضّحي سبب الإرجاع عشان الباحث يعرف يظبطه." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };
  if (!(await canReviewOpportunities(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس." };

  const { error } = await supabase.rpc("review_opportunity", {
    p_opportunity_id: id,
    p_decision: decision,
    p_note: trimmedNote || null,
  });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  await logModeration(supabase, userId, `opportunity_${decision}`, "opportunity", id, trimmedNote || null);
  revalidatePath("/admin/opportunities");
  revalidatePath("/opportunities");
  return { error: null };
}

export async function listModerationLog(): Promise<ModerationLogEntry[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId || !(await isSuperAdmin(supabase, userId))) return [];

  const { data } = await supabase
    .from("moderation_log")
    .select("id, actor_id, action, target_type, target_id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const entries = (data as (Omit<ModerationLogEntry, "actor"> & { actor_id: string })[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, entries.map((e) => e.actor_id));
  return entries.map((e) => ({ ...e, actor: { display_name: names[e.actor_id] ?? null } }));
}
