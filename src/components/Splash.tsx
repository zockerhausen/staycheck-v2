import { CHECK_PATH, PIN_PATH } from "@/components/Logo";

/**
 * Startbildschirm: zuerst das Logo, dann eine kurze Animation (Pin landet, Haken zeichnet sich, Schriftzug kommt),
 * dann öffnet sich die App. Reines HTML/CSS – sichtbar, bevor die App geladen ist; danach unsichtbar und nicht im Weg.
 * Nur beim ersten Öffnen pro Sitzung (sessionStorage); bei „Bewegung reduzieren“ nur ein kurzes Ein- und Ausblenden.
 * Als fertiges HTML eingesetzt, damit React es beim Start nicht anfasst (sonst liefe die Animation erneut).
 */
const HTML = `<div id="sc-splash" aria-hidden="true"><div class="sc-splash-inner"><div class="sc-splash-mark"><svg viewBox="0 0 64 64" width="96" height="96"><path d="${PIN_PATH}" fill="#fff"/><path class="sc-splash-check" d="${CHECK_PATH}" fill="none" stroke="#5340f2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sc-splash-shadow"></span></div><div class="sc-splash-word">Stay<span>Check</span></div></div></div><script>try{var s=document.getElementById('sc-splash');if(sessionStorage.getItem('sc-splash')){s&&s.remove()}else{sessionStorage.setItem('sc-splash','1');setTimeout(function(){s&&s.remove()},1600)}}catch(e){var x=document.getElementById('sc-splash');x&&x.remove()}</script>`;

export default function Splash() {
  return <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: HTML }} />;
}
