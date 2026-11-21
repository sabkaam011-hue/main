"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleSavedService } from "@/actions/saved";
import { Button } from "@/components/ui/button";

export function SaveButton({ slug, initialSaved, labels }: { slug: string; initialSaved: boolean; labels: { save: string; saved: string } }) {
  const [saved, setSaved] = useState(initialSaved);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col">
      <Button
        variant="outline"
        disabled={pending}
        aria-pressed={saved}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const res = await toggleSavedService(slug);
            if (res.ok) setSaved(res.saved);
            else if (res.error === "login") router.push(`/login?next=${encodeURIComponent(`/service/${slug}`)}`);
            else if (res.error === "unavailable") setMsg("Saving needs the database to be configured.");
            else setMsg("Could not save. Please try again.");
          })
        }
      >
        {saved ? <BookmarkCheck className="h-4 w-4 text-teal" /> : <Bookmark className="h-4 w-4" />}
        {saved ? labels.saved : labels.save}
      </Button>
      {msg && <p className="mt-1 text-xs text-danger" role="alert">{msg}</p>}
    </div>
  );
}
