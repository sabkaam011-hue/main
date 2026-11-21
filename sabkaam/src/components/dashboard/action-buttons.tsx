"use client";

import { useState, useTransition } from "react";
import { Trash2, XCircle } from "lucide-react";
import { cancelApplication, deleteDocument } from "@/actions/applications";
import { Button } from "@/components/ui/button";

export function CancelApplicationButton({ applicationId }: { applicationId: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!confirm)
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className="text-danger">
        <XCircle className="h-4 w-4" /> Cancel request
      </Button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>Cancel this request?</span>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => { const r = await cancelApplication(applicationId); if (r?.error) setErr(r.error); })}>
        Yes, cancel
      </Button>
      <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>Keep</Button>
      {err && <p className="w-full text-danger" role="alert">{err}</p>}
    </div>
  );
}

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await deleteDocument(documentId); })}
      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger disabled:opacity-50"
      aria-label="Delete document"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
