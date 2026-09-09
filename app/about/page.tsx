import { AboutPageContent } from "../server/aboutserver";

export const metadata = {
  title: "قصتنا — COCR",
  description: "إحنا بدأنا كطلاب... وبنبني المكان اللي كنا محتاجينه. حكاية COCR من البداية.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
