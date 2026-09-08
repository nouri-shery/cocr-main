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
      onClick={handleLogin}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm font-medium"
    >
      <span>{isPending ? 'جاري التحويل...' : 'Sign in with Google'}</span>
    </button>
  );
}