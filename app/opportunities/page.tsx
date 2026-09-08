import { OpportunitiesPageContent } from "../server/opportunitiesserver";

export const metadata = {
  title: "المنح والفرص والتطوع — COCR",
  description: "مسابقات، منح، وبرامج تطوع مناسبة لسنك، أونلاين وأوفلاين، مع تنبيهات الديدلاين.",
};

export default function OpportunitiesPage() {
  return <OpportunitiesPageContent />;
}
