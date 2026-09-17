/** حالة تحميل صفحة /projects (وما تحتها) — عشان الطالب ميشوفش layout
 * مكسور وهو مستني البيانات. Tailwind's animate-pulse بس، من غير أي
 * dependency جديدة. */
export default function ProjectsLoading() {
  return (
    <main className="relative overflow-hidden bg-cream pb-[100px] pt-[52px]">
      <div className="relative z-[2] mx-auto max-w-[1160px] px-7">
        <div className="mb-12 flex flex-col items-start gap-6 border-b border-border pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-[36em] animate-pulse">
            <div className="mb-3 h-3 w-20 rounded-full bg-border" />
            <div className="mb-2 h-8 w-4/5 rounded-lg bg-border" />
            <div className="mb-4 h-8 w-2/3 rounded-lg bg-border" />
            <div className="h-4 w-full rounded bg-border" />
          </div>
          <div className="h-[50px] w-40 shrink-0 animate-pulse rounded-xl bg-border" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl border border-border bg-white p-4">
              <div className="aspect-[4/3] rounded-2xl bg-border" />
              <div className="mt-4 h-5 w-3/4 rounded bg-border" />
              <div className="mt-2.5 h-4 w-full rounded bg-border" />
              <div className="mt-1.5 h-4 w-2/3 rounded bg-border" />
              <div className="mt-4 h-4 w-1/2 rounded bg-border" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
