export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: React.ReactNode; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
