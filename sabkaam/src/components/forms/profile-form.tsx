"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/actions/applications";
import { Input, Label, Select, FieldHint } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "./field-error";
import { INDIAN_STATES } from "@/lib/states";

export function ProfileForm({ profile, email }: { profile: { full_name: string | null; phone: string | null; state: string | null; preferred_locale: string; notify_email: boolean; notify_sms: boolean }; email: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} autoComplete="name" />
          <FieldError msg={fe.full_name} />
        </div>
        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" name="phone" defaultValue={(profile.phone ?? "").replace(/^\+91/, "")} inputMode="numeric" autoComplete="tel-national" />
          <FieldError msg={fe.phone} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email ?? ""} disabled />
          <FieldHint>Your login email can&apos;t be changed here.</FieldHint>
        </div>
        <div>
          <Label htmlFor="state">State / UT</Label>
          <Select id="state" name="state" defaultValue={profile.state ?? ""}>
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">Preferences</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="preferred_locale">Preferred language</Label>
            <Select id="preferred_locale" name="preferred_locale" defaultValue={profile.preferred_locale}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </Select>
          </div>
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify_email" defaultChecked={profile.notify_email} className="h-4 w-4 accent-teal" /> Email updates</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify_sms" defaultChecked={profile.notify_sms} className="h-4 w-4 accent-teal" /> SMS updates</label>
          </div>
        </div>
      </fieldset>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">Profile saved.</Alert>}
      <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
    </form>
  );
}
