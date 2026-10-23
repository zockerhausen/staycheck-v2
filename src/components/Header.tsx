import Link from "next/link";
import { getUser } from "@/lib/data";
import { signout } from "@/app/actions";

export default async function Header() {
  const user = await getUser();

  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-2xl text-pine">
          StayCheck
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          <Link href="/finden" className="rounded-full px-3 py-1.5 hover:bg-sand">
            Finden
          </Link>
          <Link href="/vergleich" className="rounded-full px-3 py-1.5 hover:bg-sand">
            Vergleichen
          </Link>
          {user ? (
            <>
              <Link href="/favoriten" className="rounded-full px-3 py-1.5 hover:bg-sand">
                Favoriten
              </Link>
              <form action={signout}>
                <button className="rounded-full px-3 py-1.5 text-muted hover:bg-sand">Abmelden</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-pine px-4 py-1.5 font-medium text-white hover:bg-pine-dark">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
