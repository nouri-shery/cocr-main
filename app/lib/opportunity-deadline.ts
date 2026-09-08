export type DeadlineUrgency = "closed" | "urgent" | "soon" | "normal" | "open";

export function getDeadlineInfo(deadline: string | null, now: Date = new Date()) {
  if (!deadline) {
    return { urgency: "open" as DeadlineUrgency, daysLeft: null, label: "التقديم مفتوح" };
  }
  const due = new Date(`${deadline}T23:59:59`);
  const msLeft = due.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { urgency: "closed" as DeadlineUrgency, daysLeft, label: "التقديم اتقفل" };
  if (daysLeft <= 7) return { urgency: "urgent" as DeadlineUrgency, daysLeft, label: daysLeft === 0 ? "آخر يوم النهاردة!" : `باقي ${daysLeft} يوم بس` };
  if (daysLeft <= 30) return { urgency: "soon" as DeadlineUrgency, daysLeft, label: `باقي ${daysLeft} يوم` };
  return { urgency: "normal" as DeadlineUrgency, daysLeft, label: `باقي ${daysLeft} يوم` };
}
