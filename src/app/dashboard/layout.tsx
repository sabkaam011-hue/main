import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { SideNav } from "@/components/dashboard/side-nav";

export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();
  const { locale } = await getI18n();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
  const hi = locale === "hi";
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <SideNav
          title={hi ? "मेरा खाता" : "My account"}
          items={[
            { href: "/dashboard", label: hi ? "अवलोकन" : "Overview", icon: "LayoutDashboard", exact: true },
            { href: "/dashboard/applications", label: hi ? "मेरे आवेदन" : "My Applications", icon: "FolderKanban" },
            { href: "/dashboard/saved", label: hi ? "सेव की गई सेवाएँ" : "Saved Services", icon: "Bookmark" },
            { href: "/dashboard/documents", label: hi ? "दस्तावेज़" : "Documents", icon: "FileStack" },
            { href: "/dashboard/payments", label: hi ? "भुगतान इतिहास" : "Payment History", icon: "CreditCard" },
            { href: "/dashboard/notifications", label: hi ? "सूचनाएँ" : "Notifications", icon: "Bell", badge: count ?? 0 },
            { href: "/dashboard/profile", label: hi ? "प्रोफ़ाइल व सेटिंग्स" : "Profile & Settings", icon: "Settings" },
          ]}
        />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
