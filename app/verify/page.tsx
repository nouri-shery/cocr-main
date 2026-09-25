import { VerifySearchPageContent } from "../server/certificateserver";

export const metadata = {
  title: "تحقّق من شهادة — COCR",
  description: "اتأكد إن شهادة COCR حقيقية عن طريق رقمها، من غير تسجيل دخول.",
};

export default function VerifyPage() {
  return <VerifySearchPageContent />;
}
