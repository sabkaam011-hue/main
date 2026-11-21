import { saveService, deleteService } from "@/actions/admin";
import { ActionForm } from "./action-form";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ServiceForm({ service, categories, keywords }: { service?: any; categories: { id: string; name: string }[]; keywords?: string[] }) {
  const s = service ?? {};
  const join = (a?: string[]) => (a ?? []).join("\n");
  const dates = (s.important_dates ?? []).map((d: any) => [d.label, d.date ?? "", d.note ?? ""].join(" | ")).join("\n");
  const faqs = (s.faqs ?? []).map((f: any) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
  const field = (name: string, label: string, opts: { hint?: string; rows?: number; value?: string; required?: boolean; placeholder?: string } = {}) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      {opts.rows ? (
        <Textarea id={name} name={name} rows={opts.rows} defaultValue={opts.value ?? s[name] ?? ""} placeholder={opts.placeholder} />
      ) : (
        <Input id={name} name={name} defaultValue={opts.value ?? s[name] ?? ""} required={opts.required} placeholder={opts.placeholder} />
      )}
      {opts.hint && <FieldHint>{opts.hint}</FieldHint>}
    </div>
  );
  return (
    <div className="space-y-6">
      <ActionForm action={saveService} className="space-y-6">
        {s.id && <input type="hidden" name="id" value={s.id} />}
        <Card>
          <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field("title", "Title (English)", { required: true })}
            {field("title_hi", "Title (Hindi)")}
            {field("slug", "URL slug", { required: true, hint: "lowercase-with-hyphens; changing it breaks old links", placeholder: "apply-pan-card" })}
            <div>
              <Label htmlFor="category_id">Category</Label>
              <Select id="category_id" name="category_id" defaultValue={s.category_id ?? ""} required>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="kind">Type</Label>
              <Select id="kind" name="kind" defaultValue={s.kind ?? "service"}>
                {["scheme", "service", "scholarship", "job", "exam", "guidance"].map((k) => <option key={k} value={k}>{k}</option>)}
              </Select>
            </div>
            {field("sort_order", "Sort order", { value: String(s.sort_order ?? 0) })}
            <div className="sm:col-span-2">{field("summary", "Short summary (English)", { rows: 2 })}</div>
            <div className="sm:col-span-2">{field("summary_hi", "Short summary (Hindi)", { rows: 2 })}</div>
            <div className="sm:col-span-2">{field("keywords", "Search keywords & aliases", { value: (keywords ?? []).join(", "), hint: "Comma-separated. Include Hindi, Hinglish and common misspellings, e.g. pan card, pancard, पैन" })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Content</CardTitle><p className="text-sm text-muted">One item per line. Only use information from the official source.</p></CardHeader>
          <CardContent className="grid gap-4">
            {field("overview", "Overview", { rows: 4 })}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("benefits", "Benefits", { rows: 5, value: join(s.benefits) })}
              {field("eligibility", "Eligibility criteria", { rows: 5, value: join(s.eligibility) })}
              {field("documents", "Required documents", { rows: 5, value: join(s.documents) })}
              {field("process", "Application steps", { rows: 5, value: join(s.process) })}
            </div>
            {field("important_dates", "Important dates", { rows: 3, value: dates, hint: "Label | YYYY-MM-DD (blank = as notified) | note", placeholder: "Last date to apply | 2026-12-31 | As per notification" })}
            {field("faqs", "FAQs", { rows: 6, value: faqs, hint: "Blocks of 'Q: …' and 'A: …' separated by a blank line" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Official source & verification</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field("official_source_name", "Official source name")}
            {field("official_url", "Official URL (https)")}
            <div>
              <Label htmlFor="verification_status">Verification status</Label>
              <Select id="verification_status" name="verification_status" defaultValue={s.verification_status ?? "unverified"}>
                <option value="demo">Demo (sample data)</option>
                <option value="unverified">Unverified</option>
                <option value="verified">Verified against official source</option>
              </Select>
              <FieldHint>Setting “Verified” stamps today&apos;s date as last verified.</FieldHint>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Assistance & visibility</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field("fee", "Assistance fee (₹)", { value: s.fee_paise != null ? String(s.fee_paise / 100) : "", hint: "Leave blank for information-only (no paid assistance)" })}
            <div className="space-y-2 pt-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={s.is_published ?? true} className="accent-teal" /> Published</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="is_popular" defaultChecked={s.is_popular} className="accent-teal" /> Popular (homepage & search boost)</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="is_trending" defaultChecked={s.is_trending} className="accent-teal" /> Trending</label>
            </div>
            <div className="sm:col-span-2">{field("assistance_scope", "What's included in assistance", { rows: 4, value: join(s.assistance_scope) })}</div>
          </CardContent>
        </Card>
        <div className="flex justify-end"><SubmitButton size="lg" pendingText="Saving…">Save service</SubmitButton></div>
      </ActionForm>
      {s.id && (
        <ActionForm action={deleteService} confirm="Delete this service permanently?">
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton variant="ghost" className="text-danger">Delete service</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
