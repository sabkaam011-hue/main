import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUserRole } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/utils";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const { role } = await requireStaff();
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createAdminClient();
  const [{ data: list }, { data: roles }, { data: profiles }] = await Promise.all([
    db.auth.admin.listUsers({ page, perPage: 50 }),
    db.from("admin_users").select("user_id, role"),
    db.from("profiles").select("id, full_name, state"),
  ]);
  const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const users = list?.users ?? [];
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Users & roles</h1>
      <Table head={["User", "Contact", "Joined", "Role", ...(role === "admin" ? ["Change role"] : [])]}>
        {users.map((u) => {
          const r = roleMap.get(u.id) ?? "user";
          const p = profileMap.get(u.id);
          return (
            <tr key={u.id}>
              <Td><p className="font-semibold">{p?.full_name ?? "—"}</p><p className="text-xs text-muted">{p?.state ?? ""}</p></Td>
              <Td className="text-sm">{u.email ?? ""}{u.phone && <div className="text-xs text-muted">+{u.phone}</div>}</Td>
              <Td className="text-xs text-muted">{formatDate(u.created_at)}</Td>
              <Td><Badge variant={r === "admin" ? "accent" : r === "staff" ? "teal" : "muted"}>{r}</Badge></Td>
              {role === "admin" && (
                <Td>
                  <ActionForm action={setUserRole} className="flex items-center gap-2 space-y-0">
                    <input type="hidden" name="userId" value={u.id} />
                    <Select name="role" defaultValue={r} className="h-9 w-28" aria-label="Role">
                      <option value="user">user</option><option value="staff">staff</option><option value="admin">admin</option>
                    </Select>
                    <SubmitButton size="sm" variant="outline">Save</SubmitButton>
                  </ActionForm>
                </Td>
              )}
            </tr>
          );
        })}
      </Table>
      <div className="mt-4 flex gap-3 text-sm">
        {page > 1 && <a className="font-semibold text-teal" href={`?page=${page - 1}`}>← Previous</a>}
        {users.length === 50 && <a className="font-semibold text-teal" href={`?page=${page + 1}`}>Next →</a>}
      </div>
    </>
  );
}
