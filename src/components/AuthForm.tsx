"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, oauthLogin, signup } from "@/app/actions";
import { OAUTH_LABEL, type OAuthProvider } from "@/lib/auth-providers";

const inputClass =
  "mt-1.5 w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-[17px] outline-none focus:border-sun";

export default function AuthForm({
  next,
  defaultMode = "login",
  providers = [],
}: {
  next: string;
  defaultMode?: "login" | "signup";
  /** Im Supabase-Projekt eingeschaltete Anbieter (Google, Apple) */
  providers?: OAuthProvider[];
}) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState(signup, undefined);

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <div className="mt-8">
      <div className="mb-6 grid grid-cols-2 rounded-full bg-peach p-1 font-extrabold">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2.5 ${mode === m ? "bg-sun text-white shadow-primary" : "text-sun-soft"}`}
          >
            {m === "login" ? "Anmelden" : "Registrieren"}
          </button>
        ))}
      </div>

      {providers.length > 0 && (
        <>
          <form action={oauthLogin} className="space-y-2.5">
            <input type="hidden" name="next" value={next} />
            {providers.map((p) => (
              <button
                key={p}
                name="provider"
                value={p}
                className={`press flex min-h-[3.4rem] w-full items-center justify-center rounded-full text-[16px] font-extrabold ${p === "apple" ? "bg-ink text-sand" : "border-[1.5px] border-line bg-paper"}`}
              >
                Weiter mit {OAUTH_LABEL[p]}
              </button>
            ))}
          </form>
          {!isLogin && <p className="mt-2 text-center text-xs text-muted">Ein Konto gibt es ab 16 Jahren.</p>}
          <div className="my-5 flex items-center gap-3 text-[13px] font-semibold text-muted">
            <span className="h-px flex-1 bg-line" /> oder mit E-Mail <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

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

        {!isLogin && (
          <label className="flex items-start gap-3 rounded-2xl bg-paper p-3.5 text-[14px] font-semibold">
            <input name="alter" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-sun)]" />
            <span>Ich bin mindestens 16 Jahre alt.</span>
          </label>
        )}

        {state?.error && <p className="rounded-2xl bg-peach p-3 text-sm font-semibold text-peach-ink">{state.error}</p>}
        {state?.message && <p className="rounded-2xl bg-tan p-3 text-sm font-semibold">{state.message}</p>}

        <button disabled={pending} className="btn-chunky w-full">
          {pending ? "Einen Moment…" : isLogin ? "Anmelden" : "Konto erstellen"}
        </button>
        {isLogin && (
          <Link href="/passwort/vergessen" className="block py-1 text-center text-sm font-semibold text-sun-soft">
            Passwort vergessen?
          </Link>
        )}
      </form>
    </div>
  );
}
