"use client";

import { useActionState } from "react";
import { submitSupportRequest, type FormState } from "@/actions/applications";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "./field-error";

export function SupportForm({ topic }: { topic?: string }) {
  const [state, action] = useActionState<FormState, FormData>(submitSupportRequest, null);
  if (state?.ok) return <Alert tone="success" title="Message sent">Thanks! Our team will get back to you within 1–2 working days.</Alert>;
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="s-name">Your name</Label><Input id="s-name" name="name" autoComplete="name" /><FieldError msg={fe.name} /></div>
        <div><Label htmlFor="s-contact">Mobile or email</Label><Input id="s-contact" name="contact" /><FieldError msg={fe.contact} /></div>
      </div>
      <div>
        <Label htmlFor="s-msg">How can we help?</Label>
        <Textarea id="s-msg" name="message" rows={4} defaultValue={topic ? `I'm looking for: ${topic}` : ""} />
        <FieldError msg={fe.message} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <p className="text-xs text-muted">Please don&apos;t share Aadhaar, PAN, bank or card numbers in this form.</p>
      <SubmitButton pendingText="Sending…">Send message</SubmitButton>
    </form>
  );
}
