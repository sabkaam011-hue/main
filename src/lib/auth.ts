import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "staff" | "admin" | null;

/** Returns the verified user (validated with Supabase Auth), or null. Deduped per request. */
export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

export const getStaffRole = cache(async (): Promise<StaffRole> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
  return (data?.role as StaffRole) ?? null;
});

export async function requireUser(next = "/dashboard"): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaff() {
  const user = await requireUser("/admin");
  const role = await getStaffRole();
  if (!role) redirect("/dashboard?error=forbidden");
  return { user, role };
}

export async function requireAdmin() {
  const { user, role } = await requireStaff();
  if (role !== "admin") redirect("/admin?error=admin_only");
  return { user, role };
}

/** For server actions: throw instead of redirect so the caller can return an error. */
export async function assertStaff(): Promise<{ user: User; role: Exclude<StaffRole, null> }> {
  const user = await getUser();
  const role = await getStaffRole();
  if (!user || !role) throw new Error("Not authorised");
  return { user, role };
}

export async function assertAdmin() {
  const ctx = await assertStaff();
  if (ctx.role !== "admin") throw new Error("Admin access required");
  return ctx;
}
