import type { MentorInboxSubmission } from "../actions/submissions_actions";

export interface StudentSummary {
  id: string;
  name: string;
  pendingCount: number;
  totalCount: number;
  lastActivityAt: string;
}

/** بتجمّع تسليمات حقيقية (getSubmissionsForMentor) على مستوى الطالب — مفيش
 * استعلام جديد ولا رقم مُلفَّق، بس تجميع لبيانات حقيقية موجودة أصلًا */
export function groupByStudent(subs: MentorInboxSubmission[]): StudentSummary[] {
  const map = new Map<string, StudentSummary>();
  for (const s of subs) {
    const activityAt = s.submitted_at ?? s.created_at;
    const existing = map.get(s.student_id);
    if (existing) {
      existing.totalCount += 1;
      if (!s.feedback_given) existing.pendingCount += 1;
      if (activityAt > existing.lastActivityAt) existing.lastActivityAt = activityAt;
    } else {
      map.set(s.student_id, {
        id: s.student_id,
        name: s.student?.display_name ?? "طالب في COCR",
        totalCount: 1,
        pendingCount: s.feedback_given ? 0 : 1,
        lastActivityAt: activityAt,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
