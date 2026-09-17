import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { MentorApplyForm } from "../client/mentor_apply_client";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";
import { Check, ShieldCheck } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending: "طلبك قيد المراجعة",
  approved: "مبروك، طلبك اتوافق عليه!",
  rejected: "طلبك اتفض دلوقتي",
  suspended: "حساب المينتور بتاعك متعلّق دلوقتي",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-50 text-gold-600",
  approved: "bg-green-50 text-green",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-destructive/10 text-destructive",
};

export async function BecomeMentorContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/become-a-mentor");

  const application = await getMyMentorApplication();

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
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
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[.78rem] font-bold ${STATUS_STYLE[application.status]}`}>
              {application.status === "approved" && <Check className="h-3.5 w-3.5" />}
              {STATUS_LABEL[application.status]}
            </span>
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
