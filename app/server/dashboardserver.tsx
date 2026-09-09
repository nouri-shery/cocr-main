import { redirect } from "next/navigation";
import { DashboardClient } from "../client/dashboard_client";
import { getGrowthLadder } from "../actions/landing_page_actions";
import { getOpportunities } from "../actions/opportunities_actions";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function DashboardPageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/dashboard");

  const [rungs, opportunities] = await Promise.all([
    getGrowthLadder(),
    getOpportunities(),
  ]);

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
  const firstName = displayName.split(" ")[0] || "بطل";

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-10 max-w-[38em]">
          <span className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
            لوحة التحكم
          </span>
          <h1 className="mb-4 text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold leading-tight tracking-tight">
            أهلًا يا {firstName} 👋
          </h1>
          <p className="text-[1.05rem] leading-[1.9] text-muted-foreground">
            دي رحلتك في COCR — إيه اللي عملته وإيه الخطوة الجاية.
          </p>
        </div>

        <DashboardClient rungs={rungs} opportunities={opportunities} />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
