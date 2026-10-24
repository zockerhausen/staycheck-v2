import Icon from "@/components/Icon";

export default function Loading() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <span className="animate-pulse text-sun">
        <Icon name="map" size={56} />
      </span>
      <h1 className="mega mt-5 text-2xl">Wir prüfen das Viertel …</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">Unterkünfte finden und die Lage jeder einzelnen prüfen. Beim ersten Mal dauert das bis zu einer Minute.</p>
    </div>
  );
}
