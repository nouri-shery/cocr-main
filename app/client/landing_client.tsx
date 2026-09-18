'use client';

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ArrowLeft, Clock, PlayCircle, Star, Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon3D } from "@/components/homecomponent/icon-sprite";
import { getCourses } from "../actions/landing_page_actions";
import { Course, CourseCategory, Faq, GrowthRung } from "../types/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* دالة دمج الكلاسات (cn)                                            */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Reveal — ظهور العناصر مع السكرول                                    */
/* ------------------------------------------------------------------ */
/**
 * أنماط الظهور الأربعة زي الملف المرجعي بالظبط:
 * up (نص/هيدر) — pop (كروت الجريد، سكيل مش سلايد) — left/right (بلوكات غير متماثلة)
 */
const REVEAL_HIDDEN: Record<string, string> = {
  up: "translate-y-6 opacity-0",
  pop: "scale-95 opacity-0",
  left: "-translate-x-7 opacity-0",
  right: "translate-x-7 opacity-0",
};
const REVEAL_SHOWN: Record<string, string> = {
  up: "translate-y-0 opacity-100",
  pop: "scale-100 opacity-100",
  left: "translate-x-0 opacity-100",
  right: "translate-x-0 opacity-100",
};

export function Reveal({
  children, className, delay = 0, as: Tag = "div", variant = "up",
}: {
  children: React.ReactNode; className?: string; delay?: number;
  as?: React.ElementType; variant?: "up" | "pop" | "left" | "right";
}) {
  const ref = React.useRef<HTMLElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { threshold: 0.15, rootMargin: "0px 0px -70px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-brand motion-reduce:transition-none",
        shown ? REVEAL_SHOWN[variant] : REVEAL_HIDDEN[variant],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Navbar — شريط ثابت في أول الصفحة                                    */
/* ------------------------------------------------------------------ */
/**
 * الناف بار بقى للتنقّل بين صفحات فعلية بيرجعلها الطالب باستمرار، مش سكاشن
 * قصة الهوم (المشكلة/الرحلة/ليه كوكر/قصص) — دي لسه موجودة كسكاشن في صفحة
 * الرئيسية، بس مبقتش محتاجة لينك منفصل ليها في الناف بار.
 */
const NAV_LINKS = [
  { href: "#top", label: "الرئيسية" },
  { href: "/courses", label: "الكورسات" },
  { href: "/projects", label: "المشاريع" },
  { href: "/opportunities", label: "الفرص والمنح" },
  { href: "/about", label: "قصتنا" },
];

/** ناف بار المنتج بعد تسجيل الدخول — مختلف عن ناف بار التسويق (فوق)، عشان
 * تحس إنك دلوقتي جوّا المنتج مش لسه بتتصفح صفحة تعريفية. نفس الهوية
 * البصرية (نفس الـ pill، نفس الألوان) بس روابط منتج مش سكاشن تسويقية */
const AUTH_NAV_LINKS = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/courses", label: "اتعلّم" },
  { href: "/projects", label: "ابنِ" },
  { href: "/opportunities", label: "اكتشف" },
  { href: "/profile", label: "بروفايلي" },
];

/** لينك إضافي بيظهر بس للمينتور المعتمد — عشان يحس إنه "جوّا وضع تاني" في
 * المنصة، مش نفس تجربة الطالب بالظبط */
const MENTOR_NAV_LINK = { href: "/mentor", label: "مينتور" };

export function Navbar({
  isAuthenticated = false, displayName = null, isApprovedMentor = false,
}: { isAuthenticated?: boolean; displayName?: string | null; isApprovedMentor?: boolean } = {}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [active, setActive] = React.useState("#top");
  const links = isAuthenticated
    ? (isApprovedMentor ? [...AUTH_NAV_LINKS, MENTOR_NAV_LINK] : AUTH_NAV_LINKS)
    : NAV_LINKS;

  React.useEffect(() => {
    if (!isHome || isAuthenticated) return;
    const onScroll = () => {
      const y = window.scrollY + 140;
      let current = NAV_LINKS[0].href;
      for (const l of NAV_LINKS) {
        if (!l.href.startsWith("#")) continue;
        const el = document.querySelector(l.href) as HTMLElement | null;
        if (el && el.offsetTop <= y) current = l.href;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome, isAuthenticated]);

  const isActive = (href: string) => (href.startsWith("#") ? isHome && active === href : pathname.startsWith(href));
  // روابط الـ hash (زي #courses) لازم تودّي للهوم بيج + الـ hash — مش تتلزّق على مسار الصفحة الحالية
  const hashHref = (href: string) => (href.startsWith("#") && !isHome ? `/${href}` : href);

  return (
    <header className="sticky top-0 z-50 bg-sugar-white/75 pb-2 pt-5 backdrop-blur-md">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="flex h-[66px] items-center gap-[18px] rounded-full border border-border bg-white ps-5 pe-2.5 shadow-[0_14px_34px_-22px_rgba(22,24,31,.5)]">
          <Link href={hashHref("#top")} className="flex items-center gap-3 font-display text-[1.3rem] font-extrabold tracking-tight">
            <span className="relative grid h-[38px] w-[38px] place-items-center rounded-xl bg-gradient-to-br from-[#2E58DE] to-[#16349B] shadow-[0_6px_14px_-6px_rgba(30,69,196,.7)]">
              <Icon3D name="logo" className="h-[22px] w-[22px]" />
              <span className="absolute -top-[3px] -end-[3px] h-2.5 w-2.5 rounded-full border-2 border-cream bg-gold" />
            </span>
            COCR
          </Link>

          <nav aria-label={isAuthenticated ? "أقسام المنصة" : "أقسام الصفحة"} className="mx-auto hidden items-center gap-0.5 rounded-full bg-border/50 p-[5px] lg:flex">
            {links.map((l) => (
              <Link
                key={l.href} href={hashHref(l.href)}
                className={cn(
                  "rounded-full px-4 py-2 text-[.9rem] font-semibold transition-all",
                  isActive(l.href)
                    ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_rgba(30,69,196,.65)]"
                    : "text-muted-foreground hover:bg-white/80 hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated ? (
              <>
                <Link href="/saved" className="text-[.9rem] font-semibold text-muted-foreground transition-colors hover:text-primary">
                  المفتكرة
                </Link>
                <Link href="/profile" className={cn(buttonVariants({ size: "sm" }))}>
                  {displayName ? `أهلًا يا ${displayName.split(" ")[0]}` : "بياناتك"}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-[.9rem] font-semibold text-muted-foreground transition-colors hover:text-primary">
                  تسجيل الدخول
                </Link>
                <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
                  ابدأ رحلتك
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open} aria-controls="mobile-nav" aria-label="فتح القائمة"
            className="ms-auto rounded-xl border border-border bg-white p-2.5 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {open && (
          <div id="mobile-nav" className="mt-3 flex flex-col gap-1 rounded-[22px] border border-border bg-cream p-3 shadow-[0_24px_50px_-26px_rgba(22,24,31,.6)] lg:hidden">
            {links.map((l) => (
              <Link key={l.href} href={hashHref(l.href)} onClick={() => setOpen(false)}
                className="rounded-full px-4 py-3 text-center text-[.9rem] font-semibold text-muted-foreground hover:bg-white">
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link href="/saved" onClick={() => setOpen(false)}
                  className="rounded-full px-4 py-3 text-center text-[.9rem] font-semibold text-muted-foreground hover:bg-white">
                  المفتكرة
                </Link>
                <Link href="/profile" onClick={() => setOpen(false)} className={cn(buttonVariants(), "mt-1")}>
                  بياناتك
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}
                  className="rounded-full px-4 py-3 text-center text-[.9rem] font-semibold text-muted-foreground hover:bg-white">
                  تسجيل الدخول
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className={cn(buttonVariants(), "mt-1")}>
                  ابدأ رحلتك
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* PassportVisual — الجواز بحركة ختم الشارات                              */
/* ------------------------------------------------------------------ */
const BADGES = [
  { label: "قائد", color: "#E0A02C", rotate: "-9deg", d: "M4 17.5 5.5 7l4.5 4L12 5l2 6 4.5-4L20 17.5zM4.5 20.5h15" },
  { label: "مشروع", color: "#1E45C4", rotate: "7deg", d: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5" },
  { label: "تطوّع", color: "#E0503A", rotate: "-6deg", d: "M4 15.5c3-6 5.5 2 8.5-4S18 6.5 20 8.5" },
  { label: "تعلّم", color: "#17924F", rotate: "6deg", d: "M5 5.5h5a2.5 2.5 0 0 1 2.5 2.5v10a2.2 2.2 0 0 0-2.2-1.8H5zM19 5.5h-5A2.5 2.5 0 0 0 11.5 8v10a2.2 2.2 0 0 1 2.2-1.8H19z" },
];

export function PassportVisual() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [stamped, setStamped] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStamped(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStamped(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="relative grid place-items-center px-4 py-9">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl [background-image:radial-gradient(circle_at_1px_1px,rgba(22,24,31,.14)_1px,transparent_0)] [background-size:16px_16px] [mask-image:radial-gradient(circle_at_50%_50%,#000_55%,transparent_78%)]"
      />
      <div ref={ref}
        className="relative z-10 w-full max-w-[420px] -rotate-[1.2deg] rounded-[26px] bg-[#1E45C4] p-3 shadow-[16px_20px_0_rgba(22,24,31,.10),0_40px_70px_-34px_rgba(22,24,31,.5)]">
        <div className="rounded-[18px] border-[1.5px] border-dashed border-white/40 px-5 pb-5 pt-6">
          <div className="mx-auto mb-4 grid h-[52px] w-[52px] place-items-center rounded-full border-[2.5px] border-white text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className="h-6 w-6">
              <path d="m12 4.8 2.2 4.5 5 .7-3.6 3.5.85 4.9L12 16.1l-4.45 2.3.85-4.9-3.6-3.5 5-.7z" />
            </svg>
          </div>
          <div className="text-center font-display text-[1.32rem] font-extrabold tracking-wide text-white">COCR PASSPORT</div>
          <div className="mb-[22px] mt-0.5 text-center text-[.8rem] font-semibold text-white/70">جواز النمو الطلابي</div>

          <div className="rounded-2xl bg-white p-5">
            <PassportRow label="الاسم" value="طالب" />
            <PassportRow label="المستوى" value="Contributor — L3" latin />

            <div className="mt-5 grid grid-cols-4 gap-2.5">
              {BADGES.map((b, i) => (
                <div key={b.label}
                  style={{
                    color: b.color,
                    transform: stamped ? `scale(1) rotate(${b.rotate})` : `scale(1.9) rotate(${b.rotate})`,
                    opacity: stamped ? 1 : 0,
                    transitionDelay: `${600 + i * 200}ms`,
                  }}
                  className="grid aspect-square place-content-center justify-items-center gap-px rounded-full border-2 border-current transition-all duration-500 [transition-timing-function:cubic-bezier(.2,1.3,.4,1)] motion-reduce:transition-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                    <path d={b.d} />
                  </svg>
                  <b className="text-[.72rem] font-extrabold leading-none">{b.label}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <span className="absolute -start-1.5 top-3 z-20 grid h-[82px] w-[82px] place-content-center rounded-full bg-gold text-center font-display text-base font-extrabold leading-tight text-[#3B2708] shadow-[0_12px_26px_-10px_rgba(22,24,31,.45)]">
        50+<br />XP
      </span>
      <span className="absolute -end-2.5 bottom-3.5 z-20 grid h-[84px] w-[84px] place-content-center justify-items-center gap-1 rounded-full border border-border bg-white text-center font-display text-[.78rem] font-bold shadow-[0_12px_26px_-10px_rgba(22,24,31,.45)]">
        Verified
        <Check className="h-5 w-5 text-green" />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* JourneyEndVisual — مشهد "نهاية الرحلة" في الـ CTA الأخير                */
/* ------------------------------------------------------------------ */
export function JourneyEndVisual() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDrawn(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setDrawn(true); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mx-auto mb-10 h-[92px] w-full max-w-[520px]">
      <svg viewBox="0 0 520 92" className="h-full w-full" aria-hidden="true">
        <path d="M6 18C120 78 220 8 300 52s120 22 214 14" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 11" />
        <path
          d="M6 18C120 78 220 8 300 52s120 22 214 14"
          fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round"
          className={cn("route-path", drawn && "is-drawn")}
          style={{ "--len": 640 } as React.CSSProperties}
        />
        <circle
          cx="514" cy="66" r="8" fill="#E9A93C" stroke="#fff" strokeWidth="3"
          className="origin-center transition-all duration-500"
          style={{ transitionDelay: "1700ms", transform: drawn ? "scale(1)" : "scale(0)", opacity: drawn ? 1 : 0 }}
        />
      </svg>
      <svg
        viewBox="0 0 48 48" aria-hidden="true"
        className={cn("absolute -top-1 h-9 w-9 transition-opacity duration-700", drawn && "animate-glide")}
        style={{ transitionDelay: "300ms", opacity: drawn ? 1 : 0 }}
      >
        <path d="M44 6 4 22l16 5z" fill="#FFFFFF" />
        <path d="M44 6 20 27l2 15z" fill="#DDE4F7" />
        <path d="M44 6 22 42l6-11z" fill="#B9C7EC" />
      </svg>
      <span
        className="absolute -bottom-1 start-0 text-[.8rem] font-semibold text-white/70 transition-opacity duration-700"
        style={{ transitionDelay: "2100ms", opacity: drawn ? 1 : 0 }}
      >
        نهاية الرحلة… وبداية رحلتك
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GrowthLadder — تدرّج Student→Mentor بميداليات متكبّرة وترقيم وحركة       */
/* مكوّن مشترك — بيتستخدم في أكتر من صفحة، بدل ما يتكرر شكله مختلف كل مرة */
/* ------------------------------------------------------------------ */
const RUNG_SIZE = ["h-14 w-14", "h-16 w-16", "h-[72px] w-[72px]", "h-20 w-20", "h-[92px] w-[92px]"];
const RUNG_ICON_SIZE = ["h-6 w-6", "h-6 w-6", "h-7 w-7", "h-8 w-8", "h-10 w-10"];

export function GrowthLadder({ rungs }: { rungs: GrowthRung[] }) {
  return (
    <div className="relative mx-auto max-w-[860px]">
      <span
        aria-hidden
        className="absolute end-[8%] start-[8%] top-[30px] hidden sm:block sm:top-[34px] lg:top-[42px] [background:repeating-linear-gradient(to_right,#1E45C4_0_8px,transparent_8px_18px)] [height:2px]"
      />
      <div className="relative grid gap-8 sm:grid-cols-5">
        {rungs.map((r, i) => (
          <Reveal key={r.id} variant="pop" delay={i * 100} className="group flex flex-col items-center text-center">
            <div className="relative mb-3.5">
              <div className={cn(
                "grid place-items-center rounded-full border-[3px] bg-white transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_14px_28px_-10px_rgba(30,69,196,.35)]",
                RUNG_SIZE[i],
                r.final
                  ? "border-gold bg-gradient-to-br from-gold-50 to-[#F5E4C4] shadow-[0_0_0_6px_rgba(233,169,60,.18)]"
                  : "border-primary/25",
              )}>
                <Icon3D name={r.icon} className={cn(RUNG_ICON_SIZE[i], "transition-transform duration-300 group-hover:scale-110")} />
              </div>
              <span className={cn(
                "absolute -top-1.5 -end-1.5 grid h-6 w-6 place-items-center rounded-full text-[.7rem] font-extrabold text-white",
                r.final ? "bg-gold-600" : "bg-primary",
              )}>
                {i + 1}
              </span>
            </div>
            <b className="text-[.95rem] font-extrabold">{r.description}</b>
            <span className="mt-0.5 text-[.72rem] font-semibold text-slate-400" dir="ltr">{r.label}</span>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function PassportRow({ label, value, latin }: { label: string; value: string; latin?: boolean }) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-3.5 border-b-[1.5px] border-dashed border-border pb-3">
      <span className={cn("order-1 text-[1.02rem] font-extrabold tracking-tight", latin && "font-display")}>{value}</span>
      <span className="order-2 text-[.85rem] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StarRating                                                         */
/* ------------------------------------------------------------------ */
export function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`التقييم ${value} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="h-[15px] w-[15px]"
          fill={value >= i ? "#E9A93C" : value >= i - 0.5 ? "url(#half)" : "#E7E0D4"}
          stroke="none" />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* CourseGrid — فلاتر + كروت الكورسات                                   */
/* ------------------------------------------------------------------ */
const ACCENT: Record<string, { bg: string; fg: string; dot: string }> = {
  blue: { bg: "#E9EEFC", fg: "#1E45C4", dot: "rgba(30,69,196,.2)" },
  gold: { bg: "#FBF1DC", fg: "#B8801F", dot: "rgba(184,128,31,.22)" },
  green: { bg: "#E6F3EB", fg: "#1E7A4E", dot: "rgba(30,122,78,.2)" },
  ink: { bg: "#E9E7E2", fg: "#3E403F", dot: "rgba(22,24,31,.16)" },
};

export function CourseGrid({
  initialCourses, categories,
}: {
  initialCourses: Course[];
  categories: { id: CourseCategory; label: string }[];
}) {
  const [courses, setCourses] = React.useState(initialCourses);
  const [active, setActive] = React.useState<CourseCategory>("all");
  const [pending, startTransition] = React.useTransition();

  function select(id: CourseCategory) {
    setActive(id);
    startTransition(async () => setCourses(await getCourses(id)));
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c.id} onClick={() => select(c.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-[.84rem] font-bold transition-all",
                active === c.id
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_rgba(30,69,196,.6)]"
                  : "border-border bg-white text-slate-600 hover:border-slate-400",
              )}>
              {c.label}
            </button>
          ))}
        </div>
        <Link href="/courses" className="flex items-center gap-2 text-[.94rem] font-bold text-primary">
          شوف كل الكورسات <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
      </div>

      <div className={cn("grid gap-[22px] transition-opacity sm:grid-cols-2 lg:grid-cols-3", pending && "opacity-60")}>
        {courses.map((c) => {
          const a = ACCENT[c.accent];
          return (
            <article key={c.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_26px_52px_-26px_rgba(22,24,31,.42)]">
              <div className="relative grid h-[132px] place-items-center overflow-hidden" style={{ background: a.bg }}>
                <span aria-hidden className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, ${a.dot} 1.3px, transparent 0)`,
                    backgroundSize: "18px 18px",
                    maskImage: "radial-gradient(circle at 50% 120%, transparent 30%, #000)",
                    WebkitMaskImage: "radial-gradient(circle at 50% 120%, transparent 30%, #000)",
                  }} />
                <Badge className="absolute start-3.5 top-3.5 bg-white shadow-sm" style={{ color: a.fg }}>{c.level}</Badge>
                {c.free && (
                  <span className="absolute end-3.5 top-3.5 rounded-full px-3 py-1 text-[.7rem] font-extrabold text-white" style={{ background: a.fg }}>
                    مجاني
                  </span>
                )}
                <Icon3D name={c.icon} className="relative z-10 h-[66px] w-[66px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              </div>

              <div className="flex flex-1 flex-col gap-2.5 p-[22px]">
                <h3 className="text-[1.1rem] font-extrabold leading-relaxed">{c.title}</h3>
                <p className="flex-1 text-[.9rem] text-muted-foreground">{c.description}</p>

                <div className="flex gap-4 text-[.78rem] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="h-[15px] w-[15px]" style={{ color: a.fg }} /> {c.durationWeeks} أسابيع</span>
                  <span className="flex items-center gap-1.5"><PlayCircle className="h-[15px] w-[15px]" style={{ color: a.fg }} /> {c.lessons} درس</span>
                </div>

                <div className="flex items-center gap-2.5 border-t border-dashed border-border pt-3">
                  <StarRating value={c.rating} />
                  <b className="font-display text-[.92rem] font-extrabold">{c.rating}</b>
                  <small className="text-[.76rem] font-semibold text-slate-400">({c.reviews} تقييم)</small>
                </div>

                <Link href={c.href}
                  className="mt-3.5 flex min-h-[46px] items-center justify-center gap-2 rounded-2xl text-[.92rem] font-extrabold transition-all group-hover:text-white"
                  style={{ background: a.bg, color: a.fg }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = a.fg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = a.bg; e.currentTarget.style.color = a.fg; }}>
                  التفاصيل <ArrowLeft className="h-[18px] w-[18px]" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* FaqAccordion                                                       */
/* ------------------------------------------------------------------ */
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  return (
    <Accordion
      defaultValue={faqs[0] ? [faqs[0].id] : []}
      className="mx-auto max-w-[44em]"
    >
      {faqs.map((f) => (
        <AccordionItem key={f.id} value={f.id} className="border-b border-border">
          <AccordionTrigger className="py-[22px] text-start text-[1.06rem] font-bold hover:no-underline">
            {f.question}
          </AccordionTrigger>
          <AccordionContent className="max-w-[34em] pb-6 text-[.98rem] text-muted-foreground">
            {f.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}