import { notFound } from "next/navigation";
import Link from "next/link";
import { listPolicies, getPolicyBySlug } from "../actions/policy_actions";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";
import { ShieldAlert } from "lucide-react";

function LegalReviewBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-dashed border-gold/40 bg-gold-50 p-4 text-[.85rem] text-gold-600">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        الصفحة دي لسه <b>قيد المراجعة القانونية</b> — النص النهائي هيتحط بعد ما يتراجع
        ويتعتمد رسميًا. اللي إنتي شايفاه دلوقتي هيكل بس.
      </p>
    </div>
  );
}

export async function PoliciesIndexContent() {
  const policies = await listPolicies();

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[720px] px-7">
        <AppPageHeader title="السياسات" context="كل حاجة بتخص خصوصيتك وأمانك على COCR." />
        {policies.some((p) => p.status !== "published") && <LegalReviewBanner />}
        <div className="flex flex-col gap-2.5">
          {policies.map((p) => (
            <Link
              key={p.slug}
              href={`/policies/${p.slug}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-white px-5 py-4 text-[.92rem] font-bold hover:border-primary/40"
            >
              {p.title}
              <span className="text-[.76rem] font-semibold text-muted-foreground">نسخة {p.version}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

export async function PolicyPageContent({ slug }: { slug: string }) {
  const policy = await getPolicyBySlug(slug);
  if (!policy) notFound();

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[720px] px-7">
        <Link href="/policies" className="mb-6 inline-block text-[.88rem] font-bold text-primary hover:underline">
          ← كل السياسات
        </Link>
        <AppPageHeader title={policy.title} context={`نسخة ${policy.version}`} />
        {policy.status !== "published" && <LegalReviewBanner />}
        <div className="rounded-3xl border border-border bg-white p-6">
          {policy.content ? (
            <p className="whitespace-pre-wrap text-[.92rem] leading-relaxed text-muted-foreground">{policy.content}</p>
          ) : (
            <p className="text-[.9rem] text-muted-foreground">المحتوى هيتضاف بعد المراجعة القانونية.</p>
          )}
        </div>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
