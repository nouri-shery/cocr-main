"use server";


import type {
  Course, CourseCategory, Faq, GrowthRung, JourneyPhase,
  Mentor, Opportunity, PlatformSection, Project,
} from "../types/types";

/**
 * Mock API — كل البيانات هنا تجريبية (Beta).
 * لما الـ backend يجهز، الاستبدال بيحصل جوّه الدوال دي بس،
 * والكومبوننتس مش هتتغير لأنها بتستقبل نفس الـ types.
 */

const COURSES: Course[] = [
  {
    id: "fe-basics", title: "أساسيات الـ Front-End",
    description: "تبني أول صفحة كاملة بإيدك من HTML وCSS لحد أول مكوّن تفاعلي.",
    icon: "code", accent: "blue", level: "مبتدئ", category: "front-end",
    durationWeeks: 6, lessons: 18, rating: 4.8, reviews: 34, free: true, href: "/courses/fe-basics",
  },
  {
    id: "cyber-intro", title: "مقدمة الأمن السيبراني",
    description: "تفهم إزاي الأنظمة بتتخترق قبل ما تتعلم تحميها.",
    icon: "shield", accent: "ink", level: "مبتدئ", category: "cybersecurity",
    durationWeeks: 5, lessons: 15, rating: 4.7, reviews: 21, free: true, href: "/courses/cyber-intro",
  },
  {
    id: "first-app", title: "بناء أول تطبيق موبايل",
    description: "من فكرة على ورقة لتطبيق شغّال على تليفونك.",
    icon: "phone", accent: "green", level: "متوسط", category: "app-dev",
    durationWeeks: 8, lessons: 24, rating: 4.6, reviews: 19, free: true, href: "/courses/first-app",
  },
  {
    id: "embedded-zero", title: "الأنظمة المدمجة من الصفر",
    description: "تتعامل مع بورد حقيقي وتبني أول مشروع بيتحرّك.",
    icon: "chip", accent: "gold", level: "مبتدئ", category: "embedded",
    durationWeeks: 7, lessons: 20, rating: 4.5, reviews: 12, free: true, href: "/courses/embedded-zero",
  },
  {
    id: "git-teams", title: "Git وشغل الفرق",
    description: "تشتغل مع فريق من غير ما تضيّع شغلك ولا شغلهم.",
    icon: "gears", accent: "blue", level: "مبتدئ", category: "front-end",
    durationWeeks: 3, lessons: 9, rating: 4.9, reviews: 41, free: true, href: "/courses/git-teams",
  },
  {
    id: "portfolio", title: "بناء بورتفوليو وعرض شغلك",
    description: "تحوّل مشاريعك لحاجة حد تاني يفهمها في دقيقة.",
    icon: "medal", accent: "gold", level: "متوسط", category: "front-end",
    durationWeeks: 4, lessons: 12, rating: 4.8, reviews: 27, free: true, href: "/courses/portfolio",
  },
];

export async function getCourses(category: CourseCategory = "all"): Promise<Course[]> {
  await delay(120);
  return category === "all" ? COURSES : COURSES.filter((c) => c.category === category);
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

export async function getMentors(): Promise<Mentor[]> {
  await delay(80);
  return [
    { id: "youssef", name: "يوسف ط.", track: "Front-End Development", gapLabel: "سبقك بسنة", photo: null, accent: "blue", initial: "ي" },
    { id: "menna", name: "منّة ع.", track: "Cybersecurity", gapLabel: "سبقتك بسنتين", photo: null, accent: "green", initial: "م" },
    { id: "karim", name: "كريم ش.", track: "Embedded Systems", gapLabel: "سبقك بسنة ونص", photo: null, accent: "gold", initial: "ك" },
  ];
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
    { id: "student", label: "Student", description: "لسه بيبدأ" },
    { id: "learner", label: "Learner", description: "ماشي في رحلة" },
    { id: "builder", label: "Builder", description: "بيبني بإيده" },
    { id: "contributor", label: "Contributor", description: "بيشارك ويساعد" },
    { id: "mentor", label: "Mentor", description: "بقى بداية حد تاني", final: true },
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
  ];
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
