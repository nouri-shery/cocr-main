import Link from "next/link";
import { Calendar, ClipboardCheck, GraduationCap, LayoutDashboard, Users } from "lucide-react";

const NAV = [
  { href: "/mentor", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/mentor/submissions", label: "التسليمات", icon: ClipboardCheck },
  { href: "/mentor/students", label: "طلابي", icon: Users },
  { href: "/mentor/sessions", label: "جدولي", icon: Calendar },
  { href: "/mentor/courses", label: "الكورسات", icon: GraduationCap },
];

/** ناف بار ثانوي مشترك بين كل صفحات مساحة المينتور — نفس فكرة AdminShell
 * بالظبط، هنا بس لصفحات المينتور بدل الأدمن. كل صفحة جواه real content،
 * مفيش تبويب بيودّي لحاجة فاضية أو وهمية. */
export function MentorShell({ active }: { active: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-white p-1.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[.84rem] font-extrabold text-white shadow-[0_10px_22px_-12px_rgba(30,69,196,.6)] transition-all"
                : "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[.84rem] font-bold text-muted-foreground transition-all hover:bg-blue-50 hover:text-primary"
            }
          >
            <Icon className="h-4 w-4" /> {item.label}
          </Link>
        );
      })}
    </div>
  );
}
