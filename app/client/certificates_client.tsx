"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/** فورم بسيط للتحقق من شهادة برقمها — بيوجّه لـ /verify/[code]، نفس
 * منطق صفحة التحقق العامة بتاعت freeCodeCamp/ALX (كود تعرفه = تتأكد بيه) */
export function CertificateVerifySearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    router.push(`/verify/${encodeURIComponent(code)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="مثال: COCR-2026-A1B2C3D4E5"
        dir="ltr"
        className="min-h-[52px] flex-1 rounded-xl border border-border bg-white px-4 text-[.95rem] font-semibold tracking-wide text-foreground placeholder:text-slate-400 focus:border-primary focus:outline-none"
      />
      <button
        type="submit"
        className="flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[.95rem] font-extrabold text-white transition-transform hover:-translate-y-0.5"
      >
        <Search className="h-4 w-4" /> تحقّق
      </button>
    </form>
  );
}
