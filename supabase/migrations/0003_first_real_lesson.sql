-- Milestone 3 — first real lesson content for catalog_lessons.
--
-- المحتوى ده منسوخ زي ما وصلني بالظبط — بعد مراجعة، شلت 3 حاجات كنت
-- أضفتها من عندي في نسخة سابقة من الملف ده. النقط الثلاثة دي فاضلة زي ما
-- هي في المصدر الأصلي — ناقصة/فاضية عن قصد لحد ما المحتوى الحقيقي ليها
-- يوصل: (1) شرح tags الفاضي بعد "عندنا هنا" غير h1/p، (2) سؤال Check رقم 3
-- بالكامل، (3) كود الحل المرجعي في Build Challenge.
--
-- **معنديش INSERT grant على catalog_lessons** (متعمّد — المحتوى
-- admin-managed زي ما هو متفق عليه) — الملف ده لازم يتشغّل يدويًا من
-- Supabase SQL Editor، نفس باقي الملفات في المجلد ده.

insert into public.catalog_lessons (course_id, title, summary, content_type, content, order_index, published)
values (
  'fe-basics',
  'يعني إيه Web Page؟',
  'الطالب يفهم الفرق بين HTML وCSS وJavaScript، ويكتب أول صفحة HTML بنفسه.',
  'text',
  $lesson$### قبل ما تبدأ

الـFront-End هو الجزء من الموقع اللي المستخدم بيشوفه ويتعامل معاه.

أي صفحة ويب بنبنيها غالبًا بتعتمد على 3 أجزاء أساسية:

- **HTML** → بيحدد محتوى الصفحة وهيكلها.
- **CSS** → بيحدد شكل الصفحة وتنسيقها.
- **JavaScript** → بيضيف التفاعل والسلوك.

مثال:

```html
<h1>Welcome to COCR</h1>
<p>I am learning Front-End.</p>
```

هنا HTML قال للمتصفح: عندي عنوان، وعندي فقرة. لكن الصفحة لسه شكلها بسيط جدًا. هنا بييجي دور CSS.

```css
h1 {
  color: blue;
}
```

ولو عايزين الصفحة تعمل حاجة لما المستخدم يضغط على زر، هنا نستخدم JavaScript.

### HTML يعني إيه؟

HTML اختصار لـ HyperText Markup Language. هو مش Programming Language بالمعنى التقليدي. إحنا بنستخدمه عشان نبني structure الصفحة.

مثال:

```html
<h1>My First Website</h1>
<p>Hello! I am learning HTML.</p>
<button>Click Me</button>
```

كل حاجة بين `< >` اسمها tag. عندنا هنا:

-
-
- زر

### أول صفحة ليك

اكتب الكود ده:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My First Page</title>
  </head>

  <body>
    <h1>Hello, I'm Nour!</h1>
    <p>This is my first web page.</p>
    <button>Start Learning</button>
  </body>
</html>
```

جرب تغير:

- اسمك
- الجملة الموجودة في `<p>`
- النص الموجود داخل الزر

المهم: متعملش Copy-Paste وخلاص. اكتب الكود بنفسك وشوف كل تغيير بيعمل إيه.

### افهم اللي كتبته

- `<!DOCTYPE html>` — بيقول للمتصفح إن الملف HTML.
- `<html>` — بيحتوي الصفحة كلها.
- `<head>` — فيه معلومات عن الصفحة مش بتظهر كجزء من المحتوى الأساسي.
- `<title>` — اسم الصفحة اللي بيظهر في Tab المتصفح.
- `<body>` — كل المحتوى اللي المستخدم بيشوفه.

### Try

غيّر:

1. اسم الصفحة.
2. النص داخل h1.
3. النص داخل p.
4. النص داخل button.

وبعدين افتح الصفحة في المتصفح وشوف النتيجة.

### Build Challenge — My Learning Card

اعمل صفحة شخصية صغيرة. لازم تحتوي على:

1. عنوان باسمك.
2. فقرة تعرف فيها نفسك.
3. عنوان تاني اسمه My Skills.
4. 3 مهارات بتتعلمها.
5. زر مكتوب عليه Start My Journey.

Requirements:

- استخدم `h1`.
- استخدم `p`.
- استخدم `button`.
- استخدم heading إضافي لـ My Skills.
- اكتب المحتوى بنفسك.

<details>
<summary>Hint 1</summary>

افتكر إن العنوان الرئيسي بيستخدم h1.
</details>

<details>
<summary>Hint 2</summary>

الصفحة بتحتاج html وhead وbody.
</details>

<details>
<summary>Show solution</summary>

لا تعرض الحل إلا بعد استخدام الـhints أو طلب الحل.
</details>

### Reflect

جاوب على سؤال واحد على الأقل: "إيه الفرق بين h1 وp في الصفحة اللي عملتها؟"

### Check Yourself

**1. HTML بيستخدم في إيه؟**

A. إضافة structure للموقع
B. تغيير ألوان الموقع فقط
C. إضافة database
D. تشغيل السيرفر

<details>
<summary>الإجابة الصحيحة</summary>

**A** — HTML مسؤول عن structure الصفحة، بينما CSS مسؤول عن الشكل وJavaScript عن التفاعل.
</details>

**2. CSS مسؤولة بشكل أساسي عن إيه؟**

A. Structure
B. Styling
C. Database
D. Authentication

<details>
<summary>الإجابة الصحيحة</summary>

**B**
</details>

### هتقدر تعمل إيه بعد الدرس ده

- تشرح الفرق الأساسي بين HTML وCSS وJavaScript.
- تعمل ملف HTML.
- تستخدم h1 وp وbutton.
- تفهم الفرق بين head وbody.
- تعدل صفحة بسيطة بنفسك.$lesson$,
  1,
  true
)
on conflict (course_id, order_index) do nothing;
