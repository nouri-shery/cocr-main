"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { OpportunityCard, useSavedOpportunities } from "./opportunities_client";
import type { OpportunityListing } from "../types/types";

export function SavedClient({ opportunities }: { opportunities: OpportunityListing[] }) {
  const router = useRouter();
  const { saved, toggle } = useSavedOpportunities();

  const savedOpportunities = React.useMemo(
    () => opportunities.filter((o) => saved.includes(o.id)),
    [opportunities, saved]
  );

  if (savedOpportunities.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <Icon3D name="heart" className="h-14 w-14 opacity-70" />
        <p className="text-[1.05rem] font-extrabold">لسه مفتكرتش حاجة</p>
        <p className="max-w-[26em] text-[.9rem] text-muted-foreground">
          لما تفتكر فرصة من صفحة المنح والفرص، هتظهر هنا عشان ترجع لها في أي وقت.
        </p>
        <Link href="/opportunities" className="mt-1 rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white">
          استكشف الفرص
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {savedOpportunities.map((o) => (
        <OpportunityCard
          key={o.id}
          opportunity={o}
          saved
          onToggleSaved={() => toggle(o.id)}
          onExpand={() => router.push(`/opportunities/${o.id}`)}
        />
      ))}
    </div>
  );
}
