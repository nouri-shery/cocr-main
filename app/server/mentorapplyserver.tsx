import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { MentorApplyForm } from "../client/mentor_apply_client";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";
import { Check, ShieldCheck } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  rejected: "طلبك اتفض دلوقتي",
  suspended: "حساب المينتور بتاعك متعلّق دلوقتي",
};

const STATUS_STYLE: Record<string, string> = {
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-destructive/10 text-destructive",
};

const TRACKER_STEPS = ["اتبعت", "قيد المراجعة", "اتوافق عليه"] as const;

/** خطوات حقيقية بس من الـstatus الفعلي — مفيش حالة "Interview" أو "Under
 * Review" منفصلة، لأنها مش موجودة في الداتا فعليًا */
function StatusTracker({ status }: { status: "pending" | "approved" }) {
  const currentIndex = status === "approved" ? 2 : 1;
  const doneUpTo = status === "approved" ? 2 : 0;
  return (
    <div className="flex items-center">
      {TRACKER_STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[.78rem] font-extrabold ${
                i <= currentIndex ? "border-primary bg-primary text-white" : "border-border bg-white text-slate-400"
              }`}
            >
              {i <= doneUpTo ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-[.74rem] font-bold ${i <= currentIndex ? "text-primary" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
          {i < TRACKER_STEPS.length - 1 && (
            <span className={`mx-1.5 h-0.5 flex-1 ${i < currentIndex ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export async function BecomeMentorContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/become-a-mentor");

  const application = await getMyMentorApplication();

  return (
    <>
    <main className="relative overflow-hidden bg-sugar-white pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[620px] px-7">
        <AppPageHeader
          title="تبقى مينتور"
          context="خلّصت تراك وعايز ترجّع تساعد اللي بعدك؟ ابعت طلبك وفريق COCR هيراجعه."
        />

        <Link
          href="/safety"
          className="mb-6 flex items-center gap-2.5 rounded-2xl border border-dashed border-primary/30 bg-blue-50 px-4 py-3 text-[.85rem] font-semibold text-primary transition-colors hover:border-primary/50"
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          طلبك هيتراجع من الفريق، وهنتواصل مع ولي أمرك للتأكيد قبل أي موافقة — اعرف تفاصيل أكتر عن إزاي بنحافظ على الأمان
        </Link>

        {application ? (
          <div className="rounded-3xl border border-border bg-white p-6">
            {application.status === "pending" || application.status === "approved" ? (
              <>
                <p className="mb-5 text-[1rem] font-extrabold">
                  {application.status === "approved" ? "مبروك، طلبك اتوافق عليه! 🎉" : "طلبك اتبعت وقيد المراجعة"}
                </p>
                <StatusTracker status={application.status} />
                {application.status === "approved" && (
                  <Link href="/mentor" className="mt-5 inline-flex items-center gap-1.5 text-[.86rem] font-bold text-primary">
                    افتح مساحة المينتور ←
                  </Link>
                )}
              </>
            ) : (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[.78rem] font-bold ${STATUS_STYLE[application.status]}`}>
                {STATUS_LABEL[application.status]}
              </span>
            )}
            <p className="mt-4 text-[.9rem] text-muted-foreground">التراك: <b className="text-foreground">{application.track}</b></p>
            <p className="mt-2 text-[.9rem] leading-relaxed text-muted-foreground">{application.motivation}</p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[.82rem] text-muted-foreground">
              <span>{application.gender === "female" ? "بنت" : "ولد"} — {application.age} سنة</span>
              <span>{application.gender === "female" ? "هتعلّمي" : "هتعلّم"} سن {application.student_age_min}–{application.student_age_max}</span>
            </div>
            {application.notes && (
              <div className="mt-4 rounded-2xl bg-sand p-4">
                <p className="text-[.82rem] font-bold text-slate-600">ملاحظة من الفريق:</p>
                <p className="mt-1 text-[.88rem] text-muted-foreground">{application.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <MentorApplyForm />
        )}
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
