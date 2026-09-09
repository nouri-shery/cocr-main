import type { CourseCategory, OpportunityCategory } from "../types/types";

/**
 * فلو التسجيل/الأونبوردينج ده كله Frontend-only دلوقتي — مفيش Supabase أو باك إند
 * حقيقي لسه (قرار متأخر فيه قبل كده في المشروع). بيانات الأونبوردينج (الاهتمامات
 * بس، مش كلمة السر ولا الإيميل) بتُحفظ في localStorage على جهاز الطالب بس، عشان
 * نقدر نبني تجربة "ترشيحات مخصصة ليك" حقيقية من غير حساب حقيقي. لما يبقى فيه
 * Auth حقيقي، ده هيتحول لبيانات على السيرفر مرتبطة بحساب المستخدم.
 */

export type InterestId = "tech" | "science" | "leadership" | "design" | "environment";
export type StageId = "prep" | "secondary-junior" | "secondary-senior" | "university";
export type GoalId = "competition" | "skill" | "team";

export const INTERESTS: { id: InterestId; label: string }[] = [
  { id: "tech", label: "برمجة وتكنولوجيا 💻" },
  { id: "science", label: "علوم وابتكار 🔬" },
  { id: "leadership", label: "قيادة ومناظرات 🗣️" },
  { id: "design", label: "تصميم وفنون 🎨" },
  { id: "environment", label: "بيئة واستدامة 🌿" },
];

export const STAGES: { id: StageId; label: string }[] = [
  { id: "prep", label: "إعدادي" },
  { id: "secondary-junior", label: "أولى/تانية ثانوي" },
  { id: "secondary-senior", label: "ثالثة ثانوي" },
  { id: "university", label: "جامعة" },
];

export const GOALS: { id: GoalId; label: string }[] = [
  { id: "competition", label: "أجهز لمسابقة/فرصة عالمية 🏆" },
  { id: "skill", label: "أتعلم مهارة جديدة 📚" },
  { id: "team", label: "أدور على فريق أعمل معاه مشروع 🤝" },
];

export interface OnboardingData {
  name: string;
  stage: StageId | null;
  interests: InterestId[];
  goal: GoalId | null;
  completedAt: string;
}

const KEY = "cocr-onboarding";

export function getOnboarding(): OnboardingData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOnboarding(data: OnboardingData) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* localStorage غير متاح — التجربة تكمل عادي من غير حفظ */
  }
}

/** خرائط تقريبية — نية الطالب في الأونبوردينج، مش تصنيف دقيق 100% */
export const INTEREST_TO_COURSE_CATEGORY: Record<InterestId, Exclude<CourseCategory, "all">[]> = {
  tech: ["front-end", "app-dev", "embedded"],
  science: ["embedded", "cybersecurity"],
  leadership: [],
  design: ["front-end"],
  environment: [],
};

export const INTEREST_TO_OPPORTUNITY_CATEGORY: Record<InterestId, Exclude<OpportunityCategory, "all">[]> = {
  tech: ["stem"],
  science: ["stem"],
  leadership: ["leadership", "speaking"],
  design: ["writing"],
  environment: [],
};

/** تاجز الفرص اللي مفيش لها تصنيف مخصوص (زي البيئة) بنطابقها بالكلمات دي */
export const INTEREST_TAG_HINTS: Record<InterestId, string[]> = {
  tech: ["برمجة", "STEM"],
  science: ["بحث", "STEM", "ابتكار"],
  leadership: ["قيادة"],
  design: ["كتابة", "تصميم"],
  environment: ["بيئة", "استدامة"],
};
