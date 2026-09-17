"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ReportTargetType = "project" | "submission" | "mentor" | "user" | "comment" | "opportunity";

export interface CreateReportResult {
  error: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** بلاغ — هوية المبلّغ محمية بـ RLS (المُبلَّغ عنه مش بيشوفها خالص، بس
 * الفريق بصلاحية safety_report_access أو super admin).
 *
 * target_id على الجدول الحقيقي نوعه uuid، فلو الـ id مش uuid فعلي (زي
 * أكواد المينتورز الثابتة على الصفحة الرئيسية) بنسيب target_id فاضي
 * ونحط الـ id الخام جوّا details عشان ماتضاعش المعلومة */
export async function createReport(
  targetType: ReportTargetType, targetId: string, reason: string, details: string,
): Promise<CreateReportResult> {
  const trimmedReason = reason.trim().slice(0, 200);
  if (trimmedReason.length < 3) return { error: "اكتبي سبب البلاغ." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجّلي دخولك عشان تبلّغي." };

  const isUuid = UUID_RE.test(targetId);
  const trimmedDetails = details.trim().slice(0, 2000);
  const combinedDetails = isUuid
    ? (trimmedDetails || null)
    : [trimmedDetails, `(target: ${targetId})`].filter(Boolean).join(" — ").slice(0, 2000);

  const { error } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: isUuid ? targetId : null,
      reason: trimmedReason,
      details: combinedDetails,
    });

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  return { error: null };
}
