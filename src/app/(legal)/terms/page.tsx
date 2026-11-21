import { ProsePage } from "@/components/layout/prose-page";
export const metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };
export default function Page() {
  return (
    <ProsePage title="Terms of Service" updated="20 November 2026">
      <h2>1. About Sabkaam</h2>
      <p>Sabkaam is a private information and application-assistance platform. It is not a government website and is not affiliated with, endorsed by or acting on behalf of any government ministry, department or agency.</p>
      <h2>2. Information</h2>
      <p>We summarise publicly available information and link to official sources. Schemes and rules change; the official notification always prevails. Records marked &ldquo;Demo&rdquo; or &ldquo;Unverified&rdquo; have not been checked against the latest notification.</p>
      <h2>3. Paid assistance</h2>
      <ul>
        <li>The fee and scope are shown before you request assistance. The fee is for our service only; official government fees, if any, are separate.</li>
        <li>We do not guarantee approval, sanction, selection or any outcome — these are decided solely by the relevant authority or lender.</li>
        <li>You are responsible for the accuracy of the information and documents you provide.</li>
      </ul>
      <h2>4. Acceptable use</h2>
      <p>Do not upload documents that are not yours or that you are not authorised to share, or use the service for any unlawful purpose.</p>
      <h2>5. Payments and refunds</h2>
      <p>Payments are processed by our payment partner. Refunds follow our Refund Policy.</p>
      <h2>6. Liability</h2>
      <p>To the extent permitted by law, our liability is limited to the assistance fee paid for the relevant request.</p>
      <h2>7. Governing law</h2>
      <p>These terms are governed by the laws of India. Add your jurisdiction and registered company details here.</p>
    </ProsePage>
  );
}
