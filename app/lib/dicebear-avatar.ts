/** أفاتار توضيحي بس — لسه مش صورة حقيقية، بس بدل الحروف الأولى من الاسم.
 * DiceBear بيرجّع SVG جاهز على أساس seed ثابت (نفس المستخدم = نفس الأفاتار
 * دايمًا)، بمزاج شعر مختلف حسب بنت/ولد. مفيش تخزين ولا API key.
 *
 * غيّرنا من "avataaars" (شكل شبه واقعي) لـ "big-smile" — ستايل رسم مسطّح
 * كيوت ومريح، مناسب أكتر لطلاب المرحلة العمرية دي وبيبان حلو حتى وهو
 * متقصوص صغير في دايرة. أسماء الخيارات لازم تتأكد منها فعليًا من
 * https://api.dicebear.com/9.x/big-smile/schema.json مش من الذاكرة —
 * إصدارات مختلفة من الـAPI بتستخدم أسماء مختلفة وبترجع 400 لو غلط. */
const FEMALE_HAIR = ["wavyBob", "curlyBob", "braids", "bunHair", "froBun", "bangs"];
const MALE_HAIR = ["shortHair", "bowlCutHair", "shavedHead", "straightHair", "curlyShortHair", "halfShavedHead"];

// وشوش مبتسمة بس — مقصودة عشان الأفاتار يبان مرحّب بيه ومبسوط، مش تعبير
// غريب أو زعلان عشوائي (لو سبنا القيم دي على الافتراضي بيطلع "sad"/"angry"
// أو "confused" عشوائي حسب الـseed)
const HAPPY_EYES = ["cheery", "starstruck", "winking", "normal"];
const HAPPY_MOUTH = ["openedSmile", "teethSmile", "gapSmile", "kawaii"];

// خلفية دايرة الأفاتار بألوان هوية كوكر السوفت (أزرق فاتح/دهبي فاتح/أخضر
// فاتح) بدل الرمادي الافتراضي، عشان يحس إنه جزء من المنصة مش عنصر مستعار
const BACKGROUND_COLORS = ["EFF1FC", "FBF1DC", "EAF6EF", "EEF2FE"];

export function avatarUrl(seed: string, gender: "male" | "female"): string {
  const hair = gender === "female" ? FEMALE_HAIR : MALE_HAIR;
  const params = new URLSearchParams();
  params.set("seed", seed);
  hair.forEach((h) => params.append("hair[]", h));
  HAPPY_EYES.forEach((e) => params.append("eyes[]", e));
  HAPPY_MOUTH.forEach((m) => params.append("mouth[]", m));
  BACKGROUND_COLORS.forEach((c) => params.append("backgroundColor[]", c));
  // ديفولت الـ API بيحط إكسسوار عشوائي (شنب/نضارة/تاج...) بنسبة 50%،
  // بغض النظر عن الجنس — قفلناه خالص عشان الأفاتار يفضل واضح وبسيط
  params.set("accessoriesProbability", "0");
  return `https://api.dicebear.com/9.x/big-smile/svg?${params.toString()}`;
}
