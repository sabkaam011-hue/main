import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveFaq, deleteFaq, saveSiteContent } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, FieldHint } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

/* eslint-disable @typescript-eslint/no-explicit-any */
function FaqFields({ f }: { f?: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {f?.id && <input type="hidden" name="id" value={f.id} />}
      <div><Label>Question</Label><Input name="question" defaultValue={f?.question} required /></div>
      <div><Label>Question (Hindi)</Label><Input name="question_hi" defaultValue={f?.question_hi} /></div>
      <div><Label>Answer</Label><Textarea name="answer" defaultValue={f?.answer} rows={3} required /></div>
      <div><Label>Answer (Hindi)</Label><Textarea name="answer_hi" defaultValue={f?.answer_hi} rows={3} /></div>
      <div className="flex items-center gap-4">
        <div className="w-28"><Label>Order</Label><Input name="sort_order" type="number" defaultValue={f?.sort_order ?? 0} /></div>
        <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={f?.is_published ?? true} className="accent-teal" /> Published</label>
      </div>
    </div>
  );
}

export default async function AdminContent() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: faqs }, { data: content }] = await Promise.all([
    supabase.from("faqs").select("*").order("sort_order"),
    supabase.from("site_content").select("*"),
  ]);
  const get = (k: string) => content?.find((c) => c.key === k);
  const blocks = [
    { key: "announcement", label: "Announcement banner", hint: "Shown above the homepage hero. Leave empty to hide." },
    { key: "hero_description", label: "Hero description", hint: "Overrides the default homepage hero text. Leave empty for the default." },
  ];
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">FAQs & homepage content</h1>
      <Card className="mb-6">
        <CardHeader><CardTitle>Homepage content</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {blocks.map((b) => (
            <ActionForm key={b.key} action={saveSiteContent}>
              <input type="hidden" name="key" value={b.key} />
              <p className="font-semibold">{b.label}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Textarea name="value_en" defaultValue={get(b.key)?.value_en} rows={2} placeholder="English" maxLength={500} />
                <Textarea name="value_hi" defaultValue={get(b.key)?.value_hi} rows={2} placeholder="हिन्दी" maxLength={500} />
              </div>
              <FieldHint>{b.hint}</FieldHint>
              <SubmitButton size="sm" variant="navy">Save</SubmitButton>
            </ActionForm>
          ))}
        </CardContent>
      </Card>
      <h2 className="mb-3 text-lg font-bold text-navy">Homepage FAQs</h2>
      <div className="space-y-4">
        {(faqs ?? []).map((f) => (
          <Card key={f.id}>
            <CardContent className="pt-5 sm:pt-6">
              <ActionForm action={saveFaq}>
                <FaqFields f={f} />
                <SubmitButton size="sm" variant="navy">Save</SubmitButton>
              </ActionForm>
              <ActionForm action={deleteFaq} confirm="Delete this FAQ?" className="mt-2">
                <input type="hidden" name="id" value={f.id} />
                <SubmitButton size="sm" variant="ghost" className="text-danger">Delete</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed">
          <CardContent className="pt-5 sm:pt-6">
            <p className="mb-3 font-bold">Add FAQ</p>
            <ActionForm action={saveFaq}><FaqFields /><SubmitButton size="sm">Add FAQ</SubmitButton></ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
