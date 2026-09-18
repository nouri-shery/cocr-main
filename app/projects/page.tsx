import { ProjectsPageContent } from "../server/projectsserver";

export const metadata = {
  title: "مشاريع التخرّج — COCR",
  description: "مشاريع تخرّج موثّقة لطلاب COCR.",
};

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <ProjectsPageContent search={q} />;
}
