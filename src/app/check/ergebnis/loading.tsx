import Icon from "@/components/Icon";

export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Icon name="check" size={64} className="animate-bounce text-sun" />
      <p className="mt-4 font-display text-2xl font-extrabold">Wir checken die Umgebung …</p>
      <p className="mt-1 text-muted">Bahn, Bars, Essen, Parks</p>
    </div>
  );
}
