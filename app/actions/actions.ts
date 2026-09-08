'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function changeLocale(newLocale: string) {
  const cookieStore = await cookies();
  
  cookieStore.set('locale', newLocale, {
    path: '/',
    maxAge: 31536000, // 1 year
    sameSite: 'lax',
  });

  revalidatePath('/');
}

