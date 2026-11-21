import { ProsePage } from "@/components/layout/prose-page";
export const metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };
export default function Page() {
  return (
    <ProsePage title="Privacy Policy" updated="20 November 2026">
      <p>Sabkaam (&ldquo;we&rdquo;) is a private platform that helps people discover and apply for government schemes and services. This policy explains what personal data we collect, why, and your rights, including under India&apos;s Digital Personal Data Protection Act, 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account data: mobile number and/or email, and the name and State you provide.</li>
        <li>Assistance requests: the service you choose, eligibility self-check answers and notes you write.</li>
        <li>Documents you upload for a specific request — only those needed for that service.</li>
        <li>Payment records: order IDs, amounts and status from our payment gateway. We never receive or store card, UPI PIN or net-banking credentials.</li>
        <li>Basic technical data (IP address, device/browser) for security and rate-limiting.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To provide the assistance you request and keep you updated.</li>
        <li>To process and verify payments and issue receipts and refunds.</li>
        <li>To prevent fraud and abuse and to meet legal obligations.</li>
      </ul>
      <h2>Storage and access</h2>
      <p>Documents are kept in private, access-controlled storage. Only you and the staff handling your request can open them, through short-lived links. We do not sell your personal data.</p>
      <h2>Sharing</h2>
      <p>We share data only with processors needed to run the service (hosting/database, SMS/email, payment gateway) or where required by law. We do not submit anything to a government portal without your instruction.</p>
      <h2>Retention</h2>
      <p>We keep request data and documents only as long as needed for the purpose and legal requirements, then delete them. Define your exact retention periods here.</p>
      <h2>Your rights</h2>
      <p>You can request access, correction or erasure of your data and withdraw consent by contacting us via the Help Centre. Add your Grievance Officer&apos;s name and contact details here.</p>
    </ProsePage>
  );
}
