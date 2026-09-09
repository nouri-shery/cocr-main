import { CoursesPageContent } from "../server/coursesserver";

export const metadata = {
  title: "الكورسات — COCR",
  description: "كورسات قصيرة بمينتورز سبقوك بسنة أو اتنين — مش مكتبة فيديوهات.",
};

export default function CoursesPage() {
  return <CoursesPageContent />;
}
