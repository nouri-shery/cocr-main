import { PolicyPageContent } from "../../server/policiesserver";
import { getPolicyBySlug } from "../../actions/policy_actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = await getPolicyBySlug(slug);
  return { title: policy ? `${policy.title} — COCR` : "السياسة — COCR" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PolicyPageContent slug={slug} />;
}
