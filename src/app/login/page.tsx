import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LogoMark } from "@/components/layout/logo";
import { Alert } from "@/components/ui/alert";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Login or sign up", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getUser()) redirect(next);

  const configured = isSupabaseConfigured();
  const methods = {
    phone: process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED !== "false",
    email: process.env.NEXT_PUBLIC_AUTH_EMAIL_ENABLED !== "false",
    google: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true",
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-extrabold text-navy">Welcome to Sabkaam</h1>
          <p className="mt-1 text-sm text-muted">Log in or create an account to request assistance, upload documents and track applications.</p>
        </div>
        {sp.error && (
          <Alert tone="danger" className="mb-4" title="Sign-in failed">
            {sp.error === "callback" ? "The sign-in link was invalid or expired. Please try again." : "Please try again."}
          </Alert>
        )}
        {!configured ? (
          <Alert tone="warn" title="Authentication is not configured">
            Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> and enable
            Phone/Email/Google providers in Supabase. See <strong>docs/SETUP.md</strong>. Browsing and search work without login.
          </Alert>
        ) : (
          <LoginForm next={next} methods={methods} />
        )}
        <p className="mt-6 flex items-start gap-2 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 shrink-0 text-teal" aria-hidden />
          By continuing you agree to our Terms and Privacy Policy. Sabkaam is a private platform and not a government website.
        </p>
      </div>
    </div>
  );
}
