import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { computeWebhookSignature, verifyWebhookSignature } from "@/lib/payments/cashfree";
import { sniffMime, safeFileName } from "@/lib/files";
import { safeNextPath } from "@/lib/utils";

describe("Cashfree webhook signature", () => {
  const secret = "test_secret";
  const body = '{"data":{"order":{"order_id":"SK_X"}},"type":"PAYMENT_SUCCESS_WEBHOOK"}';
  const ts = "1732100000000";
  const good = createHmac("sha256", secret).update(ts + body).digest("base64");

  it("matches Cashfree's documented algorithm", () => {
    expect(computeWebhookSignature(body, ts, secret)).toBe(good);
  });
  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(body, ts, good, secret)).toBe(true);
  });
  it("rejects tampered body, timestamp, signature or missing headers", () => {
    expect(verifyWebhookSignature(body.replace("SK_X", "SK_Y"), ts, good, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "1732100000001", good, secret)).toBe(false);
    expect(verifyWebhookSignature(body, ts, good.slice(0, -2) + "AA", secret)).toBe(false);
    expect(verifyWebhookSignature(body, null, good, secret)).toBe(false);
    expect(verifyWebhookSignature(body, ts, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, ts, good, "")).toBe(false);
  });
});

describe("upload validation", () => {
  it("detects real file types from magic bytes", () => {
    expect(sniffMime(new TextEncoder().encode("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMime(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(sniffMime(new TextEncoder().encode("MZ\x90\x00"))).toBeNull();
  });
  it("sanitises file names", () => {
    expect(safeFileName("../../etc/passwd")).not.toContain("/");
    expect(safeFileName("my aadhaar copy.pdf")).toBe("my_aadhaar_copy.pdf");
  });
});

describe("redirect safety", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNextPath("/dashboard/applications")).toBe("/dashboard/applications");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});
