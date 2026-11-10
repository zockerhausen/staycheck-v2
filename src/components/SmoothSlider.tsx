"use client";

import { useRef, useState } from "react";

/**
 * Regler mit Stufen, der sich weich anfühlt (angelehnt an Apples Regler):
 * Der Knopf folgt dem Finger stufenlos, wird beim Anfassen etwas größer, und rastet beim Loslassen
 * federnd auf der nächsten Stufe ein. Beim Überqueren einer Stufe gibt es einen kurzen Tick (wo das Gerät vibrieren kann).
 * Bedienbar auch mit Tastatur (Pfeiltasten) und Vorlese-Funktion.
 */
export default function SmoothSlider({
  value,
  max = 5,
  label,
  valueText,
  onLive,
  onChange,
}: {
  value: number;
  max?: number;
  label: string;
  valueText: (v: number) => string;
  /** Stufe unter dem Finger, während geschoben wird (für die Anzeige) */
  onLive?: (v: number | null) => void;
  /** Loslassen: neue Stufe übernehmen */
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null); // 0…1 während des Schiebens
  const stepRef = useRef(value);
  const frac = drag ?? value / max;
  const stepOf = (f: number) => Math.round(f * max);

  const THUMB = 28;
  const fracAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left - THUMB / 2) / (r.width - THUMB)));
  };
  const tick = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(4);
  };

  const move = (clientX: number) => {
    const f = fracAt(clientX);
    setDrag(f);
    const s = stepOf(f);
    if (s !== stepRef.current) {
      stepRef.current = s;
      tick();
      onLive?.(s);
    }
  };
  const end = () => {
    if (drag === null) return;
    const s = stepOf(drag);
    setDrag(null);
    onLive?.(null);
    if (s !== value) onChange(s);
  };

  const dragging = drag !== null;
  const shown = dragging ? stepOf(drag) : value;
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={shown}
      aria-valuetext={valueText(shown)}
      className="sc-slider"
      data-dragging={dragging}
      style={{ ["--f" as string]: frac }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        stepRef.current = value;
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging && move(e.clientX)}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(e) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = Math.min(max, Math.max(0, value + d));
        if (n !== value) onChange(n);
      }}
    >
      <span className="sc-slider-track">
        <span className="sc-slider-fill" />
        {Array.from({ length: max + 1 }, (_, i) => (
          <span key={i} className="sc-slider-dot" data-on={i <= shown} style={{ left: `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${i / max})` }} />
        ))}
      </span>
      <span className="sc-slider-thumb" />
    </div>
  );
}
