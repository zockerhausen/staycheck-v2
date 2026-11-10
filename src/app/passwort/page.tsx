import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import Icon from "@/components/Icon";
import { getUser } from "@/lib/data";
import { NewPasswordForm } from "@/components/PasswordForms";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getUser();
  if (!user) redirect("/passwort/vergessen");
  return (
    <div className="pt-2">
      <BackButton fallback="/konto" className="flex items-center gap-1 text-sm font-semibold text-muted">
        <Icon name="back" size={18} /> Zurück
      </BackButton>
      <h1 className="mega mt-4 text-[2.1rem]">Neues Passwort</h1>
      <p className="mt-2 text-muted [overflow-wrap:anywhere]">Für {user.email}.</p>
      <NewPasswordForm email={user.email ?? ""} />
    </div>
  );
}
