import { ProjectDetailContent } from "../../server/projectsserver";
import { getProjectById } from "../../actions/projects_actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);
  return {
    title: project ? `${project.title} — COCR` : "المشروع — COCR",
    description: project?.description,
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailContent id={id} />;
}
