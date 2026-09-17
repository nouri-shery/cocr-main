import { SafetyPageContent } from "../server/safetyserver";

export const metadata = {
  title: "الأمان والثقة — COCR",
  description: "إزاي COCR بتراجع المينتورز، بتتعامل مع البلاغات، وبتراجع المحتوى قبل ما ينزل.",
};

export default function SafetyPage() {
  return <SafetyPageContent />;
}
