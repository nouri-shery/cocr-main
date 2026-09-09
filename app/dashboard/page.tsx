import { DashboardPageContent } from "../server/dashboardserver";

export const metadata = {
  title: "لوحة التحكم — COCR",
  description: "رحلتك في COCR: الخطوة الجاية، الفرص المرشّحة ليك، وتقدّمك.",
};

export default function DashboardPage() {
  return <DashboardPageContent />;
}
