export type IconName =
  | "path" | "mentor" | "build" | "chat" | "mic" | "target" | "heart"
  | "bulb" | "hammer" | "link" | "rocket" | "compass" | "gears" | "medal"
  | "code" | "shield" | "chip" | "phone" | "logo";

export type Accent = "blue" | "gold" | "green" | "ink";

export type CourseCategory =
  | "all" | "front-end" | "cybersecurity" | "app-dev" | "embedded";

export interface Course {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  accent: Accent;
  level: "مبتدئ" | "متوسط" | "متقدم";
  category: Exclude<CourseCategory, "all">;
  durationWeeks: number;
  lessons: number;
  /** بيانات تجريبية في مرحلة الـ Beta */
  rating: number;
  reviews: number;
  free: boolean;
  href: string;
}

export interface Mentor {
  id: string;
  name: string;
  track: string;
  /** الفجوة بين المينتور والطالب — جوهر الـ Near Peer */
  gapLabel: string;
  photo: string | null;
  accent: Accent;
  initial: string;
}

export interface JourneyStep {
  n: string;
  title: string;
  description: string;
}

export interface JourneyPhase {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  icon: IconName;
  accent: Accent;
  steps: JourneyStep[];
}

export interface PlatformSection {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  featured?: boolean;
}

export interface Project {
  id: string;
  title: string;
  author: string;
  track: string;
  shot: string | null;
  accent: Accent;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  accent: Accent;
  cta: string;
}

export interface GrowthRung {
  id: string;
  label: string;
  description: string;
  final?: boolean;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

/* ==================================================================== */
/*  صفحة المنح والفرص                                                    */
/* ==================================================================== */
export type OpportunityCategory =
  | "all" | "competition" | "stem" | "writing" | "speaking" | "leadership" | "grant";

export type OpportunityFormat = "online" | "offline" | "hybrid";

export interface OpportunityListing {
  id: string;
  title: string;
  organization: string;
  category: Exclude<OpportunityCategory, "all">;
  icon: IconName;
  accent: Accent;
  /** السن الرقمي — لو مش ثابت (زي شروط UWC اللي بتختلف حسب الدولة) استخدم ageNote بدالهم */
  ageMin?: number;
  ageMax?: number;
  ageNote?: string;
  location: string;
  format: OpportunityFormat;
  free: boolean;
  /** دعم مالي/منحة جزئية أو كاملة متاحة، غير مرتبط بـ free (البرنامج ممكن يكون مدفوع بس فيه تمويل) */
  financialAid?: boolean;
  duration?: string;
  /** ISO date (YYYY-MM-DD)، أو null لو مفيش تاريخ ثابت (استخدم deadlineNote للتوضيح) */
  deadline: string | null;
  deadlineNote?: string;
  description: string;
  eligibility: string[];
  tags: string[];
  officialLink: string;
  featured?: boolean;
  /** true لو المصدر اتراجع فعليًا من الموقع الرسمي (زي UWC) — مش مجرد Seed */
  verified: boolean;
}
