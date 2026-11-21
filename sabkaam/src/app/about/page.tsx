import { ProsePage } from "@/components/layout/prose-page";
export const metadata = { title: "About Sabkaam", alternates: { canonical: "/about" } };
export default function Page() {
  return (
    <ProsePage title="About Sabkaam" template={false}>
      <p className="text-lg font-semibold text-teal-600">Har zaroori kaam, ek jagah.</p>
      <p>Finding the right scheme, scholarship, loan or document service in India often means hopping between dozens of portals and decoding dense notifications. Sabkaam brings them into one searchable place, explains them in plain Hindi and English, and always points you to the official source.</p>
      <p>Browsing is free. When a form gets complicated, you can choose paid assistance from our team — with the fee and scope shown upfront, and no false promises about approval.</p>
      <p>Sabkaam is a private platform and is not affiliated with any government body.</p>
    </ProsePage>
  );
}
