"use client";

import * as React from "react";
import { Video } from "lucide-react";
import { scheduleCourseSession, type CourseSession } from "../actions/course_sessions_actions";

function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export function CourseSessionsSection({
  courseId, sessions, canSchedule,
}: { courseId: string; sessions: CourseSession[]; canSchedule: boolean }) {
  const [list, setList] = React.useState(sessions);
  const [showForm, setShowForm] = React.useState(false);

  if (list.length === 0 && !canSchedule) return null;

  return (
    <div className="mt-8 rounded-3xl border border-border bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[1.05rem] font-extrabold">سيشنز لايف</h2>
        {canSchedule && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl border border-border px-4 py-2 text-[.85rem] font-bold text-primary"
          >
            {showForm ? "إلغاء" : "+ حدد سيشن جديد"}
          </button>
        )}
      </div>

      {showForm && (
        <ScheduleSessionForm
          courseId={courseId}
          onScheduled={(s) => {
            setList((prev) => [...prev, s].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
            setShowForm(false);
          }}
        />
      )}

      {list.length === 0 ? (
        <p className="text-[.86rem] text-muted-foreground">مفيش سيشنز متحددة لسه.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-border p-3.5">
              <div>
                <p className="text-[.9rem] font-bold">{s.title}</p>
                <p className="text-[.8rem] text-muted-foreground">{formatSessionTime(s.scheduled_at)}</p>
              </div>
              {s.zoom_link && (
                <a
                  href={s.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[.82rem] font-extrabold text-white"
                >
                  <Video className="h-3.5 w-3.5" /> انضم للسيشن
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleSessionForm({
  courseId, onScheduled,
}: { courseId: string; onScheduled: (s: CourseSession) => void }) {
  const [title, setTitle] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [zoomLink, setZoomLink] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await scheduleCourseSession(courseId, title, scheduledAt, zoomLink);
      if (res.error) { setError(res.error); return; }
      onScheduled({
        id: `temp-${Date.now()}`, course_id: courseId, mentor_id: "", title,
        scheduled_at: new Date(scheduledAt).toISOString(),
        zoom_link: zoomLink.trim(), recording_url: null, created_at: new Date().toISOString(),
      });
      setTitle(""); setScheduledAt(""); setZoomLink("");
    });
  };

  return (
    <div className="mb-4 flex flex-col gap-2.5 rounded-2xl bg-sand p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان السيشن"
        className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
      />
      <input
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        type="datetime-local"
        className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
      />
      <input
        value={zoomLink}
        onChange={(e) => setZoomLink(e.target.value)}
        type="url"
        required
        placeholder="لينك الزوم — لازم يتحدد دلوقتي، مش ممكن يتضاف بعدين"
        className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
      />
      {error && <p className="text-[.82rem] font-semibold text-destructive">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="self-start rounded-xl bg-primary px-4 py-2 text-[.85rem] font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "بيتحدد..." : "أكّد السيشن"}
      </button>
    </div>
  );
}
