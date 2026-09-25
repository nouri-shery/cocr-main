"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CohortStatus = "draft" | "published" | "in_progress" | "completed" | "cancelled";

export interface CourseCohort {
  id: string;
  course_proposal_id: string;
  mentor_id: string;
  name: string;
  status: CohortStatus;
  start_date: string;
  end_date: string;
  schedule: { day: string; time: string }[];
  timezone: string;
  max_seats: number;
  enrollment_deadline: string | null;
  created_at: string;
}

export interface CohortActionResult {
  error: string | null;
  id?: string;
}

const COLUMNS = "id, course_proposal_id, mentor_id, name, status, start_date, end_date, schedule, timezone, max_seats, enrollment_deadline, created_at";

export async function getMyCohorts(): Promise<CourseCohort[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("course_cohorts")
    .select(COLUMNS)
    .eq("mentor_id", user.id)
    .order("start_date", { ascending: true });

  return (data as CourseCohort[] | null) ?? [];
}

export async function getCohortsForCourse(courseProposalId: string): Promise<CourseCohort[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("course_cohorts")
    .select(COLUMNS)
    .eq("course_proposal_id", courseProposalId)
    .order("start_date", { ascending: true });

  return (data as CourseCohort[] | null) ?? [];
}

export async function getCohortById(id: string): Promise<CourseCohort | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.from("course_cohorts").select(COLUMNS).eq("id", id).maybeSingle();
  return data as CourseCohort | null;
}

export interface CohortInput {
  name: string;
  startDate: string;
  endDate: string;
  schedule: { day: string; time: string }[];
  timezone: string;
  maxSeats: number;
  enrollmentDeadline: string | null;
}

function validateCohort(input: CohortInput): string | null {
  if (input.name.trim().length < 3) return "اكتب اسم أوضح للدفعة.";
  if (!input.startDate || !input.endDate) return "حدد تاريخ البداية والنهاية.";
  if (input.endDate < input.startDate) return "تاريخ النهاية لازم يكون بعد البداية.";
  if (input.schedule.length === 0) return "حدد يوم وميعاد السيشنز الأسبوعي على الأقل.";
  if (!input.maxSeats || input.maxSeats <= 0) return "حدد أقصى عدد مقاعد.";
  return null;
}

/** دفعة جديدة — status='draft'. RLS بتتأكد إن الكورس منشور فعلاً وإن
 * المنتور ده هو صاحب الكورس نفسه (مفيش تعدد منتورين لنفس الكورس في V1) */
export async function createCohort(courseProposalId: string, input: CohortInput): Promise<CohortActionResult> {
  const validationError = validateCohort(input);
  if (validationError) return { error: validationError };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك." };

  const { data, error } = await supabase
    .from("course_cohorts")
    .insert({
      course_proposal_id: courseProposalId,
      mentor_id: user.id,
      name: input.name.trim().slice(0, 150),
      start_date: input.startDate,
      end_date: input.endDate,
      schedule: input.schedule,
      timezone: input.timezone || "Africa/Cairo",
      max_seats: input.maxSeats,
      enrollment_deadline: input.enrollmentDeadline,
    })
    .select("id")
    .single();

  if (error) return { error: "حصل خطأ — تأكد إن الكورس منشور فعلاً." };
  revalidatePath("/mentor/courses");
  return { error: null, id: data.id };
}

export async function updateCohort(id: string, input: CohortInput): Promise<CohortActionResult> {
  const validationError = validateCohort(input);
  if (validationError) return { error: validationError };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("course_cohorts")
    .update({
      name: input.name.trim().slice(0, 150),
      start_date: input.startDate,
      end_date: input.endDate,
      schedule: input.schedule,
      timezone: input.timezone || "Africa/Cairo",
      max_seats: input.maxSeats,
      enrollment_deadline: input.enrollmentDeadline,
    })
    .eq("id", id);

  if (error) return { error: "حصل خطأ — الدفعة دي مش قابلة للتعديل دلوقتي (فتحت تسجيل بالفعل)." };
  revalidatePath("/mentor/courses");
  return { error: null };
}

/** فتح التسجيل — draft -> published. من هنا الطلاب يقدروا يشوفوا الدفعة وينضموا */
export async function publishCohort(id: string): Promise<CohortActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("course_cohorts")
    .update({ status: "published" })
    .eq("id", id)
    .eq("status", "draft");

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath("/mentor/courses");
  return { error: null };
}
