"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * أسماء العرض بتتجاب من profiles_public (view ضيّق id+display_name بس)
 * مش من profiles نفسها — بعد تضييق RLS بتاعة profiles لصفّ صاحبها بس،
 * الـ embed المباشر (profiles!fkey) بقى بيرجّع null لأي حد غير صاحب الصف
 */
async function fetchDisplayNames(
  supabase: Awaited<ReturnType<typeof createClient>>, ids: string[],
): Promise<Record<string, string | null>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles_public").select("id, display_name").in("id", unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name]));
}

export type ProjectStatus = "draft" | "pending_review" | "published" | "rejected";

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  skills: string[];
  project_link: string | null;
  github_url: string | null;
  video_url: string | null;
  course_id: string | null;
  mentor_id: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithOwner extends Project {
  owner: { display_name: string | null } | null;
}

/** سجل مراجعة واحد زي ما بيشوفه صاحب المشروع — سبب/قرار بس، من غير أي
 * درجة رقمية (student_score/mentor_score محجوبين عنه في الداتابيز نفسها
 * عن طريق project_reviews_for_owner، مش بس إخفاء في الواجهة) */
export interface OwnerProjectReview {
  id: string;
  project_id: string;
  decision: "approved" | "rejected";
  reviewer_note: string | null;
  created_at: string;
}

/** زي ما بيشوفه المنتور — درجته هو بس (مش درجة الطالب) */
export interface MentorProjectReview {
  id: string;
  project_id: string;
  mentor_score: number | null;
  created_at: string;
}

export interface ProjectFeedback {
  id: string;
  project_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { display_name: string | null } | null;
}

export interface ProjectActionResult {
  error: string | null;
}

/** كل المشاريع المنشورة (= موثّقة من الليدر فعليًا) — للزوار والمستخدمين،
 * صفحة /projects. search بيدوّر في العنوان/الوصف/المهارات/اسم صاحب
 * المشروع — بعد الـ join بالاسم، عشان مفيش عمود اسم على projects نفسها.
 * الحجم المتوقع هنا (مشاريع تخرّج، مش سوق عام) صغير بما يكفي إن الفلترة
 * في الكود تبقى كافية ومظبوطة، بدل استعلامين متوازيين ممكن يغلطوا في مين
 * اتفلتر ومين لأ */
export async function getPublishedProjects(search?: string): Promise<ProjectWithOwner[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const projects = (data as Project[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, projects.map((p) => p.owner_id));
  const withOwner = projects.map((p) => ({ ...p, owner: { display_name: names[p.owner_id] ?? null } }));

  const q = search?.trim().toLowerCase().slice(0, 100);
  if (!q) return withOwner;

  return withOwner.filter((p) =>
    p.title.toLowerCase().includes(q)
    || p.description.toLowerCase().includes(q)
    || p.skills.some((s) => s.toLowerCase().includes(q))
    || (p.owner?.display_name ?? "").toLowerCase().includes(q));
}

/** مشروع واحد — بيرجع null لو مش موجود أو مش متاح للمستخدم الحالي (RLS) */
export async function getProjectById(id: string): Promise<ProjectWithOwner | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const project = data as Project;
  const names = await fetchDisplayNames(supabase, [project.owner_id]);
  return { ...project, owner: { display_name: names[project.owner_id] ?? null } };
}

/** مشاريع المستخدم الحالي (منشورة ومسودّات) — للـ Dashboard/Profile */
export async function getMyProjects(): Promise<Project[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  return (data as Project[] | null) ?? [];
}

function parseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    /* لينك غير صالح — يتجاهل بدل ما يكسر الحفظ */
  }
  return null;
}

function parseProjectForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const skillsRaw = String(formData.get("skills") ?? "");
  const skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  const project_link = parseUrl(String(formData.get("project_link") ?? ""));
  const github_url = parseUrl(String(formData.get("github_url") ?? ""));
  const video_url = parseUrl(String(formData.get("video_url") ?? ""));
  const courseRaw = String(formData.get("course_id") ?? "").trim();
  const course_id = courseRaw || null;
  return { title, description, skills, project_link, github_url, video_url, course_id };
}

export async function createProject(
  _prev: ProjectActionResult, formData: FormData,
): Promise<ProjectActionResult> {
  const { title, description, skills, project_link, github_url, video_url, course_id } = parseProjectForm(formData);
  if (title.length < 3) return { error: "اكتب عنوان للمشروع (3 حروف على الأقل)." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك الأول." };

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id, title, description, skills, project_link, github_url, video_url, course_id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) return { error: "حصل خطأ، جرّب تاني بعد شوية." };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(
  projectId: string, _prev: ProjectActionResult, formData: FormData,
): Promise<ProjectActionResult> {
  const { title, description, skills, project_link, github_url, video_url, course_id } = parseProjectForm(formData);
  if (title.length < 3) return { error: "اكتب عنوان للمشروع (3 حروف على الأقل)." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك الأول." };

  // RLS بترفض التعديل لو المشروع مش draft/rejected دلوقتي (pending_review
  // أو published مقفولين من التعديل، حتى لصاحبهم)
  const { error } = await supabase
    .from("projects")
    .update({
      title, description, skills, project_link, github_url, video_url, course_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) return { error: "حصل خطأ في الحفظ — المشروع ده ممكن يكون قفل من التعديل دلوقتي (مستني مراجعة أو منشور بالفعل)." };

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/profile");
  return { error: null };
}

/** إرسال المشروع للمراجعة — الطريق الوحيد اللي المشروع بيتنشر بيه دلوقتي،
 * مفيش self-publish خالص. الداتابيز نفسها (CHECK constraint) بترفض الإرسال
 * لو الكورس أو لينك الفيديو أو الجيت هاب فاضيين — الأدلة دي جزء من التحقق
 * البشري نفسه، مش تفاصيل شكلية */
export async function submitProjectForReview(projectId: string): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك الأول." };

  const { error } = await supabase
    .from("projects")
    .update({ status: "pending_review", updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    // 23514 = check_violation — غالبًا الكورس/الفيديو/الجيت هاب فاضيين
    if (error.code === "23514") {
      return { error: "لازم تحددي الكورس، ولينك الفيديو، ولينك الجيت هاب قبل ما ترسلي المشروع للمراجعة." };
    }
    return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { error: null };
}

export async function deleteProject(projectId: string): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // RLS بترفض الحذف لو المشروع pending_review/published — التوثيق مرتبط
  // بمصداقية شهادة الطالب، مش حاجة تتمسح وهي فعّالة
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) return { ok: false };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: true };
}

export async function getProjectFeedback(projectId: string): Promise<ProjectFeedback[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("project_feedback")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const feedback = (data as Omit<ProjectFeedback, "author">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, feedback.map((f) => f.author_id));
  return feedback.map((f) => ({ ...f, author: { display_name: names[f.author_id] ?? null } }));
}

export interface RecentFeedback extends ProjectFeedback {
  project: { id: string; title: string };
}

/**
 * آخر feedback وصل على أي مشروع من مشاريع المستخدم الحالي — للداشبورد.
 * بيستخدم project_feedback!inner(project) عشان يفلتر على owner_id بتاع
 * المشروع المرتبط، مش عمود موجود على project_feedback نفسها.
 */
export async function getMyRecentFeedback(limit = 3): Promise<RecentFeedback[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("project_feedback")
    .select("*, project:projects!inner(id, title, owner_id)")
    .eq("project.owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const feedback = (data as Omit<RecentFeedback, "author">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, feedback.map((f) => f.author_id));
  return feedback.map((f) => ({ ...f, author: { display_name: names[f.author_id] ?? null } }));
}

/** عدد الملاحظات اللي المستخدم الحالي كتبها لمشاريع ناس تانية — إشارة
 * "مساهم" حقيقية في رحلة الطالب (Contributor)، مش رقم مُلفَّق */
export async function getMyGivenFeedbackCount(): Promise<number> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("project_feedback")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id);

  return count ?? 0;
}

/** الملاحظات اللي المستخدم الحالي كتبها لمشاريع ناس تانية — لقسم "ساهمت"
 * في البروفايل */
export async function getMyGivenFeedback(limit = 5): Promise<RecentFeedback[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("project_feedback")
    .select("*, project:projects!inner(id, title, owner_id)")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const feedback = (data as Omit<RecentFeedback, "author">[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, feedback.map((f) => f.author_id));
  return feedback.map((f) => ({ ...f, author: { display_name: names[f.author_id] ?? null } }));
}

export async function submitFeedback(
  projectId: string, _prev: ProjectActionResult, formData: FormData,
): Promise<ProjectActionResult> {
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000);
  if (body.length < 3) return { error: "اكتب تعليق حقيقي (3 حروف على الأقل)." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك الأول." };

  const { error } = await supabase
    .from("project_feedback")
    .insert({ project_id: projectId, author_id: user.id, body });

  if (error) {
    // RLS بترفض الكتابة لو المشروع مش منشور أو المستخدم هو صاحب المشروع نفسه
    return { error: "معرفتش تضيف الملاحظة دي — ممكن يكون المشروع مش منشور أو ده مشروعك انت." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}

export async function deleteFeedback(feedbackId: string, projectId: string): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("project_feedback")
    .delete()
    .eq("id", feedbackId)
    .eq("author_id", user.id);

  if (error) return { ok: false };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* مراجعة الليدر — قراءة بس من هنا (صاحب المشروع/المنتور). الكتابة الفعلية
 * (موافقة/رفض) في admin_actions.ts زي باقي شاشات الأدمن */
/* ------------------------------------------------------------------ */

/** سجل المراجعات اللي صاحب المشروع يقدر يشوفه — من project_reviews_for_owner
 * (view ضيّق، مفيش فيه أي درجة رقمية أصلًا، مش بس مخفية في الواجهة) */
export async function getProjectReviewsForOwner(projectId: string): Promise<OwnerProjectReview[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("project_reviews_for_owner")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (data as OwnerProjectReview[] | null) ?? [];
}

/** تقييم المنتور لأدائه هو بس على المشروع ده — من project_reviews_for_mentor */
export async function getProjectReviewsForMentor(projectId: string): Promise<MentorProjectReview[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("project_reviews_for_mentor")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (data as MentorProjectReview[] | null) ?? [];
}

/* ------------------------------------------------------------------ */
/* عداد المشاهدات — حقيقي، deduplicated (unique constraint في الداتابيز،
 * مش عدّاد مخزّن ممكن يغلط) */
/* ------------------------------------------------------------------ */

/** بتتسجّل مرة واحدة بس لكل زائر مسجّل دخول لكل مشروع — على conflict
 * بتتجاهل بهدوء (مش خطأ حقيقي، ده بالظبط المطلوب من الـ dedup) */
export async function recordProjectView(projectId: string): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("project_views")
    .upsert({ project_id: projectId, viewer_id: user.id }, { onConflict: "project_id,viewer_id", ignoreDuplicates: true });
}

export async function getProjectViewCount(projectId: string): Promise<number> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { count } = await supabase
    .from("project_views")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  return count ?? 0;
}
