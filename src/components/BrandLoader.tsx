import { CHECK_PATH, PIN_PATH } from "@/components/Logo";

/** Laden im StayCheck-Look: der Logo-Pin hüpft, darunter schimmernde Platzhalter in der Form der kommenden Seite */
export default function BrandLoader({ title, text, shape = "list" }: { title: string; text?: string; shape?: "list" | "hero" | "none" }) {
  return (
    <div className="pt-10" role="status" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <svg viewBox="0 0 64 64" width="64" height="64" className="loader-pin" aria-hidden>
          <defs>
            <linearGradient id="sc-loader-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7b6dff" />
              <stop offset="1" stopColor="#4a36e8" />
            </linearGradient>
          </defs>
          <path d={PIN_PATH} fill="url(#sc-loader-g)" />
          <path d={CHECK_PATH} fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="loader-shadow mt-1 h-2 w-9 rounded-full bg-sun/40 blur-[2px]" aria-hidden />
        <p className="mt-5 text-[21px] font-extrabold tracking-[-0.03em]">{title}</p>
        {text && <p className="mt-1 max-w-xs text-[14px] font-semibold text-muted">{text}</p>}
      </div>
      {shape !== "none" && (
        <div className="mt-8 space-y-3" aria-hidden>
          {shape === "hero" && <div className="skeleton h-40" />}
          <div className="skeleton h-[118px]" />
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
      )}
    </div>
  );
}
