import { redirect } from "next/navigation";
import { getUser } from "@/lib/data";
import AuthForm from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (await getUser()) redirect("/finden");
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md pt-6">
      <h1 className="font-display text-4xl">Willkommen bei StayCheck</h1>
      <p className="mt-2 text-muted">Mit Konto speicherst du deine Wünsche und merkst dir Lieblings-Kieze.</p>
      {params.fehler === "bestaetigung" && (
        <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm text-coral">
          Der Bestätigungslink hat nicht funktioniert. Bitte melde dich an oder registriere dich erneut.
        </p>
      )}
      <AuthForm next={params.next} />
    </div>
  );
}
