import { redirect } from "next/navigation";
import { getUser } from "@/lib/data";
import AuthForm from "@/components/AuthForm";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const next = params.next && /^\/(?![\/\\])[^\s\\]*$/.test(params.next) ? params.next : "/";
  if (await getUser()) redirect(next);

  return (
    <div className="pt-4">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-peach text-sun">
        <Icon name="user" size={40} fill="rgba(242,102,47,.22)" />
      </span>
      <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">
        Dein Reise&shy;pass für Kieze
      </h1>
      <p className="mt-2 text-muted">Speichere deine Ergebnisse und merk dir die Kieze, die dir gefallen.</p>
      {params.fehler === "bestaetigung" && (
        <p className="mt-4 rounded-2xl bg-peach p-3 text-sm font-semibold text-peach-ink">
          Der Bestätigungslink hat nicht funktioniert. Melde dich an oder registriere dich erneut.
        </p>
      )}
      <AuthForm next={next} defaultMode={params.next ? "signup" : "login"} />
    </div>
  );
}
