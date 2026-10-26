"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { rememberCity } from "@/app/actions";

export default function CityButton({
  city,
  href,
  name,
  country,
  count,
  highlight,
}: {
  city: string;
  href: string;
  name: string;
  country: string;
  count: number;
  highlight: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        if ("vibrate" in navigator) navigator.vibrate(10);
        void rememberCity(city);
      }}
      className={`press flex items-center gap-4 rounded-3xl border p-5 ${
        highlight ? "border-sun/30 bg-gradient-to-br from-peach to-paper" : "border-line bg-paper"
      }`}
    >
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-peach text-sun-soft"
      >
        <Icon name="map" size={28} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[22px] font-extrabold leading-tight">{name}</span>
        <span className="block text-sm text-muted">
          {country} · {count} Viertel
        </span>
      </span>
      <Icon name="chevron" size={18} className="text-faint" />
    </Link>
  );
}
