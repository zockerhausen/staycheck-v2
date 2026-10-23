import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/data";
import { signout } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function KontoPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/konto");

  return (
    <div className="pt-4">
      <p className="text-5xl" aria-hidden>
        👤
      </p>
      <h1 className="mt-3 font-display text-4xl font-extrabold">Dein Konto</h1>
      <p className="mt-1 text-muted">{user.email}</p>

      <div className="mt-8 space-y-3">
        <Link href="/favoriten" className="btn-chunky btn-chunky-light w-full">
          ♥ Gemerkte Kieze
        </Link>
        <Link href="/quiz" className="btn-chunky btn-chunky-light w-full">
          ↻ Quiz neu machen
        </Link>
        <form action={signout}>
          <button className="w-full py-3 text-sm font-semibold text-muted">Abmelden</button>
        </form>
      </div>
    </div>
  );
}
