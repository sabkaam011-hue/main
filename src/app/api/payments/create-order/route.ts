import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { startPayment } from "@/lib/payments/service";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ applicationId: z.uuid() });

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const rl = rateLimit(`pay:${user.id}`, 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Amount is NEVER taken from the client — startPayment reads the fee snapshot from the database.
  const result = await startPayment(user.id, parsed.data.applicationId);
  if (!result.ok) {
    const status = { not_configured: 503, not_found: 404, not_payable: 409, already_paid: 409, gateway_error: 502 }[result.code];
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  return NextResponse.json({ paymentSessionId: result.paymentSessionId, orderId: result.orderId, mode: result.mode });
}
