'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signInWithGoogle() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const headerList = await headers();
  const origin = headerList.get('origin');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Error logging in with Google:', error);
    return;
  }

  if (data.url) {
    redirect(data.url); // إعادة توجيه المستخدم لصفحة تسجيل الدخول الخاصة بـ Google
  }
}