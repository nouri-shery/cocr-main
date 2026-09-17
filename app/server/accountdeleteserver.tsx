import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getMyDeletionRequest } from "../actions/account_actions";
import { DeletionRequestForm } from "../client/account_delete_client";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

const STATUS_LABEL: Record<string, string> = {
  pending: "طلبك قيد المعالجة",
  completed: "تم حذف الحساب",
  cancelled: "الطلب اتلغى",
};

export async function AccountDeleteContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/account/delete");

  const request = await getMyDeletionRequest();

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[560px] px-7">
        <AppPageHeader
          title="حذف الحساب"
          context="طلب حذف حسابك من COCR — بيتعالج من الفريق، مش فوري."
        />

        {request && request.status === "pending" ? (
          <div className="rounded-3xl border border-border bg-white p-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-3 py-1.5 text-[.78rem] font-bold text-gold-600">
              {STATUS_LABEL[request.status]}
            </span>
            <p className="mt-3 text-[.88rem] text-muted-foreground">هنتواصل معاكي قريب لإتمام الإجراء.</p>
          </div>
        ) : (
          <DeletionRequestForm />
        )}
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
