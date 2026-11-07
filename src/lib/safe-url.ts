/** Nur echte https-Links nach außen anzeigen (nie „javascript:“ o. Ä.), auch wenn Daten von außen kommen. */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url || url.length > 2000) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : undefined;
  } catch {
    return undefined;
  }
}
