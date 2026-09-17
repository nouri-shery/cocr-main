"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface DeletionRequestResult {
  error: string | null;
}

export interface MyDeletionRequest {
  id: string;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
}

/** حذف مباشر لصف profiles ممنوع عمدًا (تصحيح أمان من Milestone 2) — ده
 * طلب بيروح للفريق يعالجه يدويًا، مش حذف فوري */
export async function requestAccountDeletion(reason: string): Promise<DeletionRequestResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك." };

  const { error } = await supabase
    .from("account_deletion_requests")
    .insert({ user_id: user.id, reason: reason.trim().slice(0, 1000) || null });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath("/account/delete");
  return { error: null };
}

export async function getMyDeletionRequest(): Promise<MyDeletionRequest | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("account_deletion_requests")
    .select("id, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
