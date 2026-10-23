import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/data";
import { signout } from "@/app/actions";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function KontoPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/konto");

  return (
    <div className="pt-4">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-peach text-sun">
        <Icon name="user" size={40} fill="#ffffff" />
      </span>
      <h1 className="mt-3 font-display text-4xl font-extrabold">Dein Konto</h1>
      <p className="mt-1 text-muted">{user.email}</p>

      <div className="mt-8 space-y-3">
        <Link href="/favoriten" className="btn-chunky btn-chunky-light w-full">
          <Icon name="heart" size={22} /> Gemerkt
        </Link>
        <Link href="/quiz" className="btn-chunky btn-chunky-light w-full">
          <Icon name="refresh" size={22} /> Quiz neu machen
        </Link>
        <form action={signout}>
          <button className="w-full py-3 text-sm font-semibold text-muted">Abmelden</button>
        </form>
      </div>
    </div>
  );
}
