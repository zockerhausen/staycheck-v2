// Jede neue Seite gleitet sanft herein (kurz, nur Deckkraft und ein kleiner Weg – flüssig auch auf älteren Handys).
// Filter, Reiter und Reisedaten ändern nur die Adresse und lösen das nicht aus.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
