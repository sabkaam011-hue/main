import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ServiceForm } from "@/components/admin/service-form";

export default async function NewService() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");
  return (
    <>
      <Link href="/admin/services" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-teal"><ChevronLeft className="h-4 w-4" /> Services</Link>
      <h1 className="mt-3 mb-6 text-2xl font-extrabold text-navy">New service / listing</h1>
      <ServiceForm categories={categories ?? []} />
    </>
  );
}
