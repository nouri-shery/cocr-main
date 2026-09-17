import { AdminPolicyEditContent } from "../../../server/adminserver";

export const metadata = {
  title: "تعديل سياسة — COCR Admin",
};

export default async function AdminPolicyEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AdminPolicyEditContent slug={slug} />;
}
