"use client";

import { useActionState } from "react";
import type { AdminState } from "@/actions/admin";
import { cn } from "@/lib/utils";

/** Generic form wrapper for admin server actions with inline success/error feedback. */
export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: (prev: AdminState, fd: FormData) => Promise<AdminState>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={cn("space-y-3", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && state.message && <p role="status" className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success">{state.message}</p>}
    </form>
  );
}
