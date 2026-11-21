import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/dashboard/page-title";
import { ProfileForm } from "@/components/forms/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, state, preferred_locale, notify_email, notify_sms").eq("id", user.id).maybeSingle();
  return (
    <>
      <PageTitle title="Profile & settings" />
      <Card>
        <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
        <CardContent>
          <ProfileForm
            email={user.email ?? null}
            profile={profile ?? { full_name: null, phone: user.phone ? `+${user.phone}` : null, state: null, preferred_locale: "en", notify_email: true, notify_sms: true }}
          />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader><CardTitle>Account & data</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>Signed in as {user.email ?? (user.phone ? `+${user.phone}` : "your account")}.</p>
          <p>To download or delete your data, contact support from the Help Centre. We respond within the timelines in our Privacy Policy.</p>
          <form action="/auth/signout" method="post" className="pt-2">
            <button className="cursor-pointer font-semibold text-danger hover:underline">Log out</button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
