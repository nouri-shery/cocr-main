"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { OpportunityCategory, OpportunityListing, Accent, IconName, OpportunityFormat } from "../types/types";
import { CATEGORY_LABELS } from "../lib/opportunity-categories";

/**
 * كتالوج الفرص — DB-backed فعليًا من public.opportunities (جدول حقيقي
 * كان موجود من قبل، اتوسّع بـ migration 0010 عشان يغطّي كل حقول الـ UI).
 * الـ id بقى uuid حقيقي بدل slug نصّي — لينكات الفرص القديمة (زي
 * /opportunities/uwc-ibdp-scholarship) مش هتشتغل بعد الترحيل، تريد-أوف
 * واعي اتوثّق في الـ migration نفسها.
 */

interface OpportunityRow {
  id: string;
  title: string;
  provider: string;
  category: string | null;
  icon: string | null;
  accent: string | null;
  min_age: number | null;
  max_age: number | null;
  age_note: string | null;
  location: string;
  delivery_mode: string | null;
  funding_label: string;
  duration: string | null;
  deadline: string | null;
  deadline_note: string | null;
  summary: string;
  eligibility: string[];
  tags: string[];
  official_source_url: string;
  featured: boolean;
  verified: boolean;
}

const OPPORTUNITY_COLUMNS =
  "id, title, provider, category, icon, accent, min_age, max_age, age_note, location, delivery_mode, funding_label, duration, deadline, deadline_note, summary, eligibility, tags, official_source_url, featured, verified";

function mapOpportunityRow(row: OpportunityRow): OpportunityListing {
  return {
    id: row.id,
    title: row.title,
    organization: row.provider,
    category: (row.category ?? "grant") as Exclude<OpportunityCategory, "all">,
    icon: (row.icon ?? "target") as IconName,
    accent: (row.accent ?? "blue") as Accent,
    ageMin: row.min_age ?? undefined,
    ageMax: row.max_age ?? undefined,
    ageNote: row.age_note ?? undefined,
    location: row.location,
    format: (row.delivery_mode ?? "online") as OpportunityFormat,
    free: row.funding_label === "free",
    financialAid: row.funding_label === "fully_funded" || row.funding_label === "partially_funded" ? true : undefined,
    duration: row.duration ?? undefined,
    deadline: row.deadline ? row.deadline.slice(0, 10) : null,
    deadlineNote: row.deadline_note ?? undefined,
    description: row.summary,
    eligibility: row.eligibility,
    tags: row.tags,
    officialLink: row.official_source_url,
    featured: row.featured,
    verified: row.verified,
  };
}

export async function getOpportunities(category: OpportunityCategory = "all"): Promise<OpportunityListing[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  let query = supabase.from("opportunities").select(OPPORTUNITY_COLUMNS).order("deadline", { ascending: true, nullsFirst: false });
  if (category !== "all") query = query.eq("category", category);
  const { data } = await query;
  return ((data as OpportunityRow[] | null) ?? []).map(mapOpportunityRow);
}

export async function getOpportunityCategories(): Promise<{ id: OpportunityCategory; label: string }[]> {
  return [
    { id: "all", label: "الكل" },
    ...(Object.keys(CATEGORY_LABELS) as Exclude<OpportunityCategory, "all">[]).map((id) => ({
      id,
      label: CATEGORY_LABELS[id],
    })),
  ];
}

export async function getOpportunityById(id: string): Promise<OpportunityListing | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("opportunities")
    .select(OPPORTUNITY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapOpportunityRow(data as OpportunityRow) : null;
}
