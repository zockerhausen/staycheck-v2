import Link from "next/link";
import { getCriteria, getProfile, getUser } from "@/lib/data";
import ProfileEditor from "@/components/ProfileEditor";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const criteria = await getCriteria();
  const [{ weights }, user] = await Promise.all([getProfile(criteria), getUser()]);

  return (
    <div className="pt-2">
      <Link href="/reise" className="flex items-center gap-1 text-sm font-semibold text-muted">
        <Icon name="back" size={18} /> Zurück
      </Link>
      <h1 className="mt-4 font-display text-4xl font-extrabold">Dein Reise-Profil</h1>
      <p className="mt-2 text-muted">
        So wichtig ist dir das auf Reisen. Danach richten sich alle Kiez-Empfehlungen und Lage-Checks.
        {user ? " Gespeichert in deinem Konto." : " Gespeichert auf diesem Gerät. Mit Konto auch auf allen anderen."}
      </p>

      {weights ? (
        <ProfileEditor criteria={criteria} initial={weights} />
      ) : (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-line p-8 text-center">
          <Icon name="star" size={48} className="mx-auto text-sun" />
          <p className="mt-2 font-semibold">Noch kein Profil</p>
          <p className="mt-1 text-sm text-muted">Mach einmal das Quiz, dann kannst du es hier anpassen.</p>
          <Link href="/reise" className="btn-chunky mt-5 w-full">
            Quiz starten
          </Link>
        </div>
      )}
    </div>
  );
}
