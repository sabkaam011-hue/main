"use client";

import { useActionState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { uploadDocument, type FormState } from "@/actions/applications";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function DocumentUploader({ applicationId, suggestions }: { applicationId: string; suggestions: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(uploadDocument, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-xl border border-dashed border-line bg-canvas/50 p-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="doc-label">Document type</Label>
          <Input id="doc-label" name="label" list="doc-suggestions" placeholder="e.g. Proof of address" maxLength={120} />
          <datalist id="doc-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="doc-file">File (PDF, JPG, PNG — max 5 MB)</Label>
          <Input id="doc-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className="py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white" />
        </div>
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-success">Uploaded securely.</p>}
      <SubmitButton variant="navy" size="sm" pendingText="Uploading…">
        <Upload className="h-4 w-4" /> Upload
      </SubmitButton>
    </form>
  );
}
