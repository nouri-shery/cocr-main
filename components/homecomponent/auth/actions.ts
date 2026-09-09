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

export interface AuthActionResult {
  error: string | null;
}

export async function signUpWithEmail(
  _prev: AuthActionResult, formData: FormData,
): Promise<AuthActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (name.length < 2) return { error: 'اكتب اسمك بالكامل.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'اكتب بريد إلكتروني صحيح.' };
  if (password.length < 6) return { error: 'كلمة السر لازم تكون 6 حروف/أرقام على الأقل.' };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    // رسالة عربية بسيطة بدل رسالة Supabase التقنية
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'الإيميل ده متسجّل بحساب قبل كده — جرّب تسجّل دخولك.' };
    }
    return { error: 'حصل خطأ، جرّب تاني بعد شوية.' };
  }

  redirect('/onboarding');
}

export async function signInWithEmail(
  _prev: AuthActionResult, formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 1) {
    return { error: 'اكتب بريد إلكتروني وكلمة سر صحيحين.' };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'الإيميل أو كلمة السر غلط.' };
  }

  const next = String(formData.get('next') ?? '') || '/dashboard';
  redirect(next);
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect('/');
}
