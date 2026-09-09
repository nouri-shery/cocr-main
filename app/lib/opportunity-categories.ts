import { OpportunityCategory } from "../types/types";

export const CATEGORY_LABELS: Record<Exclude<OpportunityCategory, "all">, string> = {
  competition: "مسابقات",
  stem: "STEM وبحث",
  writing: "كتابة",
  speaking: "إلقاء وتحدّث",
  leadership: "قيادة ومجتمع",
};

export function getCategoryLabel(category: Exclude<OpportunityCategory, "all">): string {
  return CATEGORY_LABELS[category];
}
