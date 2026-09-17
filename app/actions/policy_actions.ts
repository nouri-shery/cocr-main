"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserSuperAdmin } from "./admin_actions";

export interface PolicyDocument {
  slug: string;
  title: string;
  version: number;
  content: string;
  status: "draft" | "published";
  published_at: string | null;
}

export async function listPolicies(): Promise<PolicyDocument[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("policy_documents")
    .select("slug, title, version, content, status, published_at")
    .order("title", { ascending: true });

  return data ?? [];
}

export async function getPolicyBySlug(slug: string): Promise<PolicyDocument | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("policy_documents")
    .select("slug, title, version, content, status, published_at")
    .eq("slug", slug)
    .maybeSingle();

  return data ?? null;
}

export interface PolicySaveResult {
  error: string | null;
}

/** تحديث محتوى/حالة سياسة — RLS نفسها (policy_documents_write_staff_only،
 * 0005) مقصورة على is_super_admin() بس، فالفحص هنا دفاع إضافي (defense in
 * depth) مش الحماية الحقيقية. النشر بيرفع version تلقائي ويسجّل published_at
 * عشان consents/policy_acceptances تقدر تتربط بنسخة واضحة لاحقًا. */
export async function updatePolicyContent(
  slug: string, title: string, content: string, publish: boolean,
): Promise<PolicySaveResult> {
  const trimmedTitle = title.trim().slice(0, 200);
  if (trimmedTitle.length < 1) return { error: "العنوان لازم يبقى موجود." };

  if (!(await isCurrentUserSuperAdmin())) return { error: "الإجراء ده لفريق COCR الأساسي بس." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const existing = await getPolicyBySlug(slug);
  if (!existing) return { error: "السياسة دي مش موجودة." };

  const willPublish = publish && existing.status !== "published";

  const { error } = await supabase
    .from("policy_documents")
    .update({
      title: trimmedTitle,
      content,
      status: publish ? "published" : "draft",
      version: willPublish ? existing.version + 1 : existing.version,
      published_at: willPublish ? new Date().toISOString() : existing.published_at,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);

  if (error) return { error: "حصل خطأ، جرّب تاني بعد شوية." };
  revalidatePath(`/admin/policies/${slug}`);
  revalidatePath(`/policies/${slug}`);
  revalidatePath("/policies");
  return { error: null };
}

/** بتسجّل إن المستخدم الحالي وافق على نسخة معيّنة من سياسة — دليل حقيقي
 * (مش بس boolean) لأي مراجعة مستقبلية */
export async function recordPolicyAcceptance(policySlug: string, policyVersion: number): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("policy_acceptances").insert({
    user_id: user.id, policy_slug: policySlug, policy_version: policyVersion,
  });
}
