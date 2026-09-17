"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SavedItemType = "opportunity" | "project";

/** الفرص بقت DB-backed بـ uuid حقيقي (migration 0010) — فحفظها دلوقتي بيروح
 * لـ favorites الحقيقي (uuid FK فعلي على opportunities) بدل saved_items،
 * تمامًا زي ما 0006 وثّقت إنه هيحصل لما الفرص تتحوّل لجدول حقيقي. المشاريع
 * لسه بتستخدم saved_items عادي — مفيش جدول favorites يغطّيها. */
async function getSavedOpportunityIds(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<string[]> {
  const { data } = await supabase.from("favorites").select("opportunity_id").eq("student_id", userId);
  return (data ?? []).map((r) => r.opportunity_id);
}

async function getSavedProjectIds(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("saved_items")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_type", "project");
  return (data ?? []).map((r) => r.item_id);
}

/** بترجّع الـ ids المحفوظة بتاعة المستخدم الحالي لنوع معيّن — حساب حقيقي،
 * مش localStorage، فبتفضل موجودة عبر أي جهاز/متصفح */
export async function getMySavedItemIds(itemType: SavedItemType): Promise<string[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return itemType === "opportunity"
    ? getSavedOpportunityIds(supabase, user.id)
    : getSavedProjectIds(supabase, user.id);
}

export async function toggleSavedItem(
  itemType: SavedItemType, itemId: string,
): Promise<{ saved: boolean; error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: "لازم تسجّلي دخولك الأول." };

  if (itemType === "opportunity") {
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("student_id", user.id)
      .eq("opportunity_id", itemId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
      if (error) return { saved: true, error: "حصل خطأ، جرّب تاني بعد شوية." };
      revalidatePath("/saved");
      revalidatePath("/profile");
      return { saved: false, error: null };
    }

    const { error } = await supabase.from("favorites").insert({ student_id: user.id, opportunity_id: itemId });
    if (error && error.code !== "23505") return { saved: false, error: "حصل خطأ، جرّب تاني بعد شوية." };
    revalidatePath("/saved");
    revalidatePath("/profile");
    return { saved: true, error: null };
  }

  const { data: existing } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("saved_items").delete().eq("id", existing.id);
    if (error) return { saved: true, error: "حصل خطأ، جرّب تاني بعد شوية." };
    revalidatePath("/saved");
    revalidatePath("/profile");
    return { saved: false, error: null };
  }

  const { error } = await supabase
    .from("saved_items")
    .insert({ user_id: user.id, item_type: itemType, item_id: itemId });

  // 23505 = unique_violation (اتحفظت قبل كده من تبويب تاني) — مش فشل حقيقي
  if (error && error.code !== "23505") return { saved: false, error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath("/saved");
  revalidatePath("/profile");
  return { saved: true, error: null };
}
