import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, X, Info, Star } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CourseGrid, FaqAccordion, PassportVisual, JourneyEndVisual, GrowthLadder, Reveal } from "../client/landing_client";
import { Accent } from "../types/types";
import { getCourseCategories, getCourses, getFaqs, getGrowthLadder, getJourneyPhases, getMentors, getOpportunities, getPlatformSections } from "../actions/landing_page_actions";
import { getPublishedProjects } from "../actions/projects_actions";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { cn } from "@/lib/utils";

/* ================================================================== */
/*  عناصر مشتركة                                                       */
/* ================================================================== */
export function Section({
  id, children, tone = "plain", pattern, className,
}: {
  id?: string; children: React.ReactNode;
  tone?: "plain" | "sand" | "blue" | "dark" | "lilac" | "mist" | "sage" | "clay";
  pattern?: "dots" | "grid" | "diag" | "glow" | "blobs";
  className?: string;
}) {
  return (
    <section id={id} className={cn(
      "relative overflow-hidden py-[76px] lg:py-[112px]",
      tone === "sand" && "bg-sand",
      tone === "blue" && "bg-blue-tint",
      tone === "dark" && "bg-[#14161C] text-white",
      tone === "lilac" && "bg-lilac",
      tone === "mist" && "bg-mist",
      tone === "sage" && "bg-sage",
      tone === "clay" && "bg-clay",
      className,
    )}>
      {pattern && <span aria-hidden className={cn("pointer-events-none absolute inset-0 z-[1]", `pattern-${pattern}`, tone === "dark" && "pattern-on-dark")} />}
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">{children}</div>
    </section>
  );
}

export function SectionHead({
  num, label, title, lead, center,
}: { num?: string; label: string; title: string; lead?: string; center?: boolean }) {
  return (
    <Reveal className={cn("mb-12 lg:mb-[48px]", center && "mx-auto max-w-[44em] text-center")}>
      {num && <span className="block font-display text-[clamp(2.6rem,5vw,4rem)] font-extrabold leading-[.9] tracking-tighter text-gold-600/40">{num}</span>}
      <span className="mb-3.5 mt-2.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">{label}</span>
      <h2 className={cn("mb-4 max-w-[18em] text-[clamp(1.95rem,3.9vw,2.95rem)] font-extrabold leading-tight tracking-tight", center && "mx-auto")}>{title}</h2>
      {lead && <p className={cn("max-w-[34em] text-[1.12rem] leading-[1.9] text-muted-foreground", center && "mx-auto")}>{lead}</p>}
    </Reveal>
  );
}

const ACCENT_CLASS: Record<Accent, string> = {
  blue: "text-primary", gold: "text-gold-600", green: "text-green", ink: "text-foreground",
};

/* ================================================================== */
/*  الهيرو                                                             */
/* ================================================================== */
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-to-b from-blue-tint to-cream pb-[100px] pt-16">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto grid max-w-[1160px] items-center gap-12 px-7 lg:grid-cols-[1.05fr_.95fr] lg:gap-[72px]">
        <div>
          <Reveal as="h1" className="mb-5 pt-1.5 text-[clamp(2.5rem,5.6vw,4.2rem)] font-black leading-[1.16] tracking-[-.03em]">
            بنتنافس على <span className="text-primary">أحسن رحلة تعلّم</span>، مش على عدد الكورسات.
          </Reveal>
          <Reveal delay={70} className="mb-9 max-w-[34em] text-[1.12rem] leading-[1.9] text-muted-foreground">
            رحلة واضحة، مينتور سبقك بسنة، ومشروع تطلع بيه. مش مكتبة فيديوهات تسيبك فيها لوحدك.
          </Reveal>
          <Reveal delay={140} className="flex flex-wrap items-center gap-3.5">
            <Link 
  href="#start" 
  className={cn(buttonVariants({ size: "lg" }))}
>
  ابدأ رحلتك
</Link>
            <Link href="#journey" className="group flex items-center gap-2 text-[.94rem] font-bold text-primary">
              شوف الرحلة الكاملة
              <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
            </Link>
          </Reveal>
        </div>

        <Reveal delay={120}><PassportVisual /></Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  01 — المشكلة                                                       */
/* ================================================================== */
const CHAOS = [
  "كورس 3 ساعات", "بلاي ليست 90 فيديو", "رودماب من تويتر", "كورس تاني أحسن",
  'مجلد "أتعلمه بعدين"', 'فيديو "ابدأ من هنا"', "بوت كامب 6 شهور",
  "كتاب PDF مفتوح من شهر", "قناة يوتيوب مشترك فيها",
];
const ROUTE = ["اعرف مجالك", "ابدأ رحلة واحدة", "مينتور بيراجع معاك", "اطلع بمشروع"];

export function ProblemSection() {
  return (
    <Section id="problem" tone="clay" pattern="grid">
      <SectionHead center num="01" label="المشكلة"
        title="مش عارف تبدأ منين؟ مش أنت لوحدك."
        lead="المحتوى مش المشكلة — المشكلة إن مفيش حد قايلك تبدأ بإيه، ولا إيه اللي بعده." />

      <Reveal className="grid items-stretch gap-0 lg:grid-cols-[1fr_96px_1fr]">
        <div className="relative flex min-h-[360px] flex-col overflow-hidden rounded-[26px] bg-[#F3EEE4] px-8 pb-7 pt-9">
          <span aria-hidden className="absolute inset-0 opacity-55 [background:repeating-linear-gradient(-45deg,transparent_0_9px,rgba(123,119,111,.09)_9px_10px)]" />
          <PanelHead tone="bad" title="من غير رحلة" sub="تفتح عشرة، وتخلّص صفر." />
          <div className="relative z-[2] flex flex-1 flex-wrap content-start gap-2.5 [mask-image:linear-gradient(to_bottom,#000_62%,transparent)]">
            {CHAOS.map((c, i) => (
              <span key={c} style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
                className="rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-[.86rem] font-semibold text-muted-foreground shadow-sm">
                {c}
              </span>
            ))}
          </div>
          <PanelOut tone="bad">النتيجة: إحساس إنك مش بتتقدّم</PanelOut>
        </div>

        <div className="grid place-items-center py-5 lg:py-0">
          <span className="grid h-[54px] w-[54px] rotate-90 place-items-center rounded-full border border-border bg-white text-primary shadow-[0_6px_20px_-8px_rgba(22,24,31,.28)] lg:rotate-0">
            <ArrowLeft className="h-5 w-5" />
          </span>
        </div>

        <div className="relative flex min-h-[360px] flex-col overflow-hidden rounded-[26px] bg-blue-tint px-8 pb-7 pt-9">
          <span aria-hidden className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(30,69,196,.16)_1.2px,transparent_0)] [background-size:20px_20px]" />
          <PanelHead tone="good" title="مع COCR" sub="خطوة واحدة قدامك في كل مرة." />
          <div className="relative z-[2] flex-1">
            {ROUTE.map((r, i) => (
              <div key={r}>
                <div className="grid grid-cols-[34px_1fr] items-start gap-3.5">
                  <span className={cn(
                    "grid h-[34px] w-[34px] place-items-center rounded-full border-2 font-display text-[.85rem] font-bold",
                    i === ROUTE.length - 1 ? "border-green bg-green text-white" : "border-primary bg-white text-primary",
                  )}>
                    {i === ROUTE.length - 1 ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="pt-1 text-[.98rem] font-bold">{r}</span>
                </div>
                {i < ROUTE.length - 1 && (
                  <span className="ms-4 block h-[26px] w-0.5 [background:repeating-linear-gradient(to_bottom,#1E45C4_0_4px,transparent_4px_8px)]" />
                )}
              </div>
            ))}
          </div>
          <PanelOut tone="good">النتيجة: حاجة خلّصتها وتقدر توريها</PanelOut>
        </div>
      </Reveal>
    </Section>
  );
}

function PanelHead({ tone, title, sub }: { tone: "good" | "bad"; title: string; sub: string }) {
  return (
    <div className="relative z-[2]">
      <div className="mb-2 flex items-center gap-3">
        <span className={cn("grid h-[34px] w-[34px] place-items-center rounded-full",
          tone === "bad" ? "bg-border text-muted-foreground" : "bg-primary text-white")}>
          {tone === "bad" ? <X className="h-[18px] w-[18px]" /> : <Check className="h-[18px] w-[18px]" />}
        </span>
        <span className={cn("text-[1.06rem] font-extrabold tracking-tight",
          tone === "bad" ? "text-muted-foreground" : "text-blue-700")}>{title}</span>
      </div>
      <p className="mb-6 text-[.92rem] text-muted-foreground">{sub}</p>
    </div>
  );
}

function PanelOut({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <div className={cn("relative z-[2] mt-6 flex items-center gap-2.5 border-t-[1.5px] border-dashed border-slate-400/30 pt-4 text-[.92rem] font-bold",
      tone === "bad" ? "text-muted-foreground" : "text-green")}>
      {tone === "bad" ? <Info className="h-[18px] w-[18px]" /> : <Check className="h-[18px] w-[18px]" />}
      {children}
    </div>
  );
}

/* ================================================================== */
/*  02 — مين COCR                                                      */
/* ================================================================== */
const VERBS = [
  { icon: "bulb", n: "01", title: "تتعلم", sub: "من ناس فاهمة الطريق", tint: "#E9EEFC", accent: "#1E45C4" },
  { icon: "hammer", n: "02", title: "تطبّق", sub: "مشاريع بإيدك", tint: "#FBF1DC", accent: "#B8801F" },
  { icon: "link", n: "03", title: "تتواصل", sub: "مع ناس شبهك", tint: "#E6F3EB", accent: "#1E7A4E" },
  { icon: "rocket", n: "04", title: "تتطور", sub: "لحد ما تساعد غيرك", tint: "#E9E7E2", accent: "#3E403F" },
] as const;

export function WhoSection() {
  return (
    <Section id="who">
      <SectionHead center num="02" label="مين COCR" title="مش مجرد منصة تعليم"
        lead="الفرق مش في كمية المحتوى — الفرق في إن فيه حد ماشي معاك في طريق واضح." />

      <Reveal className="grid overflow-hidden rounded-[26px] border border-border bg-white shadow-[0_8px_28px_-12px_rgba(22,24,31,.14)] lg:grid-cols-[1fr_1px_1fr]">
        <div className="flex flex-col gap-4 bg-sand p-8 lg:p-11">
          <span className="flex items-center gap-2.5 text-[.8rem] font-extrabold tracking-[.1em] text-slate-400">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-border text-muted-foreground"><X className="h-4 w-4" /></span>
            اللي مش بنعمله
          </span>
          <p className="text-[clamp(1.25rem,2.3vw,1.8rem)] font-extrabold leading-[1.55] tracking-tight text-slate-400">
            مش بنتنافس نقدّم أكتر عدد كورسات.
          </p>
        </div>
        <span className="bg-border" />
        <div className="flex flex-col gap-4 p-8 lg:p-11">
          <span className="flex items-center gap-2.5 text-[.8rem] font-extrabold tracking-[.1em] text-primary">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-primary text-white"><Check className="h-4 w-4" /></span>
            اللي بنعمله
          </span>
          <p className="text-[clamp(1.25rem,2.3vw,1.8rem)] font-extrabold leading-[1.55] tracking-tight">
            بنتنافس نقدّم <span className="text-primary">أحسن رحلة تعلّم</span>.
          </p>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {VERBS.map((v, i) => (
          <Reveal key={v.n} delay={i * 70} variant="pop">
            <article className="group relative h-full overflow-hidden rounded-[22px] border border-border bg-white px-6 pb-7 pt-[30px] transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_8px_28px_-12px_rgba(22,24,31,.2)]">
              <span aria-hidden className="absolute -start-[46px] -top-[58px] h-[150px] w-[150px] rounded-full transition-transform duration-500 group-hover:scale-125" style={{ background: v.tint }} />
              <span className="absolute end-[22px] top-5 font-display text-2xl font-extrabold leading-none opacity-25" style={{ color: v.accent }}>{v.n}</span>
              <Icon3D name={v.icon} className="relative mb-5 h-[58px] w-[58px] transition-transform duration-300 group-hover:-rotate-4 group-hover:scale-105" />
              <b className="relative mb-0.5 block text-[1.2rem] font-extrabold tracking-tight">{v.title}</b>
              <span className="relative text-[.9rem] text-muted-foreground">{v.sub}</span>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  03 — الرحلة                                                        */
/* ================================================================== */
const PHASE_TONE: Record<Accent, { acc: string; bg: string; dot: string }> = {
  blue: { acc: "#1E45C4", bg: "#EEF2FE", dot: "rgba(30,69,196,.18)" },
  gold: { acc: "#B8801F", bg: "#FBF1DC", dot: "rgba(184,128,31,.18)" },
  green: { acc: "#1E7A4E", bg: "#EAF6EF", dot: "rgba(30,122,78,.18)" },
  ink: { acc: "#3E403F", bg: "#E9E7E2", dot: "rgba(22,24,31,.16)" },
};

export async function JourneySection() {
  const phases = await getJourneyPhases();
  return (
    <Section id="journey" tone="mist" pattern="blobs">
      <SectionHead center num="03" label="الرحلة" title="تمن خطوات على تلات مراحل"
        lead="مش هتدخل تتعلم وخلاص. كل مرحلة ليها هدف، وكل خطوة بتفتح اللي بعدها." />

      <div className="grid gap-6 lg:grid-cols-3">
        {phases.map((p, i) => {
          const t = PHASE_TONE[p.accent];
          return (
            <Reveal key={p.id} delay={i * 90} variant="pop">
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_22px_50px_-22px_rgba(22,24,31,.3)]">
                <div className="relative overflow-hidden px-6 pb-6 pt-7" style={{ background: t.bg }}>
                  <span aria-hidden className="absolute inset-0"
                    style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, ${t.dot} 1.2px, transparent 0)`,
                      backgroundSize: "18px 18px",
                      maskImage: "linear-gradient(to bottom,#000,transparent)",
                      WebkitMaskImage: "linear-gradient(to bottom,#000,transparent)",
                    }} />
                  <Icon3D name={p.icon} className="absolute end-[22px] top-[22px] z-[2] h-16 w-16 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
                  <span className="relative z-[2] mb-3.5 inline-block rounded-full bg-white px-3 py-1 font-display text-[.68rem] font-extrabold tracking-[.16em] shadow-sm" style={{ color: t.acc }}>
                    {p.tag}
                  </span>
                  <h3 className="relative z-[2] mb-1.5 max-w-[7em] text-[1.34rem] font-extrabold">{p.title}</h3>
                  <p className="relative z-[2] max-w-[16em] text-[.9rem] text-slate-600">{p.subtitle}</p>
                </div>
                <span className="h-[5px]" style={{ background: t.acc }} />

                <ol className="flex-1 list-none px-6 pb-7 pt-6">
                  {p.steps.map((s, si) => (
                    <li key={s.n}>
                      <div className="grid grid-cols-[40px_1fr] items-start gap-4">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl font-display text-[.88rem] font-extrabold text-white"
                          style={{ background: t.acc, boxShadow: `0 6px 14px -6px ${t.acc}` }}>
                          {s.n}
                        </span>
                        <div>
                          <b className="block text-[1.02rem] font-extrabold leading-relaxed">{s.title}</b>
                          <p className="text-[.87rem] leading-relaxed text-muted-foreground">{s.description}</p>
                        </div>
                      </div>
                      {si < p.steps.length - 1 && (
                        <span className="ms-[19px] block h-[22px] w-0.5 opacity-45"
                          style={{ background: `repeating-linear-gradient(to bottom, ${t.acc} 0 4px, transparent 4px 8px)` }} />
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  04 — Near Peer Learning                                            */
/* ================================================================== */
export function NearPeerSection() {
  return (
    <Section id="nearpeer" tone="lilac" pattern="glow">
      <SectionHead center num="04" label="Near Peer Learning"
        title="نفس السؤال... إجابتين مختلفين تماماً"
        lead="جرّب تسأل نفس السؤال لحد سبقك بعشر سنين، ولحد سبقك بسنة. الفرق مش في المعرفة — الفرق إنه لسه فاكر." />

      <Reveal className="relative mx-auto mb-12 max-w-[44em]">
        <div className="flex items-start gap-4 rounded-[22px_22px_22px_6px] border border-border bg-white px-6 py-5 shadow-[0_14px_34px_-22px_rgba(22,24,31,.4)]">
          <Avatar seed="student" className="h-[46px] w-[46px]" />
          <div>
            <div className="mb-1 text-[.8rem] font-bold text-slate-400">سارة · لسه في أول رحلة</div>
            <p className="text-[1.12rem] font-extrabold leading-[1.65] tracking-tight">
              &ldquo;قاعدة من ساعتين على مشكلة في الكود ومش عارفة أطلع منها. أعمل إيه؟&rdquo;
            </p>
          </div>
        </div>
        <span aria-hidden className="mx-auto block h-[38px] w-0.5 [background:repeating-linear-gradient(to_bottom,#E7E0D4_0_5px,transparent_5px_10px)]" />
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <AnswerCard variant="far" name="الخبير" gap="سبقك بـ 10 سنين"
            text="&ldquo;اقرا الـ documentation وافهم المشكلة من أساسها. الموضوع ده بديهي بعد شوية ممارسة.&rdquo;"
            foot="نسي إن الجملة دي نفسها كانت بتلخبطه" />
        </Reveal>
        <Reveal delay={90}>
          <AnswerCard variant="near" name="يوسف · مينتور" gap="سبقك بسنة واحدة"
            text="&ldquo;أنا وقفت في نفس النقطة دي بالظبط. المشكلة غالباً مش في السطر اللي بتبص عليه — ابعتيلي الكود وأنا أوريكي أنا لقيتها إزاي.&rdquo;"
            foot="لسه فاكر التفصيلة اللي عطّلته" />
        </Reveal>
      </div>

      <Reveal delay={120} className="mt-9">
        <div className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-white px-7 py-6 text-center lg:flex-row lg:text-start">
          <Icon3D name="link" className="h-12 w-12 shrink-0" />
          <p className="text-[.98rem] text-slate-600">
            عشان كده كل مينتور في COCR <b className="text-foreground">خلّص نفس الرحلة اللي أنت فيها دلوقتي</b> — من سنة أو اتنين، مش أكتر.
            الفجوة القريبة هي اللي بتخلّي المساعدة مفيدة فعلاً.
          </p>
        </div>
      </Reveal>
    </Section>
  );
}

function AnswerCard({
  variant, name, gap, text, foot,
}: { variant: "far" | "near"; name: string; gap: string; text: string; foot: string }) {
  const near = variant === "near";
  return (
    <article className={cn(
      "relative flex h-full flex-col gap-3.5 overflow-hidden rounded-3xl border px-7 py-[30px] transition-transform duration-300 hover:-translate-y-1",
      near ? "border-primary bg-white shadow-[0_22px_48px_-26px_rgba(30,69,196,.55)]" : "border-border bg-sand",
    )}>
      <span aria-hidden className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${near ? "rgba(30,69,196,.14)" : "rgba(123,119,111,.16)"} 1.2px, transparent 0)`,
          backgroundSize: "20px 20px",
          maskImage: "linear-gradient(to bottom,#000,transparent 65%)",
          WebkitMaskImage: "linear-gradient(to bottom,#000,transparent 65%)",
        }} />
      <div className="relative z-[2] flex items-center gap-3.5">
        <Avatar seed={near ? "near" : "far"} className="h-14 w-14" />
        <div>
          <div className="text-[1.02rem] font-extrabold leading-snug">{name}</div>
          <div className={cn("text-[.8rem] font-bold", near ? "text-primary" : "text-slate-400")}>{gap}</div>
        </div>
        <span className={cn("ms-auto grid h-8 w-8 place-items-center rounded-full",
          near ? "bg-green text-white" : "bg-border text-slate-400")}>
          {near ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </span>
      </div>
      <p className={cn("relative z-[2] flex-1 text-base leading-[1.85]", !near && "text-slate-400")}>{text}</p>
      <div className={cn("relative z-[2] flex items-center gap-2.5 border-t border-dashed border-border pt-3.5 text-[.83rem] font-bold",
        near ? "text-green" : "text-slate-400")}>
        {near ? <Check className="h-[18px] w-[18px]" /> : <Info className="h-[18px] w-[18px]" />}
        {foot}
      </div>
    </article>
  );
}

/** بورتريه مرسوم — يتبدّل بـ <Image> أول ما الصور الحقيقية تجهز */
function Avatar({ seed, className }: { seed: "student" | "near" | "far"; className?: string }) {
  const P = {
    student: { bg: "#EDE7DC", body: "#A6A199", skin: "#D9A278", hair: "#3A2A1C" },
    near: { bg: "#E3E9FC", body: "#1E45C4", skin: "#E0A87B", hair: "#2A1D14" },
    far: { bg: "#E2DDD3", body: "#3E403F", skin: "#C99A6E", hair: "#8E8B85" },
  }[seed];
  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-full", className)}>
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <rect width="64" height="64" fill={P.bg} />
        <circle cx="32" cy="54" r="23" fill={P.body} />
        <circle cx="32" cy="26" r="14" fill={P.skin} />
        <path d="M18 25c0-8 6-14 14-14s14 6 14 14c-2-5-6-6-14-6s-12 1-14 6z" fill={P.hair} />
      </svg>
    </span>
  );
}

/* ================================================================== */
/*  05 — أقسام المنصة                                                  */
/* ================================================================== */
const RAIL = [
  { label: "الأساسيات", tail: "6 دروس", done: true },
  { label: "التطبيق الأول", tail: "مهمة", done: true },
  { label: "مشروع مصغّر", tail: "تسليم" },
  { label: "مراجعة مينتور", tail: "جلسة" },
  { label: "مشروع التخرّج", tail: "بورتفوليو" },
];

export async function PlatformSectionsBlock() {
  const sections = await getPlatformSections();
  const featured = sections.find((s) => s.featured)!;
  const rest = sections.filter((s) => !s.featured);

  return (
    <Section id="sections" tone="sage" pattern="grid">
      <SectionHead center num="05" label="أقسام المنصة" title="سبع حاجات، وكل واحدة بتكمّل اللي قبلها" />

      <Reveal className="mb-6 grid items-center gap-10 rounded-[26px] border border-border bg-white p-8 shadow-[0_8px_28px_-12px_rgba(22,24,31,.14)] lg:grid-cols-[1.02fr_.98fr] lg:p-10">
        <div>
          <span className="mb-4 inline-block rounded-full bg-blue-50 px-3.5 py-1 text-[.72rem] font-extrabold tracking-[.14em] text-primary">القلب</span>
          <Icon3D name={featured.icon} className="mb-4 h-16 w-16" />
          <h3 className="mb-2 text-2xl font-extrabold tracking-tight">{featured.title}</h3>
          <p className="text-muted-foreground">{featured.description}</p>
          <Link href="/courses" className="group mt-4 inline-flex items-center gap-2 text-[.94rem] font-bold text-primary">
            استكشف الرحلات <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
        <div className="grid gap-2.5 rounded-[18px] border border-border bg-sand p-[18px]" aria-hidden>
          {RAIL.map((r) => (
            <div key={r.label} className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[.87rem] font-semibold",
              r.done ? "border-primary bg-blue-50 font-bold text-blue-700" : "border-border bg-white text-slate-600",
            )}>
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                r.done ? "border-primary bg-primary text-white" : "border-border")}>
                {r.done && <Check className="h-3 w-3" />}
              </span>
              {r.label}
              <span className="ms-auto font-display text-[.72rem] text-slate-400">{r.tail}</span>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((m, i) => (
          <Reveal key={m.id} delay={i * 60} variant="pop">
            <article className="h-full rounded-3xl border border-border bg-white px-6 py-[26px] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_8px_28px_-12px_rgba(22,24,31,.2)]">
              <Icon3D name={m.icon} className="mb-4 h-[52px] w-[52px]" />
              <h3 className="mb-1 text-[1.12rem] font-extrabold">{m.title}</h3>
              <p className="text-[.91rem] leading-relaxed text-muted-foreground">{m.description}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  06 — المينتورز                                                     */
/* ================================================================== */
const MENTOR_BG: Record<Accent, string> = {
  blue: "from-[#5B7EE8] to-[#1E45C4]", gold: "from-[#F4BE60] to-[#B8801F]",
  green: "from-[#86D9AE] to-[#1E7A4E]", ink: "from-[#A6A199] to-[#3E403F]",
};

const MENTOR_CARD_OFFSET = ["", "sm:mt-8", "sm:mt-4"];

export async function MentorsSection() {
  const allMentors = await getMentors();
  // بس اللي ليهم صورة حقيقية — مش عايزين كارت فاضي بحروف initials جنب اللي ليهم بورتريه
  const mentors = allMentors.filter((m) => m.photo);
  return (
    <Section id="mentors">
      <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-center lg:gap-16">
        <SectionHead num="06" label="المينتورز" title="مش أساتذة — خرّيجين الرحلة اللي أنت فيها"
          lead="كل واحد فيهم خلّص نفس المسار وبقى بيراجع للي بعده." />

        <div className="relative">
          {/* زخرفة بهوية COCR حوالين الكروت — نجوم بيضا بتلف ببطء وتكبر وتوقف لفّها لما الطالب يمرّ عليها بالماوس */}
          <Star aria-hidden className="absolute -top-7 right-[10%] hidden h-7 w-7 fill-white text-white drop-shadow-[0_2px_6px_rgba(22,24,31,.28)] transition-transform duration-300 ease-out motion-safe:animate-[spin_16s_linear_infinite] hover:scale-150 hover:[animation-play-state:paused] motion-reduce:animate-none sm:block" />
          <Star aria-hidden className="absolute -top-4 left-[30%] hidden h-4 w-4 fill-white text-white drop-shadow-[0_2px_5px_rgba(22,24,31,.28)] transition-transform duration-300 ease-out motion-safe:animate-[spin_13s_linear_infinite] hover:scale-150 hover:[animation-play-state:paused] motion-reduce:animate-none sm:block" />
          <Star aria-hidden className="absolute bottom-14 -left-3 hidden h-5 w-5 fill-white text-white drop-shadow-[0_2px_5px_rgba(22,24,31,.28)] transition-transform duration-300 ease-out motion-safe:animate-[spin_11s_linear_infinite] hover:scale-150 hover:[animation-play-state:paused] motion-reduce:animate-none sm:block" />
          <Star aria-hidden className="absolute -right-3 top-1/2 h-4 w-4 fill-white text-white drop-shadow-[0_2px_5px_rgba(22,24,31,.28)] transition-transform duration-300 ease-out motion-safe:animate-[spin_9s_linear_infinite] hover:scale-150 hover:[animation-play-state:paused] motion-reduce:animate-none" />
          <Star aria-hidden className="absolute -bottom-4 right-[38%] hidden h-3.5 w-3.5 fill-white text-white drop-shadow-[0_2px_4px_rgba(22,24,31,.28)] transition-transform duration-300 ease-out motion-safe:animate-[spin_7s_linear_infinite] hover:scale-150 hover:[animation-play-state:paused] motion-reduce:animate-none sm:block" />

          <div className="grid gap-7 sm:grid-cols-3">
            {mentors.map((m, i) => (
              <Reveal key={m.id} delay={i * 90} variant="pop" className={MENTOR_CARD_OFFSET[i] ?? ""}>
                <article className="relative h-full overflow-hidden rounded-3xl border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_38px_-20px_rgba(22,24,31,.32)]">
                  {m.photo ? (
                    <Image src={m.photo} alt={m.name} width={500} height={500} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className={cn("grid aspect-square place-items-center bg-gradient-to-br text-[2.6rem] font-extrabold text-white", MENTOR_BG[m.accent])}>
                      {m.initial}
                    </div>
                  )}
                  <div className="px-5 pb-6 pt-5">
                    <b className="block text-[1.02rem] font-extrabold">{m.name}</b>
                    <div className="mb-3.5 font-display text-[.82rem] text-muted-foreground">{m.track}</div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[.76rem] font-bold text-green">
                      <Check className="h-3.5 w-3.5" /> {m.gapLabel}
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <Reveal delay={160} className="mt-10 flex flex-wrap items-center gap-4">
        <Link href="/courses" className="group inline-flex items-center gap-2 text-[.94rem] font-bold text-primary">
          قابل المينتورز <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-white px-[18px] py-2 text-[.8rem] font-semibold text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          نماذج توضيحية لشكل ملف المينتور
        </span>
      </Reveal>
    </Section>
  );
}

/* ================================================================== */
/*  07 — الكورسات                                                      */
/* ================================================================== */
export async function CoursesSection() {
  const [courses, categories] = await Promise.all([getCourses(), getCourseCategories()]);
  return (
    <Section id="courses" tone="clay" pattern="grid">
      <SectionHead center num="07" label="الكورسات" title="كورسات قصيرة، كل واحد بيخلّص بحاجة عملتها"
        lead="مفيش كورس هنا بينتهي بفيديو — كل واحد آخره تسليم بيتراجع من مينتور." />

      <Reveal><CourseGrid initialCourses={courses} categories={categories} /></Reveal>

      <div className="mt-8 flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-white px-[18px] py-2 text-[.82rem] font-semibold text-muted-foreground">
          التقييمات هنا تجريبية في مرحلة الـ Beta
        </span>
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  08 — المشاريع                                                      */
/* ================================================================== */
export async function ProjectsSection() {
  const projects = (await getPublishedProjects()).slice(0, 3);
  if (projects.length === 0) return null;

  return (
    <Section id="projects" tone="mist" pattern="diag">
      <SectionHead num="08" label="المشاريع" title="النتيجة مش شهادة — النتيجة حاجة بنيتها" />
      <div className="grid gap-6 lg:grid-cols-3">
        {projects.map((p, i) => (
          <Reveal key={p.id} delay={i * 80} variant="pop">
            <Link href={`/projects/${p.id}`} className="block h-full overflow-hidden rounded-3xl border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_28px_-12px_rgba(22,24,31,.2)]">
              <div className="grid aspect-[16/10] place-items-center border-b border-border bg-sand p-3.5">
                <Icon3D name="hammer" className="h-20 w-20" />
              </div>
              <div className="px-5 pb-[22px] pt-[18px]">
                <h3 className="mb-1 text-[1.12rem] font-extrabold">{p.title}</h3>
                <div className="font-display text-[.82rem] text-muted-foreground">
                  {p.skills[0] ?? "مشروع طالب"} · {p.owner?.display_name || "طالب COCR"}
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      <Reveal delay={200} className="mt-9">
        <Link href="/projects" className="group inline-flex items-center gap-2 text-[.94rem] font-bold text-primary">
          استكشف كل المشاريع <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
        </Link>
      </Reveal>
    </Section>
  );
}

/* ================================================================== */
/*  09 — المجتمع                                                       */
/* ================================================================== */
export function CommunitySection() {
  return (
    <Section id="stories" tone="plain" pattern="dots">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-[72px]">
        <Reveal>
          <span className="block font-display text-[clamp(2.6rem,5vw,4rem)] font-extrabold leading-[.9] tracking-tighter text-green/40">09</span>
          <span className="mb-3.5 mt-2.5 block text-[.75rem] font-extrabold tracking-[.18em] text-green">المجتمع</span>
          <h2 className="mb-4 text-[clamp(1.95rem,3.9vw,2.95rem)] font-extrabold leading-tight tracking-tight">
            أصعب حاجة في التعلم إنك تحس إنك لوحدك
          </h2>
          <p className="max-w-[34em] text-[1.12rem] leading-[1.9] text-muted-foreground">
            في COCR السؤال بيلاقي رد من حد عدّى بيه من سنة — مش من حد بيتفرج عليك من فوق.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-green/25 bg-green-50 px-4 py-1.5 text-[.8rem] font-semibold text-green">
            محتوى تجريبي في مرحلة الـ Beta
          </span>
        </Reveal>

        <Reveal delay={100} className="grid gap-3.5">
          <Msg name="سارة م." meta="لسه في أول رحلة" seed="student"
            text="حاسة إني مش فاهمة حاجة وكل الناس سابقاني. حد عدّى بالإحساس ده؟" />
          <Msg reply name="يوسف ط." meta="مينتور · كان مكانك السنة اللي فاتت" seed="near"
            text="كلنا عدّينا بيها. الإحساس ده بيروح أول ما تخلّص أول حاجة بإيدك — مش أول ما تفهم كل حاجة."
            tick="ساعد 23 طالب" />
        </Reveal>
      </div>
    </Section>
  );
}

function Msg({
  name, meta, text, seed, reply, tick,
}: {
  name: string; meta: string; text: string;
  seed: "student" | "near"; reply?: boolean; tick?: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-[18px]",
      reply ? "ms-10 border-primary/25 bg-blue-50" : "border-border bg-white")}>
      <div className="mb-2 flex items-center gap-2.5">
        <Avatar seed={seed} className="h-8 w-8" />
        <b className="text-[.88rem] font-bold">{name}</b>
        <span className="text-[.75rem] text-muted-foreground">{meta}</span>
      </div>
      <p className="text-[.92rem] leading-[1.75] text-foreground/80">{text}</p>
      {tick && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[.76rem] font-bold text-green">
          <Check className="h-4 w-4" /> {tick}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  10 — الفرص                                                         */
/* ================================================================== */
const OPP_TONE: Record<Accent, { bg: string; dot: string }> = {
  blue: { bg: "#EEF2FE", dot: "rgba(30,69,196,.18)" },
  green: { bg: "#EAF6EF", dot: "rgba(30,122,78,.18)" },
  ink: { bg: "#F3EEE4", dot: "rgba(123,119,111,.18)" },
  gold: { bg: "#FBF1DC", dot: "rgba(184,128,31,.18)" },
};

export async function OpportunitiesSection() {
  const opps = await getOpportunities();
  return (
    <Section id="opps">
      <SectionHead center num="10" label="وبعدين" title="الرحلة مش بتقف عند آخر درس"
        lead="بعد ما تخلّص، فيه تلات طرق تكمّل بيهم — كل واحدة بتفتحلك باب مختلف." />

      <div className="grid gap-[22px] lg:grid-cols-3">
        {opps.map((o, i) => {
          const t = OPP_TONE[o.accent];
          return (
            <Reveal key={o.id} delay={i * 80} variant="pop">
              <article className="relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl border border-border px-[30px] pb-7 pt-[34px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_28px_-12px_rgba(22,24,31,.2)]"
                style={{ background: t.bg }}>
                <span aria-hidden className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, ${t.dot} 1.2px, transparent 0)`,
                    backgroundSize: "20px 20px",
                    maskImage: "linear-gradient(to bottom,#000,transparent 70%)",
                    WebkitMaskImage: "linear-gradient(to bottom,#000,transparent 70%)",
                  }} />
                <Icon3D name={o.icon} className="relative z-[2] h-[52px] w-[52px]" />
                <h3 className="relative z-[2] text-[1.2rem] font-extrabold">{o.title}</h3>
                <p className="relative z-[2] flex-1 text-[.93rem] text-muted-foreground">{o.description}</p>
                <Link href="/opportunities" className="group relative z-[2] mt-1.5 inline-flex items-center gap-2 text-[.94rem] font-bold text-primary">
                  {o.cta} <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
                </Link>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  11 — هتبقى مين                                                     */
/* ================================================================== */
export async function GrowthSection() {
  const rungs = await getGrowthLadder();
  return (
    <Section id="grow" tone="sage" pattern="blobs">
      <SectionHead center num="11" label="هتبقى مين" title="النهارده بتتعلم... بكرة أنت اللي بتعلّم"
        lead="ده مش شعار — ده إزاي المنصة بتشتغل. المينتور بتاعك كان طالب هنا." />

      <GrowthLadder rungs={rungs} />
    </Section>
  );
}

/* ================================================================== */
/*  12 — الأسئلة + CTA + الفوتر                                        */
/* ================================================================== */
export async function FaqSection() {
  const faqs = await getFaqs();
  return (
    <Section id="faq">
      <SectionHead center num="12" label="الأسئلة" title="لسه عندك سؤال؟" />
      <Reveal><FaqAccordion faqs={faqs} /></Reveal>
    </Section>
  );
}

export function CtaSection() {
  return (
    <section id="start" className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-primary to-[#0B1633] py-[76px] text-center text-white lg:py-[112px]">
      <span aria-hidden className="pattern-dots pattern-on-dark pointer-events-none absolute inset-0" />
      <span aria-hidden className="pointer-events-none absolute -top-40 start-[-10%] h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
      <div className="relative z-[2] mx-auto max-w-[42em] px-7">
        <JourneyEndVisual />
        <Reveal as="h2" className="mb-[18px] text-[clamp(1.95rem,3.9vw,2.95rem)] font-extrabold leading-tight tracking-tight">
          متستناش تبقى جاهز 100٪
        </Reveal>
        <Reveal delay={80} className="mx-auto mb-9 max-w-[34em] text-[1.08rem] text-white/85">
          ابدأ، اغلط، ابنِ، واتعرف على ناس جديدة — وخلي كل خطوة تقرّبك من الشخص اللي نفسك تبقى عليه.
        </Reveal>
        <Reveal delay={160} variant="pop">
          <Link href="/register" className="inline-flex min-h-[56px] items-center justify-center rounded-xl bg-cream px-8 text-[1.05rem] font-bold text-[#0B1633] shadow-[0_8px_22px_-8px_rgba(0,0,0,.35)] transition-all hover:-translate-y-0.5">
            ابدأ رحلتك مع COCR
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

const FOOTER_COLS = [
  { title: "المنصة", links: [["الرحلة", "/#journey"], ["أقسام المنصة", "/#sections"], ["المينتورز", "/#mentors"], ["الكورسات", "/courses"], ["المشاريع", "/projects"]] },
  { title: "الفرص", links: [["الفعاليات", "/opportunities"], ["المنح", "/opportunities"], ["التطوع", "/opportunities"], ["المجتمع", "/#stories"]] },
  { title: "COCR", links: [["قصتنا", "/about"], ["الأمان والثقة", "/safety"], ["مين COCR", "/#who"], ["Near Peer Learning", "/#nearpeer"], ["الأسئلة", "/#faq"], ["تواصل معانا", "/policies/safety-contact"]] },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#14161C] pb-8 pt-[72px] text-white/65">
      <div className="mx-auto max-w-[1160px] px-7">
        <div className="grid gap-10 border-b border-white/10 pb-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <span className="flex items-center gap-3 font-display text-[1.3rem] font-extrabold tracking-tight text-white">
              <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-gradient-to-br from-[#2E58DE] to-[#16349B]">
                <Icon3D name="logo" className="h-[22px] w-[22px]" />
              </span>
              COCR
            </span>
            <p className="mt-4 max-w-[24em] text-[.92rem]">
              Community Of Creativity — منظومة تعليمية للطلاب مبنية على Near Peer Learning.
            </p>
          </div>
          {FOOTER_COLS.map((c) => (
            <div key={c.title}>
              <h4 className="mb-4 text-[.95rem] font-bold text-white">{c.title}</h4>
              <ul className="grid list-none gap-2.5">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-[.9rem] transition-colors hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3.5 pt-6 text-[.85rem] text-white/40">
          <span>© 2026 COCR. كل الحقوق محفوظة.</span>
          <span>سياسة الخصوصية · شروط الاستخدام</span>
        </div>
      </div>
    </footer>
  );
}
