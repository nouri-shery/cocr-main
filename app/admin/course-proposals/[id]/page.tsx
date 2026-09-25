import { AdminCourseReviewContent } from "../../../server/admincoursereviewserver";

export default async function AdminCourseReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCourseReviewContent id={id} />;
}
