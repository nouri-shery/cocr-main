"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bookmark, BookmarkCheck, Search, MapPin, Wifi, Building2, Users2,
  ExternalLink, AlertTriangle, Clock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { cn } from "@/lib/utils";
import { getDeadlineInfo } from "../lib/opportunity-deadline";
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

const SAVE_KEY = "cocr-saved-opportunities";

function useSavedOpportunities() {
  const [saved, setSaved] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* localStorage غير متاح — نكمل من غير حفظ */
    }
  }, []);

  const toggle = React.useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      } catch {
        /* تجاهل لو الحفظ فشل */
      }
      return next;
    });
  }, []);

  return { saved, toggle };
}

interface OpportunitiesExplorerProps {
  initialOpportunities: OpportunityListing[];
  categories: { id: OpportunityCategory; label: string }[];
}

export function OpportunitiesExplorer({ initialOpportunities, categories }: OpportunitiesExplorerProps) {
  const [category, setCategory] = React.useState<OpportunityCategory>("all");
  const [format, setFormat] = React.useState<OpportunityFormat | "all">("all");
  const [query, setQuery] = React.useState("");
  const [savedOnly, setSavedOnly] = React.useState(false);
  const { saved, toggle } = useSavedOpportunities();

  const filtered = React.useMemo(() => {
    return initialOpportunities.filter((o) => {
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
  }, [initialOpportunities, category, format, query, savedOnly, saved]);

  const urgentCount = React.useMemo(
    () => initialOpportunities.filter((o) => getDeadlineInfo(o.deadline).urgency === "urgent").length,
    [initialOpportunities],
  );

  return (
    <div>
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

      <div className="mb-4 flex flex-wrap gap-2">
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

      <div className="mb-7 flex flex-wrap items-center gap-2 border-b border-dashed border-border pb-5">
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

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[.95rem] text-muted-foreground">
          مفيش فرص مطابقة للفلاتر دي دلوقتي — جرّب تشيل فلتر أو اتنين.
        </p>
      ) : (
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <OpportunityCard key={o.id} opportunity={o} saved={saved.includes(o.id)} onToggleSaved={() => toggle(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

const URGENCY_STYLE: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  soon: "bg-gold-50 text-gold-600",
  normal: "bg-blue-tint text-primary",
  open: "bg-green-50 text-green",
  closed: "bg-muted text-muted-foreground",
};

function OpportunityCard({
  opportunity, saved, onToggleSaved,
}: { opportunity: OpportunityListing; saved: boolean; onToggleSaved: () => void }) {
  const a = ACCENT[opportunity.accent];
  const deadlineInfo = getDeadlineInfo(opportunity.deadline);
  const FormatIcon = FORMAT_ICON[opportunity.format];

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_26px_52px_-26px_rgba(22,24,31,.42)]">
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
          onClick={onToggleSaved}
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
          <span className="text-[.76rem] font-bold text-slate-400">{opportunity.organization}</span>
          <span
            className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[.72rem] font-extrabold", URGENCY_STYLE[deadlineInfo.urgency])}
          >
            <Clock className="h-3 w-3" />
            {deadlineInfo.label}
          </span>
        </div>

        <h3 className="text-[1.05rem] font-extrabold leading-relaxed">{opportunity.title}</h3>
        <p className="flex-1 text-[.86rem] leading-relaxed text-muted-foreground">{opportunity.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {opportunity.free && <Badge variant="outline" className="border-green/30 text-green">مجاني</Badge>}
          <Badge variant="outline" className="text-slate-500">{opportunity.ageMin}–{opportunity.ageMax} سنة</Badge>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-3 text-[.78rem] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-[15px] w-[15px]" style={{ color: a.fg }} /> {opportunity.location}
          </span>
          <span className="flex items-center gap-1.5">
            <FormatIcon className="h-[15px] w-[15px]" style={{ color: a.fg }} /> {FORMAT_LABEL[opportunity.format]}
          </span>
        </div>

        <Link
          href={opportunity.officialLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex min-h-[46px] items-center justify-center gap-2 rounded-2xl text-[.9rem] font-extrabold transition-all group-hover:text-white"
          style={{ background: a.bg, color: a.fg }}
          onMouseEnter={(e) => { e.currentTarget.style.background = a.fg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = a.bg; e.currentTarget.style.color = a.fg; }}
        >
          قدّم دلوقتي <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
