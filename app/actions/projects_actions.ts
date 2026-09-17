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

export type ProjectStatus = "draft" | "published";

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  skills: string[];
  project_link: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithOwner extends Project {
  owner: { display_name: string | null } | null;
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

/** كل المشاريع المنشورة — للزوار والمستخدمين، صفحة /projects */
export async function getPublishedProjects(): Promise<ProjectWithOwner[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const projects = (data as Project[] | null) ?? [];
  const names = await fetchDisplayNames(supabase, projects.map((p) => p.owner_id));
  return projects.map((p) => ({ ...p, owner: { display_name: names[p.owner_id] ?? null } }));
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

function parseProjectForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const skillsRaw = String(formData.get("skills") ?? "");
  const skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  const linkRaw = String(formData.get("project_link") ?? "").trim();
  let project_link: string | null = null;
  if (linkRaw) {
    try {
      const url = new URL(linkRaw);
      if (url.protocol === "http:" || url.protocol === "https:") project_link = url.toString();
    } catch {
      /* لينك غير صالح — يتجاهل بدل ما يكسر الحفظ */
    }
  }
  return { title, description, skills, project_link };
}

export async function createProject(
  _prev: ProjectActionResult, formData: FormData,
): Promise<ProjectActionResult> {
  const { title, description, skills, project_link } = parseProjectForm(formData);
  if (title.length < 3) return { error: "اكتب عنوان للمشروع (3 حروف على الأقل)." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك الأول." };

  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title, description, skills, project_link, status: "draft" })
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
  const { title, description, skills, project_link } = parseProjectForm(formData);
  if (title.length < 3) return { error: "اكتب عنوان للمشروع (3 حروف على الأقل)." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك الأول." };

  const { error } = await supabase
    .from("projects")
    .update({ title, description, skills, project_link, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/profile");
  return { error: null };
}

export async function setProjectStatus(projectId: string, status: ProjectStatus): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) return { ok: false };

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteProject(projectId: string): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

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
