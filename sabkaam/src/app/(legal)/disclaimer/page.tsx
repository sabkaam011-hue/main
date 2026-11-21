import { ProsePage } from "@/components/layout/prose-page";
export const metadata = { title: "Disclaimer", alternates: { canonical: "/disclaimer" } };
export default function Page() {
  return (
    <ProsePage title="Disclaimer" template={false}>
      <p><strong>Sabkaam is a private platform. It is not a government website</strong> and is not affiliated with, endorsed by or operated by any government ministry, department, bank or agency.</p>
      <p>Scheme names, logos and portals belong to their respective owners. We link to official websites so you can verify information and apply directly. You can always apply on official portals yourself without paying us.</p>
      <p>Information on Sabkaam is for general guidance. Eligibility, benefits, documents and dates are set by the relevant authority and may change at any time — the official notification always prevails. Pages marked &ldquo;Demo data&rdquo; contain sample information that has not been verified.</p>
      <p>Paying for assistance does not guarantee approval of any application.</p>
    </ProsePage>
  );
}
