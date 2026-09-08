"use server";

import { OpportunityCategory, OpportunityListing } from "../types/types";

/**
 * Seed data — فرص حقيقية اتجابت من بحث خارجي (مش مُختلَقة)، لكنها بيانات
 * تجريبية للـ MVP مش قاعدة بيانات نهائية. لازم تتراجع الديدلاينز فعليًا
 * قبل أي إطلاق حقيقي لأن مواعيد المسابقات بتتغير كل سنة.
 */
const OPPORTUNITIES: OpportunityListing[] = [
  {
    id: "breakthrough-junior-challenge",
    title: "Breakthrough Junior Challenge 2026",
    organization: "Breakthrough Prize Foundation",
    category: "competition",
    icon: "medal",
    accent: "gold",
    ageMin: 13,
    ageMax: 18,
    location: "عالمي",
    format: "online",
    free: true,
    deadline: "2026-09-15",
    description: "اعمل فيديو قصير بتشرح فيه مفهوم علمي معقّد بطريقة مبسّطة وممتعة — أفضل فيديو ياخد منحة دراسية كبيرة.",
    eligibility: ["السن من 13 لـ 18 سنة", "فيديو أصلي من إنتاجك", "أي مجال علمي (فيزياء، أحياء، رياضيات...)"],
    tags: ["علوم", "فيديو", "منحة دراسية"],
    officialLink: "https://breakthroughjuniorchallenge.org",
    featured: true,
    verified: false,
  },
  {
    id: "wharton-global-hs-investment",
    title: "Wharton Global High School Investment Competition",
    organization: "Wharton School — University of Pennsylvania",
    category: "competition",
    icon: "target",
    accent: "blue",
    ageMin: 14,
    ageMax: 18,
    location: "عالمي",
    format: "online",
    free: true,
    deadline: "2026-09-11",
    description: "تكوّن فريق وتدير محفظة استثمار وهمية لمدة عشر أسابيع — تتعلم أساسيات الاستثمار والتحليل المالي عمليًا.",
    eligibility: ["طالب ثانوي (تقريبًا 14-18 سنة)", "العمل في فريق من 4-5 أفراد", "مشرف/معلّم يوافق على التسجيل"],
    tags: ["استثمار", "فريق", "مالية"],
    officialLink: "https://globalyouth.wharton.upenn.edu/investment-competition/",
    verified: false,
  },
  {
    id: "intl-youth-environmental-challenge",
    title: "International Youth Environmental Challenge 2026",
    organization: "IYEC",
    category: "competition",
    icon: "compass",
    accent: "green",
    ageMin: 13,
    ageMax: 18,
    location: "عالمي",
    format: "online",
    free: true,
    deadline: "2026-10-15",
    description: "قدّم حل مبتكر لمشكلة بيئية حقيقية في مجتمعك — بحث، مشروع، أو حملة توعية.",
    eligibility: ["السن من 13 لـ 18 سنة", "مشروع بيئي أصلي (فردي أو جماعي)"],
    tags: ["بيئة", "استدامة", "مشروع"],
    officialLink: "https://www.iyec.org",
    verified: false,
  },
  {
    id: "conrad-challenge",
    title: "Conrad Challenge 2026–27",
    organization: "Conrad Foundation",
    category: "stem",
    icon: "rocket",
    accent: "blue",
    ageMin: 13,
    ageMax: 18,
    location: "عالمي",
    format: "hybrid",
    free: true,
    deadline: "2026-10-29",
    description: "مسابقة ابتكار STEM بتحويل فكرتك لمنتج أو خدمة فعلية — فريق، Pitch، وخبراء بيراجعوا شغلك.",
    eligibility: ["السن من 13 لـ 18 سنة", "فريق من 2-5 أفراد", "فكرة ابتكارية في مجال STEM"],
    tags: ["STEM", "ابتكار", "ريادة أعمال"],
    officialLink: "https://www.conradchallenge.org",
    featured: true,
    verified: false,
  },
  {
    id: "journal-emerging-investigators",
    title: "Journal of Emerging Investigators",
    organization: "JEI",
    category: "stem",
    icon: "bulb",
    accent: "green",
    ageMin: 13,
    ageMax: 18,
    location: "عالمي",
    format: "online",
    free: true,
    deadline: null,
    description: "انشر بحثك العلمي الأصلي في مجلة أكاديمية بتراجع أبحاث طلاب المرحلة المتوسطة والثانوية.",
    eligibility: ["طالب في المرحلة المتوسطة أو الثانوية", "بحث علمي أصلي بإشراف معلّم أو مرشد"],
    tags: ["بحث", "نشر علمي", "مستمر"],
    officialLink: "https://emerginginvestigators.org",
    verified: false,
  },
  {
    id: "immerse-education-essay",
    title: "Immerse Education Essay Competition",
    organization: "Immerse Education",
    category: "writing",
    icon: "chat",
    accent: "gold",
    ageMin: 13,
    ageMax: 18,
    location: "عالمي",
    format: "online",
    free: true,
    deadline: "2026-10-25",
    description: "اكتب مقال في مجال دراسي بتحبه — أفضل المقالات بتاخد منح جزئية لبرامج Immerse الصيفية.",
    eligibility: ["السن من 13 لـ 18 سنة", "مقال أصلي مش أطول من 500 كلمة (حسب المجال)"],
    tags: ["كتابة", "منحة جزئية", "أكاديمي"],
    officialLink: "https://www.immerse.education/essay-competition/",
    verified: false,
  },
  {
    id: "ted-summer-public-speaking",
    title: "TED Summer School Public Speaking Challenge",
    organization: "TED-Ed",
    category: "speaking",
    icon: "mic",
    accent: "ink",
    ageMin: 14,
    ageMax: 18,
    location: "عالمي",
    format: "online",
    free: true,
    deadline: null,
    description: "سجّل فيديو قصير (فكرة تستاهل الانتشار) وطوّر مهارات الإلقاء والتأثير بتاعتك.",
    eligibility: ["السن من 14 لـ 18 سنة", "فيديو 3-5 دقايق بفكرة أصلية"],
    tags: ["إلقاء", "فيديو", "دورة قادمة"],
    officialLink: "https://ed.ted.com",
    verified: false,
  },
  {
    id: "veya-international-prize",
    title: "Veya International Prize 2026–27",
    organization: "Veya",
    category: "leadership",
    icon: "compass",
    accent: "ink",
    ageMin: 12,
    ageMax: 19,
    location: "عالمي",
    format: "online",
    free: true,
    deadline: null,
    description: "مسابقة عالمية بتكرّم مبادرات الشباب في القيادة والتأثير المجتمعي.",
    eligibility: ["السن من 12 لـ 19 سنة", "مبادرة أو مشروع قيادي حقيقي"],
    tags: ["قيادة", "مجتمع", "عالمي"],
    officialLink: "https://veya.org",
    verified: false,
  },
];

const CATEGORY_LABELS: Record<Exclude<OpportunityCategory, "all">, string> = {
  competition: "مسابقات",
  stem: "STEM وبحث",
  writing: "كتابة",
  speaking: "إلقاء وتحدّث",
  leadership: "قيادة ومجتمع",
};

function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function getOpportunities(category: OpportunityCategory = "all"): Promise<OpportunityListing[]> {
  const sorted = [...OPPORTUNITIES].sort((a, b) => {
    if (a.deadline === null && b.deadline === null) return 0;
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
  const filtered = category === "all" ? sorted : sorted.filter((o) => o.category === category);
  return delay(filtered);
}

export async function getOpportunityCategories(): Promise<{ id: OpportunityCategory; label: string }[]> {
  return delay([
    { id: "all", label: "الكل" },
    ...(Object.keys(CATEGORY_LABELS) as Exclude<OpportunityCategory, "all">[]).map((id) => ({
      id,
      label: CATEGORY_LABELS[id],
    })),
  ]);
}

