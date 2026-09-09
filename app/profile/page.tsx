import { ProfilePageContent } from "../server/profileserver";

export const metadata = {
  title: "الملف الشخصي — COCR",
  description: "بياناتك واهتماماتك في COCR.",
};

export default function ProfilePage() {
  return <ProfilePageContent />;
}
