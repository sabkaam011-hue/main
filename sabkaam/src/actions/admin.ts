"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertAdmin, assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { invalidateCatalogue } from "@/lib/data/catalogue";
import { notify, refundPayment, syncOrder } from "@/lib/payments/service";
import { STAFF_SETTABLE_STATUSES, STATUS_META, type ApplicationStatus } from "@/lib/applications";

export type AdminState = { ok?: boolean; error?: string; message?: string } | null;

function fail(e: unknown): AdminState {
  return { error: e instanceof Error ? e.message : "Something went wrong" };
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function refreshCatalogue() {
  invalidateCatalogue();
  revalidatePath("/", "layout");
}

/* ───────────────────────── Applications ───────────────────────── */

const StatusUpdate = z.object({
  applicationId: z.uuid(),
  status: z.enum(STAFF_SETTABLE_STATUSES as [ApplicationStatus, ...ApplicationStatus[]]),
  note: z.string().trim().max(2000).optional(),
});

export async function updateApplicationStatus(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    const { user } = await assertStaff();
    const input = StatusUpdate.parse(Object.fromEntries(formData));
    const supabase = await createClient(); // RLS: staff may update applications
    const { data: app } = await supabase.from("applications").select("id, user_id, status, reference, fee_paise").eq("id", input.applicationId).single();
    if (!app) return { error: "Application not found" };

    // Work can't start on a paid request until payment is verified.
    if (app.fee_paise > 0 && ["under_review", "in_progress", "completed", "documents_required"].includes(input.status)) {
      const { data: paid } = await supabase.from("payments").select("id").eq("application_id", app.id).eq("status", "success").maybeSingle();
      if (!paid) return { error: "This request has no verified payment yet." };
    }

    const { error } = await supabase.from("applications").update({ status: input.status }).eq("id", app.id);
    if (error) return { error: error.message };
    await supabase.from("application_status_history").insert({ application_id: app.id, status: input.status, note: input.note || null, changed_by: user.id });
    await notify(
      app.user_id,
      `${app.reference}: ${STATUS_META[input.status].en}`,
      input.note || STATUS_META[input.status].next,
      `/dashboard/applications/${app.id}`,
    );
    revalidatePath(`/admin/applications/${app.id}`);
    revalidatePath("/admin/applications");
    return { ok: true, message: "Status updated and user notified." };
  } catch (e) {
    return fail(e);
  }
}

export async function assignApplication(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    const { user } = await assertAdmin();
    const applicationId = z.uuid().parse(formData.get("applicationId"));
    const staffId = String(formData.get("staffId") ?? "");
    const supabase = await createClient();
    if (staffId) {
      const { data: staff } = await supabase.from("admin_users").select("user_id").eq("user_id", staffId).maybeSingle();
      if (!staff) return { error: "Selected user is not staff" };
    }
    const { error } = await supabase.from("applications").update({ assigned_to: staffId || null }).eq("id", applicationId);
    if (error) return { error: error.message };
    if (staffId) await supabase.from("staff_assignments").insert({ application_id: applicationId, staff_id: staffId, assigned_by: user.id });
    revalidatePath(`/admin/applications/${applicationId}`);
    return { ok: true, message: staffId ? "Assigned." : "Unassigned." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────────────────── Payments ───────────────────────── */

export async function refundPaymentAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    const { user } = await assertAdmin();
    const paymentId = z.uuid().parse(formData.get("paymentId"));
    const rupees = String(formData.get("amount") ?? "").trim();
    const amountPaise = rupees ? Math.round(z.coerce.number().positive().parse(rupees) * 100) : null;
    const note = z.string().trim().min(3, "Add a reason for the refund").max(100).parse(formData.get("note"));
    await refundPayment(paymentId, amountPaise, note, user.id);
    revalidatePath("/admin/payments");
    return { ok: true, message: "Refund initiated with Cashfree." };
  } catch (e) {
    return fail(e);
  }
}

export async function syncPaymentAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    await assertStaff();
    const orderId = z.string().min(3).max(60).parse(formData.get("orderId"));
    const r = await syncOrder(orderId);
    revalidatePath("/admin/payments");
    return { ok: true, message: `Synced: ${r?.status ?? "unknown"}` };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────────────────── Services ───────────────────────── */

const ServiceSchema = z
  .object({
    id: z.string().optional(),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and hyphens"),
    category_id: z.uuid("Choose a category"),
    kind: z.enum(["scheme", "service", "scholarship", "job", "exam", "guidance"]),
    title: z.string().trim().min(2).max(200),
    title_hi: z.string().trim().max(200).default(""),
    summary: z.string().trim().min(10, "Summary is too short").max(400),
    summary_hi: z.string().trim().max(400).default(""),
    overview: z.string().trim().max(5000).default(""),
    official_source_name: z.string().trim().max(200).default(""),
    official_url: z.union([z.literal(""), z.url().refine((u) => u.startsWith("https://"), "Official URL must use https://")]),
    fee: z.string().trim().default(""),
    verification_status: z.enum(["demo", "unverified", "verified"]),
    sort_order: z.coerce.number().int().default(0),
  })
  .refine((v) => v.verification_status !== "verified" || v.official_url, { message: "A verified record needs an official URL", path: ["official_url"] });

function parseDates(raw: FormDataEntryValue | null) {
  return lines(raw).map((l) => {
    const [label, date, note] = l.split("|").map((x) => x.trim());
    const iso = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    return { label: label || "Date", date: iso, ...(note ? { note } : {}) };
  });
}

function parseFaqs(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split(/\n\s*\n/)
    .map((block) => {
      const q = block.match(/^Q:\s*(.+)$/m)?.[1]?.trim();
      const a = block.match(/^A:\s*([\s\S]+)$/m)?.[1]?.trim();
      return q && a ? { q, a } : null;
    })
    .filter(Boolean);
}

export async function saveService(_prev: AdminState, formData: FormData): Promise<AdminState> {
  let savedId: string | null = null;
  try {
    await assertAdmin();
    const parsed = ServiceSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(" · ") };
    const v = parsed.data;
    let feePaise: number | null = null;
    if (v.fee) {
      const n = Number(v.fee);
      if (!Number.isFinite(n) || n < 1 || n > 100000) return { error: "Fee must be between ₹1 and ₹1,00,000 (or blank for information-only)" };
      feePaise = Math.round(n * 100);
    }

    const row = {
      slug: v.slug,
      category_id: v.category_id,
      kind: v.kind,
      title: v.title,
      title_hi: v.title_hi,
      summary: v.summary,
      summary_hi: v.summary_hi,
      overview: v.overview,
      benefits: lines(formData.get("benefits")),
      eligibility: lines(formData.get("eligibility")),
      documents: lines(formData.get("documents")),
      process: lines(formData.get("process")),
      assistance_scope: lines(formData.get("assistance_scope")),
      important_dates: parseDates(formData.get("important_dates")),
      faqs: parseFaqs(formData.get("faqs")),
      official_source_name: v.official_source_name,
      official_url: v.official_url,
      fee_paise: feePaise,
      verification_status: v.verification_status,
      is_popular: formData.get("is_popular") === "on",
      is_trending: formData.get("is_trending") === "on",
      is_published: formData.get("is_published") === "on",
      sort_order: v.sort_order,
    };

    const supabase = await createClient();
    if (v.id) {
      const { data: before } = await supabase.from("services").select("verification_status").eq("id", v.id).single();
      const lastVerified = v.verification_status === "verified" && before?.verification_status !== "verified" ? { last_verified_at: new Date().toISOString() } : {};
      const { error } = await supabase.from("services").update({ ...row, ...lastVerified }).eq("id", v.id);
      if (error) return { error: error.code === "23505" ? "That slug is already used" : error.message };
      savedId = v.id;
    } else {
      const { data, error } = await supabase
        .from("services")
        .insert({ ...row, ...(v.verification_status === "verified" ? { last_verified_at: new Date().toISOString() } : {}) })
        .select("id")
        .single();
      if (error) return { error: error.code === "23505" ? "That slug is already used" : error.message };
      savedId = data.id;
    }

    const keywords = Array.from(new Set(String(formData.get("keywords") ?? "").split(",").map((k) => k.trim().toLowerCase()).filter((k) => k && k.length <= 80)));
    await supabase.from("service_keywords").delete().eq("service_id", savedId);
    if (keywords.length) await supabase.from("service_keywords").insert(keywords.map((keyword) => ({ service_id: savedId, keyword })));

    refreshCatalogue();
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/services/${savedId}?saved=1`);
}

export async function deleteService(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    await assertAdmin();
    const id = z.uuid().parse(formData.get("id"));
    const supabase = await createClient();
    const { count } = await supabase.from("applications").select("id", { count: "exact", head: true }).eq("service_id", id);
    if (count) return { error: `This service has ${count} application(s). Unpublish it instead of deleting.` };
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return { error: error.message };
    refreshCatalogue();
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/services?deleted=1");
}

/* ───────────────────────── Categories ───────────────────────── */

const CategorySchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(80),
  name_hi: z.string().trim().max(80).default(""),
  description: z.string().trim().max(300).default(""),
  description_hi: z.string().trim().max(300).default(""),
  icon: z.string().trim().max(40).default("layers"),
  sort_order: z.coerce.number().int().default(0),
});

export async function saveCategory(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    await assertAdmin();
    const parsed = CategorySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(" · ") };
    const { id, ...row } = parsed.data;
    const keywords = String(formData.get("keywords") ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    const supabase = await createClient();
    const { error } = id
      ? await supabase.from("categories").update({ ...row, keywords }).eq("id", id)
      : await supabase.from("categories").insert({ ...row, keywords });
    if (error) return { error: error.code === "23505" ? "Slug already exists" : error.message };
    refreshCatalogue();
    revalidatePath("/admin/categories");
    return { ok: true, message: "Category saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCategory(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    await assertAdmin();
    const id = z.uuid().parse(formData.get("id"));
    const supabase = await createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { error: error.code === "23503" ? "Move or delete this category's services first." : error.message };
    refreshCatalogue();
    revalidatePath("/admin/categories");
    return { ok: true, message: "Category deleted." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────────────────── FAQs & site content ───────────────────────── */

const FaqSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(2000),
  question_hi: z.string().trim().max(300).default(""),
  answer_hi: z.string().trim().max(2000).default(""),
  sort_order: z.coerce.number().int().default(0),
});

export async function saveFaq(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    await assertAdmin();
    const parsed = FaqSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(" · ") };
    const { id, ...row } = parsed.data;
    const is_published = formData.get("is_published") === "on";
    const supabase = await createClient();
    const { error } = id ? await supabase.from("faqs").update({ ...row, is_published }).eq("id", id) : await supabase.from("faqs").insert({ ...row, is_published });
    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, message: "FAQ saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteFaq(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    await assertAdmin();
    const id = z.uuid().parse(formData.get("id"));
    const supabase = await createClient();
    await supabase.from("faqs").delete().eq("id", id);
    revalidatePath("/", "layout");
    return { ok: true, message: "FAQ deleted." };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSiteContent(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    await assertAdmin();
    const key = z.string().regex(/^[a-z0-9_]+$/).parse(formData.get("key"));
    const value_en = z.string().max(500).parse(formData.get("value_en") ?? "");
    const value_hi = z.string().max(500).parse(formData.get("value_hi") ?? "");
    const supabase = await createClient();
    const { error } = await supabase.from("site_content").upsert({ key, value_en, value_hi });
    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────────────────────── Users & roles ───────────────────────── */

export async function setUserRole(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    const { user } = await assertAdmin();
    const userId = z.uuid().parse(formData.get("userId"));
    const role = z.enum(["user", "staff", "admin"]).parse(formData.get("role"));
    if (userId === user.id && role !== "admin") return { error: "You can't remove your own admin role." };
    const supabase = await createClient();
    const { error } =
      role === "user"
        ? await supabase.from("admin_users").delete().eq("user_id", userId)
        : await supabase.from("admin_users").upsert({ user_id: userId, role, created_by: user.id });
    if (error) return { error: error.message };
    revalidatePath("/admin/users");
    return { ok: true, message: "Role updated." };
  } catch (e) {
    return fail(e);
  }
}

export async function closeSupportRequest(_prev: AdminState, formData: FormData): Promise<AdminState> {
  try {
    await assertStaff();
    const id = z.uuid().parse(formData.get("id"));
    const supabase = await createClient();
    await supabase.from("support_requests").update({ status: "closed" }).eq("id", id);
    revalidatePath("/admin/support");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
