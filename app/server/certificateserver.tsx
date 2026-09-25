import Link from "next/link";
import { BadgeCheck, ShieldAlert, ShieldX, ExternalLink } from "lucide-react";
import { verifyCertificate } from "../actions/certificates_actions";
import { CertificateVerifySearch } from "../client/certificates_client";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

/** صفحة التحقق بدون كود — فورم بسيط، متاحة لأي حد من غير تسجيل دخول */
export function VerifySearchPageContent() {
  return (
    <>
      <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
        <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
        <div className="relative z-[2] mx-auto max-w-[560px] px-7">
          <AppPageHeader
            title="تحقّق من شهادة"
            context="أي حد يقدر يتأكد إن شهادة COCR حقيقية — من غير تسجيل دخول، بس محتاج رقم الشهادة."
          />
          <div className="rounded-2xl border border-border bg-white p-6">
            <CertificateVerifySearch />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** نتيجة التحقق من شهادة برقمها — عامة تمامًا، بدون تسجيل دخول */
export async function VerifyCertificateContent({ code }: { code: string }) {
  const cert = await verifyCertificate(code);

  return (
    <>
      <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
        <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
        <div className="relative z-[2] mx-auto max-w-[560px] px-7">
          <AppPageHeader title="تحقّق من شهادة" />

          {!cert && (
            <div className="rounded-2xl border border-border bg-white p-8 text-center">
              <ShieldX className="mx-auto mb-3 h-10 w-10 text-red-500" />
              <h2 className="mb-2 text-[1.1rem] font-extrabold">مفيش شهادة بالرقم ده</h2>
              <p className="mb-5 text-[.9rem] text-muted-foreground">
                تأكّد إنك ناسخ رقم الشهادة صح، أو جرّب تاني تحت.
              </p>
              <CertificateVerifySearch />
            </div>
          )}

          {cert && (
            <div className="overflow-hidden rounded-2xl border border-border bg-white">
              <div
                className={`flex items-center gap-2 px-6 py-4 text-[.9rem] font-extrabold text-white ${
                  cert.status === "active" ? "bg-green" : "bg-red-600"
                }`}
              >
                {cert.status === "active" ? (
                  <>
                    <BadgeCheck className="h-5 w-5" /> شهادة سارية ومتحقّق منها
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5" /> الشهادة دي اتلغت
                  </>
                )}
              </div>

              <div className="flex flex-col gap-4 p-7">
                <div>
                  <span className="mb-1 block text-[.75rem] font-bold text-slate-400">اسم الطالب</span>
                  <p className="text-[1.15rem] font-extrabold">{cert.student_display_name ?? "—"}</p>
                </div>
                <div>
                  <span className="mb-1 block text-[.75rem] font-bold text-slate-400">الكورس</span>
                  <p className="text-[1.05rem] font-bold">{cert.course_title}</p>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <div>
                    <span className="mb-1 block text-[.75rem] font-bold text-slate-400">تاريخ الإصدار</span>
                    <p className="font-semibold">{fmt(cert.issued_at)}</p>
                  </div>
                  <div>
                    <span className="mb-1 block text-[.75rem] font-bold text-slate-400">رقم الشهادة</span>
                    <p dir="ltr" className="text-left font-mono text-[.9rem] font-semibold">{cert.certificate_number}</p>
                  </div>
                </div>

                {cert.status === "revoked" && cert.revoked_at && (
                  <p className="rounded-lg bg-red-50 px-4 py-3 text-[.85rem] font-semibold text-red-700">
                    اتلغت في {fmt(cert.revoked_at)}. الشهادة دي متبقاش دليل صالح على إتمام الكورس.
                  </p>
                )}

                {cert.project_id && cert.project_title && (
                  <Link
                    href={`/projects/${cert.project_id}`}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-[.9rem] font-bold text-primary transition-colors hover:bg-cream"
                  >
                    <span>مشروع التخرّج الموثّق: {cert.project_title}</span>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
