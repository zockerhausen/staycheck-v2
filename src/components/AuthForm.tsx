"use client";

import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions";

const inputClass =
  "mt-1 w-full rounded-2xl bg-paper px-4 py-3.5 text-lg outline-none focus:border-sun";

export default function AuthForm({ next, defaultMode = "login" }: { next: string; defaultMode?: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState(signup, undefined);

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <div className="mt-8">
      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-tan p-1.5 font-semibold">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl py-2.5 ${mode === m ? "bg-paper text-ink shadow-sm" : "text-muted"}`}
          >
            {m === "login" ? "Anmelden" : "Registrieren"}
          </button>
        ))}
      </div>

      <form action={isLogin ? loginAction : signupAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="text-sm font-semibold">E-Mail</span>
          <input name="email" type="email" required autoComplete="email" placeholder="du@beispiel.de" className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Passwort</span>
          <input
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={isLogin ? "" : "Mindestens 8 Zeichen"}
            className={inputClass}
          />
        </label>

        {state?.error && <p className="rounded-2xl bg-peach p-3 text-sm font-semibold text-peach-ink">{state.error}</p>}
        {state?.message && <p className="rounded-2xl bg-tan p-3 text-sm font-semibold">{state.message}</p>}

        <button disabled={pending} className="btn-chunky w-full">
          {pending ? "Einen Moment…" : isLogin ? "Anmelden" : "Konto erstellen"}
        </button>
      </form>
    </div>
  );
}
