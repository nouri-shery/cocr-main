/**
 * بورتريهات المينتورز — نفس الرسومات المعتمدة من الملف المرجعي (cocr-ar-preview.html)،
 * منقولة حرفيًا (نفس الـ paths والألوان) مش مُعاد اختراعها. كل واحد مرتبط بـ mentor id محدد.
 */

function MentorFace({
  bg, body, bodyShadow, skin, hair, accessory,
}: {
  bg: string; body: string; bodyShadow: string; skin: string; hair: string;
  accessory?: "hijab" | "glasses";
}) {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" role="img" aria-hidden="true">
      <rect width="96" height="96" fill={bg} />
      <path d="M12 96c0-20 16-33 36-33s36 13 36 33z" fill={body} />
      <path d="M12 96c0-12 6-22 15-27v27z" fill={bodyShadow} opacity=".45" />
      <path d="M40 63h16v9a8 8 0 0 1-16 0z" fill={skin} />
      <path d="M40 63h16v4a8 8 0 0 1-16 0z" fill="#000" opacity=".08" />
      <ellipse cx="48" cy="42" rx="21" ry="23" fill={skin} />
      {accessory === "hijab" ? (
        <>
          <path d="M25 44c0-16 10-27 23-27s23 11 23 27c0 12-3 18-5 27H30c-2-9-5-15-5-27z" fill={body} />
          <ellipse cx="48" cy="43" rx="16" ry="19" fill={skin} />
          <path d="M25 44c0-16 10-27 23-27s23 11 23 27c-3-8-11-12-23-12s-20 4-23 12z" fill="#000" opacity=".12" />
        </>
      ) : (
        <path d="M27 40c0-14 9-23 21-23s21 9 21 23c-2-7-6-9-11-9.6-6-.7-9 2.4-16 1.6-6-.7-12 1.4-15 8z" fill={hair} />
      )}
      <circle cx="41" cy="43" r="2.4" fill="#2A211A" />
      <circle cx="55" cy="43" r="2.4" fill="#2A211A" />
      <path d="M43 52c3 2.6 7 2.6 10 0" stroke="#2A211A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="36" cy="49" rx="3.4" ry="2.2" fill="#E07A5F" opacity=".28" />
      <ellipse cx="60" cy="49" rx="3.4" ry="2.2" fill="#E07A5F" opacity=".28" />
      {accessory === "glasses" && (
        <g stroke="#16181F" strokeWidth="2.2" fill="none">
          <circle cx="41" cy="43" r="8" />
          <circle cx="57" cy="43" r="8" />
          <path d="M49 43h1M33 41l-4-1.5M65 41l4-1.5" />
        </g>
      )}
    </svg>
  );
}

export function MentorFrontEndIllustration() {
  return <MentorFace bg="#E3E9FC" body="#1E45C4" bodyShadow="#16349B" skin="#E0A87B" hair="#241812" />;
}

export function MentorCybersecurityIllustration() {
  return <MentorFace bg="#EAF6EF" body="#1E7A4E" bodyShadow="#166040" skin="#DFA97E" hair="#1E7A4E" accessory="hijab" />;
}

export function MentorEmbeddedIllustration() {
  return <MentorFace bg="#FBF1DC" body="#B8801F" bodyShadow="#8F6316" skin="#C98A57" hair="#1F1610" accessory="glasses" />;
}

export const MENTOR_ILLUSTRATIONS: Record<string, React.ComponentType> = {
  youssef: MentorFrontEndIllustration,
  menna: MentorCybersecurityIllustration,
  karim: MentorEmbeddedIllustration,
};
