declare module "@cashfreepayments/cashfree-js" {
  export interface CheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_top" | "_modal" | HTMLElement;
    returnUrl?: string;
  }
  export interface CashfreeInstance {
    checkout(options: CheckoutOptions): Promise<{ error?: { message: string }; redirect?: boolean; paymentDetails?: unknown }>;
  }
  export function load(options: { mode: "sandbox" | "production" }): Promise<CashfreeInstance | null>;
}
