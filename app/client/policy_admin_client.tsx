"use client";

import * as React from "react";
import { updatePolicyContent, type PolicyDocument } from "../actions/policy_actions";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gold-50 text-gold-600",
  published: "bg-green-50 text-green",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  published: "منشورة",
};

export function PolicyEditorForm({ policy }: { policy: PolicyDocument }) {
  const [title, setTitle] = React.useState(policy.title);
  const [content, setContent] = React.useState(policy.content);
  const [status, setStatus] = React.useState(policy.status);
  const [version, setVersion] = React.useState(policy.version);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<"draft" | "published" | null>(null);

  const save = (publish: boolean) => {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const res = await updatePolicyContent(policy.slug, title, content, publish);
      if (res.error) { setError(res.error); return; }
      if (publish && status !== "published") setVersion((v) => v + 1);
      setStatus(publish ? "published" : "draft");
      setSaved(publish ? "published" : "draft");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-3 py-1 text-[.76rem] font-bold", STATUS_STYLE[status])}>
          {STATUS_LABEL[status]}
        </span>
        <span className="text-[.8rem] text-muted-foreground">نسخة {version}</span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">العنوان</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[.85rem] font-bold text-slate-600">المحتوى</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          placeholder="نص السياسة..."
          className="rounded-xl border border-border p-3 font-mono text-[.85rem] leading-relaxed outline-none focus:border-primary"
        />
      </label>

      {error && <p className="text-[.85rem] font-semibold text-destructive">{error}</p>}
      {saved && (
        <p className="text-[.85rem] font-semibold text-green">
          {saved === "published" ? "اتنشرت." : "اتحفظت كمسودة."}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => save(true)}
          className="rounded-xl bg-primary px-5 py-2.5 text-[.88rem] font-extrabold text-white disabled:opacity-60"
        >
          {pending ? "بيتحفظ..." : "انشر"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save(false)}
          className="rounded-xl border border-border px-5 py-2.5 text-[.88rem] font-bold text-slate-600 disabled:opacity-60"
        >
          احفظ كمسودة
        </button>
      </div>
    </div>
  );
}
