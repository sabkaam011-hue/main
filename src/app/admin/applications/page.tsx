import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, Td } from "@/components/admin/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUSES, STATUS_META, type ApplicationStatus } from "@/lib/applications";
import { formatDateTime, formatINR } from "@/lib/utils";

type Props = { searchParams: Promise<{ status?: string; q?: string; mine?: string }> };

export default async function AdminApplications({ searchParams }: Props) {
  const sp = await searchParams;
  const { user } = await requireStaff();
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select("id, reference, status, fee_paise, applicant_name, applicant_phone, created_at, updated_at, assigned_to, services(title)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (sp.status && (APPLICATION_STATUSES as readonly string[]).includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.mine) query = query.eq("assigned_to", user.id);
  if (sp.q) {
    const q = sp.q.replace(/[%,()]/g, "").slice(0, 60);
    query = query.or(`reference.ilike.%${q}%,applicant_name.ilike.%${q}%,applicant_phone.ilike.%${q}%`);
  }
  const { data } = await query;
  const rows = (data ?? []) as unknown as { id: string; reference: string; status: ApplicationStatus; fee_paise: number; applicant_name: string; applicant_phone: string; created_at: string; updated_at: string; assigned_to: string | null; services: { title: string } | null }[];

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Assistance requests</h1>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Reference, name or phone" className="max-w-xs" />
        <Select name="status" defaultValue={sp.status ?? ""} className="max-w-[220px]">
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].en}</option>)}
        </Select>
        <label className="flex items-center gap-2 px-2 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={!!sp.mine} className="accent-teal" /> Assigned to me</label>
        <Button type="submit" variant="navy">Filter</Button>
      </form>
      <Table head={["Reference", "Service", "Applicant", "Fee", "Status", "Updated"]}>
        {rows.map((a) => (
          <tr key={a.id} className="hover:bg-canvas/50">
            <Td><Link href={`/admin/applications/${a.id}`} className="font-semibold text-teal hover:underline">{a.reference}</Link></Td>
            <Td>{a.services?.title}</Td>
            <Td>{a.applicant_name}<div className="text-xs text-muted">{a.applicant_phone}</div></Td>
            <Td>{formatINR(a.fee_paise)}</Td>
            <Td><StatusBadge status={a.status} /></Td>
            <Td className="text-xs text-muted whitespace-nowrap">{formatDateTime(a.updated_at)}</Td>
          </tr>
        ))}
        {!rows.length && <tr><Td colSpan={6} className="py-10 text-center text-muted">No requests match.</Td></tr>}
      </Table>
    </>
  );
}
