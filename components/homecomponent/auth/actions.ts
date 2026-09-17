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
  needsConfirmation?: boolean;
}

export async function signUpWithEmail(
  _prev: AuthActionResult, formData: FormData,
): Promise<AuthActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const termsAccepted = formData.get('termsAccepted') === 'on';

  if (name.length < 2) return { error: 'اكتب اسمك بالكامل.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'اكتب بريد إلكتروني صحيح.' };
  if (password.length < 6) return { error: 'كلمة السر لازم تكون 6 حروف/أرقام على الأقل.' };
  if (!termsAccepted) return { error: 'لازم توافق على سياسة الخصوصية وشروط الاستخدام عشان تكمل.' };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // full_name: بيتقرا في أماكن تانية في الفرونت (navbar، تحية الداشبورد).
    // display_name: ده اللي الـ trigger الحقيقي (handle_new_user) بيقراه
    // فعليًا عشان يعمل profiles.display_name — من غيره كان بيفضل فاضي.
    options: { data: { full_name: name, display_name: name } },
  });

  if (error) {
    // رسالة عربية بسيطة بدل رسالة Supabase التقنية
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'الإيميل ده متسجّل بحساب قبل كده — جرّب تسجّل دخولك.' };
    }
    return { error: 'حصل خطأ، جرّب تاني بعد شوية.' };
  }

  // لو الأكونت محتاج تأكيد إيميل، Supabase مش بيرجّع سيشن فعلية دلوقتي —
  // مفيش auth.uid() نقدر نسجّل بيه الموافقة على السياسات دلوقتي
  if (!data.session) {
    return { error: null, needsConfirmation: true };
  }

  // دليل حقيقي إن المستخدم وافق على السياسات وقت التسجيل، مش بس checkbox فاضي
  if (data.user) {
    await supabase.from('policy_acceptances').insert([
      { user_id: data.user.id, policy_slug: 'terms-of-use', policy_version: 1 },
      { user_id: data.user.id, policy_slug: 'privacy-policy', policy_version: 1 },
    ]);
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
