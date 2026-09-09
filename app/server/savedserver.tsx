import { redirect } from "next/navigation";
import { SavedClient } from "../client/saved_client";
import { getOpportunities } from "../actions/opportunities_actions";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function SavedPageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/saved");

  const opportunities = await getOpportunities();

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-10 max-w-[38em]">
          <span className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
            المفتكرة
          </span>
          <h1 className="mb-4 text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold leading-tight tracking-tight">
            الفرص اللي فكّرت نفسك بيها
          </h1>
          <p className="text-[1.05rem] leading-[1.9] text-muted-foreground">
            كل الفرص اللي حفظتها من صفحة المنح والفرص، في مكان واحد.
          </p>
        </div>

        <SavedClient opportunities={opportunities} />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
