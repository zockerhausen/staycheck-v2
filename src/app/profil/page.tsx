import BackButton from "@/components/BackButton";
import Link from "next/link";
import { getCriteria, getExtras, getProfile, getUser } from "@/lib/data";
import ProfileEditor from "@/components/ProfileEditor";
import Icon from "@/components/Icon";
import ThemeSwitch from "@/components/ThemeSwitch";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const criteria = await getCriteria();
  const [{ weights }, user, extras] = await Promise.all([getProfile(criteria), getUser(), getExtras()]);

  return (
    <div className="pt-2">
      <BackButton fallback="/reise" className="flex items-center gap-1 text-sm font-semibold text-muted">
        <Icon name="back" size={18} /> Zurück
      </BackButton>
      <h1 className="mega mt-4 text-[2.1rem]">Dein Reise-Profil</h1>
      <p className="mt-2 text-muted">
        So wichtig ist dir das auf Reisen. Danach richten sich alle Kiez-Empfehlungen und Lage-Checks.
        {user ? " Gespeichert in deinem Konto." : " Gespeichert auf diesem Gerät. Mit Konto auch auf allen anderen."}
      </p>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-extrabold text-muted">Darstellung</h2>
        <ThemeSwitch />
      </section>

      {weights ? (
        <ProfileEditor criteria={criteria} initial={weights} initialExtras={extras} />
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-raised p-8 text-center">
          <Icon name="star" size={48} className="mx-auto text-sun" />
          <p className="mt-2 font-semibold">Noch kein Profil</p>
          <p className="mt-1 text-sm text-muted">Mach einmal das Quiz, dann kannst du es hier anpassen.</p>
          <Link href="/quiz" className="btn-chunky mt-5 w-full">
            Quiz starten
          </Link>
        </div>
      )}
    </div>
  );
}
