import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getMyMentorApplication } from "../actions/mentor_actions";
import { getSubmissionsForMentor } from "../actions/submissions_actions";
import { SubmissionReviewRow } from "../client/mentor_inbox_client";
import { MentorShell } from "./mentorshell";
import { SiteFooter } from "./landingserver";
import { AppPageHeader } from "@/components/homecomponent/app-page-header";

export async function MentorSubmissionsInboxContent() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/mentor/submissions");

  const application = await getMyMentorApplication();
  if (application?.status !== "approved") redirect("/become-a-mentor");

  const submissions = await getSubmissionsForMentor();

  return (
    <>
    <main className="relative overflow-hidden bg-sugar-white pb-[100px] pt-[52px]">
      <div className="relative z-[2] mx-auto max-w-[720px] px-7">
        <MentorShell active="/mentor/submissions" />
        <AppPageHeader title="تسليمات طلابك" context="راجعي شغل الطلاب اللي اتسلّم في التراك بتاعك." />

        {submissions.length === 0 ? (
          <p className="text-[.9rem] text-muted-foreground">مفيش تسليمات جديدة دلوقتي.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.map((s, i) => (
              <div key={s.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <SubmissionReviewRow submission={s} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
