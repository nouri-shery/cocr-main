import { redirect } from "next/navigation";
import { SavedClient } from "../client/saved_client";
import { getOpportunities } from "../actions/opportunities_actions";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

export async function SavedPageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/saved");

  const opportunities = await getOpportunities();

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <AppPageHeader title="المفتكرة" context="كل الفرص اللي حفظتها، في مكان واحد." />

        <SavedClient opportunities={opportunities} />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
