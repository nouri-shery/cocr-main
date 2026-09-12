"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProfileActionResult {
  error: string | null;
}

export interface StartedCourse {
  id: string;
  startedAt: string;
}

export async function updateProfile(
  _prev: ProfileActionResult, formData: FormData,
): Promise<ProfileActionResult> {
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 300);
  const skillsRaw = String(formData.get("skills") ?? "");
  const skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.auth.updateUser({ data: { bio, skills } });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath("/profile");
  return { error: null };
}

/** بيسجّل إن الطالب بدأ الكورس ده — على حساب المستخدم الحقيقي، مش localStorage */
export async function startCourse(courseId: string): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const existing: StartedCourse[] = user.user_metadata?.startedCourses ?? [];
  if (existing.some((c) => c.id === courseId)) return;

  const next: StartedCourse[] = [...existing, { id: courseId, startedAt: new Date().toISOString() }];
  await supabase.auth.updateUser({ data: { startedCourses: next } });

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath(`/courses/${courseId}`);
}
