import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ServiceForm } from "@/components/admin/service-form";
import { Alert } from "@/components/ui/alert";

export default async function EditService({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: service }, { data: categories }, { data: kw }] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("service_keywords").select("keyword").eq("service_id", id),
  ]);
  if (!service) notFound();
  return (
    <>
      <Link href="/admin/services" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-teal"><ChevronLeft className="h-4 w-4" /> Services</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Edit: {service.title}</h1>
        <Link href={`/service/${service.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-teal">View public page <ExternalLink className="h-3.5 w-3.5" /></Link>
      </div>
      {sp.saved && <Alert tone="success" className="mb-4">Saved. The public site and search index update within a minute.</Alert>}
      <ServiceForm service={service} categories={categories ?? []} keywords={(kw ?? []).map((k) => k.keyword)} />
    </>
  );
}
