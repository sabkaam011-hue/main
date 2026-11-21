import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveCategory, deleteCategory } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { CategoryIcon, ICON_NAMES } from "@/components/services/category-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

/* eslint-disable @typescript-eslint/no-explicit-any */
function CategoryFields({ c }: { c?: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <div><Label>Name</Label><Input name="name" defaultValue={c?.name} required /></div>
      <div><Label>Name (Hindi)</Label><Input name="name_hi" defaultValue={c?.name_hi} /></div>
      <div><Label>Slug</Label><Input name="slug" defaultValue={c?.slug} required /></div>
      <div>
        <Label>Icon</Label>
        <Select name="icon" defaultValue={c?.icon ?? "layers"}>{ICON_NAMES.map((n) => <option key={n}>{n}</option>)}</Select>
      </div>
      <div className="sm:col-span-2"><Label>Description</Label><Input name="description" defaultValue={c?.description} /></div>
      <div className="sm:col-span-2"><Label>Description (Hindi)</Label><Input name="description_hi" defaultValue={c?.description_hi} /></div>
      <div className="sm:col-span-3"><Label>Search keywords (comma-separated)</Label><Input name="keywords" defaultValue={(c?.keywords ?? []).join(", ")} /></div>
      <div><Label>Sort order</Label><Input name="sort_order" type="number" defaultValue={c?.sort_order ?? 0} /></div>
    </div>
  );
}

export default async function AdminCategories() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order");
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Categories</h1>
      <div className="space-y-4">
        {(data ?? []).map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-5 sm:pt-6">
              <div className="mb-3 flex items-center gap-2 font-bold"><CategoryIcon name={c.icon} className="h-5 w-5 text-teal" /> {c.name}</div>
              <ActionForm action={saveCategory}>
                <CategoryFields c={c} />
                <SubmitButton size="sm" variant="navy">Save</SubmitButton>
              </ActionForm>
              <ActionForm action={deleteCategory} confirm="Delete this category?" className="mt-2">
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton size="sm" variant="ghost" className="text-danger">Delete</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed">
          <CardContent className="pt-5 sm:pt-6">
            <p className="mb-3 font-bold">Add category</p>
            <ActionForm action={saveCategory}>
              <CategoryFields />
              <SubmitButton size="sm">Add category</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
