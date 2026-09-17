import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, MapPin, Wifi, Building2, Users2, ExternalLink, Wallet, BadgeCheck, CalendarPlus } from "lucide-react";
import { OpportunitiesExplorer, ShareButton } from "../client/opportunities_client";
import { getOpportunities, getOpportunityCategories, getOpportunityById } from "../actions/opportunities_actions";
import { getMyProfile } from "../actions/profile_actions";
import { getDeadlineInfo } from "../lib/opportunity-deadline";
import { CATEGORY_LABELS } from "../lib/opportunity-categories";
import { INTERESTS, type InterestId } from "../lib/onboarding";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { Badge } from "@/components/ui/badge";
import type { OpportunityFormat, OpportunityListing } from "../types/types";

const ACCENT: Record<string, { bg: string; fg: string; dot: string }> = {
  blue: { bg: "#E9EEFC", fg: "#1E45C4", dot: "rgba(30,69,196,.2)" },
  gold: { bg: "#FBF1DC", fg: "#B8801F", dot: "rgba(184,128,31,.22)" },
  green: { bg: "#E6F3EB", fg: "#1E7A4E", dot: "rgba(30,122,78,.2)" },
  ink: { bg: "#E9E7E2", fg: "#3E403F", dot: "rgba(22,24,31,.16)" },
};

const FORMAT_LABEL: Record<OpportunityFormat, string> = {
  online: "أونلاين",
  offline: "حضوري",
  hybrid: "مختلط",
};

const FORMAT_ICON: Record<OpportunityFormat, React.ElementType> = {
  online: Wifi,
  offline: Building2,
  hybrid: Users2,
};

const URGENCY_STYLE: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  soon: "bg-gold-50 text-gold-600",
  normal: "bg-blue-tint text-primary",
  open: "bg-green-50 text-green",
  closed: "bg-muted text-muted-foreground",
};

function formatAgeLabel(o: OpportunityListing) {
  if (o.ageNote) return o.ageNote;
  if (o.ageMin != null && o.ageMax != null) return `${o.ageMin}–${o.ageMax} سنة`;
  return "حسب شروط الجهة";
}

function isoDatePlusOneDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
}

function googleCalendarUrl(o: OpportunityListing) {
  if (!o.deadline) return null;
  const date = o.deadline.replace(/-/g, "");
  const end = isoDatePlusOneDay(o.deadline);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `ديدلاين: ${o.title}`,
    dates: `${date}/${end}`,
    details: `تذكير من COCR — آخر موعد للتقديم على ${o.title}. رابط التقديم: ${o.officialLink}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const VALID_INTEREST_IDS = new Set(INTERESTS.map((i) => i.id));

export async function OpportunitiesPageContent() {
  const [opportunities, categories, user] = await Promise.all([
    getOpportunities(),
    getOpportunityCategories(),
    getCurrentUser().catch(() => null),
  ]);
  const profile = user ? await getMyProfile() : null;
  const myInterests = (profile?.interests ?? []).filter((i): i is InterestId => VALID_INTEREST_IDS.has(i as InterestId));

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <AppPageHeader
          title="المنح والفرص والتطوع"
          context="مسابقات ومنح مناسبة لسنك — بدل ما تدوّر لوحدك وتلاقي الديدلاين فات."
        />

        <OpportunitiesExplorer
          initialOpportunities={opportunities}
          categories={categories}
          isAuthenticated={!!user}
          myInterests={myInterests}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

export async function OpportunityDetailContent({ id }: { id: string }) {
  const opportunity = await getOpportunityById(id);
  if (!opportunity) notFound();

  const a = ACCENT[opportunity.accent];
  const deadlineInfo = opportunity.deadlineNote
    ? { label: opportunity.deadlineNote, urgency: "normal" as const }
    : getDeadlineInfo(opportunity.deadline);
  const FormatIcon = FORMAT_ICON[opportunity.format];
  const calendarUrl = googleCalendarUrl(opportunity);

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[820px] px-7">
        <Link href="/opportunities" className="mb-8 inline-flex items-center gap-2 text-[.9rem] font-bold text-primary">
          <ArrowRight className="h-4 w-4" /> رجوع لكل الفرص
        </Link>

        <div className="overflow-hidden rounded-3xl border border-border bg-white">
          {/* شريط علوي وظيفي بدل البلوك الزخرفي — الديدلاين والتصنيف حقيقيين وواضحين فورًا */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-[24px] py-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: a.bg }}>
              <Icon3D name={opportunity.icon} className="h-6 w-6" />
            </span>
            <Badge variant="outline" style={{ color: a.fg, borderColor: a.fg }}>
              {CATEGORY_LABELS[opportunity.category]}
            </Badge>
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[.78rem] font-extrabold ${URGENCY_STYLE[deadlineInfo.urgency]}`}>
              <Clock className="h-3.5 w-3.5" /> {deadlineInfo.label}
            </span>
          </div>

          <div className="flex flex-col gap-4 p-[28px]">
            <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-tight">{opportunity.title}</h1>
            <p className="text-[.95rem] font-bold text-slate-500">{opportunity.organization}</p>
            <p className="text-[1rem] leading-[1.9] text-muted-foreground">{opportunity.description}</p>

            <div className="flex flex-wrap gap-2">
              {opportunity.free && <Badge variant="outline" className="border-green/30 text-green">مجاني</Badge>}
              {opportunity.financialAid && (
                <Badge variant="outline" className="border-gold/40 text-gold-600">
                  <Wallet className="me-1 h-3 w-3" /> دعم مالي متاح
                </Badge>
              )}
              <Badge variant="outline" className="text-slate-500">{formatAgeLabel(opportunity)}</Badge>
              {opportunity.verified && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <BadgeCheck className="me-1 h-3 w-3" /> مصدر موثّق
                </Badge>
              )}
              {opportunity.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-slate-500">{t}</Badge>
              ))}
            </div>

            {opportunity.duration && (
              <p className="text-[.9rem] font-semibold text-slate-500">المدة: {opportunity.duration}</p>
            )}

            <div className="grid gap-3 rounded-2xl border border-dashed border-border p-4 sm:grid-cols-2">
              <span className="flex items-center gap-2 text-[.9rem] font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4" style={{ color: a.fg }} /> {opportunity.location}
              </span>
              <span className="flex items-center gap-2 text-[.9rem] font-semibold text-muted-foreground">
                <FormatIcon className="h-4 w-4" style={{ color: a.fg }} /> {FORMAT_LABEL[opportunity.format]}
              </span>
            </div>

            <div>
              <h2 className="mb-2 text-[1rem] font-extrabold">شروط الأهلية</h2>
              <ul className="list-inside list-disc space-y-1.5 text-[.92rem] text-muted-foreground">
                {opportunity.eligibility.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Link
                href={opportunity.officialLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl text-[.95rem] font-extrabold text-white"
                style={{ background: a.fg }}
              >
                قدّم دلوقتي على الموقع الرسمي <ExternalLink className="h-4 w-4" />
              </Link>
              {calendarUrl && (
                <Link
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-border px-5 text-[.9rem] font-bold text-slate-600"
                >
                  <CalendarPlus className="h-4 w-4" /> فكّرني بالديدلاين
                </Link>
              )}
              <ShareButton title={opportunity.title} />
            </div>

            <p className="text-[.76rem] text-slate-400">
              البيانات دي تجريبية للـ MVP — راجع تفاصيل الديدلاين والأهلية من الموقع الرسمي قبل التقديم.
            </p>
          </div>
        </div>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
