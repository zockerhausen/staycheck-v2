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
      className={`flex items-center gap-4 rounded-3xl border-2 border-b-[6px] p-5 transition active:translate-y-[3px] active:border-b-2 ${
        highlight ? "border-sun-dark bg-sun text-white" : "border-line bg-paper"
      }`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${highlight ? "bg-white/20" : "bg-peach text-sun"}`}
      >
        <Icon name="map" size={32} fill={highlight ? "#ffffff55" : "#ffffff"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-2xl font-extrabold leading-tight">{name}</span>
        <span className={`block text-sm ${highlight ? "text-white/85" : "text-muted"}`}>
          {country} · {count} Viertel
        </span>
      </span>
      <Icon name="forward" size={24} className={highlight ? "" : "text-muted"} />
    </Link>
  );
}
