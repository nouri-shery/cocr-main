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
}

export interface MentorApplyResult {
  error: string | null;
}

const APPLICATION_COLUMNS = "id, track, motivation, prior_projects, gender, age, student_age_min, student_age_max, guardian_email, status, notes, created_at, expertise_areas, portfolio_url, github_url, preferred_days, preferred_time, timezone, weekly_availability_hours, preferred_cohort_size";

const PREFERRED_DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;

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

  const expertiseAreas = String(formData.get("expertiseAreas") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const portfolioUrl = String(formData.get("portfolioUrl") ?? "").trim().slice(0, 500) || null;
  const githubUrl = String(formData.get("githubUrl") ?? "").trim().slice(0, 500) || null;
  const preferredDays = formData.getAll("preferredDays").map(String).filter((d) => (PREFERRED_DAYS as readonly string[]).includes(d));
  const preferredTime = String(formData.get("preferredTime") ?? "").trim().slice(0, 50) || null;
  const timezone = String(formData.get("timezone") ?? "Africa/Cairo").trim().slice(0, 50) || null;
  const weeklyAvailabilityRaw = formData.get("weeklyAvailabilityHours");
  const weeklyAvailabilityHours = weeklyAvailabilityRaw ? Number(weeklyAvailabilityRaw) : null;
  const preferredCohortSizeRaw = formData.get("preferredCohortSize");
  const preferredCohortSize = preferredCohortSizeRaw ? Number(preferredCohortSizeRaw) : null;

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
  if (expertiseAreas.length === 0) return { error: "اكتبي مجال أو اتنين إنتي فاهماهم كويس." };
  if (portfolioUrl && !/^https?:\/\/\S+$/.test(portfolioUrl)) return { error: "لينك البورتفوليو لازم يبدأ بـ http:// أو https://." };
  if (githubUrl && !/^https?:\/\/\S+$/.test(githubUrl)) return { error: "لينك GitHub لازم يبدأ بـ http:// أو https://." };
  if (weeklyAvailabilityHours !== null && (!Number.isFinite(weeklyAvailabilityHours) || weeklyAvailabilityHours <= 0)) {
    return { error: "عدد ساعات التفرّغ الأسبوعية لازم يكون رقم موجب." };
  }
  if (preferredCohortSize !== null && (!Number.isInteger(preferredCohortSize) || preferredCohortSize <= 0)) {
    return { error: "حجم الدفعة المفضّل لازم يكون رقم صحيح موجب." };
  }

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
      expertise_areas: expertiseAreas,
      portfolio_url: portfolioUrl,
      github_url: githubUrl,
      preferred_days: preferredDays,
      preferred_time: preferredTime,
      timezone,
      weekly_availability_hours: weeklyAvailabilityHours,
      preferred_cohort_size: preferredCohortSize,
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
