import { redirect } from "next/navigation";
import { getUser } from "@/lib/data";
import AuthForm from "@/components/AuthForm";
import Icon from "@/components/Icon";
import Link from "next/link";
import ThemeSwitch from "@/components/ThemeSwitch";
import LegalLinks from "@/components/LegalLinks";

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
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tan text-ink">
        <Icon name="user" size={30} />
      </span>
      <h1 className="mega mt-5 text-[2.1rem]">Behalte deine Orte.</h1>
      <p className="mt-2 text-muted">Reise-Profil, gemerkte Viertel und Unterkünfte auf jedem Gerät.</p>
      {params.fehler === "bestaetigung" && (
        <p className="mt-4 rounded-2xl bg-peach p-3 text-sm font-semibold text-peach-ink">
          Der Bestätigungslink hat nicht funktioniert. Melde dich an oder registriere dich erneut.
        </p>
      )}
      <AuthForm next={next} defaultMode={params.next ? "signup" : "login"} />
      <p className="mt-5 text-center text-xs leading-relaxed text-muted">
        Mit dem Konto gelten unsere{" "}
        <Link href="/nutzungsbedingungen" className="underline">
          Nutzungsbedingungen
        </Link>
        . Wir speichern deine E-Mail und was du anlegst, mehr in der{" "}
        <Link href="/datenschutz" className="underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
      <section className="mt-10">
        <h2 className="mb-2 text-sm font-extrabold text-muted">Darstellung</h2>
        <ThemeSwitch />
      </section>
      <LegalLinks className="mt-10" />
    </div>
  );
}
