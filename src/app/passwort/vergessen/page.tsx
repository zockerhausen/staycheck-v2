import BackButton from "@/components/BackButton";
import Icon from "@/components/Icon";
import { ResetRequestForm } from "@/components/PasswordForms";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="pt-2">
      <BackButton fallback="/login" className="flex items-center gap-1 text-sm font-semibold text-muted">
        <Icon name="back" size={18} /> Zurück
      </BackButton>
      <h1 className="mega mt-4 text-[2.1rem]">Passwort vergessen?</h1>
      <p className="mt-2 text-muted">Gib deine E-Mail ein. Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.</p>
      <ResetRequestForm />
    </div>
  );
}
