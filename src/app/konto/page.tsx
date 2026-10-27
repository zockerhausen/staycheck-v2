import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/data";
import { signout } from "@/app/actions";
import Icon from "@/components/Icon";
import ThemeSwitch from "@/components/ThemeSwitch";
import DeleteAccount from "@/components/DeleteAccount";
import LegalLinks from "@/components/LegalLinks";

export const dynamic = "force-dynamic";

export default async function KontoPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/konto");

  return (
    <div className="pt-4">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tan text-ink">
        <Icon name="user" size={30} />
      </span>
      <h1 className="mega mt-3 text-[2.1rem]">Dein Konto</h1>
      <p className="mt-1 text-muted">{user.email}</p>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-extrabold text-muted">Darstellung</h2>
        <ThemeSwitch />
      </section>

      <div className="mt-8 space-y-3">
        <Link href="/favoriten" className="btn-chunky btn-chunky-light w-full">
          <Icon name="heart" size={22} /> Gemerkt
        </Link>
        <Link href="/profil" className="btn-chunky btn-chunky-light w-full">
          <Icon name="star" size={22} /> Mein Reise-Profil
        </Link>
        <Link href="/hilfe" className="btn-chunky btn-chunky-light w-full">
          <Icon name="tip" size={22} /> Hilfe und Kontakt
        </Link>
        <form action={signout}>
          <button className="w-full py-3 text-sm font-semibold text-muted">Abmelden</button>
        </form>
        <DeleteAccount />
      </div>
      <LegalLinks className="mt-12" />
    </div>
  );
}
