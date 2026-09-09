import { redirect } from "next/navigation";
import { ProfileClient } from "../client/profile_client";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function ProfilePageContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/profile");

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "طالب COCR";

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-10 max-w-[38em]">
          <span className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
            الملف الشخصي
          </span>
          <h1 className="mb-4 text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold leading-tight tracking-tight">
            بياناتك
          </h1>
        </div>

        <ProfileClient name={name} email={user.email ?? ""} />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
