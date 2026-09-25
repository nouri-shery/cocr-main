"use client";

import { useActionState, type ReactNode } from "react";
import { applyToBeMentor, type MentorApplyResult } from "../actions/mentor_actions";

const TRACKS = [
  { id: "front-end", label: "Front-End" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "app-dev", label: "App Dev" },
  { id: "embedded", label: "Embedded" },
];

const DAYS = [
  { id: "saturday", label: "سبت" },
  { id: "sunday", label: "حد" },
  { id: "monday", label: "اتنين" },
  { id: "tuesday", label: "تلات" },
  { id: "wednesday", label: "أربع" },
  { id: "thursday", label: "خميس" },
  { id: "friday", label: "جمعة" },
];

const initialState: MentorApplyResult = { error: null };

export function MentorApplyForm() {
  const [state, formAction, pending] = useActionState(applyToBeMentor, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-7 rounded-3xl border border-border bg-white p-6">
      <FormSection step={1} title="عنك">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[.88rem] font-bold text-slate-600">بنت ولا ولد؟</span>
            <select name="gender" required defaultValue="" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary">
              <option value="" disabled>اختار</option>
              <option value="female">بنت</option>
              <option value="male">ولد</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[.88rem] font-bold text-slate-600">سنّك</span>
            <input name="age" type="number" required min={10} max={100} className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[.88rem] font-bold text-slate-600">مشاريع عملتها قبل كده (اختياري)</span>
          <textarea
            name="priorProjects"
            rows={3}
            placeholder="اكتب وصف أو لينكات لمشاريع عملتها."
            className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
          />
        </label>
      </FormSection>

      <FormSection step={2} title="إيه اللي هتعلّمه؟">
        <label className="flex flex-col gap-1.5">
          <span className="text-[.88rem] font-bold text-slate-600">التراك اللي عايز تكون مينتور فيه</span>
          <select
            name="track"
            required
            defaultValue=""
            className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
          >
            <option value="" disabled>اختار تراك</option>
            {TRACKS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[.88rem] font-bold text-slate-600">ليه عايز تكون مينتور؟</span>
          <textarea
            name="motivation"
            required
            rows={4}
            placeholder="احكيلنا عن خبرتك في التراك ده، وليه حابب تساعد طلاب تانيين يتعلموه."
            className="rounded-xl border border-border p-3 text-[.9rem] outline-none focus:border-primary"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[.88rem] font-bold text-slate-600">الفئة العمرية اللي عايز تعلّمها (من — لحد)</span>
          <div className="grid grid-cols-2 gap-3">
            <input name="studentAgeMin" type="number" required min={10} max={100} placeholder="من" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
            <input name="studentAgeMax" type="number" required min={10} max={100} placeholder="لحد" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[.88rem] font-bold text-slate-600">مجالاتك (افصل بينهم بفاصلة)</span>
          <input
            name="expertiseAreas" required placeholder="مثال: React, Accessibility, أمن الشبكات"
            className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[.88rem] font-bold text-slate-600">لينك بورتفوليو (اختياري)</span>
            <input name="portfolioUrl" type="url" dir="ltr" placeholder="https://…" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[.88rem] font-bold text-slate-600">لينك GitHub (اختياري)</span>
            <input name="githubUrl" type="url" dir="ltr" placeholder="https://github.com/…" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          </label>
        </div>
      </FormSection>

      <FormSection step={3} title="جدولك">
        <div className="flex flex-col gap-1.5">
          <span className="text-[.88rem] font-bold text-slate-600">الأيام اللي تقدر تعلّم فيها</span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label key={d.id} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[.82rem] font-semibold text-slate-600">
                <input name="preferredDays" type="checkbox" value={d.id} />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[.88rem] font-bold text-slate-600">الوقت المفضّل (اختياري)</span>
            <input name="preferredTime" placeholder="مثال: 6-8 مساءً" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[.88rem] font-bold text-slate-600">التوقيت الزمني</span>
            <input name="timezone" defaultValue="Africa/Cairo" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[.88rem] font-bold text-slate-600">ساعات تفرّغ تقريبية أسبوعيًا (اختياري)</span>
            <input name="weeklyAvailabilityHours" type="number" min={1} step="0.5" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[.88rem] font-bold text-slate-600">حجم الدفعة المفضّل (اختياري)</span>
            <input name="preferredCohortSize" type="number" min={1} className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          </label>
        </div>
      </FormSection>

      <FormSection step={4} title="الأمان والمسؤولية">
        <label className="flex flex-col gap-1.5">
          <span className="text-[.88rem] font-bold text-slate-600">إيميل ولي الأمر</span>
          <input name="guardianEmail" type="email" required placeholder="guardian@example.com" className="h-11 rounded-xl border border-border px-3 text-[.9rem] outline-none focus:border-primary" />
          <span className="text-[.76rem] text-muted-foreground">فريق COCR هيتواصل مع ولي أمرك للتأكيد قبل الموافقة النهائية.</span>
        </label>

        <div className="flex flex-col gap-3 rounded-2xl bg-sand p-4">
          <label className="flex items-start gap-2.5 text-[.85rem] text-slate-700">
            <input name="guardianConsent" type="checkbox" required className="mt-0.5" />
            <span>أقرّ إن ولي أمري موافق على انضمامي كمينتور في COCR.</span>
          </label>
          <label className="flex items-start gap-2.5 text-[.85rem] text-slate-700">
            <input name="safetyPolicy" type="checkbox" required className="mt-0.5" />
            <span>قرأت ووافقت على سياسة الأمان الخاصة بـ COCR.</span>
          </label>
          <label className="flex items-start gap-2.5 text-[.85rem] text-slate-700">
            <input name="zoomConsent" type="checkbox" required className="mt-0.5" />
            <span>موافقة إني هشرح سيشنز لايف مع الطلاب عن طريق Zoom.</span>
          </label>
          <label className="flex items-start gap-2.5 text-[.85rem] text-slate-700">
            <input name="followupCommitment" type="checkbox" required className="mt-0.5" />
            <span>أقرّ بالمتابعة مع الطلاب طول مدة الكورس.</span>
          </label>
        </div>
      </FormSection>

      {state.error && <p className="text-[.85rem] font-semibold text-destructive">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2.5 text-[.9rem] font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "بيتبعت..." : "ابعت الطلب"}
      </button>
    </form>
  );
}

function FormSection({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <legend className="mb-1 flex items-center gap-2.5 text-[.95rem] font-extrabold">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-tint text-[.76rem] font-extrabold text-primary">
          {step}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
