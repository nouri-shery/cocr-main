"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { LogOut, Pencil, GraduationCap, Check } from "lucide-react";
import { signOut } from "@/components/homecomponent/auth/actions";
import { updateProfile, type ProfileActionResult } from "../actions/profile_actions";
import { INTERESTS, STAGES, GOALS, type InterestId, type StageId, type GoalId } from "../lib/onboarding";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { JourneyFull, computeJourney, type JourneySignals } from "./journey_client";
import type { Course, Mentor, OpportunityListing } from "../types/types";
import type { Project, RecentFeedback } from "../actions/projects_actions";
import type { CourseProgress } from "../actions/lessons_actions";

const initialState: ProfileActionResult = { error: null };

export interface ActivityEvent {
  date: string;
  label: string;
  href: string;
}

export function ProfileClient({
  name, email, bio, skills, stage, interests, goal,
  startedCourses, progressByCourse, mentorById, projects, givenFeedback,
  savedOpportunities, journeySignals, activity, isApprovedMentor,
}: {
  name: string; email: string; bio: string; skills: string[];
  stage: string | null; interests: string[]; goal: string | null;
  startedCourses: Course[]; progressByCourse: Record<string, CourseProgress>;
  mentorById: Record<string, Mentor>;
  projects: Project[]; givenFeedback: RecentFeedback[];
  savedOpportunities: OpportunityListing[];
  journeySignals: JourneySignals;
  activity: ActivityEvent[];
  isApprovedMentor: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  const wasPending = React.useRef(false);
  React.useEffect(() => {
    if (wasPending.current && !pending && !state.error) setEditing(false);
    wasPending.current = pending;
  }, [pending, state.error]);

  const stageLabel = stage ? STAGES.find((s) => s.id === (stage as StageId))?.label : null;
  const goalLabel = goal ? GOALS.find((g) => g.id === (goal as GoalId))?.label : null;
  const interestLabels = interests
    .map((i) => INTERESTS.find((x) => x.id === (i as InterestId))?.label)
    .filter((l): l is string => !!l);
  const { current } = computeJourney(journeySignals);

  return (
    <div className="flex flex-col gap-6">
      {/* الهيدر — هويتك: اسمك، مرحلتك الحالية، نبذتك ومهاراتك */}
      <div className="grid gap-6 sm:grid-cols-[280px_1fr]">
        <div className="rounded-3xl border border-border bg-white p-6 text-center">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-blue-tint text-[1.7rem] font-extrabold text-primary">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <p className="text-[1.05rem] font-extrabold">{name}</p>
          <p className="mt-1 text-[.85rem] text-muted-foreground">{email}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-tint px-3 py-1 text-[.78rem] font-bold text-primary">
            مرحلتك: {current.label}
          </span>

          <Link
            href={isApprovedMentor ? "/mentor/submissions" : "/become-a-mentor"}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 py-2.5 text-[.85rem] font-bold text-primary hover:bg-blue-tint"
          >
            <GraduationCap className="h-4 w-4" /> {isApprovedMentor ? "تسليمات طلابك" : "تبقى مينتور"}
          </Link>

          <form
            action={signOut}
            className="mt-6"
            onSubmit={() => {
              // "المحفوظة" بقت حقيقية على الحساب (saved_items) — بس فرص المتصفح
              // المؤقتة (لو أي حاجة قديمة فاضلة) بتتمسح عادي عند الخروج
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

          <div className="mt-4 flex flex-col gap-1.5 text-[.78rem]">
            <Link href="/policies" className="text-muted-foreground hover:text-primary hover:underline">السياسات</Link>
            <Link href="/account/delete" className="text-muted-foreground hover:text-destructive hover:underline">حذف الحساب</Link>
          </div>
        </div>

        <div className="flex flex-col gap-6">
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

          {/* بيانات الأونبوردينج — حقيقية على الحساب دلوقتي، مش localStorage */}
          {!stageLabel && interestLabels.length === 0 && !goalLabel ? (
            <Link
              href="/onboarding"
              className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-white px-5 py-3.5 text-[.85rem] font-semibold text-muted-foreground transition-colors hover:border-primary/40"
            >
              كمّل بياناتك في الأونبوردينج عشان نرشّحلك أدق
              <span className="flex shrink-0 items-center gap-1 font-bold text-primary">
                اعمله دلوقتي <Pencil className="h-3.5 w-3.5" />
              </span>
            </Link>
          ) : (
            <div className="rounded-3xl border border-border bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[1.05rem] font-extrabold">بياناتك في الأونبوردينج</h2>
                <Link href="/onboarding" className="flex items-center gap-1 text-[.82rem] font-bold text-primary">
                  <Pencil className="h-3.5 w-3.5" /> تعديل
                </Link>
              </div>

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
            </div>
          )}
        </div>
      </div>

      {/* رحلتك — نفس مكوّن الرحلة في الداشبورد */}
      <SectionCard title="رحلتك">
        <JourneyFull signals={journeySignals} />
      </SectionCard>

      {/* إنجازاتك — بادچات حقيقية من نفس مراحل الرحلة */}
      <SectionCard title="إنجازاتك">
        <AchievementBadges signals={journeySignals} />
      </SectionCard>

      {/* بتتعلم — كورساتك الحقيقية وتقدّمك فيها */}
      <SectionCard
        title="بتتعلم"
        action={<Link href="/courses" className="text-[.82rem] font-bold text-primary">استكشف كورسات</Link>}
      >
        {startedCourses.length === 0 ? (
          <EmptyRow text="لسه مبدأتش كورس." linkHref="/courses" linkLabel="استكشف الكورسات" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {startedCourses.map((c) => {
              const progress = progressByCourse[c.id];
              return (
                <Link key={c.id} href={c.href} className="flex flex-col gap-2 rounded-xl border border-border p-3 hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <Icon3D name={c.icon} className="h-8 w-8" />
                    <div>
                      <p className="text-[.88rem] font-extrabold">{c.title}</p>
                      <p className="text-[.76rem] text-muted-foreground">{mentorById[c.mentorId]?.name}</p>
                    </div>
                  </div>
                  {progress && progress.total > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[.74rem] font-bold text-slate-500">{progress.completed} من {progress.total} دروس</p>
                      <Progress value={Math.round((progress.completed / progress.total) * 100)} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* بتبني — مشاريعك، مسودّات ومنشورة */}
      <SectionCard
        title="بتبني"
        action={<Link href="/projects/new" className="text-[.82rem] font-bold text-primary">+ مشروع جديد</Link>}
      >
        {projects.length === 0 ? (
          <EmptyRow text="لسه معملتش مشروع." linkHref="/projects/new" linkLabel="أنشئ أول مشروع" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/40">
                <Icon3D name="hammer" className="h-8 w-8" />
                <div className="flex-1">
                  <p className="text-[.88rem] font-extrabold">{p.title}</p>
                  <p className="text-[.76rem] text-muted-foreground">{p.status === "published" ? "منشور" : "مسودّة"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {/* بتساهم — ملاحظات كتبتها لمشاريع طلاب تانيين */}
      <SectionCard title="بتساهم">
        {givenFeedback.length === 0 ? (
          <EmptyRow text="لسه معملتش مساهمة. سيبي ملاحظة على مشروع طالب تاني." linkHref="/projects" linkLabel="استكشفي المشاريع" />
        ) : (
          <div className="flex flex-col gap-3">
            {givenFeedback.map((f) => (
              <Link key={f.id} href={`/projects/${f.project.id}`} className="rounded-xl border border-border p-3 hover:border-primary/40">
                <p className="text-[.78rem] font-extrabold text-primary">{f.project.title}</p>
                <p className="mt-1 text-[.86rem] leading-relaxed">{f.body}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {/* اكتشفي — الفرص المحفوظة، حقيقية على الحساب دلوقتي */}
      <SectionCard
        title="اكتشفي"
        action={savedOpportunities.length > 0 && <Link href="/saved" className="text-[.82rem] font-bold text-primary">شوف الكل</Link>}
      >
        {savedOpportunities.length === 0 ? (
          <EmptyRow text="لسه محفظتش أي فرصة." linkHref="/opportunities" linkLabel="استكشف الفرص" />
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
      </SectionCard>

      {/* نشاطك — أحداث حقيقية مرتّبة بالتاريخ */}
      {activity.length > 0 && (
        <SectionCard title="نشاطك">
          <ul className="flex flex-col divide-y divide-border">
            {activity.map((e, i) => (
              <li key={i}>
                <Link href={e.href} className="flex items-center justify-between gap-3 py-3 text-[.86rem] hover:text-primary">
                  <span className="font-semibold">{e.label}</span>
                  <span className="shrink-0 text-[.76rem] text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function SectionCard({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[1.05rem] font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ text, linkHref, linkLabel }: { text: string; linkHref: string; linkLabel: string }) {
  return (
    <p className="text-[.9rem] text-muted-foreground">
      {text} <Link href={linkHref} className="font-bold text-primary underline">{linkLabel}</Link>
    </p>
  );
}

/** بادچات الإنجازات — نفس مراحل الرحلة (Journey)، بس معروضة كـ grid مضغوط.
 * كل بادچ إما اتحقّق فعليًا أو لسه — مفيش رقم مُلفَّق ولا قفل "قريبًا" عام */
function AchievementBadges({ signals }: { signals: JourneySignals }) {
  const { stages } = computeJourney(signals);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stages.map((s) => (
        <div
          key={s.id}
          className={cn(
            "flex flex-col items-center gap-2 rounded-2xl border px-3 py-5 text-center",
            s.achieved ? "border-primary/30 bg-blue-tint" : "border-dashed border-border opacity-60",
          )}
        >
          {s.achieved ? <Check className="h-7 w-7 text-primary" /> : <Icon3D name="build" className="h-7 w-7" />}
          <span className="text-[.78rem] font-bold text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
