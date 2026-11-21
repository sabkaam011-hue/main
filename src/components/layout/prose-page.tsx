import { Alert } from "@/components/ui/alert";

export function ProsePage({ title, updated, children, template = true }: { title: string; updated?: string; children: React.ReactNode; template?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold text-navy">{title}</h1>
      {updated && <p className="mt-1 text-sm text-muted">Last updated: {updated}</p>}
      {template && (
        <Alert tone="warn" className="mt-6" title="Template — review before launch">
          This page is a starting template, not legal advice. Have it reviewed by a qualified lawyer and add your registered company details, grievance officer and contact information before going live.
        </Alert>
      )}
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-ink/85 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-navy [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
