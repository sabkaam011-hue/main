import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { markAllNotificationsRead } from "@/actions/applications";
import { PageTitle } from "@/components/dashboard/page-title";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, cn } from "@/lib/utils";

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const supabase = await createClient();
  const { locale } = await getI18n();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const unread = data?.some((n) => !n.read_at);
  return (
    <>
      <PageTitle
        title="Notifications"
        action={
          unread ? (
            <form action={markAllNotificationsRead}>
              <SubmitButton variant="outline" size="sm">Mark all as read</SubmitButton>
            </form>
          ) : undefined
        }
      />
      {data?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {data.map((n) => {
            const inner = (
              <>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-teal")} aria-hidden />
                <div className="min-w-0">
                  <p className={cn("text-sm", n.read_at ? "text-ink/80" : "font-bold text-ink")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{formatDateTime(n.created_at, locale)}</p>
                </div>
              </>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className="flex gap-3 p-4 hover:bg-canvas/60">{inner}</Link>
                ) : (
                  <div className="flex gap-3 p-4">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Bell className="h-5 w-5" />} title="You're all caught up" />
      )}
    </>
  );
}
