import Link from "next/link";
import { FileStack, FileText, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageTitle } from "@/components/dashboard/page-title";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteDocumentButton } from "@/components/dashboard/action-buttons";
import { formatDate } from "@/lib/utils";

export default async function DocumentsPage() {
  const user = await requireUser("/dashboard/documents");
  const supabase = await createClient();
  const { locale } = await getI18n();
  const { data: docs } = await supabase
    .from("documents")
    .select("id, file_name, label, size_bytes, created_at, application_id, applications(reference, services(title))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <>
      <PageTitle title="Uploaded documents" subtitle="Stored privately. Only you and the staff handling your request can open them." />
      <p className="mb-4 flex items-center gap-2 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 text-teal" /> Links to files expire after 60 seconds and are never public.
      </p>
      {docs?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {docs.map((d) => {
            const app = d.applications as unknown as { reference: string; services: { title: string } | null } | null;
            return (
              <li key={d.id} className="flex items-center gap-3 p-4">
                <FileText className="h-5 w-5 shrink-0 text-teal" aria-hidden />
                <div className="min-w-0 flex-1">
                  <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="block truncate font-semibold hover:text-teal">{d.label || d.file_name}</a>
                  <p className="truncate text-xs text-muted">
                    <Link className="hover:text-teal" href={`/dashboard/applications/${d.application_id}`}>{app?.reference} · {app?.services?.title}</Link> · {(d.size_bytes / 1024).toFixed(0)} KB · {formatDate(d.created_at, locale)}
                  </p>
                </div>
                <DeleteDocumentButton documentId={d.id} />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<FileStack className="h-5 w-5" />} title="No documents uploaded" description="You'll be able to upload documents on an application after payment is confirmed." />
      )}
    </>
  );
}
