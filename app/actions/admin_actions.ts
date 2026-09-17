"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  status: "pending" | "approved" | "rejected" | "suspended";
  notes: string | null;
  created_at: string;
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
    .select("id, applicant_id, track, motivation, prior_projects, gender, age, student_age_min, student_age_max, guardian_email, leads_training_completed_at, status, notes, created_at")
    .order("created_at", { ascending: false });

  const applications = (data as Omit<MentorApplication, "applicant">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, applications.map((a) => a.applicant_id));
  return applications.map((a) => ({ ...a, applicant: { display_name: names[a.applicant_id] ?? null } }));
}

export async function reviewMentorApplication(
  id: string, decision: "approved" | "rejected", note: string,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "لازم تسجّلي دخولك." };
  if (!(await canReviewMentorApplications(supabase, userId))) return { error: "الإجراء ده لفريق COCR بس." };

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
