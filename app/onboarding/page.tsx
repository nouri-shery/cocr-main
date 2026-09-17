"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { saveOnboardingData } from "../actions/profile_actions";
import {
  STAGES, INTERESTS, GOALS,
  type StageId, type InterestId, type GoalId,
} from "../lib/onboarding";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [stage, setStage] = React.useState<StageId | null>(null);
  const [interests, setInterests] = React.useState<InterestId[]>([]);
  const [goal, setGoal] = React.useState<GoalId | null>(null);
  const [finishing, setFinishing] = React.useState(false);

  const toggleInterest = (id: InterestId) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const canNext = (step === 1 && stage !== null) || (step === 2 && interests.length > 0) || (step === 3 && goal !== null);

  const handleNext = async () => {
    if (step < TOTAL_STEPS) { setStep((s) => s + 1); return; }
    setFinishing(true);
    try {
      const { data } = await createClient().auth.getUser();
      if (data.user) {
        // بيانات حقيقية على الحساب (profiles.interests/goal/grade_or_education_stage)
        // — مش localStorage، فبتفضل موجودة عبر أي جهاز أو متصفح
        await saveOnboardingData(stage, interests, goal);
      }
    } catch {
      /* لو حصل خطأ، نكمل التنقل عادي — المستخدم يقدر يعدّل من البروفايل تاني */
    }
    setTimeout(() => router.push("/dashboard"), 2200);
  };

  if (finishing) {
    return (
      <main className="grid min-h-screen place-items-center bg-gradient-to-br from-blue-700 via-primary to-[#0B1633] px-6 text-center text-white">
        <div>
          <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
          <p className="text-[1.1rem] font-bold">بنجهّزلك أول خطوة في رحلتك وكارت الـ Passport...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#F7F2E8] to-cream px-6 py-12">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] w-full max-w-[560px]">
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < step ? "bg-primary" : "bg-border")} />
          ))}
        </div>

        <div className="rounded-[26px] border border-border bg-white p-8 shadow-[0_20px_50px_-20px_rgba(22,24,31,.25)]">
          {step === 1 && (
            <>
              <h1 className="mb-1.5 text-[1.3rem] font-extrabold">السن والمرحلة الدراسية</h1>
              <p className="mb-6 text-[.88rem] text-muted-foreground">عشان نعرف نوجهك صح.</p>
              <div className="grid grid-cols-2 gap-3">
                {STAGES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStage(s.id)}
                    aria-pressed={stage === s.id}
                    className={cn(
                      "flex min-h-[64px] items-center justify-center rounded-2xl border-2 px-4 text-center text-[.94rem] font-bold transition-all",
                      stage === s.id ? "border-primary bg-blue-tint text-primary" : "border-border text-slate-600 hover:border-slate-400",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="mb-1.5 text-[1.3rem] font-extrabold">مجالات الشغف والاهتمام</h1>
              <p className="mb-6 text-[.88rem] text-muted-foreground">اختار اللي تحبه — تقدر تختار أكتر من واحد.</p>
              <div className="flex flex-wrap gap-2.5">
                {INTERESTS.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => toggleInterest(i.id)}
                    aria-pressed={interests.includes(i.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-[.9rem] font-bold transition-all",
                      interests.includes(i.id) ? "border-primary bg-blue-tint text-primary" : "border-border text-slate-600 hover:border-slate-400",
                    )}
                  >
                    {interests.includes(i.id) && <Check className="h-3.5 w-3.5" />}
                    {i.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="mb-1.5 text-[1.3rem] font-extrabold">هدفك الحالي من COCR</h1>
              <p className="mb-6 text-[.88rem] text-muted-foreground">مفيش إجابة غلط — دي بس عشان نرشّحلك صح.</p>
              <div className="flex flex-col gap-2.5">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    aria-pressed={goal === g.id}
                    className={cn(
                      "flex min-h-[56px] items-center justify-between rounded-2xl border-2 px-5 text-start text-[.94rem] font-bold transition-all",
                      goal === g.id ? "border-primary bg-blue-tint text-primary" : "border-border text-slate-600 hover:border-slate-400",
                    )}
                  >
                    {g.label}
                    {goal === g.id && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className={cn("text-[.88rem] font-bold text-muted-foreground hover:text-foreground", step === 1 && "pointer-events-none opacity-0")}
            >
              رجوع
            </button>
            <button
              onClick={handleNext}
              disabled={!canNext}
              className="flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-7 text-[.95rem] font-extrabold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === TOTAL_STEPS ? "خلّصنا 🎉" : "التالي"}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[.8rem] text-slate-400">
          <Icon3D name="path" className="me-1 inline h-4 w-4 align-[-3px]" />
          خطوة {step} من {TOTAL_STEPS}
        </p>
      </div>
    </main>
  );
}
