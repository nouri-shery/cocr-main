import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import {
  isCurrentUserStaff, isCurrentUserSuperAdmin, listMentorApplications, listReports, listDeletionRequests, listModerationLog,
} from "../actions/admin_actions";
import { listPolicies, getPolicyBySlug } from "../actions/policy_actions";
import { MentorApplicationRow, ReportRow, DeletionRequestRow } from "../client/admin_client";
import { PolicyEditorForm } from "../client/policy_admin_client";

async function requireStaff() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/admin/mentor-applications");
  const staff = await isCurrentUserStaff();
  if (!staff) redirect("/");
}

async function requireSuperAdmin(nextPath: string) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=${nextPath}`);
  if (!(await isCurrentUserSuperAdmin())) redirect("/");
}

/** لوحة داخلية بسيطة — أداة إدارية للفريق، مش واجهة طالب، فمفيش داعي لتصميم مُبالغ فيه */
function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-[900px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <Link href="/admin/mentor-applications" className="text-[.85rem] font-bold text-primary hover:underline">طلبات المينتورز</Link>
        <Link href="/admin/reports" className="text-[.85rem] font-bold text-primary hover:underline">البلاغات</Link>
        <Link href="/admin/deletion-requests" className="text-[.85rem] font-bold text-primary hover:underline">طلبات حذف الحساب</Link>
        <Link href="/admin/moderation-log" className="text-[.85rem] font-bold text-primary hover:underline">سجل المراجعة</Link>
        <Link href="/admin/policies" className="text-[.85rem] font-bold text-primary hover:underline">سياسات المحتوى</Link>
      </div>
      <h1 className="mb-6 text-[1.4rem] font-extrabold">{title}</h1>
      {children}
    </main>
  );
}

export async function AdminMentorApplicationsContent() {
  await requireStaff();
  const applications = await listMentorApplications();

  return (
    <AdminShell title="طلبات الانضمام كمينتور">
      {applications.length === 0 ? (
        <p className="text-[.9rem] text-muted-foreground">مفيش طلبات دلوقتي.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((a) => (
            <MentorApplicationRow key={a.id} application={a} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

export async function AdminReportsContent() {
  await requireStaff();
  const reports = await listReports();

  return (
    <AdminShell title="البلاغات">
      {reports.length === 0 ? (
        <p className="text-[.9rem] text-muted-foreground">مفيش بلاغات دلوقتي.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

export async function AdminDeletionRequestsContent() {
  await requireStaff();
  const requests = await listDeletionRequests();

  return (
    <AdminShell title="طلبات حذف الحساب">
      {requests.length === 0 ? (
        <p className="text-[.9rem] text-muted-foreground">مفيش طلبات دلوقتي.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <DeletionRequestRow key={r.id} request={r} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

export async function AdminPoliciesListContent() {
  await requireSuperAdmin("/admin/policies");
  const policies = await listPolicies();

  return (
    <AdminShell title="سياسات المحتوى">
      <div className="flex flex-col gap-2">
        {policies.map((p) => (
          <Link
            key={p.slug}
            href={`/admin/policies/${p.slug}`}
            className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-white p-4 hover:border-primary"
          >
            <span className="text-[.9rem] font-bold">{p.title}</span>
            <span className="flex items-center gap-2 text-[.78rem] text-muted-foreground">
              نسخة {p.version}
              <span className={p.status === "published" ? "font-bold text-green" : "font-bold text-gold-600"}>
                {p.status === "published" ? "منشورة" : "مسودة"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}

export async function AdminPolicyEditContent({ slug }: { slug: string }) {
  await requireSuperAdmin(`/admin/policies/${slug}`);
  const policy = await getPolicyBySlug(slug);
  if (!policy) notFound();

  return (
    <AdminShell title={policy.title}>
      <PolicyEditorForm policy={policy} />
    </AdminShell>
  );
}

export async function AdminModerationLogContent() {
  await requireStaff();
  const entries = await listModerationLog();

  return (
    <AdminShell title="سجل المراجعة">
      {entries.length === 0 ? (
        <p className="text-[.9rem] text-muted-foreground">مفيش حاجة اتسجّلت لسه.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-start text-[.82rem]">
            <thead className="bg-sand text-[.76rem] font-bold text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-start">مين</th>
                <th className="px-4 py-2.5 text-start">عمل إيه</th>
                <th className="px-4 py-2.5 text-start">على إيه</th>
                <th className="px-4 py-2.5 text-start">السبب</th>
                <th className="px-4 py-2.5 text-start">إمتى</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-2.5">{e.actor?.display_name ?? "—"}</td>
                  <td className="px-4 py-2.5">{e.action}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.target_type} · {e.target_id.slice(0, 8)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.reason ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(e.created_at).toLocaleString("ar-EG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
