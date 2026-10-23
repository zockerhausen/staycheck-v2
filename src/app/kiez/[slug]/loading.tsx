import Icon from "@/components/Icon";

export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Icon name="hotel" size={64} className="animate-bounce text-sun" />
      <p className="mt-4 font-display text-2xl font-extrabold">Wir suchen Unterkünfte …</p>
      <p className="mt-1 text-muted">und prüfen bei jeder die Lage</p>
    </div>
  );
}
