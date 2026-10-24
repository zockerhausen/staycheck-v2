import Link from "next/link";
import Icon from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <Icon name="map" size={56} className="text-sun" />
      <h1 className="mega mt-5 text-[2rem]">Hier ist nichts.</h1>
      <p className="mt-2 max-w-xs text-muted">Diese Seite oder dieses Viertel gibt es nicht (mehr).</p>
      <Link href="/" className="btn-chunky mt-7 w-full max-w-xs">
        Zum Start
      </Link>
    </div>
  );
}
