import { getCriteria, getSavedWeights, getUser } from "@/lib/data";
import PreferenceForm from "@/components/PreferenceForm";

export const dynamic = "force-dynamic";

export default async function FindenPage() {
  const [criteria, saved, user] = await Promise.all([getCriteria(), getSavedWeights(), getUser()]);

  return (
    <div>
      <h1 className="font-display text-4xl">Was ist dir wichtig?</h1>
      <p className="mt-2 text-muted">
        Schieb die Regler: ganz links ist dir egal, ganz rechts ist sehr wichtig.
        {user ? " Deine Auswahl wird in deinem Konto gespeichert." : ""}
      </p>
      <PreferenceForm criteria={criteria} initial={saved ?? {}} loggedIn={Boolean(user)} />
    </div>
  );
}
