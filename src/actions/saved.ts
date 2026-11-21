"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceBySlug } from "@/lib/data/catalogue";

export type SaveResult = { ok: true; saved: boolean } | { ok: false; error: "login" | "unavailable" | "failed" };

export async function toggleSavedService(slug: string): Promise<SaveResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "login" };
  const service = await getServiceBySlug(slug);
  if (!service?.id) return { ok: false, error: "unavailable" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saved_services")
    .select("service_id")
    .eq("user_id", user.id)
    .eq("service_id", service.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("saved_services").delete().eq("user_id", user.id).eq("service_id", service.id)
    : await supabase.from("saved_services").insert({ user_id: user.id, service_id: service.id });
  if (error) return { ok: false, error: "failed" };

  revalidatePath("/dashboard/saved");
  return { ok: true, saved: !existing };
}
