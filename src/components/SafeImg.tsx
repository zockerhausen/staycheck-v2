"use client";

/** Bild, das sich bei einem Ladefehler einfach ausblendet (darunter liegt dann die Farbfläche). */
export default function SafeImg({ src, className, eager = false }: { src: string; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = "none";
        const box = e.currentTarget.parentElement;
        box?.querySelectorAll<HTMLElement>("[data-credit]").forEach((el) => (el.style.display = "none"));
        box?.classList.add("img-failed");
      }}
    />
  );
}
