"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger-50 text-danger"><AlertTriangle className="h-7 w-7" /></div>
      <h1 className="mt-5 text-2xl font-extrabold text-navy">Something went wrong</h1>
      <p className="mt-2 text-muted">Please try again. If the problem continues, contact us from the Help Centre{error.digest ? ` and quote ${error.digest}` : ""}.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
