import { IconName } from "@/app/types/types";

/**
 * الأيقونات المجسّمة — نظامين مقصودين:
 *  • Icon3D  → تصنيف الأقسام والكورسات فقط
 *  • lucide  → الواجهة (أسهم، حالات، تحقّق)
 * السبرايت بيتحمّل مرة واحدة في الـ layout، والباقي <use>.
 */
export function Icon3D({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <use href={`#i-${name}`} />
    </svg>
  );
}

export function IconSprite() {
  return (
    <svg width={0} height={0} className="absolute" aria-hidden>
      <defs>
        <linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5B7EE8" /><stop offset="1" stopColor="#1E45C4" /></linearGradient>
        <linearGradient id="gbd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1E45C4" /><stop offset="1" stopColor="#102872" /></linearGradient>
        <linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#86D9AE" /><stop offset="1" stopColor="#1E7A4E" /></linearGradient>
        <linearGradient id="gmd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1E7A4E" /><stop offset="1" stopColor="#13543A" /></linearGradient>
        <linearGradient id="gs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A6A199" /><stop offset="1" stopColor="#3E403F" /></linearGradient>
        <linearGradient id="gsd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3E403F" /><stop offset="1" stopColor="#16181F" /></linearGradient>
        <linearGradient id="gsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".4" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>

      <symbol id="i-path" viewBox="0 0 64 64">
        <ellipse cx="32" cy="57" rx="21" ry="3" fill="#16181F" opacity=".1" />
        <path d="M12 48c0-10 40-6 40-18S18 22 18 12" fill="none" stroke="url(#gbd)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 10" />
        <circle cx="18" cy="12" r="8" fill="url(#gb)" /><circle cx="16" cy="10" r="2.6" fill="#fff" opacity=".45" />
        <circle cx="12" cy="48" r="7" fill="url(#gm)" />
      </symbol>

      <symbol id="i-mentor" viewBox="0 0 64 64">
        <ellipse cx="32" cy="57" rx="21" ry="3" fill="#16181F" opacity=".1" />
        <circle cx="45" cy="22" r="7" fill="url(#gsd)" /><path d="M34 52a12 12 0 0 1 23 0z" fill="url(#gsd)" />
        <circle cx="25" cy="20" r="10" fill="url(#gb)" /><path d="M8 54a17 17 0 0 1 34 0z" fill="url(#gb)" />
        <circle cx="21" cy="16" r="3.2" fill="#fff" opacity=".4" />
      </symbol>

      <symbol id="i-build" viewBox="0 0 64 64">
        <ellipse cx="32" cy="57" rx="22" ry="3" fill="#16181F" opacity=".1" />
        <path d="M32 7 50 17v20L32 47 14 37V17z" fill="url(#gm)" />
        <path d="M32 7 50 17 32 27 14 17z" fill="#B7E8CE" />
        <path d="M32 27v20L14 37V17z" fill="url(#gmd)" />
        <path d="M32 27v20l18-10V17z" fill="#13543A" />
      </symbol>

      <symbol id="i-chat" viewBox="0 0 64 64">
        <ellipse cx="32" cy="57" rx="21" ry="3" fill="#16181F" opacity=".1" />
        <path d="M22 15h30a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H36l-8 7v-7h-6a5 5 0 0 1-5-5V20a5 5 0 0 1 5-5z" fill="url(#gsd)" />
        <path d="M9 8h26a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H23l-9 8v-8h-5a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" fill="url(#gb)" />
        <rect x="12" y="15" width="19" height="3.2" rx="1.6" fill="#fff" opacity=".7" />
        <rect x="12" y="22" width="12" height="3.2" rx="1.6" fill="#fff" opacity=".45" />
        <path d="M9 8h26a5 5 0 0 1 5 5v3H4v-3a5 5 0 0 1 5-5z" fill="url(#gsh)" />
      </symbol>

      <symbol id="i-mic" viewBox="0 0 64 64">
        <ellipse cx="32" cy="57" rx="15" ry="2.8" fill="#16181F" opacity=".1" />
        <rect x="29" y="42" width="6" height="11" rx="3" fill="url(#gsd)" />
        <rect x="21" y="51" width="22" height="5" rx="2.5" fill="url(#gsd)" />
        <path d="M15 28v3a17 17 0 0 0 34 0v-3" fill="none" stroke="url(#gsd)" strokeWidth="5" strokeLinecap="round" />
        <rect x="23" y="7" width="18" height="33" rx="9" fill="url(#gb)" />
        <rect x="27" y="11" width="5" height="13" rx="2.5" fill="#fff" opacity=".4" />
      </symbol>

      <symbol id="i-target" viewBox="0 0 64 64">
        <ellipse cx="32" cy="57" rx="19" ry="3" fill="#16181F" opacity=".1" />
        <circle cx="32" cy="31" r="23" fill="url(#gb)" /><circle cx="32" cy="31" r="15" fill="#fff" />
        <circle cx="32" cy="31" r="9.5" fill="url(#gb)" /><circle cx="32" cy="31" r="4" fill="#4FBE8B" />
        <path d="M32 8a23 23 0 0 1 16 6.6A23 23 0 0 0 15.5 47 23 23 0 0 1 32 8z" fill="#fff" opacity=".18" />
      </symbol>

      <symbol id="i-heart" viewBox="0 0 64 64">
        <ellipse cx="32" cy="57" rx="17" ry="2.8" fill="#16181F" opacity=".1" />
        <path d="M32 54S6 39 6 23.5A13.5 13.5 0 0 1 32 18a13.5 13.5 0 0 1 26 5.5C58 39 32 54 32 54z" fill="url(#gm)" />
        <path d="M32 54S6 39 6 23.5c0-1 .1-2 .3-3C9.4 34.6 32 48 32 48z" fill="url(#gmd)" />
        <ellipse cx="19" cy="21" rx="6" ry="4.2" fill="#fff" opacity=".42" transform="rotate(-28 19 21)" />
      </symbol>

      <symbol id="i-bulb" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="15" ry="2.6" fill="#16181F" opacity=".1" />
        <g stroke="#E9A93C" strokeWidth="3.4" strokeLinecap="round" opacity=".85">
          <path d="M32 3v5M13 12l3.4 3.4M51 12l-3.4 3.4M5 31h5M54 31h5" />
        </g>
        <rect x="25" y="43" width="14" height="4.6" rx="2.3" fill="#7B776F" />
        <rect x="25" y="49" width="14" height="4.6" rx="2.3" fill="#5C5A55" />
        <path d="M26 44c0-5-3-7-5.6-10A14 14 0 1 1 43.6 34C41 37 38 39 38 44z" fill="url(#gb)" />
        <path d="M32 20a12 12 0 0 0-9 20c-6-6-6-16 1-21 2.4-1.7 5.2-2.4 8-2.4z" fill="#fff" opacity=".38" />
        <path d="M28 44v-6l4-4 4 4v6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
      </symbol>

      <symbol id="i-hammer" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="18" ry="2.6" fill="#16181F" opacity=".1" />
        <g transform="rotate(-38 32 32)">
          <rect x="28.5" y="26" width="7" height="30" rx="3.5" fill="url(#gsd)" />
          <rect x="28.5" y="26" width="3.2" height="30" rx="1.6" fill="#fff" opacity=".18" />
          <path d="M15 12h34a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z" fill="url(#gb)" />
          <path d="M15 12h34a3 3 0 0 1 3 3v2H12v-2a3 3 0 0 1 3-3z" fill="#fff" opacity=".3" />
          <rect x="27" y="25" width="10" height="5" rx="2" fill="#102872" />
        </g>
      </symbol>

      <symbol id="i-link" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="19" ry="2.6" fill="#16181F" opacity=".1" />
        <circle cx="23" cy="31" r="14" fill="none" stroke="url(#gb)" strokeWidth="8" />
        <circle cx="41" cy="31" r="14" fill="none" stroke="url(#gm)" strokeWidth="8" />
        <path d="M23 17a14 14 0 0 0-11.4 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".45" />
        <path d="M30.6 21A14 14 0 0 1 41 17" fill="none" stroke="url(#gb)" strokeWidth="8" strokeLinecap="round" />
      </symbol>

      <symbol id="i-rocket" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="14" ry="2.6" fill="#16181F" opacity=".1" />
        <path d="M20 34 11 44v9l9-6z" fill="url(#gsd)" /><path d="M44 34l9 10v9l-9-6z" fill="url(#gsd)" />
        <path d="M32 4c7.6 7.4 12 17 12 26.6V46H20V30.6C20 21 24.4 11.4 32 4z" fill="url(#gb)" />
        <path d="M32 4c-4 4-7 8.6-9 13.6V46h-3V30.6C20 21 24.4 11.4 32 4z" fill="#fff" opacity=".26" />
        <circle cx="32" cy="25" r="6" fill="#fff" /><circle cx="32" cy="25" r="3.4" fill="#16349B" opacity=".55" />
        <path d="M26 46h12c-1.4 7-4 11.6-6 14-2-2.4-4.6-7-6-14z" fill="url(#gm)" />
      </symbol>

      <symbol id="i-compass" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="19" ry="2.6" fill="#16181F" opacity=".1" />
        <circle cx="32" cy="31" r="24" fill="url(#gb)" /><circle cx="32" cy="31" r="18" fill="#fff" />
        <path d="M43 20 26 26l-5 17 17-6z" fill="url(#gm)" /><path d="M43 20 32 31l-11 12 17-6z" fill="#1E7A4E" />
        <circle cx="32" cy="31" r="3" fill="#16181F" />
        <path d="M32 7a24 24 0 0 1 17 7A24 24 0 0 0 16 47 24 24 0 0 1 32 7z" fill="#fff" opacity=".18" />
      </symbol>

      <symbol id="i-gears" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="21" ry="2.6" fill="#16181F" opacity=".1" />
        <g fill="url(#gsd)">
          <rect x="39" y="28" width="7" height="24" rx="2" /><rect x="31" y="36" width="24" height="7" rx="2" />
          <g transform="rotate(45 42.5 39.5)"><rect x="39" y="28" width="7" height="24" rx="2" /><rect x="31" y="36" width="24" height="7" rx="2" /></g>
        </g>
        <circle cx="42.5" cy="39.5" r="12" fill="url(#gs)" /><circle cx="42.5" cy="39.5" r="5" fill="#16181F" />
        <g fill="url(#gbd)">
          <rect x="21" y="4" width="8" height="30" rx="2.5" /><rect x="10" y="15" width="30" height="8" rx="2.5" />
          <g transform="rotate(45 25 19)"><rect x="21" y="4" width="8" height="30" rx="2.5" /><rect x="10" y="15" width="30" height="8" rx="2.5" /></g>
        </g>
        <circle cx="25" cy="19" r="15" fill="url(#gb)" /><circle cx="25" cy="19" r="6" fill="#fff" />
      </symbol>

      <symbol id="i-medal" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="17" ry="2.6" fill="#16181F" opacity=".1" />
        <path d="M18 4h10l8 20H26z" fill="url(#gbd)" /><path d="M46 4H36l-8 20h10z" fill="url(#gb)" />
        <circle cx="32" cy="39" r="19" fill="url(#gm)" /><circle cx="32" cy="39" r="14" fill="url(#gmd)" />
        <path d="m32 29 3 6.4 7 1-5 4.9 1.2 7-6.2-3.4-6.2 3.4 1.2-7-5-4.9 7-1z" fill="#fff" />
      </symbol>

      <symbol id="i-code" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="21" ry="2.6" fill="#16181F" opacity=".1" />
        <rect x="5" y="10" width="54" height="42" rx="7" fill="url(#gbd)" />
        <rect x="5" y="10" width="54" height="36" rx="7" fill="url(#gb)" />
        <path d="M5 17a7 7 0 0 1 7-7h40a7 7 0 0 1 7 7v4H5z" fill="#102872" />
        <circle cx="12.5" cy="15.5" r="2.2" fill="#fff" opacity=".85" /><circle cx="19.5" cy="15.5" r="2.2" fill="#fff" opacity=".55" /><circle cx="26.5" cy="15.5" r="2.2" fill="#fff" opacity=".4" />
        <path d="m24 28-6 6 6 6M40 28l6 6-6 6M35 26l-6 16" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>

      <symbol id="i-shield" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="17" ry="2.6" fill="#16181F" opacity=".1" />
        <path d="M32 4 10 12v18c0 14 9.4 23.6 22 26.6C44.6 53.6 54 44 54 30V12z" fill="url(#gb)" />
        <path d="M32 4 10 12v18c0 14 9.4 23.6 22 26.6z" fill="url(#gbd)" />
        <path d="m22 30 7 7 13-13" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 4 10 12v5l22-8 22 8v-5z" fill="#fff" opacity=".24" />
      </symbol>

      <symbol id="i-chip" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="20" ry="2.6" fill="#16181F" opacity=".1" />
        <g stroke="url(#gsd)" strokeWidth="4.5" strokeLinecap="round">
          <path d="M23 3v9M32 3v9M41 3v9M23 44v9M32 44v9M41 44v9M3 23h9M3 32h9M3 41h9M52 23h9M52 32h9M52 41h9" />
        </g>
        <rect x="12" y="12" width="40" height="40" rx="8" fill="url(#gs)" />
        <rect x="22" y="22" width="20" height="20" rx="5" fill="url(#gsd)" />
      </symbol>

      <symbol id="i-phone" viewBox="0 0 64 64">
        <ellipse cx="32" cy="58" rx="15" ry="2.6" fill="#16181F" opacity=".1" />
        <rect x="16" y="4" width="32" height="50" rx="8" fill="url(#gmd)" />
        <rect x="16" y="4" width="26" height="50" rx="8" fill="url(#gm)" />
        <rect x="20" y="11" width="18" height="34" rx="4" fill="#FAF7F2" />
        <rect x="24" y="16" width="10" height="3" rx="1.5" fill="#1E7A4E" opacity=".55" />
        <rect x="24" y="23" width="7" height="3" rx="1.5" fill="#1E7A4E" opacity=".32" />
      </symbol>

      <symbol id="i-logo" viewBox="0 0 64 64">
        <path d="M32 8 6 20l26 12 26-12z" fill="#fff" opacity=".95" />
        <path d="M14 26v13c0 5 8 9 18 9s18-4 18-9V26l-18 8z" fill="#fff" opacity=".7" />
      </symbol>
    </svg>
  );
}
