"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { createReport, type ReportTargetType } from "../actions/reports_actions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

/** زرار وحوار إبلاغ قابل لإعادة الاستخدام — بيتحط على أي حاجة (مشروع،
 * مينتور، تسليم زميل) محتاجة تبليغ. هوية المبلّغ محمية بالكامل في الباك إند */
export function ReportButton({
  targetType, targetId, compact,
}: { targetType: ReportTargetType; targetId: string; compact?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createReport(targetType, targetId, reason, details);
      if (res.error) { setError(res.error); return; }
      setSent(true);
    });
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) { setTimeout(() => { setSent(false); setReason(""); setDetails(""); setError(null); }, 200); }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label="بلّغي عن المحتوى ده"
        className={compact
          ? "flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-destructive/10 hover:text-destructive"
          : "flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[.8rem] font-bold text-slate-500 hover:border-destructive/40 hover:text-destructive"}
      >
        <Flag className="h-3.5 w-3.5" /> {!compact && "إبلاغ"}
      </button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          {sent ? (
            <div className="py-6 text-center">
              <p className="text-[1rem] font-extrabold">تم إرسال البلاغ</p>
              <p className="mt-2 text-[.88rem] text-muted-foreground">فريق COCR هيراجعه، وهويتك كمُبلّغة محمية بالكامل.</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>الإبلاغ عن مشكلة</DialogTitle>
                <DialogDescription>احكيلنا إيه اللي حصل، وإحنا هنراجعه بسرّية تامة.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[.85rem] font-bold text-slate-600">سبب البلاغ</span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="مثال: محتوى غير مناسب"
                    className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[.85rem] font-bold text-slate-600">تفاصيل (اختياري)</span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
                  />
                </label>
                {error && <p className="text-[.85rem] font-semibold text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <button
                  type="button"
                  disabled={pending}
                  onClick={submit}
                  className="rounded-xl bg-destructive px-5 py-2.5 text-[.9rem] font-extrabold text-white disabled:opacity-60"
                >
                  {pending ? "بيتبعت..." : "ابعتي البلاغ"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
