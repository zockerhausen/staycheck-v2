"use client";

import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions";

export default function AuthForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState(signup, undefined);

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <div className="mt-8 rounded-2xl border border-line bg-paper p-6">
      <div className="mb-6 grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-medium">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 ${mode === m ? "bg-paper shadow-sm" : "text-muted"}`}
          >
            {m === "login" ? "Anmelden" : "Registrieren"}
          </button>
        ))}
      </div>

      <form action={isLogin ? loginAction : signupAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/finden"} />
        <label className="block">
          <span className="text-sm font-medium">E-Mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Passwort</span>
          <input
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-pine"
          />
        </label>

        {state?.error && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{state.error}</p>}
        {state?.message && <p className="rounded-xl bg-pine/10 p-3 text-sm text-pine">{state.message}</p>}

        <button
          disabled={pending}
          className="w-full rounded-full bg-pine py-3 font-medium text-white hover:bg-pine-dark disabled:opacity-60"
        >
          {pending ? "Einen Moment…" : isLogin ? "Anmelden" : "Konto erstellen"}
        </button>
      </form>
    </div>
  );
}
