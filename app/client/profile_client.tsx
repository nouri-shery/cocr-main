"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Pencil } from "lucide-react";
import { signOut } from "@/components/homecomponent/auth/actions";
import { getOnboarding, INTERESTS, STAGES, GOALS, type OnboardingData } from "../lib/onboarding";

export function ProfileClient({ name, email }: { name: string; email: string }) {
  const [onboarding, setOnboarding] = React.useState<OnboardingData | null>(null);

  React.useEffect(() => {
    setOnboarding(getOnboarding());
  }, []);

  const stageLabel = onboarding?.stage ? STAGES.find((s) => s.id === onboarding.stage)?.label : null;
  const goalLabel = onboarding?.goal ? GOALS.find((g) => g.id === onboarding.goal)?.label : null;
  const interestLabels = onboarding?.interests.map((i) => INTERESTS.find((x) => x.id === i)?.label).filter(Boolean) ?? [];

  return (
    <div className="grid gap-6 sm:grid-cols-[280px_1fr]">
      <div className="rounded-3xl border border-border bg-white p-6 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-blue-tint text-[1.7rem] font-extrabold text-primary">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <p className="text-[1.05rem] font-extrabold">{name}</p>
        <p className="mt-1 text-[.85rem] text-muted-foreground">{email}</p>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[.88rem] font-bold text-slate-600 hover:border-destructive/40 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[1.05rem] font-extrabold">بياناتك في الأونبوردينج</h2>
          <Link href="/onboarding" className="flex items-center gap-1 text-[.82rem] font-bold text-primary">
            <Pencil className="h-3.5 w-3.5" /> تعديل
          </Link>
        </div>

        {!onboarding ? (
          <p className="text-[.9rem] text-muted-foreground">
            لسه معملتش الأونبوردينج.{" "}
            <Link href="/onboarding" className="font-bold text-primary underline">
              اعمله دلوقتي
            </Link>{" "}
            عشان نرشّحلك أدق.
          </p>
        ) : (
          <dl className="grid gap-4 text-[.9rem]">
            <div>
              <dt className="mb-1 font-bold text-muted-foreground">المرحلة الدراسية</dt>
              <dd className="font-extrabold">{stageLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className="mb-1 font-bold text-muted-foreground">اهتماماتك</dt>
              <dd className="flex flex-wrap gap-2">
                {interestLabels.length > 0
                  ? interestLabels.map((l) => (
                      <span key={l} className="rounded-full bg-blue-tint px-3 py-1 text-[.8rem] font-bold text-primary">{l}</span>
                    ))
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="mb-1 font-bold text-muted-foreground">هدفك</dt>
              <dd className="font-extrabold">{goalLabel ?? "—"}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
