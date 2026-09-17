import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // حساب جديد فعلاً (اتعمل من ثواني، مش تسجيل دخول عادي) — نسجّل موافقة
      // ضمنية على السياسات وقت أول ظهور له، بدل ما نكرّرها كل مرة يدخل فيها
      const isNewSignup = data.user && Date.now() - new Date(data.user.created_at).getTime() < 60_000;
      if (isNewSignup && data.user) {
        await supabase.from('policy_acceptances').insert([
          { user_id: data.user.id, policy_slug: 'terms-of-use', policy_version: 1 },
          { user_id: data.user.id, policy_slug: 'privacy-policy', policy_version: 1 },
        ]);
      }
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // في حال حدث خطأ، يمكنك توجيهه لصفحة رئيسية أو صفحة خطأ
  return NextResponse.redirect(`${origin}/`);
}