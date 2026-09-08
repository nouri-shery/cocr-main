import { OpportunitiesExplorer } from "../client/opportunities_client";
import { getOpportunities, getOpportunityCategories } from "../actions/opportunities_actions";

export async function OpportunitiesPageContent() {
  const [opportunities, categories] = await Promise.all([
    getOpportunities(),
    getOpportunityCategories(),
  ]);

  return (
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-10 max-w-[38em]">
          <span className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
            المنح والفرص والتطوع
          </span>
          <h1 className="mb-4 text-[clamp(1.95rem,3.9vw,2.95rem)] font-extrabold leading-tight tracking-tight">
            الخطوة اللي بعد الرحلة
          </h1>
          <p className="text-[1.05rem] leading-[1.9] text-muted-foreground">
            مسابقات، منح، وبرامج تطوع مناسبة لسنك، أونلاين وأوفلاين — بدل ما تدوّر لوحدك وتلاقي الديدلاين فات.
          </p>
        </div>

        <OpportunitiesExplorer initialOpportunities={opportunities} categories={categories} />
      </div>
    </main>
  );
}
