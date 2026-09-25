import { MentorCourseBuilderContent } from "../../../server/mentorcoursebuilderserver";

export default async function MentorCourseBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MentorCourseBuilderContent id={id} />;
}
