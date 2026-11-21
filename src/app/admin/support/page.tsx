import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { closeSupportRequest } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/utils";

export default async function AdminSupport() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("support_requests").select("*").order("status").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Support inbox</h1>
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{r.name} <span className="font-normal text-muted">· {r.contact}</span></p>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "open" ? "accent" : "muted"}>{r.status}</Badge>
                  <span className="text-xs text-muted">{formatDateTime(r.created_at)}</span>
                </div>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{r.message}</p>
              {r.status === "open" && (
                <ActionForm action={closeSupportRequest} className="mt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <SubmitButton size="sm" variant="outline">Mark resolved</SubmitButton>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No messages yet" />}
    </>
  );
}
