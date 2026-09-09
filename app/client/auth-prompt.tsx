"use client";

import Link from "next/link";
import { Sprout } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

/**
 * بوابة تسجيل موحّدة — "استكشف الأول، شارك بعد التسجيل": بتظهر لما زائر يحاول
 * يعمل فعل شخصي (حفظ/بدء/تسجيل...) من غير ما يقفل التصفّح العادي خالص.
 */
export function AuthPrompt({
  open, onOpenChange, title, description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="mb-1 grid h-12 w-12 place-items-center rounded-full bg-blue-tint text-primary">
          <Sprout className="h-6 w-6" />
        </div>
        <DialogHeader className="text-start">
          <DialogTitle className="text-[1.1rem] font-extrabold">{title}</DialogTitle>
          <DialogDescription className="text-[.9rem] leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Link
            href="/login"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-border text-[.9rem] font-bold text-foreground hover:border-slate-400"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/register"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-primary text-[.9rem] font-extrabold text-white"
          >
            أنشئ حساب
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
