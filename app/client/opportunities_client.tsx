"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bookmark, BookmarkCheck, Search, MapPin, Wifi, Building2, Users2,
  ExternalLink, AlertTriangle, Clock, Share2, Check, ArrowUpDown,
  Wallet, BadgeCheck, CalendarPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { cn } from "@/lib/utils";
import { getDeadlineInfo, type DeadlineUrgency } from "../lib/opportunity-deadline";
import { CATEGORY_LABELS } from "../lib/opportunity-categories";
import { INTEREST_TO_OPPORTUNITY_CATEGORY, INTEREST_TAG_HINTS, type InterestId } from "../lib/onboarding";
import { getMySavedItemIds, toggleSavedItem } from "../actions/saved_actions";
import { AuthPrompt } from "./auth-prompt";
import type { OpportunityCategory, OpportunityFormat, OpportunityListing } from "../types/types";

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

function getDeadlineDisplay(o: OpportunityListing): { label: string; urgency: DeadlineUrgency } {
  if (o.deadlineNote) return { label: o.deadlineNote, urgency: "normal" };
  return getDeadlineInfo(o.deadline);
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

/** محفوظ حقيقي على الحساب (جدول saved_items) — مش localStorage، فبيفضل موجود
 * عبر أي جهاز أو متصفح، وشايفه الفريق لو احتاج. التحديث متفائل (optimistic)
 * عشان الزرار يستجيب فورًا، وبيرجع لحالته الأصلية لو الـ server action فشل */
export function useSavedOpportunities() {
  const [saved, setSaved] = React.useState<string[]>([]);

  React.useEffect(() => {
    getMySavedItemIds("opportunity").then(setSaved).catch(() => {});
  }, []);

  const toggle = React.useCallback((id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    toggleSavedItem("opportunity", id).then((res) => {
      if (res.error) {
        // فشل الحفظ فعليًا — نرجّع الحالة زي ما كانت قبل الضغطة
        setSaved((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
      }
    });
  }, []);

  return { saved, toggle };
}

type SortOption = "deadline-asc" | "deadline-desc" | "alpha";

const SORT_LABEL: Record<SortOption, string> = {
  "deadline-asc": "الأقرب ديدلاين",
  "deadline-desc": "الأبعد ديدلاين",
  alpha: "أبجديًا",
};

function sortOpportunities(list: OpportunityListing[], sort: SortOption) {
  const items = [...list];
  if (sort === "alpha") return items.sort((a, b) => a.title.localeCompare(b.title));
  return items.sort((a, b) => {
    if (a.deadline === null && b.deadline === null) return 0;
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;
    return sort === "deadline-asc" ? a.deadline.localeCompare(b.deadline) : b.deadline.localeCompare(a.deadline);
  });
}

interface OpportunitiesExplorerProps {
  initialOpportunities: OpportunityListing[];
  categories: { id: OpportunityCategory; label: string }[];
  isAuthenticated: boolean;
  /** اهتمامات المستخدم الحقيقية من profiles.interests (مش localStorage) —
   * فاضية لو مش مسجّل دخول أو لسه معملش أونبوردينج */
  myInterests: InterestId[];
}

export function OpportunitiesExplorer({ initialOpportunities, categories, isAuthenticated, myInterests }: OpportunitiesExplorerProps) {
  const [category, setCategory] = React.useState<OpportunityCategory>("all");
  const [format, setFormat] = React.useState<OpportunityFormat | "all">("all");
  const [query, setQuery] = React.useState("");
  const [savedOnly, setSavedOnly] = React.useState(false);
  const [sort, setSort] = React.useState<SortOption>("deadline-asc");
  const [sortOpen, setSortOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);
  const { saved, toggle } = useSavedOpportunities();

  const guardedToggle = (id: string) => {
    if (!isAuthenticated) { setAuthPromptOpen(true); return; }
    toggle(id);
  };

  const interestMatch = React.useMemo(() => {
    if (myInterests.length === 0) return null;
    return {
      categories: Array.from(new Set(myInterests.flatMap((i) => INTEREST_TO_OPPORTUNITY_CATEGORY[i]))),
      tags: Array.from(new Set(myInterests.flatMap((i) => INTEREST_TAG_HINTS[i]))),
    };
  }, [myInterests]);

  const recommendedOpportunities = React.useMemo(() => {
    if (!interestMatch) return [];
    return initialOpportunities
      .filter((o) => interestMatch.categories.includes(o.category) || o.tags.some((t) => interestMatch.tags.includes(t)))
      .slice(0, 3);
  }, [initialOpportunities, interestMatch]);

  const filtered = React.useMemo(() => {
    const matches = initialOpportunities.filter((o) => {
      const matchesCategory = category === "all" || o.category === category;
      const matchesFormat = format === "all" || o.format === format;
      const matchesQuery =
        query.trim().length === 0 ||
        o.title.includes(query.trim()) ||
        o.organization.includes(query.trim()) ||
        o.tags.some((t) => t.includes(query.trim()));
      const matchesSaved = !savedOnly || saved.includes(o.id);
      return matchesCategory && matchesFormat && matchesQuery && matchesSaved;
    });
    return sortOpportunities(matches, sort);
  }, [initialOpportunities, category, format, query, savedOnly, saved, sort]);

  const urgentCount = React.useMemo(
    () => initialOpportunities.filter((o) => getDeadlineDisplay(o).urgency === "urgent").length,
    [initialOpportunities],
  );

  const activeOpportunity = initialOpportunities.find((o) => o.id === activeId) ?? null;

  return (
    <div>
      {recommendedOpportunities.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-[1.15rem] font-extrabold">ترشيحات مخصصة ليك</h2>
            <span className="rounded-full bg-blue-tint px-3 py-1 text-[.72rem] font-bold text-primary">بناءً على اهتماماتك</span>
          </div>
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {recommendedOpportunities.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} saved={saved.includes(o.id)} onToggleSaved={() => guardedToggle(o.id)} onExpand={() => setActiveId(o.id)} />
            ))}
          </div>
        </section>
      )}

      {urgentCount > 0 && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-[#F0C4A6] bg-[#FBEEE4] px-4 py-3 text-[.88rem] font-semibold text-[#993C1D]">
          <AlertTriangle className="h-[18px] w-[18px] shrink-0" />
          {urgentCount === 1
            ? "فيه فرصة واحدة الديدلاين بتاعها قرّب أوي — بصّلها الأول."
            : `فيه ${urgentCount} فرص الديدلاين بتاعهم قرّب أوي — بصّلهم الأول.`}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="دور على فرصة، منظمة، أو مجال"
            className="h-11 rounded-full pe-9 ps-4"
          />
        </div>
        <button
          onClick={() => setSavedOnly((v) => !v)}
          aria-pressed={savedOnly}
          className={cn(
            "flex items-center gap-1.5 self-start rounded-full border px-4 py-2 text-[.84rem] font-bold transition-all lg:self-auto",
            savedOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-white text-slate-600 hover:border-slate-400",
          )}
        >
          {savedOnly ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          المحفوظة {saved.length > 0 && `(${saved.length})`}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[.8rem] font-semibold text-slate-500">التصنيف:</span>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-[.84rem] font-bold transition-all",
              category === c.id
                ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_rgba(30,69,196,.6)]"
                : "border-border bg-white text-slate-600 hover:border-slate-400",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[.8rem] font-semibold text-slate-500">الصيغة:</span>
          {(["all", "online", "offline", "hybrid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[.8rem] font-semibold transition-colors",
                format === f
                  ? "bg-foreground text-background"
                  : "border border-border text-slate-500 hover:border-slate-400",
              )}
            >
              {f === "all" ? "الكل" : FORMAT_LABEL[f]}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-[.8rem] font-semibold text-slate-600 hover:border-slate-400"
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> ترتيب: {SORT_LABEL[sort]}
          </button>
          {sortOpen && (
            <div className="absolute end-0 top-[calc(100%+6px)] z-10 w-48 overflow-hidden rounded-2xl border border-border bg-white py-1.5 shadow-[0_18px_40px_-18px_rgba(22,24,31,.35)]">
              {(Object.keys(SORT_LABEL) as SortOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setSort(opt); setSortOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2 text-start text-[.84rem] font-semibold hover:bg-sand",
                    sort === opt ? "text-primary" : "text-slate-600",
                  )}
                >
                  {SORT_LABEL[opt]}
                  {sort === opt && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[.95rem] text-muted-foreground">
          مفيش فرص مطابقة للفلاتر دي دلوقتي — جرّب تشيل فلتر أو اتنين.
        </p>
      ) : (
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o, i) => (
            <Reveal key={o.id} delay={Math.min(i, 5) * 60}>
              <OpportunityCard
                opportunity={o}
                saved={saved.includes(o.id)}
                onToggleSaved={() => guardedToggle(o.id)}
                onExpand={() => setActiveId(o.id)}
              />
            </Reveal>
          ))}
        </div>
      )}

      <OpportunityDialog
        opportunity={activeOpportunity}
        open={activeOpportunity !== null}
        onOpenChange={(open) => { if (!open) setActiveId(null); }}
      />

      <AuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        title="عايز تفتكر الفرصة دي؟"
        description="اعمل حساب مجاني في COCR واحفظ الفرص اللي تهمك عشان ترجع لها في أي وقت."
      />
    </div>
  );
}

function orgInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

export function OpportunityCard({
  opportunity, saved, onToggleSaved, onExpand,
}: { opportunity: OpportunityListing; saved: boolean; onToggleSaved: () => void; onExpand: () => void }) {
  const a = ACCENT[opportunity.accent];
  const deadline = getDeadlineDisplay(opportunity);
  const FormatIcon = FORMAT_ICON[opportunity.format];

  return (
    <article
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onExpand(); } }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_26px_52px_-26px_rgba(22,24,31,.42)]"
    >
      <div className="relative grid h-[112px] place-items-center overflow-hidden" style={{ background: a.bg }}>
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${a.dot} 1.3px, transparent 0)`,
            backgroundSize: "18px 18px",
            maskImage: "radial-gradient(circle at 50% 120%, transparent 30%, #000)",
            WebkitMaskImage: "radial-gradient(circle at 50% 120%, transparent 30%, #000)",
          }}
        />
        {opportunity.featured && (
          <Badge className="absolute start-3.5 top-3.5 bg-white shadow-sm" style={{ color: a.fg }}>
            مميّزة
          </Badge>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSaved(); }}
          aria-label={saved ? "إلغاء الحفظ" : "احفظ الفرصة"}
          aria-pressed={saved}
          className="absolute end-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-colors hover:text-primary"
        >
          {saved ? <BookmarkCheck className="h-4 w-4" style={{ color: a.fg }} /> : <Bookmark className="h-4 w-4" />}
        </button>
        <Icon3D name={opportunity.icon} className="relative z-10 h-14 w-14 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-[22px]">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[.68rem] font-extrabold"
              style={{ background: a.bg, color: a.fg }}
              aria-hidden
            >
              {orgInitials(opportunity.organization)}
            </span>
            <span className="text-[.76rem] font-bold text-slate-500">{opportunity.organization}</span>
          </span>
          <span
            className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[.72rem] font-extrabold", URGENCY_STYLE[deadline.urgency])}
          >
            <Clock className="h-3 w-3" />
            {deadline.label}
          </span>
        </div>

        <h3 className="text-[1.05rem] font-extrabold leading-relaxed group-hover:text-primary">
          {opportunity.title}
        </h3>
        <p className="flex-1 text-[.86rem] leading-relaxed text-muted-foreground">{opportunity.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {opportunity.free && <Badge variant="outline" className="border-green/30 text-green">مجاني</Badge>}
          {opportunity.financialAid && (
            <Badge variant="outline" className="border-gold/40 text-gold-600">
              <Wallet className="me-1 h-3 w-3" /> دعم مالي
            </Badge>
          )}
          <Badge variant="outline" className="text-slate-500">{formatAgeLabel(opportunity)}</Badge>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <Accordion>
            <AccordionItem value="eligibility" className="border-t-0">
              <AccordionTrigger className="py-1 text-[.82rem]">شروط الأهلية</AccordionTrigger>
              <AccordionContent>
                <ul className="list-inside list-disc space-y-1 text-[.82rem] text-muted-foreground">
                  {opportunity.eligibility.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-3 text-[.78rem] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-[15px] w-[15px]" style={{ color: a.fg }} /> {opportunity.location}
          </span>
          <span className="flex items-center gap-1.5">
            <FormatIcon className="h-[15px] w-[15px]" style={{ color: a.fg }} /> {FORMAT_LABEL[opportunity.format]}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link
            href={opportunity.officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl text-[.9rem] font-extrabold transition-all group-hover:text-white"
            style={{ background: a.bg, color: a.fg }}
            onMouseEnter={(e) => { e.currentTarget.style.background = a.fg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = a.bg; e.currentTarget.style.color = a.fg; }}
          >
            قدّم دلوقتي <ExternalLink className="h-4 w-4" />
          </Link>
          <ShareButton title={opportunity.title} url={`/opportunities/${opportunity.id}`} compact />
        </div>
      </div>
    </article>
  );
}

function OpportunityDialog({
  opportunity, open, onOpenChange,
}: { opportunity: OpportunityListing | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!opportunity) return null;
  const a = ACCENT[opportunity.accent];
  const deadline = getDeadlineDisplay(opportunity);
  const FormatIcon = FORMAT_ICON[opportunity.format];
  const calendarUrl = googleCalendarUrl(opportunity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto p-0 sm:max-w-lg">
        <div className="relative grid h-[110px] place-items-center" style={{ background: a.bg }}>
          <Icon3D name={opportunity.icon} className="h-16 w-16" />
        </div>
        <div className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pe-8">
            <Badge variant="outline" style={{ color: a.fg, borderColor: a.fg }}>
              {CATEGORY_LABELS[opportunity.category]}
            </Badge>
            <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[.72rem] font-extrabold", URGENCY_STYLE[deadline.urgency])}>
              <Clock className="h-3 w-3" /> {deadline.label}
            </span>
          </div>

          <DialogHeader className="text-start">
            <DialogTitle className="text-[1.15rem] font-extrabold leading-snug">{opportunity.title}</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">{opportunity.organization}</DialogDescription>
          </DialogHeader>

          <p className="text-[.92rem] leading-[1.8] text-muted-foreground">{opportunity.description}</p>

          <div className="flex flex-wrap gap-1.5">
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
          </div>

          {opportunity.duration && (
            <p className="text-[.86rem] font-semibold text-slate-500">المدة: {opportunity.duration}</p>
          )}

          <div>
            <h4 className="mb-1.5 text-[.9rem] font-extrabold">شروط الأهلية</h4>
            <ul className="list-inside list-disc space-y-1 text-[.86rem] text-muted-foreground">
              {opportunity.eligibility.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-dashed border-border pt-3 text-[.82rem] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" style={{ color: a.fg }} /> {opportunity.location}</span>
            <span className="flex items-center gap-1.5"><FormatIcon className="h-4 w-4" style={{ color: a.fg }} /> {FORMAT_LABEL[opportunity.format]}</span>
          </div>

          <p className="text-[.72rem] text-slate-400">
            البيانات دي تجريبية للـ MVP — راجع تفاصيل الديدلاين والأهلية من الموقع الرسمي قبل التقديم.
          </p>
        </div>

        <DialogFooter>
          <ShareButton title={opportunity.title} url={`/opportunities/${opportunity.id}`} compact />
          {calendarUrl && (
            <Link
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-border px-4 text-[.88rem] font-bold text-slate-600 hover:border-slate-400"
            >
              <CalendarPlus className="h-4 w-4" /> فكّرني بالديدلاين
            </Link>
          )}
          <Link
            href={opportunity.officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl text-[.92rem] font-extrabold text-white"
            style={{ background: a.fg }}
          >
            قدّم دلوقتي <ExternalLink className="h-4 w-4" />
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShareButton({
  title, url, compact,
}: { title: string; url?: string; compact?: boolean }) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined"
      ? new URL(url ?? window.location.pathname, window.location.origin).toString()
      : (url ?? "");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        /* المستخدم لغى المشاركة — نكمل عادي */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* الكليبورد مش متاح — تجاهل بهدوء */
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleShare}
        aria-label="شارك الفرصة"
        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-border text-slate-500 transition-colors hover:border-slate-400 hover:text-primary"
      >
        {copied ? <Check className="h-4 w-4 text-green" /> : <Share2 className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-border px-5 text-[.9rem] font-extrabold text-slate-600 transition-colors hover:border-slate-400"
    >
      {copied ? <Check className="h-4 w-4 text-green" /> : <Share2 className="h-4 w-4" />}
      {copied ? "اتنسخ الرابط!" : "شارك"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal — نفس أنيميشن الظهور مع السكرول المستخدم في باقي الموقع         */
/* ------------------------------------------------------------------ */
function Reveal({
  children, className, delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "h-full transition-all duration-700 ease-[cubic-bezier(.2,.75,.25,1)] motion-reduce:transition-none",
        shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
