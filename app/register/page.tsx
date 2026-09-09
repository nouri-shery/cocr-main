"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon3D } from "@/components/homecomponent/icon-sprite";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("اكتب اسمك بالكامل.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("اكتب بريد إلكتروني صحيح.");
    if (password.length < 6) return setError("كلمة السر لازم تكون 6 حروف/أرقام على الأقل.");
    setError("");
    setSubmitting(true);
    // ملاحظة: مفيش حساب حقيقي بيتعمل هنا لسه — لا الإيميل ولا كلمة السر بيتحفظوا
    // في أي مكان. الاسم بس بيتحفظ محليًا عشان نستخدمه في خطوة الأونبوردينج الجاية.
    window.localStorage.setItem("cocr-display-name", name.trim());
    router.push("/onboarding");
  };

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
          <h1 className="mb-1.5 text-center text-[1.4rem] font-extrabold">أنشئ حسابك</h1>
          <p className="mb-6 text-center text-[.88rem] text-muted-foreground">خطوة واحدة بسيطة، وبعدها نتعرف عليك أكتر.</p>

          <button
            type="button"
            className="mb-5 flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-white text-[.92rem] font-bold text-foreground transition-colors hover:border-slate-400"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.64v3.02h3.87c2.27-2.09 3.57-5.17 3.57-8.85z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.95-2.9l-3.87-3a7.2 7.2 0 0 1-4.08 1.14c-3.14 0-5.8-2.12-6.75-4.97H1.24v3.12A11.99 11.99 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.25 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.24a12 12 0 0 0 0 10.78z" />
              <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.43-3.43C17.94 1.19 15.23 0 12 0A11.99 11.99 0 0 0 1.24 6.61l4.01 3.12C6.2 6.87 8.86 4.75 12 4.75z" />
            </svg>
            التسجيل باستخدام Google
          </button>

          <div className="mb-5 flex items-center gap-3 text-[.78rem] text-slate-400">
            <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[.84rem] font-bold text-slate-600">الاسم بالكامل</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك زي ما تحب نناديك بيه" className="h-11 rounded-xl" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[.84rem] font-bold text-slate-600">البريد الإلكتروني</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" className="h-11 rounded-xl" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[.84rem] font-bold text-slate-600">كلمة السر</span>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 حروف/أرقام على الأقل"
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

            {error && <p className="text-[.82rem] font-semibold text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} size="lg" className="mt-2 h-12 rounded-xl text-[1rem]">
              أنشئ حسابك وابدأ رحلتك 🚀
            </Button>
          </form>

          <p className="mt-6 text-center text-[.86rem] text-muted-foreground">
            عندك حساب؟{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">سجّل دخولك</Link>
          </p>
        </div>

        <Link href="/" className="mt-6 flex items-center justify-center gap-2 text-[.86rem] font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rotate-180" /> رجوع للرئيسية
        </Link>
      </div>
    </main>
  );
}
