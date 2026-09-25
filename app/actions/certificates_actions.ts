"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface MyCertificate {
  id: string;
  certificate_number: string;
  course_title: string;
  status: "active" | "revoked";
  issued_at: string;
  project_id: string | null;
}

export interface CertificateVerification {
  certificate_number: string;
  student_display_name: string | null;
  course_title: string;
  status: "active" | "revoked";
  issued_at: string;
  revoked_at: string | null;
  project_id: string | null;
  project_title: string | null;
}

/** شهادات الطالب الحالي — RLS بتفلتر على student_id = auth.uid() فعليًا،
 * الشرط هنا مجرد تحسين (مش أمان إضافي) */
export async function getMyCertificates(): Promise<MyCertificate[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("certificates")
    .select("id, certificate_number, course_title, status, issued_at, project_id")
    .eq("student_id", user.id)
    .order("issued_at", { ascending: false });

  return (data as MyCertificate[] | null) ?? [];
}

/** عدد الشهادات بس — استعمال خفيف (كارت صغير في الداشبورد)، من غير ما نجيب كل الصفوف */
export async function getMyCertificateCount(): Promise<number> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id);

  return count ?? 0;
}

/** تحقق عام من شهادة برقمها — متاح لأي حد (مسجّل أو زائر)، عن طريق
 * verify_certificate() الـ SECURITY DEFINER بس، مفيش قراءة مباشرة من الجدول */
export async function verifyCertificate(certificateNumber: string): Promise<CertificateVerification | null> {
  const trimmed = certificateNumber.trim();
  if (!trimmed) return null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .rpc("verify_certificate", { p_certificate_number: trimmed })
    .maybeSingle();

  if (error || !data) return null;
  return data as CertificateVerification;
}
