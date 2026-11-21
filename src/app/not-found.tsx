import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-teal"><SearchX className="h-7 w-7" /></div>
      <h1 className="mt-5 text-2xl font-extrabold text-navy">Page not found</h1>
      <p className="mt-2 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved. Try searching instead.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className={buttonVariants()}>Go home</Link>
        <Link href="/services" className={buttonVariants({ variant: "outline" })}>Explore services</Link>
      </div>
    </div>
  );
}
