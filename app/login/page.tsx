"use client";

import * as React from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import GoogleLoginButton from "@/components/homecomponent/auth/client";
import { signInWithEmail, type AuthActionResult } from "@/components/homecomponent/auth/actions";

const initialState: AuthActionResult = { error: null };

export default function LoginPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [state, formAction, pending] = useActionState(signInWithEmail, initialState);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#F7F2E8] to-cream px-6 py-12">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] w-full max-w-[440px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3 font-display text-[1.3rem] font-extrabold tracking-tight">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-gradient-to-br from-[#2E58DE] to-[#16349B]">
            <Icon3D name="logo" className="h-[22px] w-[22px]" />
          </span>
          COCR
        </Link>

        <div className="rounded-[26px] border border-border bg-white p-8 shadow-[0_20px_50px_-20px_rgba(22,24,31,.25)]">
          <h1 className="mb-1.5 text-center text-[1.4rem] font-extrabold">أهلًا بيك تاني</h1>
          <p className="mb-6 text-center text-[.88rem] text-muted-foreground">سجّل دخولك وكمّل من فين ما وقفت.</p>

          <GoogleLoginButton />

          <div className="my-5 flex items-center gap-3 text-[.78rem] text-slate-400">
            <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
          </div>

          <form action={formAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col gap-1.5">
              <span className="text-[.84rem] font-bold text-slate-600">البريد الإلكتروني</span>
              <Input name="email" type="email" placeholder="name@example.com" dir="ltr" className="h-11 rounded-xl" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[.84rem] font-bold text-slate-600">كلمة السر</span>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  className="h-11 rounded-xl pe-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
                  className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {state.error && <p className="text-[.82rem] font-semibold text-destructive">{state.error}</p>}

            <Button type="submit" disabled={pending} size="lg" className="mt-2 h-12 rounded-xl text-[1rem]">
              {pending ? "لحظة..." : "دخول"}
            </Button>
          </form>

          <p className="mt-6 text-center text-[.86rem] text-muted-foreground">
            لسه معملتش حساب؟{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">أنشئ حسابك</Link>
          </p>
        </div>

        <Link href="/" className="mt-6 flex items-center justify-center gap-2 text-[.86rem] font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rotate-180" /> رجوع للرئيسية
        </Link>
      </div>
    </main>
  );
}
