"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getServiceBySlug } from "@/lib/data/catalogue";
import { notify } from "@/lib/payments/service";
import { UPLOAD_ALLOWED_STATUSES, USER_CANCELLABLE_STATUSES } from "@/lib/applications";
import { MAX_UPLOAD_BYTES, safeFileName, sniffMime } from "@/lib/files";
import { rateLimit } from "@/lib/rate-limit";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | null;

const RequestSchema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number"),
  state: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(2000).optional(),
  consentPrivate: z.literal("on", { error: "Please confirm you understand Sabkaam is a private platform" }),
  consentNoGuarantee: z.literal("on", { error: "Please confirm you understand approval is not guaranteed" }),
  consentTerms: z.literal("on", { error: "Please accept the Terms and Refund Policy" }),
});

export async function createAssistanceRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please log in to continue." };
  if (!isServiceRoleConfigured()) return { error: "The database is not configured yet (SUPABASE_SERVICE_ROLE_KEY)." };
  if (!rateLimit(`assist:${user.id}`, 10, 60 * 60_000).ok) return { error: "Too many requests. Please try again later." };

  const parsed = RequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;

  const service = await getServiceBySlug(input.slug);
  if (!service?.id || service.feePaise == null) return { error: "Assistance is not available for this service." };

  // Eligibility self-check answers (checkbox per criterion)
  const eligibility: Record<string, boolean> = {};
  service.eligibility.forEach((crit, i) => (eligibility[crit] = formData.get(`elig_${i}`) === "on"));

  const db = createAdminClient();

  // Avoid accidental duplicates: one open request per service per user.
  const { data: open } = await db
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("service_id", service.id)
    .in("status", ["submitted", "payment_pending"])
    .limit(1)
    .maybeSingle();
  if (open) redirect(`/dashboard/applications/${open.id}?existing=1`);

  const status = service.feePaise > 0 ? "payment_pending" : "submitted";
  const { data: app, error } = await db
    .from("applications")
    .insert({
      user_id: user.id,
      service_id: service.id,
      status,
      fee_paise: service.feePaise, // fee is snapshotted from the DB — never from the client
      applicant_name: input.name,
      applicant_phone: `+91${input.phone}`,
      applicant_state: input.state || null,
      notes: input.notes || null,
      eligibility_answers: eligibility,
      consent_at: new Date().toISOString(),
    })
    .select("id, reference")
    .single();
  if (error || !app) {
    console.error("[assist] insert failed", error);
    return { error: "Could not submit your request. Please try again." };
  }

  await db.from("application_status_history").insert([
    { application_id: app.id, status: "submitted", note: "Assistance request submitted.", changed_by: user.id },
    ...(status === "payment_pending" ? [{ application_id: app.id, status: "payment_pending", note: "Awaiting assistance fee payment." }] : []),
  ]);
  await db.from("profiles").update({ full_name: input.name, state: input.state || null }).eq("id", user.id).is("full_name", null);
  await notify(user.id, `Request ${app.reference} created`, `Your assistance request for ${service.title} has been created.`, `/dashboard/applications/${app.id}`);

  redirect(`/dashboard/applications/${app.id}?new=1`);
}

export async function cancelApplication(applicationId: string): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please log in." };
  const db = createAdminClient();
  const { data: app } = await db.from("applications").select("id, user_id, status").eq("id", applicationId).maybeSingle();
  if (!app || app.user_id !== user.id) return { error: "Application not found." };
  if (!USER_CANCELLABLE_STATUSES.includes(app.status)) return { error: "This request can no longer be cancelled. Please contact support." };
  const { data: paid } = await db.from("payments").select("id").eq("application_id", app.id).eq("status", "success").maybeSingle();
  if (paid) return { error: "This request has a successful payment. Please contact support to cancel." };

  await db.from("applications").update({ status: "cancelled" }).eq("id", app.id).in("status", USER_CANCELLABLE_STATUSES);
  await db.from("application_status_history").insert({ application_id: app.id, status: "cancelled", note: "Cancelled by user.", changed_by: user.id });
  revalidatePath(`/dashboard/applications/${app.id}`);
  return { ok: true };
}

export async function uploadDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please log in." };
  if (!rateLimit(`upload:${user.id}`, 30, 60 * 60_000).ok) return { error: "Upload limit reached. Please try later." };

  const applicationId = String(formData.get("applicationId") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 120);
  const file = formData.get("file");
  if (!z.uuid().safeParse(applicationId).success) return { error: "Invalid application." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "File is larger than 5 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return { error: "Only PDF, JPG, PNG or WEBP files are allowed." };

  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("id, user_id, status").eq("id", applicationId).maybeSingle();
  if (!app || app.user_id !== user.id) return { error: "Application not found." };
  if (!UPLOAD_ALLOWED_STATUSES.includes(app.status)) return { error: "Documents can be uploaded after payment is confirmed." };

  const path = `${user.id}/${app.id}/${randomUUID()}-${safeFileName(file.name)}`;
  const { error: upErr } = await supabase.storage.from("documents").upload(path, bytes, { contentType: mime, upsert: false });
  if (upErr) {
    console.error("[upload] storage", upErr);
    return { error: "Upload failed. Please try again." };
  }
  const { error: rowErr } = await supabase.from("documents").insert({
    application_id: app.id,
    user_id: user.id,
    storage_path: path,
    file_name: safeFileName(file.name),
    label: label || null,
    mime_type: mime,
    size_bytes: file.size,
  });
  if (rowErr) {
    await supabase.storage.from("documents").remove([path]);
    return { error: "Upload failed. Please try again." };
  }
  revalidatePath(`/dashboard/applications/${app.id}`);
  revalidatePath(`/dashboard/documents`);
  return { ok: true };
}

export async function deleteDocument(documentId: string): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please log in." };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("id, user_id, storage_path, application_id").eq("id", documentId).maybeSingle();
  if (!doc || doc.user_id !== user.id) return { error: "Document not found." };
  await supabase.storage.from("documents").remove([doc.storage_path]);
  await supabase.from("documents").delete().eq("id", doc.id);
  revalidatePath(`/dashboard/applications/${doc.application_id}`);
  revalidatePath(`/dashboard/documents`);
  return { ok: true };
}

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || /^(91)?[6-9]\d{9}$/.test(v), "Enter a valid Indian mobile number")
    .transform((v) => (v ? `+91${v.slice(-10)}` : null)),
  state: z.string().trim().max(60).optional().transform((v) => v || null),
  preferred_locale: z.enum(["en", "hi"]),
  notify_email: z.string().optional().transform((v) => v === "on"),
  notify_sms: z.string().optional().transform((v) => v === "on"),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please log in." };
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "Could not save your profile." };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/dashboard", "layout");
}

const SupportSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  contact: z.string().trim().min(5, "Enter a phone number or email").max(160),
  message: z.string().trim().min(5, "Tell us a little more").max(2000),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitSupportRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`support:${ip}`, 5, 60 * 60_000).ok) return { error: "Too many messages. Please try again later." };
  const parsed = SupportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  if (!isServiceRoleConfigured()) return { error: "Support inbox is not configured yet. Please email support instead." };
  const user = await getUser();
  const { website: _hp, ...row } = parsed.data;
  void _hp;
  const { error } = await createAdminClient().from("support_requests").insert({ ...row, user_id: user?.id ?? null });
  if (error) return { error: "Could not send your message. Please try again." };
  return { ok: true };
}
