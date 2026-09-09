'use client';

import { useTransition } from 'react';
import { signInWithGoogle } from './actions';

export default function GoogleLoginButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogin = () => {
    startTransition(async () => {
      await signInWithGoogle();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isPending}
      className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-white text-[.92rem] font-bold text-foreground transition-colors hover:border-slate-400 disabled:opacity-50"
    >
      {!isPending && (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.64v3.02h3.87c2.27-2.09 3.57-5.17 3.57-8.85z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.95-2.9l-3.87-3a7.2 7.2 0 0 1-4.08 1.14c-3.14 0-5.8-2.12-6.75-4.97H1.24v3.12A11.99 11.99 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.25 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.24a12 12 0 0 0 0 10.78z" />
          <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.43-3.43C17.94 1.19 15.23 0 12 0A11.99 11.99 0 0 0 1.24 6.61l4.01 3.12C6.2 6.87 8.86 4.75 12 4.75z" />
        </svg>
      )}
      {isPending ? "جاري التحويل..." : "التسجيل باستخدام Google"}
    </button>
  );
}