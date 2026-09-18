import Link from "next/link";
import { Check } from "lucide-react";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { cn } from "@/lib/utils";
import { Section, SectionHead, SiteFooter } from "./landingserver";
import { Reveal, JourneyEndVisual, GrowthLadder } from "../client/landing_client";
import { getGrowthLadder } from "../actions/landing_page_actions";
import type { IconName } from "../types/types";

/* ================================================================== */
/*  الهيرو                                                             */
/* ================================================================== */
function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-tint to-cream pb-[90px] pt-20">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[46em] px-7 text-center">
        <Reveal as="h1" className="mb-5 text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.22] tracking-[-.02em]">
          إحنا بدأنا كطلاب... وبنبني <span className="text-primary">المكان اللي كنا محتاجينه</span>
        </Reveal>
        <Reveal delay={80} className="mx-auto max-w-[38em] text-[1.1rem] leading-[1.9] text-muted-foreground">
          كنا عايزين نتعلم أسرع، نلاقي فرص تناسبنا، ونوصل لحاجة حقيقية — بس ملقيناش حد يوجهنا. الصفحة دي حكاية إزاي بدأنا، وليه قررنا نبني COCR.
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  قصتنا — تايم لاين 4 مراحل                                          */
/* ================================================================== */
const STORY = [
  { n: "01", title: "كنا بندور", desc: "كنا عايزين نتعلم، نتطور، نلاقي فرص، ونحقق حاجة حقيقية — بس ملقيناش نبدأ منين." },
  { n: "02", title: "اتعلمنا بالطريقة الصعبة", desc: "دورنا، قدّمنا، جربنا، فشلنا، اتعلمنا، وعرفنا الطريق خطوة خطوة." },
  { n: "03", title: "فهمنا المشكلة", desc: "فهمنا إن الرحلة ممكن تبقى أسهل أوي لو حد سبقك في نفس الطريق بيوجهك." },
  { n: "04", title: "بدأنا COCR", desc: "بدل ما نستنى المكان اللي كنا محتاجينه يظهر، قررنا نبنيه إحنا بنفسنا." },
];

function OurStorySection() {
  return (
    <Section tone="sand" pattern="grid">
      <SectionHead center label="قصتنا" title="من أول خطوة، لحد ما بدأنا نبني" />

      <Reveal className="mx-auto max-w-[560px] rounded-[26px] border border-border bg-white px-8 py-9 shadow-[0_8px_28px_-12px_rgba(22,24,31,.14)]">
        {STORY.map((s, i) => (
          <div key={s.n}>
            <div className="grid grid-cols-[44px_1fr] items-start gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-primary bg-blue-50 font-display text-[.95rem] font-extrabold text-primary">
                {s.n}
              </span>
              <div className="pt-1.5">
                <b className="block text-[1.02rem] font-extrabold">{s.title}</b>
                <p className="mt-1 text-[.92rem] leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </div>
            {i < STORY.length - 1 && (
              <span className="ms-[21px] block h-[30px] w-0.5 [background:repeating-linear-gradient(to_bottom,#1E45C4_0_4px,transparent_4px_8px)]" />
            )}
          </div>
        ))}
      </Reveal>
    </Section>
  );
}

/* ================================================================== */
/*  إحنا عارفين الإحساس ده                                              */
/* ================================================================== */
const PAIN_POINTS = [
  "نفسي أقدم على منحة بس مش عارف أبدأ.",
  "عرفت عن المسابقة بعد الـDeadline.",
  "بدأت كورسات كتير ومش عارف أكمل في إيه.",
  "نفسي ألاقي حد يوجهني.",
];

function TheProblemSection() {
  return (
    <Section>
      <SectionHead center label="الإحساس ده" title="إحنا عارفين الإحساس ده" />

      <div className="mx-auto grid max-w-[720px] gap-4 sm:grid-cols-2">
        {PAIN_POINTS.map((p) => (
          <Reveal key={p}>
            <div className="h-full rounded-2xl border border-border bg-white px-6 py-5 text-[.98rem] font-semibold leading-relaxed text-slate-600">
              &quot;{p}&quot;
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={80} className="mt-9 text-center text-[1.3rem] font-extrabold text-primary">
        إحنا كنا مكانك.
      </Reveal>
    </Section>
  );
}

/* ================================================================== */
/*  ليه عملنا COCR — 5 نتايج                                            */
/* ================================================================== */
const OUTCOMES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "compass", title: "تبدأ صح", desc: "نعرفك إيه الخطوة المناسبة ليك." },
  { icon: "build", title: "تتعلم صح", desc: "مسارات وكورسات وموارد تساعدك تتقدم." },
  { icon: "target", title: "تلاقي فرص", desc: "منح، مسابقات، برامج، تطوع ومشاريع." },
  { icon: "mentor", title: "تلاقي توجيه", desc: "مينتورز وتجارب ناس سبقوك." },
  { icon: "medal", title: "توصل لهدفك", desc: "مش مجرد استهلاك محتوى — خطوات حقيقية وحاجة تحققها." },
];

function WhyWeBuiltSection() {
  return (
    <Section tone="sand" pattern="grid">
      <SectionHead center label="ليه عملنا COCR؟" title="مش عايزين حد يعدّي بالتجربة دي لوحده"
        lead="احنا عدّينا بيها، وعارفين إنها أصعب لما تكون لوحدك." />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {OUTCOMES.map((o, i) => (
          <Reveal key={o.title} delay={i * 60} variant="pop">
            <article className="h-full rounded-3xl border border-border bg-white px-5 py-[26px] text-center transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_8px_28px_-12px_rgba(22,24,31,.2)]">
              <Icon3D name={o.icon} className="mx-auto mb-4 h-[52px] w-[52px]" />
              <h3 className="mb-1 text-[1.02rem] font-extrabold">{o.title}</h3>
              <p className="text-[.86rem] leading-relaxed text-muted-foreground">{o.desc}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  الناس اللي بنت COCR                                                 */
/* ================================================================== */
const FOUNDERS = [
  { id: "nouran", name: "نوران", track: "Product · Frontend · Student Experience", initial: "ن", accent: "blue" as const },
  { id: "hassan", name: "حسن", track: "Design · Visual Identity", initial: "ح", accent: "gold" as const },
  { id: "yassin", name: "ياسين", track: "Technology · Infrastructure · Security", initial: "ي", accent: "green" as const },
];

const FOUNDER_BG: Record<string, string> = {
  blue: "from-[#5B7EE8] to-[#1E45C4]",
  gold: "from-[#F4BE60] to-[#B8801F]",
  green: "from-[#86D9AE] to-[#1E7A4E]",
};

function PeopleSection() {
  return (
    <Section id="people">
      <SectionHead center label="الناس اللي بنت COCR" title="تلات طلاب، قرّروا يبنوا اللي كانوا محتاجينه" />

      <div className="grid gap-6 sm:grid-cols-3">
        {FOUNDERS.map((f, i) => (
          <Reveal key={f.id} delay={i * 90} variant="pop">
            <article className="h-full overflow-hidden rounded-3xl border border-border bg-white text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]">
              <div className={cn("grid aspect-[4/3] place-items-center bg-gradient-to-br text-[2.6rem] font-extrabold text-white", FOUNDER_BG[f.accent])}>
                {f.initial}
              </div>
              <div className="px-5 pb-6 pt-5">
                <b className="block text-[1.08rem] font-extrabold">{f.name}</b>
                <div className="mb-3.5 font-display text-[.8rem] text-muted-foreground">{f.track}</div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3.5 py-1.5 text-[.76rem] font-bold text-green">
                  <Check className="h-3.5 w-3.5" /> مؤسس مشارك
                </span>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <div className="mx-auto mt-14 max-w-[560px]">
        <Reveal className="mb-5 text-center">
          <span className="mb-2.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">الناس اللي ساعدتنا في الطريق</span>
        </Reveal>
        <Reveal delay={60}>
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-sand px-6 py-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#A6A199] to-[#3E403F] text-[1.2rem] font-extrabold text-white">
              م
            </span>
            <div>
              <b className="block text-[.98rem] font-extrabold">م. محمد <span className="font-normal text-muted-foreground">— مينتور</span></b>
              <p className="mt-0.5 text-[.86rem] leading-relaxed text-muted-foreground">
                مينتور دعم رحلتنا بالتوجيه، الخبرة، والفيدباك المستمر.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  من طالب لمينتور                                                    */
/* ================================================================== */
async function StudentToMentorSection() {
  const rungs = await getGrowthLadder();
  return (
    <Section tone="blue" pattern="dots">
      <SectionHead center label="من طالب لمينتور" title="تبدأ طالب... ترجع مينتور"
        lead="تبدأ كطالب في COCR، تتعلم وتجرب وتبني حاجات حقيقية. ومع الوقت، لما يكون عندك خبرة أو حاجة تقدر تقدّمها لغيرك، تقدر ترجع COCR كـMentor أو Contributor وتساعد طالب تاني." />

      <GrowthLadder rungs={rungs} />
    </Section>
  );
}

/* ================================================================== */
/*  رؤيتنا                                                             */
/* ================================================================== */
function VisionSection() {
  return (
    <Section>
      <div className="mx-auto max-w-[38em] px-0 text-center">
        <Reveal className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
          رؤيتنا
        </Reveal>
        <Reveal delay={40} as="h2" className="mb-6 text-[clamp(1.7rem,3.4vw,2.4rem)] font-extrabold leading-tight tracking-tight">
          إحنا عايزين نغير شكل البداية.
        </Reveal>
        <Reveal delay={90} className="text-[1.08rem] leading-[1.9] text-muted-foreground">
          عايزين الطالب اللي عنده حلم، بس مش عارف يبدأ، يلاقي أول خطوة.
          <br />
          وعايزين الطالب اللي وصل لحاجة، ما يحتفظش بالطريق لنفسه — لكن يمد إيده لحد لسه بيبدأ.
        </Reveal>
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  الـ CTA الأخير                                                     */
/* ================================================================== */
function AboutCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-primary to-[#0B1633] py-[76px] text-center text-white lg:py-[112px]">
      <span aria-hidden className="pattern-dots pattern-on-dark pointer-events-none absolute inset-0" />
      <span aria-hidden className="pointer-events-none absolute -top-40 start-[-10%] h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
      <div className="relative z-[2] mx-auto max-w-[42em] px-7">
        <JourneyEndVisual />
        <Reveal as="h2" className="mb-[18px] text-[clamp(1.95rem,3.9vw,2.95rem)] font-extrabold leading-tight tracking-tight">
          إنت لسه في أول الطريق؟
        </Reveal>
        <Reveal delay={80} className="mx-auto mb-9 max-w-[30em] text-[1.08rem] text-white/85">
          إحنا كمان بدأنا من هناك.
        </Reveal>
        <Reveal delay={160} variant="pop" className="flex flex-wrap items-center justify-center gap-3.5">
          <Link href="/register" className="inline-flex min-h-[56px] items-center justify-center rounded-xl bg-cream px-8 text-[1.05rem] font-bold text-[#0B1633] shadow-[0_8px_22px_-8px_rgba(0,0,0,.35)] transition-all hover:-translate-y-0.5">
            ابدأ رحلتك
          </Link>
          <Link href="/register" className="inline-flex min-h-[56px] items-center justify-center rounded-xl border border-white/30 px-8 text-[1.05rem] font-bold text-white transition-all hover:bg-white/10">
            خليك جزء من COCR
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  الصفحة الكاملة                                                     */
/* ================================================================== */
export function AboutPageContent() {
  return (
    <main>
      <AboutHero />
      <OurStorySection />
      <TheProblemSection />
      <WhyWeBuiltSection />
      <PeopleSection />
      <StudentToMentorSection />
      <VisionSection />
      <AboutCta />
      <SiteFooter />
    </main>
  );
}
