"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

export function PayButton({ applicationId, amountPaise }: { applicationId: string; amountPaise: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment.");
      const { load } = await import("@cashfreepayments/cashfree-js");
      const cashfree = await load({ mode: data.mode });
      if (!cashfree) throw new Error("Could not load the payment window.");
      // Redirects to Cashfree checkout, then back to /payments/return?order_id=…
      await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed to start.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="lg" onClick={pay} disabled={loading} className="w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Pay {formatINR(amountPaise)} securely
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <p className="mt-2 text-xs text-muted">Payments are processed by Cashfree Payments. Sabkaam never sees or stores your card or UPI details.</p>
    </div>
  );
}
