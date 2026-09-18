"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProfileActionResult {
  error: string | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  goal: string | null;
  grade_or_education_stage: string | null;
  gender: "male" | "female" | null;
  avatar_id: string | null;
}

export interface Enrollment {
  course_id: string;
  started_at: string;
}

const PROFILE_COLUMNS = "id, display_name, bio, skills, interests, goal, grade_or_education_stage, gender, avatar_id";

export async function getMyProfile(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  return data ?? {
    id: user.id, display_name: null, bio: null, skills: [],
    interests: [], goal: null, grade_or_education_stage: null, gender: null, avatar_id: null,
  };
}

/** الطالب بيتاخد أفاتار تلقائي أول ما يحدد جنسه، بس يقدر يغيّره بعدين لأي
 * واحد تاني من نفس الجاليري — avatarId لازم يكون id حقيقي من AVATARS، مش
 * أي نص حر */
export async function setAvatarChoice(avatarId: string): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك الأول." };

  const { AVATARS } = await import("../lib/avatar-gallery");
  if (!AVATARS.some((a) => a.id === avatarId)) return { error: "اختيار غير صالح." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_id: avatarId, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  // بنبين رسالة الخطأ الحقيقية من Postgres مؤقتًا (مش النص العام) عشان لو
  // حصلت تاني نقدر نشخّصها بالظبط من غير ما نخمّن
  if (error) return { error: `حصل خطأ: ${error.message}` };
  revalidatePath("/profile");
  revalidatePath("/mentor");
  return { error: null };
}

/** بتحفظ بيانات الأونبوردينج (المرحلة، الاهتمامات، الهدف، وشكل الأفاتار
 * الاختياري) على الحساب فعليًا — بدل localStorage اللي بيتمسح مع أي جهاز
 * جديد. gender اختياري بالكامل (nullable) — لو الطالب سابه فاضي بيفضل null
 * ومفيش أفاتار توضيحي بيتفرض، initials بس */
export async function saveOnboardingData(
  stage: string | null, interests: string[], goal: string | null, gender: "male" | "female" | null,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك الأول." };

  const { error } = await supabase
    .from("profiles")
    .update({
      grade_or_education_stage: stage,
      interests,
      goal,
      gender,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  return { error: null };
}

export async function updateProfile(
  _prev: ProfileActionResult, formData: FormData,
): Promise<ProfileActionResult> {
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 300);
  const skillsRaw = String(formData.get("skills") ?? "");
  const skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك الأول." };

  // .update() مش .upsert() — الصف دايمًا موجود بالفعل (بيتعمل تلقائي عند
  // التسجيل عن طريق trigger حقيقي)، وصلاحية المستخدم على الجدول محدودة على
  // عمود bio/skills/updated_at بس (upsert محتاج INSERT privilege مش متاحة)
  const { error } = await supabase
    .from("profiles")
    .update({ bio, skills, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath("/profile");
  return { error: null };
}

/** بيسجّل إن الطالب بدأ الكورس ده — enrollment حقيقي في course_enrollments */
export async function startCourse(courseId: string): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("course_enrollments")
    .insert({ user_id: user.id, course_id: courseId })
    // unique(user_id, course_id) بيمنع التكرار على مستوى الداتابيز — لو
    // اتسجّل قبل كده، الـ insert ده هيتجاهل من غير ما يرجّع error
    .select()
    .maybeSingle();

  // كود 23505 = unique_violation (اتسجّل قبل كده) — ده مش فشل حقيقي
  if (error && error.code !== "23505") return { ok: false };

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath(`/courses/${courseId}`);
  return { ok: true };
}

export async function getMyEnrollments(): Promise<Enrollment[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("course_enrollments")
    .select("course_id, started_at")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  return data ?? [];
}
