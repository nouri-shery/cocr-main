"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { LogOut, Pencil, Lock } from "lucide-react";
import { signOut } from "@/components/homecomponent/auth/actions";
import { updateProfile, type ProfileActionResult } from "../actions/profile_actions";
import { getOnboarding, INTERESTS, STAGES, GOALS, type OnboardingData } from "../lib/onboarding";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { useSavedOpportunities } from "./opportunities_client";
import type { Course, Mentor, OpportunityListing } from "../types/types";

const initialState: ProfileActionResult = { error: null };

export function ProfileClient({
  name, email, bio, skills, startedCourses, mentorById, opportunities,
}: {
  name: string; email: string; bio: string; skills: string[];
  startedCourses: Course[]; mentorById: Record<string, Mentor>;
  opportunities: OpportunityListing[];
}) {
  const [onboarding, setOnboarding] = React.useState<OnboardingData | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const { saved } = useSavedOpportunities();

  React.useEffect(() => {
    setOnboarding(getOnboarding());
  }, []);

  const wasPending = React.useRef(false);
  React.useEffect(() => {
    if (wasPending.current && !pending && !state.error) setEditing(false);
    wasPending.current = pending;
  }, [pending, state.error]);

  const savedOpportunities = React.useMemo(
    () => opportunities.filter((o) => saved.includes(o.id)),
    [opportunities, saved],
  );

  const stageLabel = onboarding?.stage ? STAGES.find((s) => s.id === onboarding.stage)?.label : null;
  const goalLabel = onboarding?.goal ? GOALS.find((g) => g.id === onboarding.goal)?.label : null;
  const interestLabels = onboarding?.interests.map((i) => INTERESTS.find((x) => x.id === i)?.label).filter(Boolean) ?? [];

  return (
    <div className="grid gap-6 sm:grid-cols-[280px_1fr]">
      <div className="rounded-3xl border border-border bg-white p-6 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-blue-tint text-[1.7rem] font-extrabold text-primary">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <p className="text-[1.05rem] font-extrabold">{name}</p>
        <p className="mt-1 text-[.85rem] text-muted-foreground">{email}</p>

        <form
          action={signOut}
          className="mt-6"
          onSubmit={() => {
            // بيانات localStorage (مفتكرة/أونبوردينج) شخصية للجهاز مش للحساب —
            // لازم تتمسح عند تسجيل الخروج عشان ما تختلطش مع حساب تاني على نفس الجهاز
            try {
              window.localStorage.removeItem("cocr-saved-opportunities");
              window.localStorage.removeItem("cocr-onboarding");
            } catch {
              /* localStorage غير متاح — تسجيل الخروج يكمل عادي */
            }
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[.88rem] font-bold text-slate-600 hover:border-destructive/40 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-6">
        {/* نبذة ومهارات */}
        <div className="rounded-3xl border border-border bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[1.05rem] font-extrabold">نبذة ومهاراتك</h2>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-[.82rem] font-bold text-primary"
              >
                <Pencil className="h-3.5 w-3.5" /> تعديل
              </button>
            )}
          </div>

          {editing ? (
            <form action={formAction} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[.84rem] font-bold text-slate-600">نبذة عنك</span>
                <textarea
                  name="bio"
                  defaultValue={bio}
                  maxLength={300}
                  rows={3}
                  placeholder="اكتب سطرين عن نفسك ومهتم بإيه..."
                  className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[.84rem] font-bold text-slate-600">مهاراتك (افصل بينهم بفاصلة)</span>
                <input
                  name="skills"
                  defaultValue={skills.join(", ")}
                  placeholder="مثال: HTML, CSS, تصميم شعارات"
                  className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
                />
              </label>
              {state.error && <p className="text-[.82rem] font-semibold text-destructive">{state.error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-primary px-5 py-2 text-[.88rem] font-extrabold text-white disabled:opacity-60"
                >
                  {pending ? "لحظة..." : "احفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-border px-5 py-2 text-[.88rem] font-bold text-slate-600"
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[.92rem] leading-relaxed text-muted-foreground">
                {bio || "لسه معملتش نبذة عن نفسك — دوس تعديل وضيف سطرين."}
              </p>
              <div className="flex flex-wrap gap-2">
                {skills.length > 0
                  ? skills.map((s) => (
                      <span key={s} className="rounded-full bg-blue-tint px-3 py-1 text-[.8rem] font-bold text-primary">{s}</span>
                    ))
                  : <span className="text-[.85rem] text-muted-foreground">لسه مضفتش مهارات.</span>}
              </div>
            </div>
          )}
        </div>

        {/* بيانات الأونبوردينج */}
        <div className="rounded-3xl border border-border bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[1.05rem] font-extrabold">بياناتك في الأونبوردينج</h2>
            <Link href="/onboarding" className="flex items-center gap-1 text-[.82rem] font-bold text-primary">
              <Pencil className="h-3.5 w-3.5" /> تعديل
            </Link>
          </div>

          {!onboarding ? (
            <p className="text-[.9rem] text-muted-foreground">
              لسه معملتش الأونبوردينج.{" "}
              <Link href="/onboarding" className="font-bold text-primary underline">
                اعمله دلوقتي
              </Link>{" "}
              عشان نرشّحلك أدق.
            </p>
          ) : (
            <dl className="grid gap-4 text-[.9rem]">
              <div>
                <dt className="mb-1 font-bold text-muted-foreground">المرحلة الدراسية</dt>
                <dd className="font-extrabold">{stageLabel ?? "—"}</dd>
              </div>
              <div>
                <dt className="mb-1 font-bold text-muted-foreground">اهتماماتك</dt>
                <dd className="flex flex-wrap gap-2">
                  {interestLabels.length > 0
                    ? interestLabels.map((l) => (
                        <span key={l} className="rounded-full bg-blue-tint px-3 py-1 text-[.8rem] font-bold text-primary">{l}</span>
                      ))
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="mb-1 font-bold text-muted-foreground">هدفك</dt>
                <dd className="font-extrabold">{goalLabel ?? "—"}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* كورساتك */}
        <div className="rounded-3xl border border-border bg-white p-6">
          <h2 className="mb-5 text-[1.05rem] font-extrabold">كورساتك</h2>
          {startedCourses.length === 0 ? (
            <p className="text-[.9rem] text-muted-foreground">
              لسه مبدأتش كورس. <Link href="/courses" className="font-bold text-primary underline">استكشف الكورسات</Link>
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {startedCourses.map((c) => (
                <Link key={c.id} href={c.href} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/40">
                  <Icon3D name={c.icon} className="h-8 w-8" />
                  <div>
                    <p className="text-[.88rem] font-extrabold">{c.title}</p>
                    <p className="text-[.76rem] text-muted-foreground">{mentorById[c.mentorId]?.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* الفرص المحفوظة */}
        <div className="rounded-3xl border border-border bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[1.05rem] font-extrabold">الفرص المحفوظة</h2>
            {savedOpportunities.length > 0 && (
              <Link href="/saved" className="text-[.82rem] font-bold text-primary">شوف الكل</Link>
            )}
          </div>
          {savedOpportunities.length === 0 ? (
            <p className="text-[.9rem] text-muted-foreground">
              لسه محفظتش أي فرصة. <Link href="/opportunities" className="font-bold text-primary underline">استكشف الفرص</Link>
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {savedOpportunities.slice(0, 4).map((o) => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/40">
                  <Icon3D name={o.icon} className="h-8 w-8" />
                  <div>
                    <p className="text-[.88rem] font-extrabold">{o.title}</p>
                    <p className="text-[.76rem] text-muted-foreground">{o.organization}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* مشاريعك — قريبًا */}
        <div className="rounded-3xl border border-border bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[1.05rem] font-extrabold">مشاريعك</h2>
            <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[.72rem] font-bold text-muted-foreground">
              <Lock className="h-3 w-3" /> قريبًا
            </span>
          </div>
          <p className="text-[.88rem] text-muted-foreground">
            نظام رفع ومشاركة المشاريع لسه في الطريق — هيظهر هنا أول ما يبقى جاهز.
          </p>
        </div>
      </div>
    </div>
  );
}
