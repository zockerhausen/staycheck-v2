import Icon from "@/components/Icon";
import type { GuideText } from "@/lib/wikivoyage";
import { safeHref } from "@/lib/safe-url";

/** „Aus dem Reiseführer“: Einleitung des Wikivoyage-Artikels, mit Quelle und Lizenz. */
export default function GuideCard({ guide }: { guide: GuideText | null }) {
  if (!guide) return null;
  const part = guide.title.split("/").pop() ?? guide.title;
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-[1.35rem] font-extrabold tracking-[-0.03em]">
        <Icon name="tip" size={22} className="text-sun-soft" fill="transparent" /> Aus dem Reiseführer
      </h2>
      <p className="mt-1 text-[13px] font-semibold text-muted">
        Wikivoyage über {part}
        {guide.lang === "en" ? " (auf Englisch)" : ""}
        {guide.distKm > 0.8 ? `, ${String(guide.distKm).replace(".", ",")} km entfernt` : ""}
      </p>
      <p lang={guide.lang} className="mt-3 text-[15.5px] font-medium leading-relaxed">
        {guide.text}
      </p>
      <p className="mt-3 text-[12px] font-semibold leading-relaxed text-muted">
        Quelle:{" "}
        <a href={safeHref(guide.url)} target="_blank" rel="noopener noreferrer" className="font-bold text-sun-soft underline underline-offset-4">
          Wikivoyage, „{guide.title}“
        </a>
        , Lizenz{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          CC BY-SA 4.0
        </a>
        , gekürzt. Fließt nicht in den Score ein.
      </p>
    </section>
  );
}
