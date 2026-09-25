import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isCurrentUserStaff, getCourseProposalForReview } from "../actions/admin_actions";
import { CourseReviewDecision } from "../client/admin_client";

const SESSION_TYPE_LABEL: Record<string, string> = {
  workshop: "ورشة لايف", practice: "تدريب عملي", project_review: "مراجعة مشروع",
  qa: "أسئلة وأجوبة", assessment: "تقييم", final_review: "مراجعة نهائية",
};

export async function AdminCourseReviewContent({ id }: { id: string }) {
  const staff = await isCurrentUserStaff();
  if (!staff) notFound();

  const course = await getCourseProposalForReview(id);
  if (!course) notFound();

  const rubricEntries = Object.entries(course.final_project_rubric ?? {});

  return (
    <main className="mx-auto min-h-screen max-w-[900px] px-6 py-10">
      <Link href="/admin/course-proposals" className="mb-6 inline-flex items-center gap-1.5 text-[.85rem] font-bold text-primary">
        <ArrowRight className="h-4 w-4" /> رجوع لكل الكورسات
      </Link>

      <h1 className="mb-1 text-[1.4rem] font-extrabold">{course.title}</h1>
      <p className="mb-6 text-[.9rem] text-muted-foreground">
        المينتور: <b className="text-foreground">{course.mentor?.display_name ?? "مينتور"}</b> · التراك: <b className="text-foreground">{course.track}</b>
        {course.level && <> · المستوى: <b className="text-foreground">{course.level}</b></>}
      </p>

      <section className="mb-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="mb-2 text-[1rem] font-extrabold">الوصف</h2>
        <p className="text-[.9rem] leading-relaxed text-muted-foreground">{course.description}</p>

        {course.learning_outcomes.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-1.5 text-[.85rem] font-extrabold">نتائج التعلّم</h3>
            <ul className="flex flex-col gap-1 text-[.86rem] text-muted-foreground">
              {course.learning_outcomes.map((o, i) => <li key={i}>• {o}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[.82rem] text-muted-foreground sm:grid-cols-3">
          {course.skills.length > 0 && <span>المهارات: {course.skills.join("، ")}</span>}
          {(course.age_min || course.age_max) && <span>السن: {course.age_min ?? "—"}–{course.age_max ?? "—"}</span>}
          {course.weekly_workload_hours && <span>{course.weekly_workload_hours} ساعة/أسبوع</span>}
        </div>
        {course.prerequisites && <p className="mt-3 text-[.82rem] text-muted-foreground">متطلبات سابقة: {course.prerequisites}</p>}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-[1rem] font-extrabold">المنهج ({course.curriculumSessions.length} سيشن)</h2>
        {course.curriculumSessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-blue-50 px-6 py-8 text-center text-[.9rem] text-muted-foreground">
            مفيش سيشنز في المنهج — ده مش المفروض يوصل هنا أصلًا.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {course.curriculumSessions.map((s, i) => (
              <div key={s.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-tint text-[.72rem] font-extrabold text-primary">{i + 1}</span>
                  <b className="text-[.9rem] font-extrabold">{s.title}</b>
                  <span className="text-[.76rem] text-muted-foreground">— {SESSION_TYPE_LABEL[s.session_type] ?? s.session_type} · {s.duration_minutes} د</span>
                </div>
                {s.objectives.length > 0 && <p className="mt-1.5 text-[.82rem] text-muted-foreground">أهداف: {s.objectives.join("، ")}</p>}
                {s.live_activity && <p className="mt-1 text-[.82rem] text-muted-foreground">النشاط: {s.live_activity}</p>}
                {s.post_session_task_brief && <p className="mt-1 text-[.82rem] text-muted-foreground">المهمة: {s.post_session_task_brief}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="mb-2 text-[1rem] font-extrabold">مشروع التخرّج</h2>
        {course.final_project_brief ? (
          <>
            <p className="text-[.88rem] leading-relaxed text-muted-foreground">{course.final_project_brief}</p>
            {rubricEntries.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                {rubricEntries.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-[.84rem]">
                    <span className="text-muted-foreground">{key}</span>
                    <b>{value}%</b>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-[.86rem] text-muted-foreground">مفيش مشروع تخرّج محدّد — ده مش المفروض يوصل هنا أصلًا.</p>
        )}
      </section>

      <CourseReviewDecision proposalId={course.id} />
    </main>
  );
}
