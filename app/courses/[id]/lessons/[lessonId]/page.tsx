import { LessonPageContent } from "../../../../server/coursesserver";
import { getLessonWithContent } from "../../../../actions/lessons_actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await getLessonWithContent(lessonId);
  return {
    title: lesson ? `${lesson.title} — COCR` : "الدرس — COCR",
    description: lesson?.summary ?? "درس على COCR.",
  };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  return <LessonPageContent courseId={id} lessonId={lessonId} />;
}
