"use client";

import { useActionState } from "react";
import { requestPasswordReset, setNewPassword } from "@/app/actions";

const inputClass = "mt-1.5 w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-[17px] outline-none focus:border-sun";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">E-Mail</span>
        <input name="email" type="email" required autoComplete="email" placeholder="du@beispiel.de" className={inputClass} />
      </label>
      {state?.error && <p className="rounded-2xl bg-peach p-3 text-sm font-semibold text-peach-ink">{state.error}</p>}
      {state?.message && <p className="rounded-2xl bg-tan p-3 text-sm font-semibold" role="status">{state.message}</p>}
      <button disabled={pending} className="btn-chunky w-full">
        {pending ? "Einen Moment…" : "Link schicken"}
      </button>
    </form>
  );
}

export function NewPasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(setNewPassword, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      {/* Damit Passwort-Manager das neue Passwort dem richtigen Konto zuordnen */}
      <input type="email" name="email" value={email} readOnly autoComplete="username" className="hidden" />
      <label className="block">
        <span className="text-sm font-semibold">Neues Passwort</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Mindestens 8 Zeichen" className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Nochmal eingeben</span>
        <input name="password2" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </label>
      {state?.error && <p className="rounded-2xl bg-peach p-3 text-sm font-semibold text-peach-ink">{state.error}</p>}
      <button disabled={pending} className="btn-chunky w-full">
        {pending ? "Speichere…" : "Passwort speichern"}
      </button>
    </form>
  );
}
