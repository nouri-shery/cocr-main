"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Sprout, Lock } from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { GrowthLadder } from "./landing_client";
import { getOnboarding, GOALS, INTEREST_TO_OPPORTUNITY_CATEGORY, type OnboardingData } from "../lib/onboarding";
import type { OpportunityListing, GrowthRung } from "../types/types";

const ACCENT: Record<string, { bg: string }> = {
  blue: { bg: "#E9EEFC" },
  gold: { bg: "#FBF1DC" },
  green: { bg: "#E6F3EB" },
  ink: { bg: "#E9E7E2" },
};

/** بادچات الإنجازات — الشكل موجود، البيانات لسه Placeholder لحد ما يبقى فيه تتبّع حقيقي */
const ACHIEVEMENT_SLOTS = [
  { label: "أول كورس", icon: "build" as const },
  { label: "أول مشروع", icon: "hammer" as const },
  { label: "أول فرصة", icon: "target" as const },
  { label: "مساهمة", icon: "heart" as const },
];

export function DashboardClient({
  rungs, opportunities,
}: { rungs: GrowthRung[]; opportunities: OpportunityListing[] }) {
  const [onboarding, setOnboarding] = React.useState<OnboardingData | null>(null);

  React.useEffect(() => {
    setOnboarding(getOnboarding());
  }, []);

  const recommended = React.useMemo(() => {
    if (!onboarding || onboarding.interests.length === 0) return opportunities.slice(0, 3);
    const cats = Array.from(new Set(onboarding.interests.flatMap((i) => INTEREST_TO_OPPORTUNITY_CATEGORY[i])));
    const matches = opportunities.filter((o) => cats.includes(o.category));
    return (matches.length > 0 ? matches : opportunities).slice(0, 3);
  }, [onboarding, opportunities]);

  const goalLabel = onboarding?.goal ? GOALS.find((g) => g.id === onboarding.goal)?.label : null;

  return (
    <div>
      {/* الخطوة الجاية */}
      <section className="mb-10 rounded-3xl border border-primary/20 bg-blue-tint p-6">
        <div className="mb-2 flex items-center gap-2 text-[.8rem] font-extrabold text-primary">
          <Sprout className="h-4 w-4" /> الخطوة الجاية ليك
        </div>
        <p className="mb-4 text-[1.05rem] font-extrabold leading-relaxed">
          {goalLabel
            ? `بناءً على هدفك: "${goalLabel}"، ابدأ من هنا —`
            : "لسه معملتش الأونبوردينج؟ يومّنا نعرف نرشّحلك أدق."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/opportunities" className="rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white">
            استكشف الفرص
          </Link>
          <Link href="/courses" className="rounded-xl border border-primary/30 bg-white px-5 py-2.5 text-[.9rem] font-extrabold text-primary">
            استكشف الكورسات
          </Link>
        </div>
      </section>

      {/* ترشيحات ليك */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-[1.2rem] font-extrabold">فرص ترشيحات ليك</h2>
          <span className="rounded-full bg-blue-tint px-3 py-1 text-[.72rem] font-bold text-primary">بناءً على اهتماماتك</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {recommended.map((o) => {
            const a = ACCENT[o.accent];
            return (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]"
              >
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-full" style={{ background: a.bg }}>
                  <Icon3D name={o.icon} className="h-5 w-5" />
                </span>
                <p className="text-[.92rem] font-extrabold leading-snug">{o.title}</p>
                <p className="mt-1 text-[.78rem] text-muted-foreground">{o.organization}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* استمر في التعلم — Empty state صريح، من غير تقدّم مُلفَّق */}
      <section className="mb-10">
        <h2 className="mb-4 text-[1.2rem] font-extrabold">استمر في التعلم</h2>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-sand px-6 py-10 text-center">
          <Icon3D name="build" className="h-12 w-12 opacity-70" />
          <p className="font-bold">لسه مبدأتش كورس</p>
          <p className="max-w-[26em] text-[.86rem] text-muted-foreground">لما تبدأ كورس، هيظهر هنا وتقدر تكمّل منه في أي وقت.</p>
          <Link href="/courses" className="mt-1 rounded-xl bg-primary px-5 py-2 text-[.86rem] font-extrabold text-white">
            استكشف الكورسات
          </Link>
        </div>
      </section>

      {/* رحلتك */}
      <section className="mb-10">
        <h2 className="mb-6 text-[1.2rem] font-extrabold">رحلتك</h2>
        <GrowthLadder rungs={rungs} />
      </section>

      {/* إنجازاتك — قريبًا */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-[1.2rem] font-extrabold">إنجازاتك</h2>
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[.72rem] font-bold text-muted-foreground">
            <Lock className="h-3 w-3" /> قريبًا
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACHIEVEMENT_SLOTS.map((a) => (
            <div key={a.label} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white px-3 py-5 text-center opacity-60">
              <Icon3D name={a.icon} className="h-9 w-9" />
              <span className="text-[.78rem] font-bold text-muted-foreground">{a.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[.78rem] text-slate-400">
          <Star className="me-1 inline h-3 w-3" />
          الإنجازات دي هتشتغل بمجرد ما يبقى فيه تتبّع حقيقي لتقدّمك — مش أرقام مُلفَّقة.
        </p>
      </section>
    </div>
  );
}
