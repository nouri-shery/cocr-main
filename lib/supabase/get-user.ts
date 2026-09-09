import { cookies } from "next/headers";
import { createClient } from "./server";

/** يرجّع المستخدم الحالي لو عامل تسجيل دخول حقيقي، أو null لو زائر */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
