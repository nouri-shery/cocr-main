"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CourseProposal {
  id: string;
  title: string;
  description: string;
  track: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
}

export interface CourseProposalResult {
  error: string | null;
}

const COLUMNS = "id, title, description, track, status, notes, created_at";

/** طلبات المينتور الحالي بإنه يعمل كورس جديد — RLS بتفلتر على صاحب الطلب بس */
export async function getMyCourseProposals(): Promise<CourseProposal[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("course_proposals")
    .select(COLUMNS)
    .eq("mentor_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** المينتور بيطلب كورس جديد — مش INSERT مباشر على catalog_courses (مفيش
 * صلاحية عليه)، ده طلب staff يراجعه (RLS: is_approved_mentor(track)) */
export async function submitCourseProposal(
  track: string, title: string, description: string,
): Promise<CourseProposalResult> {
  const trimmedTitle = title.trim().slice(0, 200);
  const trimmedDescription = description.trim().slice(0, 2000);
  if (trimmedTitle.length < 3) return { error: "اكتب عنوان أوضح للكورس." };
  if (trimmedDescription.length < 20) return { error: "اشرح فكرة الكورس بتفصيل أكتر." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّل دخولك." };

  const { error } = await supabase
    .from("course_proposals")
    .insert({ mentor_id: user.id, track, title: trimmedTitle, description: trimmedDescription });

  if (error) return { error: "حصل خطأ — تأكد إنك مينتور معتمد في التراك ده." };
  revalidatePath("/mentor");
  return { error: null };
}
