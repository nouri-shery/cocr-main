import { VerifyCertificateContent } from "../../server/certificateserver";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return {
    title: `تحقّق من شهادة ${code} — COCR`,
    description: "تحقّق عام من شهادة COCR — بدون تسجيل دخول.",
  };
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <VerifyCertificateContent code={code} />;
}
