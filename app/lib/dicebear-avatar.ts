/** أفاتار توضيحي بس — نسخة تصميم مبدئية قبل ما نقرر نظام الصور الحقيقي.
 * DiceBear بيرجّع SVG جاهز على أساس seed ثابت (نفس الاسم = نفس الأفاتار
 * دايمًا)، بمزاج شعر/لبس مختلف حسب بنت/ولد. مفيش تخزين ولا API key.
 * أسماء الخيارات (top/clothing) لازم تتأكد من https://api.dicebear.com/9.x/avataaars/schema.json
 * — القيم دي مش من الذاكرة، اتأكد منها فعليًا لأن نسخ قديمة من الـ API كانت
 * بأسماء مختلفة (longHairCurly.. بدل curly) وكانت بترجع 400. */
const FEMALE_TOP = ["bob", "bun", "curly", "longButNotTooLong", "straight02", "bigHair"];
const FEMALE_CLOTHING = ["blazerAndSweater", "collarAndSweater", "shirtScoopNeck"];
const MALE_TOP = ["shortFlat", "shortRound", "shortWaved", "shaggy", "theCaesar", "shavedSides"];
const MALE_CLOTHING = ["hoodie", "shirtCrewNeck", "graphicShirt"];

// وشوش مبتسمة/مرتاحة بس — مقصودة عشان الأفاتار يبان مرحّب بيه، مش تعبير
// غريب أو عصبي عشوائي (mouth/eyes/eyebrows كلهم بيتحددوا بالـseed، لو
// سبناهم على الافتراضي بيطلع تعبيرات زي "concerned"/"angry" عشوائي)
const HAPPY_MOUTH = ["smile", "twinkle"];
const HAPPY_EYES = ["happy", "default", "wink"];
const HAPPY_EYEBROWS = ["default", "defaultNatural", "raisedExcitedNatural"];

export function avatarUrl(seed: string, gender: "male" | "female"): string {
  const top = gender === "female" ? FEMALE_TOP : MALE_TOP;
  const clothing = gender === "female" ? FEMALE_CLOTHING : MALE_CLOTHING;
  const params = new URLSearchParams();
  params.set("seed", seed);
  params.set("radius", "50");
  top.forEach((t) => params.append("top[]", t));
  clothing.forEach((c) => params.append("clothing[]", c));
  HAPPY_MOUTH.forEach((m) => params.append("mouth[]", m));
  HAPPY_EYES.forEach((e) => params.append("eyes[]", e));
  HAPPY_EYEBROWS.forEach((b) => params.append("eyebrows[]", b));
  // ديفولت الـ API بيحط شنب/دقن بنسبة 10% عشوائي — بغض النظر عن الجنس، وده
  // كان بيطلع غلط على أفاتارات بنات. قفلناه خالص، ونفس الكلام للإكسسوارات
  // العشوائية (نضارات...) عشان الأفاتار يفضل واضح وبسيط
  params.set("facialHairProbability", "0");
  params.set("accessoriesProbability", "0");
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}
