import Icon from "@/components/Icon";

export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Icon name="duel" size={64} className="animate-bounce text-sun" />
      <p className="mt-4 font-display text-[22px] font-extrabold">Die Hotels treten an …</p>
      <p className="mt-1 text-muted">Wir prüfen die Umgebung jeder Unterkunft</p>
    </div>
  );
}
