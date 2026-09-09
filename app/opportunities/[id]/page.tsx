import { OpportunityDetailContent } from "../../server/opportunitiesserver";
import { getOpportunityById } from "../../actions/opportunities_actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getOpportunityById(id);
  return {
    title: opportunity ? `${opportunity.title} — COCR` : "الفرصة غير موجودة — COCR",
    description: opportunity?.description,
  };
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpportunityDetailContent id={id} />;
}
