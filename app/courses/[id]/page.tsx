import { CourseDetailContent } from "../../server/coursesserver";
import { getCourseById } from "../../actions/landing_page_actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourseById(id);
  return {
    title: course ? `${course.title} — COCR` : "الكورس — COCR",
    description: course?.description ?? "تفاصيل الكورس على COCR.",
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseDetailContent id={id} />;
}
