import { TORSO } from "./Accessories";
import { AppIconDefs } from "../ui/AppIcon";
/**
 * Shared, colour-independent paint servers for Walkie, the wardrobe and premium icons. Rendered once in the root layout;
 * overlays referencing these gracefully disappear where they're missing (e.g. serialized share images inject a copy).
 */
export function WalkieDefs() {
  return (
    <svg id="walkie-defs" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden focusable="false">
      <defs>
        <radialGradient id="wkg-hl" cx=".32" cy=".26" r=".75"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <linearGradient id="wkg-shade" x1="0" y1="0" x2="0" y2="1"><stop offset=".48" stopColor="#1b2538" stopOpacity="0" /><stop offset="1" stopColor="#1b2538" stopOpacity=".26" /></linearGradient>
        <linearGradient id="wkg-cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".34" /><stop offset=".42" stopColor="#fff" stopOpacity="0" /><stop offset=".72" stopColor="#0f1726" stopOpacity="0" /><stop offset="1" stopColor="#0f1726" stopOpacity=".26" /></linearGradient>
        <linearGradient id="wkg-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".6" /><stop offset=".28" stopColor="#fff" stopOpacity=".1" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#0f1726" stopOpacity=".22" /></linearGradient>
        <linearGradient id="wkg-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF0B8" /><stop offset=".45" stopColor="#E9C35C" /><stop offset="1" stopColor="#B8892A" /></linearGradient>
        <linearGradient id="wkg-lens" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".42" /><stop offset=".45" stopColor="#fff" stopOpacity=".06" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <radialGradient id="wkg-iris" cx=".5" cy=".3" r=".78"><stop offset="0" stopColor="#D3E8FF" /><stop offset=".45" stopColor="#80B1EF" /><stop offset="1" stopColor="#3A6BBF" /></radialGradient>
        <radialGradient id="wkg-ground" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#425A7C" stopOpacity=".32" /><stop offset="1" stopColor="#425A7C" stopOpacity="0" /></radialGradient>
        <radialGradient id="wkg-bubble" cx=".34" cy=".28" r=".8"><stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset=".62" stopColor="#DDEBFA" stopOpacity=".1" /><stop offset="1" stopColor="#A9C5ED" stopOpacity=".38" /></radialGradient>
        <radialGradient id="wkg-crystal" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#CFE3FA" /><stop offset="1" stopColor="#7FA6DE" /></radialGradient>
        <pattern id="wkg-fur" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
          <path d="M1 1.5 l2.2 2.8" stroke="#fff" strokeOpacity=".11" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M5.5 5.5 l2 2.6" stroke="#1b2538" strokeOpacity=".08" strokeWidth="1.1" strokeLinecap="round" />
        </pattern>
        <clipPath id="wkc-torso"><path d={TORSO} /></clipPath>
        {/* premium icon materials */}
        <linearGradient id="aig-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <AppIconDefs />
        <linearGradient id="aig-bot" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stopColor="#0f1726" stopOpacity="0" /><stop offset="1" stopColor="#0f1726" stopOpacity=".22" /></linearGradient>
      </defs>
    </svg>
  );
}
/** For canvas exports: copy the live defs into a serialized SVG clone so gradients survive. */
export function injectDefs(svg: SVGSVGElement) {
  const d = typeof document !== "undefined" ? document.querySelector("#walkie-defs defs") : null;
  if (d) svg.insertBefore(d.cloneNode(true), svg.firstChild);
  return svg;
}
