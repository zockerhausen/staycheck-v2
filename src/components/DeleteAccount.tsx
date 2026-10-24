"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions";
import Icon from "@/components/Icon";

/** Konto löschen mit bewusster Bestätigung (Wort eintippen), damit niemand aus Versehen alles verliert. */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full py-3 text-sm font-semibold text-faint">
        Konto löschen
      </button>
    );
  }

  return (
    <form action={action} className="card mt-2 space-y-3 p-4">
      <p className="flex items-center gap-2 font-bold">
        <Icon name="close" size={16} className="text-sun-soft" /> Konto endgültig löschen?
      </p>
      <p className="text-sm leading-relaxed text-muted">
        Dein Reise-Profil, alle gemerkten Orte und deine Tipps werden sofort gelöscht. Das lässt sich nicht rückgängig machen.
      </p>
      <label className="block text-sm font-semibold">
        Zum Bestätigen LÖSCHEN eintippen
        <input
          name="confirm"
          autoComplete="off"
          autoCapitalize="characters"
          className="mt-1.5 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[17px] outline-none focus:border-sun"
        />
      </label>
      {state?.error && <p className="text-sm font-semibold text-sun-soft">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="press flex-1 rounded-full bg-tan py-3 text-sm font-semibold">
          Abbrechen
        </button>
        <button disabled={pending} className="press flex-1 rounded-full bg-sun py-3 text-sm font-bold text-white disabled:opacity-60">
          {pending ? "Lösche …" : "Endgültig löschen"}
        </button>
      </div>
    </form>
  );
}
