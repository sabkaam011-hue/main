"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createAssistanceRequest, type FormState } from "@/actions/applications";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "./field-error";
import { INDIAN_STATES } from "@/lib/states";
import { formatINR } from "@/lib/utils";

export function AssistForm({
  slug,
  eligibility,
  feePaise,
  defaults,
}: {
  slug: string;
  eligibility: string[];
  feePaise: number;
  defaults: { name: string; phone: string; state: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(createAssistanceRequest, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="slug" value={slug} />

      <fieldset>
        <legend className="text-lg font-bold text-navy">1. Eligibility self-check</legend>
        <p className="mt-1 text-sm text-muted">Tick the criteria you believe you meet. This helps our team — it is not a final eligibility decision.</p>
        <div className="mt-4 space-y-2.5">
          {eligibility.map((e, i) => (
            <label key={e} className="flex cursor-pointer gap-3 rounded-xl border border-line bg-white p-3.5 text-sm transition-colors hover:border-teal/50 has-[:checked]:border-teal has-[:checked]:bg-teal-50/40">
              <input type="checkbox" name={`elig_${i}`} className="mt-0.5 h-4 w-4 accent-teal" />
              <span>{e}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold text-navy">2. Your details</legend>
        <p className="text-sm text-muted">We only collect what&apos;s needed to help you. Don&apos;t enter Aadhaar, PAN or bank numbers here.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Full name (as on documents)</Label>
            <Input id="name" name="name" defaultValue={defaults.name} autoComplete="name" required aria-invalid={!!fe.name} />
            <FieldError msg={fe.name} />
          </div>
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" name="phone" defaultValue={defaults.phone} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" required aria-invalid={!!fe.phone} />
            <FieldError msg={fe.phone} />
          </div>
          <div>
            <Label htmlFor="state">State / UT</Label>
            <Select id="state" name="state" defaultValue={defaults.state}>
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Anything we should know? (optional)</Label>
          <Textarea id="notes" name="notes" maxLength={2000} placeholder="E.g. I applied earlier and it was rejected because of a name mismatch." />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg font-bold text-navy">3. Please confirm</legend>
        {[
          ["consentPrivate", "I understand Sabkaam is a private assistance platform, not a government website, and is not affiliated with any government body."],
          ["consentNoGuarantee", "I understand that approval is decided only by the relevant authority and Sabkaam does not guarantee approval."],
          ["consentTerms", "I agree to the Terms of Service, Privacy Policy and Refund Policy."],
        ].map(([name, text]) => (
          <div key={name}>
            <label className="flex cursor-pointer gap-3 text-sm">
              <input type="checkbox" name={name} className="mt-0.5 h-4 w-4 accent-teal" required aria-invalid={!!fe[name]} />
              <span>
                {text}
                {name === "consentTerms" && (
                  <>
                    {" "}
                    <Link href="/terms" target="_blank" className="text-teal underline">Terms</Link> ·{" "}
                    <Link href="/refund-policy" target="_blank" className="text-teal underline">Refund Policy</Link>
                  </>
                )}
              </span>
            </label>
            <FieldError msg={fe[name]} />
          </div>
        ))}
      </fieldset>

      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Next: pay the assistance fee of <strong className="text-ink">{formatINR(feePaise)}</strong> securely.
        </p>
        <SubmitButton size="lg" pendingText="Submitting…">Submit request & continue</SubmitButton>
      </div>
    </form>
  );
}
