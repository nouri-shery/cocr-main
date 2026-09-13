import { ProjectsPageContent } from "../server/projectsserver";

export const metadata = {
  title: "المشاريع — COCR",
  description: "مشاريع حقيقية عملها طلاب COCR.",
};

export default function ProjectsPage() {
  return <ProjectsPageContent />;
}
