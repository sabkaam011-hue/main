import { requireStaff } from "@/lib/auth";
import { SideNav, type NavIcon } from "@/components/dashboard/side-nav";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireStaff();
  const items: { href: string; label: string; icon: NavIcon; exact?: boolean; admin?: boolean }[] = [
    { href: "/admin", label: "Overview", icon: "LayoutDashboard", exact: true },
    { href: "/admin/applications", label: "Assistance requests", icon: "FolderKanban" },
    { href: "/admin/payments", label: "Payments & refunds", icon: "ReceiptIndianRupee" },
    { href: "/admin/services", label: "Services & listings", icon: "Layers", admin: true },
    { href: "/admin/categories", label: "Categories", icon: "Tags", admin: true },
    { href: "/admin/content", label: "FAQs & homepage", icon: "HelpCircle", admin: true },
    { href: "/admin/users", label: "Users & roles", icon: "Users" },
    { href: "/admin/support", label: "Support inbox", icon: "Inbox" },
  ];
  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[230px_1fr] lg:py-8">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-3 hidden items-center gap-2 px-3 lg:flex">
          <Badge variant={role === "admin" ? "accent" : "teal"}>{role === "admin" ? "Administrator" : "Staff"}</Badge>
        </div>
        <SideNav title="Admin" showSignOut={false} items={items.filter((i) => !i.admin || role === "admin")} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
