import { getUser, getStaffRole } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { NavbarClient } from "./navbar-client";

export async function Navbar() {
  const [{ locale, t }, user, role] = await Promise.all([getI18n(), getUser(), getStaffRole()]);
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/services", label: t.nav.explore },
    { href: "/category/government-schemes", label: t.nav.schemes },
    { href: "/category/banking-loans", label: t.nav.loans },
    { href: "/category/scholarships", label: t.nav.scholarships },
    { href: "/category/jobs-exams", label: t.nav.jobs },
    { href: "/help", label: t.nav.help },
  ];
  return (
    <NavbarClient
      links={links}
      locale={locale}
      user={user ? { name: (user.user_metadata?.full_name as string) || user.email || user.phone || "Account" } : null}
      isStaff={!!role}
      labels={{
        login: t.nav.login,
        dashboard: t.nav.dashboard,
        admin: t.nav.admin,
        logout: t.nav.logout,
        menu: t.nav.menu,
        language: t.nav.language,
      }}
    />
  );
}
