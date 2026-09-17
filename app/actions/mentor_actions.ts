"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface MyMentorApplication {
  id: string;
  track: string;
  motivation: string;
  prior_projects: string;
  gender: "male" | "female";
  age: number;
  student_age_min: number;
  student_age_max: number;
  guardian_email: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  notes: string | null;
  created_at: string;
}

export interface MentorApplyResult {
  error: string | null;
}

const APPLICATION_COLUMNS = "id, track, motivation, prior_projects, gender, age, student_age_min, student_age_max, guardian_email, status, notes, created_at";

/** بترجّع آخر طلب انضمام كمينتور بتاع المستخدم الحالي، لو موجود */
export async function getMyMentorApplication(): Promise<MyMentorApplication | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("mentor_applications")
    .select(APPLICATION_COLUMNS)
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function applyToBeMentor(
  _prev: MentorApplyResult, formData: FormData,
): Promise<MentorApplyResult> {
  const track = String(formData.get("track") ?? "").trim();
  const motivation = String(formData.get("motivation") ?? "").trim().slice(0, 2000);
  const priorProjects = String(formData.get("priorProjects") ?? "").trim().slice(0, 2000);
  const gender = String(formData.get("gender") ?? "");
  const age = Number(formData.get("age"));
  const studentAgeMin = Number(formData.get("studentAgeMin"));
  const studentAgeMax = Number(formData.get("studentAgeMax"));
  const guardianEmail = String(formData.get("guardianEmail") ?? "").trim();
  const guardianConsent = formData.get("guardianConsent") === "on";
  const safetyPolicy = formData.get("safetyPolicy") === "on";
  const zoomConsent = formData.get("zoomConsent") === "on";
  const followupCommitment = formData.get("followupCommitment") === "on";

  if (!track) return { error: "لازم تختاري التراك اللي عايزة تكوني مينتور فيه." };
  if (motivation.length < 20) return { error: "اكتبي سطرين أكتر عن سبب رغبتك تبقي مينتور." };
  if (gender !== "male" && gender !== "female") return { error: "لازم تحددي انتي بنت ولا ولد." };
  if (!Number.isInteger(age) || age < 10 || age > 100) return { error: "اكتبي سنّك صح." };
  if (!Number.isInteger(studentAgeMin) || !Number.isInteger(studentAgeMax) || studentAgeMin < 10 || studentAgeMax > 100) {
    return { error: "حددي السن اللي عايزة تعلّميله من وإلى." };
  }
  if (studentAgeMax < studentAgeMin) return { error: "السن الأقصى لازم يكون أكبر من أو يساوي الأدنى." };
  if (!/^\S+@\S+\.\S+$/.test(guardianEmail)) return { error: "اكتبي إيميل ولي الأمر صح." };
  if (!guardianConsent) return { error: "لازم تأكيد موافقة ولي الأمر عشان تكملي." };
  if (!safetyPolicy) return { error: "لازم توافقي على سياسة الأمان عشان تكملي." };
  if (!zoomConsent) return { error: "لازم توافقي على شرح السيشنز عبر زوم عشان تكملي." };
  if (!followupCommitment) return { error: "لازم تأكيد المتابعة مع الطلاب طول الكورس عشان تكملي." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك الأول." };

  const { error } = await supabase
    .from("mentor_applications")
    .insert({
      applicant_id: user.id,
      track,
      motivation,
      prior_projects: priorProjects,
      gender,
      age,
      student_age_min: studentAgeMin,
      student_age_max: studentAgeMax,
      guardian_email: guardianEmail,
      guardian_consent_confirmed: true,
      agreed_to_safety_policy: true,
      agreed_to_zoom_sessions: true,
      agreed_to_followup_commitment: true,
    });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };

  // دليل حقيقي مربوط بنسخة السياسة الفعلية، مش بس boolean فاضي
  await supabase.from("policy_acceptances").insert({
    user_id: user.id, policy_slug: "child-teen-safety-policy", policy_version: 1,
  });

  revalidatePath("/become-a-mentor");
  revalidatePath("/profile");
  return { error: null };
}
