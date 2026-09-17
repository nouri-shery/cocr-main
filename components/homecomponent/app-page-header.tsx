/**
 * عنوان صفحات الـProduct (Dashboard/Courses/...) — بديل الـeyebrow+heading
 * الضخم بتاع الـmarketing pages. عنوان + سطر context قصير + مكان لأزرار
 * حقيقية، من غير أي نص تسويقي أو رقم زخرفي. مش بديل لأي هيرو قائم بذاته
 * (زي "بتتعلم دلوقتي" في الداشبورد) — ده بديل لعنوان الصفحة اللي كان
 * بيتكتب يدويًا فوق كل صفحة.
 */
export function AppPageHeader({
  title, context, actions,
}: { title: string; context?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-[1.4rem] font-extrabold leading-tight tracking-tight sm:text-[1.65rem]">{title}</h1>
        {context && <p className="mt-1.5 text-[.9rem] text-muted-foreground">{context}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
