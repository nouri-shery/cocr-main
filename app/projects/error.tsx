"use client";

/** حالة خطأ لصفحة /projects — Next.js error boundary. واضحة وبسيطة، من
 * غير ما تكسر باقي الصفحة أو تسيب المستخدم من غير طريق للرجوع. */
export default function ProjectsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="relative flex min-h-[60vh] items-center justify-center bg-cream px-7 py-20">
      <div className="flex max-w-[26em] flex-col items-center gap-3 text-center">
        <p className="text-[1.05rem] font-extrabold">حصل خطأ وإحنا بنجيب المشاريع</p>
        <p className="text-[.9rem] text-muted-foreground">جرّب تاني بعد شوية — المشكلة مش من عندك.</p>
        <button
          onClick={() => reset()}
          className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white"
        >
          جرّب تاني
        </button>
      </div>
    </main>
  );
}
