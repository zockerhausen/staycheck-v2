"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { deleteTip, reportTip } from "@/app/actions";

export default function TipActions({
  tipId,
  own,
  loggedIn,
  path,
}: {
  tipId: string;
  own: boolean;
  loggedIn: boolean;
  path: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "reported">("idle");
  const [pending, startTransition] = useTransition();

  if (own) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteTip(tipId, path);
            router.refresh();
          })
        }
        className="mt-2 text-xs font-semibold text-muted underline underline-offset-2"
      >
        {pending ? "Wird gelöscht …" : "Meinen Tipp löschen"}
      </button>
    );
  }
  if (!loggedIn) return null;
  if (state === "reported") return <p className="mt-2 text-xs font-semibold text-muted">Danke, wir schauen uns das an.</p>;
  if (state === "confirm") {
    return (
      <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
        <span className="text-muted">Tipp melden?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await reportTip(tipId);
              setState("reported");
            })
          }
          className="text-sun"
        >
          Ja, melden
        </button>
        <button type="button" onClick={() => setState("idle")} className="text-muted">
          Abbrechen
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setState("confirm")}
      className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted"
      aria-label="Tipp melden"
    >
      <Icon name="flag" size={14} /> Melden
    </button>
  );
}
