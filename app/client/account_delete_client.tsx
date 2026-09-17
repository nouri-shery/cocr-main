"use client";

import * as React from "react";
import { requestAccountDeletion } from "../actions/account_actions";

export function DeletionRequestForm() {
  const [reason, setReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await requestAccountDeletion(reason);
      if (res.error) { setError(res.error); return; }
      setSent(true);
    });
  };

  if (sent) {
    return (
      <div className="rounded-3xl border border-border bg-white p-6 text-center">
        <p className="text-[1rem] font-extrabold">استلمنا طلبك</p>
        <p className="mt-2 text-[.9rem] text-muted-foreground">فريق COCR هيتواصل معاكي ويعالج الطلب — مش حذف فوري.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-white p-6">
      <label className="flex flex-col gap-1.5">
        <span className="text-[.88rem] font-bold text-slate-600">ليه عايزة تمسحي حسابك؟ (اختياري)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
        />
      </label>
      {error && <p className="text-[.85rem] font-semibold text-destructive">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="self-start rounded-xl bg-destructive px-5 py-2.5 text-[.9rem] font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "بيتبعت..." : "ابعتي طلب حذف الحساب"}
      </button>
    </div>
  );
}
