import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input, Select } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/utils";

type Props = { searchParams: Promise<{ q?: string; category?: string; verification?: string; deleted?: string }> };

export default async function AdminServices({ searchParams }: Props) {
  const sp = await searchParams;
  await requireAdmin();
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");
  let q = supabase.from("services").select("id, slug, title, kind, fee_paise, verification_status, is_published, is_popular, updated_at, categories(name)").order("sort_order").limit(500);
  if (sp.q) q = q.ilike("title", `%${sp.q.replace(/[%,()]/g, "").slice(0, 60)}%`);
  if (sp.category) q = q.eq("category_id", sp.category);
  if (sp.verification) q = q.eq("verification_status", sp.verification);
  const { data } = await q;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Services, schemes & listings</h1>
        <Link href="/admin/services/new" className={buttonVariants()}><Plus className="h-4 w-4" /> New service</Link>
      </div>
      {sp.deleted && <Alert tone="success" className="mb-4">Service deleted.</Alert>}
      <Alert tone="warn" className="mb-4" title="Verification workflow">
        Records marked <strong>Demo</strong> or <strong>Unverified</strong> show a warning on the public page. Check every detail against the official source before marking a record Verified.
      </Alert>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Search title" className="max-w-xs" />
        <Select name="category" defaultValue={sp.category ?? ""} className="max-w-[220px]">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="verification" defaultValue={sp.verification ?? ""} className="max-w-[180px]">
          <option value="">Any verification</option>
          <option value="demo">Demo</option><option value="unverified">Unverified</option><option value="verified">Verified</option>
        </Select>
        <Button type="submit" variant="navy">Filter</Button>
      </form>
      <Table head={["Title", "Category", "Type", "Fee", "Status", "Updated"]}>
        {(data ?? []).map((s) => (
          <tr key={s.id} className="hover:bg-canvas/50">
            <Td><Link href={`/admin/services/${s.id}`} className="font-semibold text-teal hover:underline">{s.title}</Link><div className="text-xs text-muted">/service/{s.slug}</div></Td>
            <Td>{(s.categories as unknown as { name: string } | null)?.name}</Td>
            <Td className="capitalize">{s.kind}</Td>
            <Td>{s.fee_paise == null ? <span className="text-muted">Info only</span> : formatINR(s.fee_paise)}</Td>
            <Td className="space-x-1">
              <Badge variant={s.verification_status === "verified" ? "success" : "warn"}>{s.verification_status}</Badge>
              {!s.is_published && <Badge variant="muted">Hidden</Badge>}
              {s.is_popular && <Badge variant="teal">Popular</Badge>}
            </Td>
            <Td className="text-xs text-muted">{formatDate(s.updated_at)}</Td>
          </tr>
        ))}
        {!data?.length && <tr><Td colSpan={6} className="py-10 text-center text-muted">No services. Run supabase/seed.sql to load the demo catalogue.</Td></tr>}
      </Table>
    </>
  );
}
