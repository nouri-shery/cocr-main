"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface AchievementStatus {
  key: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

/** كل الإنجازات (الكتالوج) مع حالة كل واحد للمستخدم الحالي — earned:false
 * لكل حاجة لو مفيش تسجيل دخول */
export async function getMyAchievements(): Promise<AchievementStatus[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const { data: catalog } = await supabase
    .from("achievements")
    .select("key, title, description, icon, order_index")
    .order("order_index", { ascending: true });

  const rows = catalog ?? [];
  if (!user) {
    return rows.map((a) => ({ key: a.key, title: a.title, description: a.description, icon: a.icon, earned: false, earned_at: null }));
  }

  const { data: earned } = await supabase
    .from("user_achievements")
    .select("achievement_key, earned_at")
    .eq("user_id", user.id);

  const earnedMap = Object.fromEntries((earned ?? []).map((e) => [e.achievement_key, e.earned_at as string]));

  return rows.map((a) => ({
    key: a.key,
    title: a.title,
    description: a.description,
    icon: a.icon,
    earned: a.key in earnedMap,
    earned_at: earnedMap[a.key] ?? null,
  }));
}

/** عدد الإنجازات اللي اتحصّلت — استعمال خفيف (كارت صغير)، من غير ما نجيب
 * كل الكتالوج */
export async function getMyAchievementCount(): Promise<number> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("user_achievements")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return count ?? 0;
}
