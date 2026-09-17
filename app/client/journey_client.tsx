"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type JourneyStageId = "student" | "learner" | "builder" | "contributor" | "mentor";

export interface JourneySignals {
  hasEnrollment: boolean;
  hasPublishedProject: boolean;
  hasGivenFeedback: boolean;
  isApprovedMentor: boolean;
}

const STAGES: { id: JourneyStageId; label: string; doneCopy: string; todoCopy: string }[] = [
  { id: "student", label: "طالب", doneCopy: "بدأت رحلتك في COCR", todoCopy: "بدأت رحلتك في COCR" },
  { id: "learner", label: "متعلّم", doneCopy: "بدأت تتعلّم فعليًا", todoCopy: "ابدأ كورس عشان توصل هنا" },
  { id: "builder", label: "باني", doneCopy: "نشرت أول مشروع", todoCopy: "انشر مشروع عشان توصل هنا" },
  { id: "contributor", label: "مساهم", doneCopy: "ساعدت طالب تاني بملاحظة حقيقية", todoCopy: "سيب ملاحظة على مشروع حد تاني" },
  { id: "mentor", label: "مينتور", doneCopy: "بقيت مينتور معتمد في COCR", todoCopy: "اتقدّمي تبقي مينتور بعد ما تكبري في رحلتك" },
];

/** بترجّع كل مرحلة وهل اتحققت فعليًا من بيانات حقيقية — مفيش XP ولا رقم
 * مُلفَّق، كل مرحلة إما اتحققت أو لأ بناءً على فعل حقيقي في الحساب */
export function computeJourney(signals: JourneySignals) {
  const achieved: Record<JourneyStageId, boolean> = {
    student: true,
    learner: signals.hasEnrollment,
    builder: signals.hasPublishedProject,
    contributor: signals.hasGivenFeedback,
    mentor: signals.isApprovedMentor,
  };
  const stages = STAGES.map((s) => ({ ...s, achieved: achieved[s.id] }));
  const currentIndex = [...stages].reverse().findIndex((s) => s.achieved);
  const current = stages[stages.length - 1 - currentIndex];
  return { stages, current };
}

/** نسخة مختصرة أفقية — للداشبورد، شريط واحد فوق كل حاجة */
export function JourneyCompact({ signals }: { signals: JourneySignals }) {
  const { stages, current } = computeJourney(signals);
  return (
    <div className="flex items-center gap-1.5" aria-label={`مرحلتك الحالية: ${current.label}`}>
      {stages.map((s) => (
        <span
          key={s.id}
          title={s.label}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            s.achieved ? "bg-primary" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

/** النسخة الكاملة — للبروفايل، كل مرحلة بحالتها ووصفها */
export function JourneyFull({ signals }: { signals: JourneySignals }) {
  const { stages, current } = computeJourney(signals);
  return (
    <div>
      <p className="mb-4 text-[.88rem] text-muted-foreground">
        مرحلتك الحالية: <b className="font-extrabold text-primary">{current.label}</b>
      </p>
      <ol className="flex flex-col gap-0">
        {stages.map((s, i) => (
          <li key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[.78rem] font-extrabold",
                  s.achieved ? "border-primary bg-primary text-white" : "border-border bg-white text-slate-400",
                )}
              >
                {s.achieved ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              {i < stages.length - 1 && (
                <span className={cn("w-0.5 flex-1 min-h-[26px]", s.achieved ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <div className="pb-6">
              <p className={cn("text-[.94rem] font-extrabold", !s.achieved && "text-muted-foreground")}>{s.label}</p>
              <p className="text-[.8rem] text-muted-foreground">{s.achieved ? s.doneCopy : s.todoCopy}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
