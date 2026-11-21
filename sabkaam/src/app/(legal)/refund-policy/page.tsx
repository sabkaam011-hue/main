import { ProsePage } from "@/components/layout/prose-page";
export const metadata = { title: "Refund Policy", alternates: { canonical: "/refund-policy" } };
export default function Page() {
  return (
    <ProsePage title="Refund Policy" updated="20 November 2026">
      <p>This policy covers Sabkaam&apos;s assistance fee only. Government or official fees paid on official portals are not collected by us and cannot be refunded by us.</p>
      <h2>Full refund</h2>
      <ul>
        <li>You cancel before our team has started work on your request.</li>
        <li>We are unable to proceed with your request for reasons on our side.</li>
        <li>You were charged more than once for the same request (duplicate payments are refunded automatically after review).</li>
      </ul>
      <h2>No refund</h2>
      <ul>
        <li>The assistance described in the scope has been delivered, regardless of the final decision by the authority.</li>
        <li>The request could not be completed because required information or documents were not provided.</li>
      </ul>
      <h2>How refunds are paid</h2>
      <p>Approved refunds are initiated to the original payment method through our payment gateway. Banks typically take 5–7 working days to credit the amount. You can see refund status in Payment History.</p>
      <h2>Requesting a refund</h2>
      <p>Contact us through the Help Centre with your request reference number.</p>
    </ProsePage>
  );
}
