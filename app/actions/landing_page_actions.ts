"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type {
  Course, CourseCategory, Faq, GrowthRung, IconName, Accent, CourseFormat, JourneyPhase,
  Mentor, Opportunity, PlatformSection, Project,
} from "../types/types";

/**
 * كتالوج الكورسات — DB-backed فعليًا من public.catalog_courses (migration
 * 0008)، بنفس الـ ids النصّية اللي catalog_lessons/course_enrollments/
 * course_submissions بيستخدموها. باقي الدوال في الملف ده (journey phases،
 * platform sections، FAQs، growth ladder، المينتورز) لسه Mock عمدًا —
 * محتوى تسويقي/Seed موصوف كده في التصميم المعتمد، مش جزء من الكتالوج نفسه.
 */

interface CatalogCourseRow {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  level: string;
  category: string;
  duration_weeks: number;
  lessons_count: number;
  hours: number;
  format: string;
  online_sessions: number | null;
  offline_sessions: number | null;
  age_min: number;
  age_max: number;
  mentor_id: string;
  rating: number;
  reviews: number;
  free: boolean;
  popular: boolean;
}

function mapCourseRow(row: CatalogCourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon as IconName,
    accent: row.accent as Accent,
    level: row.level as Course["level"],
    category: row.category as Course["category"],
    durationWeeks: row.duration_weeks,
    lessons: row.lessons_count,
    hours: row.hours,
    format: row.format as CourseFormat,
    onlineSessions: row.online_sessions ?? undefined,
    offlineSessions: row.offline_sessions ?? undefined,
    ageMin: row.age_min,
    ageMax: row.age_max,
    mentorId: row.mentor_id,
    rating: Number(row.rating),
    reviews: row.reviews,
    free: row.free,
    href: `/courses/${row.id}`,
    popular: row.popular,
  };
}

const CATALOG_COURSE_COLUMNS =
  "id, title, description, icon, accent, level, category, duration_weeks, lessons_count, hours, format, online_sessions, offline_sessions, age_min, age_max, mentor_id, rating, reviews, free, popular";

export async function getCourses(category: CourseCategory = "all"): Promise<Course[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  let query = supabase.from("catalog_courses").select(CATALOG_COURSE_COLUMNS).order("order_index");
  if (category !== "all") query = query.eq("category", category);
  const { data } = await query;
  return ((data as CatalogCourseRow[] | null) ?? []).map(mapCourseRow);
}

/** أشهر الكورسات — مرتبة بالتقييم والمراجعات، مش بأي منطق شخصي (محتاج حساب مستخدم مش موجود لسه) */
export async function getPopularCourses(): Promise<Course[]> {
  const all = await getCourses();
  return [...all]
    .sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || b.rating - a.rating)
    .slice(0, 6);
}

export async function getCourseById(id: string): Promise<Course | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("catalog_courses")
    .select(CATALOG_COURSE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapCourseRow(data as CatalogCourseRow) : null;
}

export async function getCourseCategories(): Promise<{ id: CourseCategory; label: string }[]> {
  return [
    { id: "all", label: "الكل" },
    { id: "front-end", label: "Front-End" },
    { id: "cybersecurity", label: "Cybersecurity" },
    { id: "app-dev", label: "App Dev" },
    { id: "embedded", label: "Embedded" },
  ];
}

const MENTORS: Mentor[] = [
  { id: "adam", name: "آدم", track: "Programmer", gapLabel: "سبقك بسنة", photo: "/mentors/adam-v2.webp", accent: "blue", initial: "أ", coursesCount: 3, rating: 4.8 },
  { id: "mariam", name: "مريم", track: "Cybersecurity", gapLabel: "سبقتك بسنتين", photo: "/mentors/mariam-v2.webp", accent: "green", initial: "م", coursesCount: 1, rating: 4.7 },
  { id: "nour", name: "نور", track: "Environmental Volunteering", gapLabel: "سبقتك بسنة", photo: "/mentors/nour-v4.webp", accent: "gold", initial: "ن", coursesCount: 0, rating: 4.6 },
  { id: "karim", name: "كريم ش.", track: "Embedded Systems", gapLabel: "سبقك بسنة ونص", photo: null, accent: "gold", initial: "ك", coursesCount: 1, rating: 4.5 },
  { id: "yasmin", name: "ياسمين ك.", track: "App Development", gapLabel: "سبقتك بسنتين ونص", photo: null, accent: "ink", initial: "ي", coursesCount: 1, rating: 4.6 },
];

export async function getMentors(): Promise<Mentor[]> {
  await delay(80);
  return MENTORS;
}

export async function getMentorById(id: string): Promise<Mentor | null> {
  await delay(60);
  return MENTORS.find((m) => m.id === id) ?? null;
}

export async function getJourneyPhases(): Promise<JourneyPhase[]> {
  return [
    {
      id: "start", tag: "PHASE 01", title: "البداية", subtitle: "تعرف تبدأ منين قبل ما تبدأ.",
      icon: "compass", accent: "blue",
      steps: [
        { n: "01", title: "اكتشف", description: "إيه المجال اللي يناسبك وإيه اللي نفسك توصله." },
        { n: "02", title: "ابدأ", description: "تختار رحلة واحدة بس وتمشي فيها." },
      ],
    },
    {
      id: "practice", tag: "PHASE 02", title: "التعلّم والتطبيق", subtitle: "اللي بتعرفه بيتحوّل لحاجة عملتها.",
      icon: "gears", accent: "gold",
      steps: [
        { n: "03", title: "اتعلم", description: "مع مينتور قريب من تجربتك ومستواك." },
        { n: "04", title: "طبّق", description: "تحوّل اللي اتعلمته لمشروع حقيقي." },
        { n: "05", title: "اتصل", description: "تتعرف على طلاب ومينتورز وخبراء." },
      ],
    },
    {
      id: "impact", tag: "PHASE 03", title: "الأثر", subtitle: "تبقى أنت اللي بتفتح الطريق لحد تاني.",
      icon: "medal", accent: "green",
      steps: [
        { n: "06", title: "شارك", description: "فعاليات، تطوع، ومشاركة في المجتمع." },
        { n: "07", title: "اتطور", description: "تبني خبرتك وفرصك خطوة بخطوة." },
        { n: "08", title: "سيب أثرك", description: "تبقى السبب إن حد تاني بدأ." },
      ],
    },
  ];
}

export async function getPlatformSections(): Promise<PlatformSection[]> {
  return [
    { id: "journeys", title: "رحلات التعلم", icon: "path", featured: true,
      description: "طريق مرتّب من الأساسيات لمشروع التخرّج، وأنت شايف إنت فين في كل لحظة — مش بلاي ليست بتسيبك تختار لوحدك." },
    { id: "mentors", title: "المينتورز", icon: "mentor", description: "حد سبقك بسنة بيراجع شغلك ويقولك تحسّن إزاي." },
    { id: "projects", title: "المشاريع", icon: "build", description: "شغل حقيقي تقدر توريه وتتكلم عنه في أي إنترفيو." },
    { id: "community", title: "المجتمع", icon: "chat", description: "ناس عندها نفس أسئلتك، وناس عدّت بيها قبلك بشوية." },
    { id: "events", title: "الفعاليات", icon: "mic", description: "مؤتمرات وورش وجلسات لايف مع ناس عاشت التجربة." },
    { id: "grants", title: "المنح والفرص", icon: "target", description: "الخطوة اللي بعد الرحلة — منح وبرامج وتدريب." },
    { id: "volunteer", title: "التطوع", icon: "heart", description: "خبرة وأثر حقيقي، مش سطر إضافي في الـ CV." },
  ];
}

export async function getProjects(): Promise<Project[]> {
  return [
    { id: "p1", title: "موقع مطعم كامل", author: "سارة م.", track: "Front-End", shot: null, accent: "blue" },
    { id: "p2", title: "تطبيق تنظيم مذاكرة", author: "كريم ش.", track: "App Development", shot: null, accent: "green" },
    { id: "p3", title: "أداة فحص كلمات السر", author: "منّة ع.", track: "Cybersecurity", shot: null, accent: "ink" },
  ];
}

export async function getOpportunities(): Promise<Opportunity[]> {
  return [
    { id: "events", title: "المؤتمرات والفعاليات", icon: "mic", accent: "blue", cta: "اكتشف الفعاليات",
      description: "اسمع من حد عاش التجربة بنفسه، واعمل Connections حقيقية بدل ما تتفرج من بعيد." },
    { id: "volunteer", title: "التطوع", icon: "heart", accent: "green", cta: "اكتشف فرص التطوع",
      description: "تتعامل مع ناس، تتحمّل مسؤولية، وتطوّر Soft Skills مش هتتعلمها من كورس." },
    { id: "grants", title: "المنح والفرص", icon: "target", accent: "ink", cta: "اكتشف الفرص",
      description: "منح وبرامج وتدريبات ممكن تنقلك للخطوة اللي بعدها بدل ما تدوّر لوحدك." },
  ];
}

export async function getGrowthLadder(): Promise<GrowthRung[]> {
  return [
    { id: "student", label: "Student", description: "لسه بيبدأ", icon: "path" },
    { id: "learner", label: "Learner", description: "ماشي في رحلة", icon: "compass" },
    { id: "builder", label: "Builder", description: "بيبني بإيده", icon: "hammer" },
    { id: "contributor", label: "Contributor", description: "بيشارك ويساعد", icon: "heart" },
    { id: "mentor", label: "Mentor", description: "بقى بداية حد تاني", icon: "mentor", final: true },
  ];
}

export async function getFaqs(): Promise<Faq[]> {
  return [
    { id: "who", question: "COCR مناسبة لمين؟",
      answer: "للطلاب من 13 لـ 18 سنة اللي عايزين يتعلموا، يطبقوا، ويتطوروا وسط مجتمع شبههم." },
    { id: "courses", question: "هل COCR مجرد كورسات؟",
      answer: "لأ. الكورسات جزء من رحلة أكبر فيها تطبيق، Mentorship، مجتمع، وفرص وتجارب." },
    { id: "npl", question: "يعني إيه Near Peer Learning؟",
      answer: "إنك تتعلم من شخص قريب من تجربتك، فاهم التحديات اللي أنت لسه بتواجهها." },
    { id: "become", question: "هل أقدر أبقى Mentor؟",
      answer: "لما توصل لمستوى وخبرة يخلوك قادر تساعد غيرك، تقدر تبدأ رحلتك كـ Mentor." },
    { id: "safety", question: "إزاي بتضمنوا إن المنصة آمنة؟",
      answer: "كل مينتور بيتراجع من فريق COCR قبل الموافقة، وبنتواصل مع ولي أمره للتأكيد. فيه زرار إبلاغ على أي مشروع أو تسليم، وأي مخالفة بتسحب الصلاحيات على طول. التفاصيل كاملة في صفحة الأمان والثقة." },
  ];
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
