/** أفاتار توضيحي بس — لسه مش صورة حقيقية، بس بدل الحروف الأولى من الاسم.
 * دي مجموعة رسومات ثابتة (11 صورة حقيقية، مش مولّدة بخوارزمية) بستايل واحد
 * متّسق، عشان نضمن شكلها يفضل كيوت ومريح دايمًا بدل ما نراهن على API
 * بيولّد عشوائي وممكن يطلع غريب. كل مستخدم بياخد نفس الأفاتار دايمًا
 * (مبني على الـseed الثابت بتاعه)، ومفيش تخزين ولا API خارجي وقت التشغيل.
 */
export interface AvatarOption {
  id: string;
  src: string;
  gender: "male" | "female";
}

export const AVATARS: AvatarOption[] = [
  { id: "boy-messy-blue", src: "/avatars/boy-messy-blue.png", gender: "male" },
  { id: "boy-curly-green", src: "/avatars/boy-curly-green.png", gender: "male" },
  { id: "boy-cap-blue", src: "/avatars/boy-cap-blue.png", gender: "male" },
  { id: "boy-glasses-green", src: "/avatars/boy-glasses-green.png", gender: "male" },
  { id: "boy-glasses-blue", src: "/avatars/boy-glasses-blue.png", gender: "male" },
  { id: "girl-headband-purple", src: "/avatars/girl-headband-purple.png", gender: "female" },
  { id: "girl-headphones-pink", src: "/avatars/girl-headphones-pink.png", gender: "female" },
  { id: "girl-glasses-pink", src: "/avatars/girl-glasses-pink.png", gender: "female" },
  { id: "girl-bob-yellow", src: "/avatars/girl-bob-yellow.png", gender: "female" },
  { id: "girl-bob-blue", src: "/avatars/girl-bob-blue.png", gender: "female" },
  { id: "girl-hijab-purple", src: "/avatars/girl-hijab-purple.png", gender: "female" },
];

/** توزيع بسيط وثابت — نفس الـseed دايمًا بيطلع بنفس الأفاتار، عشان الأفاتار
 * مايتغيرش كل مرة يفتح فيها المستخدم الصفحة (ده الافتراضي قبل ما يختار) */
export function avatarUrl(seed: string, gender: "male" | "female"): string {
  const options = AVATARS.filter((a) => a.gender === gender);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return options[hash % options.length].src;
}

/** المصدر الفعلي للأفاتار — لو المستخدم اختار واحد بنفسه (avatarId محفوظ في
 * profiles) بيتقدّم عليه، وإلا بيرجع للتعيين التلقائي الثابت */
export function resolveAvatarSrc(
  seed: string, gender: "male" | "female", avatarId: string | null,
): string {
  if (avatarId) {
    const chosen = AVATARS.find((a) => a.id === avatarId);
    if (chosen) return chosen.src;
  }
  return avatarUrl(seed, gender);
}
