"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import {
  LogOut, Pencil, GraduationCap, Check, BookOpen, Hammer, MessageSquare,
  User, Trophy, Calendar, Clock,
} from "lucide-react";
import { signOut } from "@/components/homecomponent/auth/actions";
import { updateProfile, setAvatarChoice, type ProfileActionResult } from "../actions/profile_actions";
import { INTERESTS, STAGES, GOALS, type InterestId, type StageId, type GoalId } from "../lib/onboarding";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { JourneyFull, computeJourney, type JourneySignals } from "./journey_client";
import { AVATARS, resolveAvatarSrc } from "../lib/avatar-gallery";
import type { Course, Mentor, OpportunityListing } from "../types/types";
import type { Project, RecentFeedback } from "../actions/projects_actions";
import type { CourseProgress } from "../actions/lessons_actions";

const initialState: ProfileActionResult = { error: null };

export interface ActivityEvent {
  date: string;
  label: string;
  href: string;
}

export interface UpcomingSessionItem {
  id: string;
  title: string;
  courseTitle: string;
  scheduledAt: string;
  zoomLink: string | null;
}

const TABS = [
  { id: "info", label: "معلوماتي", icon: User },
  { id: "achievements", label: "إنجازاتي", icon: Trophy },
  { id: "courses", label: "كورساتي", icon: BookOpen },
  { id: "schedule", label: "جدولي", icon: Calendar },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** "عضو منذ" — حقيقي من auth.users.created_at، مفيش تقريب لأشهر وهمية */
function memberSinceLabel(iso: string): string {
  const start = new Date(iso);
  const months = Math.max(0, (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "عضو من أقل من شهر";
  if (months < 2) return "عضو منذ شهر";
  if (months < 12) return `عضو منذ ${Math.floor(months)} شهور`;
  const years = Math.floor(months / 12);
  return years === 1 ? "عضو منذ سنة" : `عضو منذ ${years} سنين`;
}

export function ProfileClient({
  name, email, bio, skills, stage, gender, userId, avatarId, interests, goal,
  startedCourses, progressByCourse, mentorById, projects, givenFeedback, givenFeedbackCount,
  savedOpportunities, upcomingSessions, memberSince, journeySignals, activity, isApprovedMentor,
}: {
  name: string; email: string; bio: string; skills: string[];
  stage: string | null; gender: "male" | "female" | null; userId: string; avatarId: string | null;
  interests: string[]; goal: string | null;
  startedCourses: Course[]; progressByCourse: Record<string, CourseProgress>;
  mentorById: Record<string, Mentor>;
  projects: Project[]; givenFeedback: RecentFeedback[]; givenFeedbackCount: number;
  savedOpportunities: OpportunityListing[];
  upcomingSessions: UpcomingSessionItem[];
  memberSince: string;
  journeySignals: JourneySignals;
  activity: ActivityEvent[];
  isApprovedMentor: boolean;
}) {
  const [tab, setTab] = React.useState<TabId>("info");
  const [editing, setEditing] = React.useState(false);
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [pickingAvatar, setPickingAvatar] = React.useState(false);
  const [avatarChoice, setAvatarChoiceLocal] = React.useState(avatarId);
  const [savingAvatar, setSavingAvatar] = React.useState(false);

  async function pickAvatar(id: string) {
    setAvatarChoiceLocal(id);
    setPickingAvatar(false);
    setSavingAvatar(true);
    await setAvatarChoice(id);
    setSavingAvatar(false);
  }

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
  const publishedCount = projects.filter((p) => p.status === "published").length;

  return (
    <div className="flex flex-col gap-6">
      {/* الهيرو — هويتك الحقيقية: أفاتار (لو حددت جنسك في الأونبوردينج)، اسمك، مرحلتك، وعضويتك */}
      <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-border bg-white p-7">
        <span aria-hidden className="animate-soft-pulse absolute -left-8 -top-8">
          <Icon3D name="path" className="h-36 w-36" />
        </span>
        <div className="relative z-[1] flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {gender || avatarChoice ? (
                <img
                  src={resolveAvatarSrc(userId, gender ?? "female", avatarChoice)}
                  alt=""
                  className={cn("h-20 w-20 rounded-full border-2 border-white shadow-sm", savingAvatar && "opacity-60")}
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-full bg-blue-tint text-[1.7rem] font-extrabold text-primary">
                  {name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => setPickingAvatar((v) => !v)}
                aria-label="غيّر صورتك الشخصية"
                className="absolute -bottom-1 -left-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-primary text-white shadow-sm transition-transform hover:scale-105"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              {pickingAvatar && (
                <div className="absolute top-full z-10 mt-2 w-72 rounded-2xl border border-border bg-white p-3 shadow-[0_20px_50px_-20px_rgba(22,24,31,.35)]">
                  <p className="mb-2 px-1 text-[.78rem] font-bold text-muted-foreground">اختار صورتك</p>
                  <div className="grid grid-cols-4 gap-2">
                    {AVATARS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => pickAvatar(a.id)}
                        className={cn(
                          "overflow-hidden rounded-full border-2 transition-all hover:scale-105",
                          avatarChoice === a.id ? "border-primary" : "border-transparent",
                        )}
                      >
                        <img src={a.src} alt="" className="h-14 w-14" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="text-[1.2rem] font-extrabold">{name}</p>
              <p className="text-[.84rem] text-muted-foreground">{email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-tint px-3 py-1 text-[.76rem] font-bold text-primary">
                  مرحلتك: {current.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[.76rem] font-bold text-slate-600">
                  <Clock className="h-3 w-3" /> {memberSinceLabel(memberSince)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={isApprovedMentor ? "/mentor" : "/become-a-mentor"}
              className="flex items-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 py-2.5 text-[.84rem] font-bold text-primary transition-colors hover:bg-blue-tint"
            >
              <GraduationCap className="h-4 w-4" /> {isApprovedMentor ? "مساحة المينتور" : "تبقى مينتور"}
            </Link>
            <form
              action={signOut}
              onSubmit={() => {
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
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[.84rem] font-bold text-slate-600 transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" /> تسجيل الخروج
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* أرقامك الحقيقية بس — مفيش ساعات تعلّم ولا streak، دول مش متتبَّعين فعليًا دلوقتي */}
      <div className="grid animate-fade-up grid-cols-2 gap-4 sm:grid-cols-4" style={{ animationDelay: "60ms" }}>
        <QuickStat icon={<BookOpen className="h-4.5 w-4.5" />} value={startedCourses.length} label="كورس بدأته" />
        <QuickStat icon={<Hammer className="h-4.5 w-4.5" />} value={publishedCount} label="مشروع منشور" />
        <QuickStat icon={<MessageSquare className="h-4.5 w-4.5" />} value={givenFeedbackCount} label="ملاحظة قدّمتها" />
        <QuickStat icon={<Trophy className="h-4.5 w-4.5" />} value={computeJourney(journeySignals).stages.filter((s) => s.achieved).length} label="مرحلة وصلتها" />
      </div>

      {/* تابات — كل تاب محتواه حقيقي بالكامل */}
      <div className="animate-fade-up flex flex-wrap gap-1 rounded-2xl border border-border bg-white p-1.5" style={{ animationDelay: "110ms" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                isActive
                  ? "flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[.84rem] font-extrabold text-white shadow-[0_10px_22px_-12px_rgba(30,69,196,.6)] transition-all"
                  : "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[.84rem] font-bold text-muted-foreground transition-all hover:bg-blue-50 hover:text-primary"
              }
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "info" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="نبذة ومهاراتك" action={!editing && (
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-[.82rem] font-bold text-primary">
                <Pencil className="h-3.5 w-3.5" /> تعديل
              </button>
            )}>
              {editing ? (
                <form action={formAction} className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[.84rem] font-bold text-slate-600">نبذة عنك</span>
                    <textarea
                      name="bio" defaultValue={bio} maxLength={300} rows={3}
                      placeholder="اكتب سطرين عن نفسك ومهتم بإيه..."
                      className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[.84rem] font-bold text-slate-600">مهاراتك (افصل بينهم بفاصلة)</span>
                    <input
                      name="skills" defaultValue={skills.join(", ")} placeholder="مثال: HTML, CSS, تصميم شعارات"
                      className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
                    />
                  </label>
                  {state.error && <p className="text-[.82rem] font-semibold text-destructive">{state.error}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={pending} className="rounded-xl bg-primary px-5 py-2 text-[.88rem] font-extrabold text-white disabled:opacity-60">
                      {pending ? "لحظة..." : "احفظ"}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-border px-5 py-2 text-[.88rem] font-bold text-slate-600">
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
                      ? skills.map((s) => <span key={s} className="rounded-full bg-blue-tint px-3 py-1 text-[.8rem] font-bold text-primary">{s}</span>)
                      : <span className="text-[.85rem] text-muted-foreground">لسه مضفتش مهارات.</span>}
                  </div>
                </div>
              )}
            </SectionCard>

            {!stageLabel && interestLabels.length === 0 && !goalLabel ? (
              <Link
                href="/onboarding"
                className="flex items-center justify-between gap-3 rounded-3xl border border-dashed border-border bg-white px-6 py-6 text-[.85rem] font-semibold text-muted-foreground transition-colors hover:border-primary/40"
              >
                كمّل بياناتك في الأونبوردينج عشان نرشّحلك أدق
                <span className="flex shrink-0 items-center gap-1 font-bold text-primary">اعمله دلوقتي <Pencil className="h-3.5 w-3.5" /></span>
              </Link>
            ) : (
              <SectionCard title="معلوماتي الشخصية" action={<Link href="/onboarding" className="flex items-center gap-1 text-[.82rem] font-bold text-primary"><Pencil className="h-3.5 w-3.5" /> تعديل</Link>}>
                <dl className="grid gap-4 text-[.9rem]">
                  <div>
                    <dt className="mb-1 font-bold text-muted-foreground">المرحلة الدراسية</dt>
                    <dd className="font-extrabold">{stageLabel ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 font-bold text-muted-foreground">اهتماماتك</dt>
                    <dd className="flex flex-wrap gap-2">
                      {interestLabels.length > 0
                        ? interestLabels.map((l) => <span key={l} className="rounded-full bg-blue-tint px-3 py-1 text-[.8rem] font-bold text-primary">{l}</span>)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 font-bold text-muted-foreground">هدفك</dt>
                    <dd className="font-extrabold">{goalLabel ?? "—"}</dd>
                  </div>
                </dl>
              </SectionCard>
            )}
          </div>

          {activity.length > 0 && (
            <SectionCard title="نشاطي الأخير">
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

          <div className="flex flex-col gap-1.5 text-[.78rem]">
            <Link href="/policies" className="text-muted-foreground hover:text-primary hover:underline">السياسات</Link>
            <Link href="/account/delete" className="text-muted-foreground hover:text-destructive hover:underline">حذف الحساب</Link>
          </div>
        </div>
      )}

      {tab === "achievements" && (
        <div className="flex flex-col gap-6">
          <SectionCard title="رحلتك">
            <JourneyFull signals={journeySignals} />
          </SectionCard>
          <SectionCard title="إنجازاتك">
            <AchievementBadges signals={journeySignals} />
          </SectionCard>
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
        </div>
      )}

      {tab === "courses" && (
        <div className="flex flex-col gap-6">
          <SectionCard title="بتتعلم" action={<Link href="/courses" className="text-[.82rem] font-bold text-primary">استكشف كورسات</Link>}>
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

          <SectionCard title="بتبني" action={<Link href="/projects/new" className="text-[.82rem] font-bold text-primary">+ مشروع جديد</Link>}>
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

          <SectionCard title="اكتشفي" action={savedOpportunities.length > 0 && <Link href="/saved" className="text-[.82rem] font-bold text-primary">شوف الكل</Link>}>
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
        </div>
      )}

      {tab === "schedule" && (
        <SectionCard title="جدولي">
          {upcomingSessions.length === 0 ? (
            <EmptyRow text="مفيش سيشنز مجدولة ليك دلوقتي." linkHref="/courses" linkLabel="استكشف الكورسات" />
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcomingSessions.map((s) => {
                const date = new Date(s.scheduledAt);
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-tint">
                      <Calendar className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[.88rem] font-extrabold">{s.title}</p>
                      <p className="truncate text-[.76rem] text-muted-foreground">{s.courseTitle}</p>
                    </div>
                    <span className="shrink-0 text-[.78rem] font-bold text-primary">
                      {date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "short" })} · {date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

function QuickStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.18)]">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-primary">{icon}</span>
      <p className="text-[1.4rem] font-extrabold">{value}</p>
      <p className="text-[.78rem] font-bold text-muted-foreground">{label}</p>
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
