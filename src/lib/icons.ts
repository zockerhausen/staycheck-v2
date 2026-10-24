// StayCheck Icon-Set „Sonnenpass“
// 24er Raster, runde Linienenden, Linienstärke 2.2, dazu eine weiche Akzentfläche (fill).
// Jedes Icon: Liste von Formen. f = Akzentfläche, s = Linie.
export type IconPart = { d: string; f?: true; s?: true };

export const ICONS = {
  budget: [
    { d: "M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16z", f: true, s: true },
    { d: "M12 7.6v8.8M14.4 9.8c-.5-.7-1.3-1.1-2.4-1.1-1.4 0-2.4.7-2.4 1.8 0 2.5 4.8 1.2 4.8 3.7 0 1.1-1 1.8-2.4 1.8-1.1 0-2-.4-2.5-1.1", s: true },
  ],
  nightlife: [
    { d: "M4.5 5h13L11 12.5z", f: true, s: true },
    { d: "M11 12.5V19M7.5 19.5h7M19.5 2v3.4M17.8 3.7h3.4", s: true },
  ],
  quiet: [
    { d: "M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1z", f: true, s: true },
    { d: "M15 3.5h3.5L15 7h3.5", s: true },
  ],
  safety: [
    { d: "M12 2.8l7.2 3v5.3c0 4.4-3 8.2-7.2 10-4.2-1.8-7.2-5.6-7.2-10V5.8z", f: true, s: true },
    { d: "M8.9 12l2.2 2.2 4.1-4.2", s: true },
  ],
  transit: [
    { d: "M7.5 3h9a2.5 2.5 0 0 1 2.5 2.5V14a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5.5A2.5 2.5 0 0 1 7.5 3z", f: true, s: true },
    { d: "M5 10.2h14M8.6 13.6h.01M15.4 13.6h.01M8 17l-2 4M16 17l2 4", s: true },
  ],
  food: [
    { d: "M3.5 12h17a8.5 8.5 0 0 1-17 0z", f: true, s: true },
    { d: "M13.5 2.8l-2.6 8.4M18.5 3.5l-5.3 7.6", s: true },
  ],
  nature: [
    { d: "M12 2.8a5 5 0 0 1 4.9 4.1 4.2 4.2 0 0 1-.6 8.1H7.7a4.2 4.2 0 0 1-.6-8.1A5 5 0 0 1 12 2.8z", f: true, s: true },
    { d: "M12 15v6.2M8.8 21.2h6.4M12 15l-2.2-2.4M12 13.2l2-2", s: true },
  ],
  discover: [
    { d: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z", s: true },
    { d: "M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5z", f: true, s: true },
  ],
  check: [
    { d: "M12 21.8s7.2-6.2 7.2-12a7.2 7.2 0 0 0-14.4 0c0 5.8 7.2 12 7.2 12z", f: true, s: true },
    { d: "M9.2 9.8l2 2 3.7-3.8", s: true },
  ],
  hotel: [
    { d: "M5.6 9.2h2.8a1.6 1.6 0 0 1 1.6 1.6v2H4v-2a1.6 1.6 0 0 1 1.6-1.6z", f: true },
    { d: "M3 5v15M3 15.5h18V20M21 15.5v-3.3a3 3 0 0 0-3-3h-6.5v6.3", s: true },
    { d: "M4 12.8h6", s: true },
  ],
  duel: [
    { d: "M12 9.5l-2.3 2.3 2.3 2.3 2.3-2.3z", f: true },
    { d: "M4 3.5l10 10M4 3.5h3.6M4 3.5v3.6M20 3.5l-10 10M20 3.5h-3.6M20 3.5v3.6M6.2 14.3l3.5 3.5M5 19l2.9-2.9M17.8 14.3l-3.5 3.5M19 19l-2.9-2.9", s: true },
  ],
  heart: [{ d: "M12 20.2s-7.6-4.6-7.6-10.4A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.6 2.8c0 5.8-7.6 10.4-7.6 10.4z", f: true, s: true }],
  user: [
    { d: "M12 3.6a4.2 4.2 0 1 1 0 8.4a4.2 4.2 0 1 1 0-8.4z", f: true, s: true },
    { d: "M4.5 20.8a7.5 7.5 0 0 1 15 0", s: true },
  ],
  share: [
    { d: "M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12", f: true, s: true },
    { d: "M12 3v11M7.8 7.2L12 3l4.2 4.2", s: true },
  ],
  search: [
    { d: "M11 4a6.6 6.6 0 1 1 0 13.2A6.6 6.6 0 1 1 11 4z", f: true, s: true },
    { d: "M16 16l4.6 4.6", s: true },
  ],
  back: [{ d: "M14.8 5l-7 7 7 7", s: true }],
  forward: [{ d: "M5 12h13.5M12.8 6l6 6-6 6", s: true }],
  refresh: [{ d: "M19.8 12a7.8 7.8 0 1 1-2.3-5.5M19.8 4v4.2h-4.2", s: true }],
  walk: [
    { d: "M13.6 2.6a1.9 1.9 0 1 1 0 3.8a1.9 1.9 0 1 1 0-3.8z", f: true, s: true },
    { d: "M9.5 21l2.2-6.2 3 2.8v3.4M11.7 14.8l1.3-5.6-3.4 1.6L8 13.6M13 9.2l2 3.2 2.6 1", s: true },
  ],
  star: [{ d: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z", f: true, s: true }],
  external: [{ d: "M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5", s: true }],
  close: [{ d: "M6 6l12 12M18 6L6 18", s: true }],
  map: [
    { d: "M9 4.5l6 2.2 5-2v13l-5 2-6-2.2-5 2v-13z", f: true, s: true },
    { d: "M9 4.5v13M15 6.7v13", s: true },
  ],
  plane: [
    { d: "M10.6 3.6c.6-1.1 2.2-1.1 2.8 0l.6 5.6 7 4.1v2.1l-7-1.9-.5 4.1 2.4 2v1.6L12 19.9l-3.9 1.2v-1.6l2.4-2-.5-4.1-7 1.9v-2.1l7-4.1z", f: true, s: true },
  ],
  bag: [
    { d: "M6.5 9a5.5 5.5 0 0 1 11 0v9a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z", f: true, s: true },
    { d: "M9.5 6.6V5.5a2.5 2.5 0 0 1 5 0v1.1M9.5 13.5h5", s: true },
  ],
  bus: [
    { d: "M5.5 3.5h13a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16V5a1.5 1.5 0 0 1 1.5-1.5z", f: true, s: true },
    { d: "M4 10.5h16M7.5 17v3M16.5 17v3M8 13.8h.01M16 13.8h.01", s: true },
  ],
  tip: [
    { d: "M5 4h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-7l-4.5 3.8v-3.8H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", f: true, s: true },
    { d: "M7.5 9h9M7.5 12h5.5", s: true },
  ],
  flag: [
    { d: "M5 4h12l-2.6 4.2L17 12.4H5z", f: true, s: true },
    { d: "M5 21V4", s: true },
  ],
  locate: [
    { d: "M12 8.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z", f: true, s: true },
    { d: "M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M12 5.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13z", s: true },
  ],
  chevron: [{ d: "M9.2 5l7 7-7 7", s: true }],
  down: [{ d: "M6 9.5l6 6 6-6", s: true }],
  sliders: [{ d: "M4 7h16M7 12h10M10 17h4", s: true }],
  link: [
    { d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1", s: true },
  ],
} satisfies Record<string, IconPart[]>;

export type IconName = keyof typeof ICONS;

/** Kriterium → Icon */
export const CRITERION_ICON: Record<string, IconName> = {
  budget: "budget",
  nightlife: "nightlife",
  quiet: "quiet",
  safety: "safety",
  transit: "transit",
  food: "food",
  nature: "nature",
};
