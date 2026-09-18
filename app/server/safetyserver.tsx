import Link from "next/link";
import { ShieldCheck, Flag, UserCheck, FileCheck2 } from "lucide-react";
import { Section, SectionHead, SiteFooter } from "./landingserver";
import { Reveal } from "../client/landing_client";
import type { IconName } from "../types/types";
import { Icon3D } from "@/components/homecomponent/icon-sprite";

/* ================================================================== */
/*  الهيرو                                                             */
/* ================================================================== */
function SafetyHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-tint to-cream pb-[90px] pt-20">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[46em] px-7 text-center">
        <Reveal className="mb-5 flex justify-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </span>
        </Reveal>
        <Reveal as="h1" delay={40} className="mb-5 text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.22] tracking-[-.02em]">
          الأمان مش خطوة إضافية — <span className="text-primary">هو جزء من إزاي المنصة بُنيت</span>
        </Reveal>
        <Reveal delay={80} className="mx-auto max-w-[38em] text-[1.1rem] leading-[1.9] text-muted-foreground">
          من أول ما حد يقدّم يبقى مينتور، لحد أي محتوى بينشر على المنصة — فيه مراجعة حقيقية بتحصل من فريق COCR قبل ما أي حاجة توصلك. الصفحة دي بتشرح الآليات دي بالظبط، من غير أرقام مبالَغ فيها.
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  إزاي بنختار المينتورز                                              */
/* ================================================================== */
const MENTOR_SAFEGUARDS: { icon: IconName; title: string; desc: string }[] = [
  { icon: "shield", title: "كل مينتور بيتراجع من الفريق", desc: "طلب الانضمام كمينتور مش بيتوافق عليه أوتوماتيك — فريق COCR بيراجعه شخصيًا قبل أي موافقة." },
  { icon: "heart", title: "موافقة ولي الأمر مطلوبة", desc: "فريق COCR بيتواصل مع ولي أمر المينتور للتأكيد قبل الموافقة النهائية — مش مجرد تيك في مربّع." },
  { icon: "compass", title: "السن مناسب للسن", desc: "كل مينتور بيحدد مقدمًا السن اللي مرتاح ومناسب يعلّمه، والمطابقة مع الطلاب بتحصل على أساس ده." },
  { icon: "medal", title: "موافقة صريحة على سياسة الأمان", desc: "كل مينتور بيقرأ ويوافق كتابةً على سياسة أمان واضحة قبل ما يبدأ يتفاعل مع أي طالب." },
];

function MentorVettingSection() {
  return (
    <Section tone="sand" pattern="grid">
      <SectionHead
        center
        label="قبل ما تقابل مينتور"
        title="مفيش حد بيبقى مينتور من غير مراجعة"
        lead="مش كل اللي بيقدّم بيتقبل، ومفيش موافقة أوتوماتيكية — كل خطوة هنا فيها إنسان حقيقي بيراجع."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {MENTOR_SAFEGUARDS.map((s, i) => (
          <Reveal key={s.title} delay={i * 60} variant="pop">
            <article className="h-full rounded-3xl border border-border bg-white px-5 py-[26px] text-center transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_8px_28px_-12px_rgba(22,24,31,.2)]">
              <Icon3D name={s.icon} className="mx-auto mb-4 h-[52px] w-[52px]" />
              <h3 className="mb-1 text-[1.02rem] font-extrabold">{s.title}</h3>
              <p className="text-[.86rem] leading-relaxed text-muted-foreground">{s.desc}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  لو حسّيت إن حاجة مش مظبوطة                                          */
/* ================================================================== */
function ReportingSection() {
  return (
    <Section>
      <SectionHead
        center
        label="لو حسّيت إن حاجة مش مظبوطة"
        title="زرار الإبلاغ موجود جنب أي حاجة، مش مخبّي"
        lead="على أي مشروع، تسليم، أو تفاعل مع مينتور — تقدر تبلّغ في ثانية."
      />

      <div className="mx-auto grid max-w-[880px] gap-5 sm:grid-cols-3">
        <Reveal variant="pop">
          <div className="h-full rounded-3xl border border-border bg-white px-6 py-7 text-center">
            <Flag className="mx-auto mb-3.5 h-9 w-9 text-primary" />
            <h3 className="mb-1.5 text-[.98rem] font-extrabold">بلّغ في أي وقت</h3>
            <p className="text-[.86rem] leading-relaxed text-muted-foreground">
              زرار إبلاغ متاح على المشاريع، التسليمات، وأي تفاعل مع مينتور. هويتك كمُبلّغ محمية بالكامل.
            </p>
          </div>
        </Reveal>
        <Reveal delay={60} variant="pop">
          <div className="h-full rounded-3xl border border-border bg-white px-6 py-7 text-center">
            <UserCheck className="mx-auto mb-3.5 h-9 w-9 text-primary" />
            <h3 className="mb-1.5 text-[.98rem] font-extrabold">الفريق بيراجع كل بلاغ</h3>
            <p className="text-[.86rem] leading-relaxed text-muted-foreground">
              كل بلاغ بيوصل لفريق COCR وبيتراجع — مش بيتسجّل وبس ويتنسى.
            </p>
          </div>
        </Reveal>
        <Reveal delay={120} variant="pop">
          <div className="h-full rounded-3xl border border-border bg-white px-6 py-7 text-center">
            <ShieldCheck className="mx-auto mb-3.5 h-9 w-9 text-primary" />
            <h3 className="mb-1.5 text-[.98rem] font-extrabold">الصلاحيات بتتسحب فورًا</h3>
            <p className="text-[.86rem] leading-relaxed text-muted-foreground">
              لو مينتور خالف، صلاحياته بتتعلّق على طول — من غير استنى دورة مراجعة تانية.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  المحتوى بيتراجع قبل ما ينزل                                        */
/* ================================================================== */
function ContentReviewSection() {
  return (
    <Section tone="blue" pattern="dots">
      <SectionHead
        center
        label="قبل ما ينزل أي محتوى"
        title="اللي بيكتب المحتوى مش هو اللي بيوافق عليه"
        lead="قاعدة ثابتة عندنا على الكورسات والفرص: الشخص اللي بيبحث أو بيكتب مش نفس الشخص اللي بيوافق على النشر."
      />

      <div className="mx-auto flex max-w-[640px] items-start gap-4 rounded-3xl border border-border bg-white px-7 py-8">
        <FileCheck2 className="mt-1 h-8 w-8 shrink-0 text-primary" />
        <p className="text-[.95rem] leading-[1.9] text-muted-foreground">
          سواء كورس بيتحضّر أو فرصة بتتراجع من مصدرها الرسمي، مفيش نشر من غير مراجع تاني. القاعدة دي مطبّقة على مستوى النظام نفسه، مش مجرد سياسة مكتوبة.
        </p>
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  السياسات + تواصل                                                  */
/* ================================================================== */
function PoliciesLinkSection() {
  return (
    <Section tone="sand" pattern="grid">
      <div className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <h2 className="mb-3.5 text-[1.4rem] font-extrabold">كل سياساتنا متاحة وواضحة</h2>
          <p className="mb-7 text-[.95rem] leading-relaxed text-muted-foreground">
            بنبني COCR في مرحلة Beta بشفافية — السياسات اللي بتحكم المنصة كلها متاحة تقرأها في أي وقت.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/policies" className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-primary px-7 text-[1rem] font-bold text-white transition-all hover:-translate-y-0.5">
              كل السياسات
            </Link>
            <Link href="/policies/safety-contact" className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-border px-7 text-[1rem] font-bold text-foreground transition-all hover:border-primary/40">
              تواصل بخصوص الأمان
            </Link>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ================================================================== */
/*  الصفحة الكاملة                                                     */
/* ================================================================== */
export function SafetyPageContent() {
  return (
    <main>
      <SafetyHero />
      <MentorVettingSection />
      <ReportingSection />
      <ContentReviewSection />
      <PoliciesLinkSection />
      <SiteFooter />
    </main>
  );
}
