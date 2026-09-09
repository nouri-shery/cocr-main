import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * الصفحات دي بتاعة الطالب بس — لازم تسجيل دخول حقيقي. أي حاجة تانية (الهوم،
 * الكورسات، الفرص، قصتنا...) مفتوحة للزوار زي ما هي، زي قاعدة "استكشف الأول،
 * شارك بعد التسجيل" اللي اتفقنا عليها.
 */
const PROTECTED_PREFIXES = [
  "/dashboard", "/saved", "/profile", "/settings", "/progress", "/my-journey",
  "/onboarding", "/opportunities/submit",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  if (!supabaseUrl || !supabaseKey) {
    // مفيش مشروع Supabase حقيقي متوصّل لسه — سيبها تعدّي عادي، الصفحات
    // المحمية هتتصرف بشكل مستقل (redirect للـ login) لو حاولت تدخلها.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
