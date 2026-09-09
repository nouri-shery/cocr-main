import { CoursesExplorer } from "../client/courses_client";
import { getCourses, getPopularCourses, getCourseCategories, getMentors } from "../actions/landing_page_actions";
import { SiteFooter } from "./landingserver";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function CoursesPageContent() {
  const [popularCourses, allCourses, categories, mentors, user] = await Promise.all([
    getPopularCourses(),
    getCourses(),
    getCourseCategories(),
    getMentors(),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <>
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <span aria-hidden className="pattern-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-10 max-w-[38em]">
          <span className="mb-3.5 block text-[.75rem] font-extrabold tracking-[.18em] text-gold-600">
            الكورسات
          </span>
          <h1 className="mb-4 text-[clamp(1.95rem,3.9vw,2.95rem)] font-extrabold leading-tight tracking-tight">
            كورسات قصيرة، كل واحد بيخلّص بحاجة عملتها
          </h1>
          <p className="text-[1.05rem] leading-[1.9] text-muted-foreground">
            مفيش كورس هنا بينتهي بفيديو — كل واحد آخره تسليم بيتراجع من مينتور.
          </p>
        </div>

        <CoursesExplorer
          popularCourses={popularCourses}
          allCourses={allCourses}
          categories={categories}
          mentors={mentors}
          isAuthenticated={!!user}
        />
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
