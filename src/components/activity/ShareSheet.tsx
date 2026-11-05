"use client";
import { privacyTrim } from "@/lib/route-privacy";
import { useEffect, useRef, useState } from "react";
import { injectDefs } from "../mascot/WalkieDefs";
import { ACTIVITY_META, FAMILY_META, type ActivityType } from "@/lib/constants";
import { formatDuration, formatPace, formatSpeed } from "@/lib/fitness";
import { dist, distUnit } from "@/lib/format";
import { api } from "@/lib/client/api";
import { Sheet } from "../ui/Sheet";
import { Icon } from "../ui/Icon";
import { Walkie } from "../mascot/Walkie";
import { useToast } from "../ui/Toast";
import type { CompletionData } from "./CompletionCard";

type Opts = { route: boolean; name: boolean; details: boolean; format: "story" | "square" };

async function svgToImage(el: SVGSVGElement, size: number): Promise<HTMLImageElement> {
  const clone = injectDefs(el.cloneNode(true) as SVGSVGElement);
  clone.setAttribute("width", String(size)); clone.setAttribute("height", String(size));
  clone.querySelectorAll(".wk-fx").forEach((n) => n.remove()); // static share art: no particle layers
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await img.decode();
  return img;
}

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }

/** Draws the share card. Privacy: start & finish of the route are trimmed (route-privacy.ts) so home/work isn't revealed. */
export async function renderShareCard(canvas: HTMLCanvasElement, d: CompletionData, o: Opts, mascot: SVGSVGElement) {
  const W = 1080, H = o.format === "story" ? 1920 : 1080;
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext("2d")!;
  const a = d.activity, meta = ACTIVITY_META[a.type as ActivityType] ?? ACTIVITY_META.FREE_WORKOUT, fam = FAMILY_META[meta.family];
  const story = o.format === "story";
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#D6E6FB"); g.addColorStop(0.55, "#EAF2FC"); g.addColorStop(1, "#FAFAF7");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // hills
  c.fillStyle = "#CFE8C4"; c.beginPath(); c.moveTo(0, story ? 760 : 470); c.quadraticCurveTo(300, story ? 640 : 380, 600, story ? 730 : 450); c.quadraticCurveTo(860, story ? 790 : 500, 1080, story ? 700 : 430); c.lineTo(1080, story ? 900 : 560); c.lineTo(0, story ? 900 : 560); c.fill();
  const D = (s: number) => `600 ${s}px "Fredoka Variable", ui-rounded, sans-serif`;
  const B = (s: number, w = 700) => `${w} ${s}px "Nunito Variable", system-ui, sans-serif`;
  c.fillStyle = "#425A7C"; c.font = D(44); c.fillText("🐾 Walkie.run", 64, 100);
  c.fillStyle = "#242B35"; c.font = D(story ? 96 : 76); c.fillText(a.title || meta.label, 64, story ? 230 : 196);
  c.fillStyle = "#6B7685"; c.font = B(36, 600);
  const dateLine = new Date(a.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  c.fillText(o.name ? `${d.userName} · ${dateLine}` : dateLine, 64, story ? 290 : 250);
  const mSize = story ? 560 : 400;
  c.drawImage(await svgToImage(mascot, mSize), W - mSize - 10, story ? 300 : 150, mSize, mSize);

  const top = story ? 900 : 590;
  rr(c, 48, top, W - 96, H - top - 48, 56); c.fillStyle = "#FFFFFF"; c.shadowColor = "rgba(66,90,124,.18)"; c.shadowBlur = 40; c.shadowOffsetY = 12; c.fill(); c.shadowColor = "transparent";
  const stats: [string, string][] = [];
  if (a.distanceM > 0) stats.push([`${dist(a.distanceM, d.units, 2)} ${distUnit(d.units)}`, "Distance"]);
  stats.push([formatDuration(a.durationSec), "Time"]);
  if (o.details) {
    if (meta.family !== "bike" && a.avgPaceSecKm) stats.push([`${formatPace(a.avgPaceSecKm, d.units)}/${distUnit(d.units)}`, "Avg pace"]);
    else if (a.avgSpeedMps) stats.push([`${formatSpeed(a.avgSpeedMps, d.units)} ${d.units === "imperial" ? "mph" : "km/h"}`, "Avg speed"]);
  }
  stats.push([`+${a.points.toLocaleString()}`, "Walkie points"]);
  const colW = (W - 160) / Math.min(2, stats.length);
  stats.forEach(([v, l], i) => {
    const x = 96 + (i % 2) * colW, y = top + 120 + Math.floor(i / 2) * 150;
    c.fillStyle = i === stats.length - 1 ? fam.color : "#242B35"; c.font = D(story ? 76 : 64); c.fillText(v, x, y);
    c.fillStyle = "#6B7685"; c.font = B(30); c.fillText(l, x, y + 46);
  });
  const statsBottom = top + 120 + Math.ceil(stats.length / 2) * 150;
  let drewRoute = false;
  if (o.route && d.route.length >= 3) {
    const pts = privacyTrim(d.route); // start & finish hidden (150 m, or 20 % of a short route)
    const boxY = statsBottom, boxH = H - 48 - 60 - boxY;
    if (pts.length >= 2 && boxH > 160) {
      rr(c, 96, boxY, W - 192, boxH, 40); c.fillStyle = "#EAF2FC"; c.fill();
      const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
      const k = Math.cos(((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI / 180);
      const w = Math.max((Math.max(...lngs) - Math.min(...lngs)) * k, 1e-6), h = Math.max(Math.max(...lats) - Math.min(...lats), 1e-6);
      const s = Math.min((W - 192 - 120) / w, (boxH - 120) / h);
      const ox = 96 + (W - 192 - w * s) / 2, oy = boxY + (boxH - h * s) / 2;
      c.lineCap = "round"; c.lineJoin = "round";
      for (const [col, lw] of [["#FFFFFF", 22], [fam.color, 12]] as const) {
        c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
        pts.forEach((p, i) => { const x = ox + (p[1] - Math.min(...lngs)) * k * s, y = oy + h * s - (p[0] - Math.min(...lats)) * s; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
        c.stroke();
      }
      drewRoute = true;
    }
  }
  const freeH = H - 48 - 60 - statsBottom;
  if (!drewRoute && freeH > 200) {
    rr(c, 96, statsBottom, W - 192, freeH - 20, 40); c.fillStyle = fam.tint; c.fill();
    c.fillStyle = fam.color; c.globalAlpha = 0.25;
    for (let i = 0; i < 7; i++) { const x = 170 + i * 120, y = statsBottom + freeH / 2 + (i % 2 ? -40 : 30); for (const [dx, dy, r] of [[0, 0, 18], [-22, -26, 9], [-7, -36, 9], [9, -36, 9], [24, -26, 9]]) { c.beginPath(); c.arc(x + dx, y + dy, r, 0, Math.PI * 2); c.fill(); } }
    c.globalAlpha = 1; c.fillStyle = "#425A7C"; c.font = D(52); c.textAlign = "center";
    c.fillText("Every step is an adventure.", W / 2, statsBottom + freeH / 2 + 110 > H - 140 ? statsBottom + freeH / 2 : statsBottom + freeH / 2 + 110); c.textAlign = "left";
  }
  c.fillStyle = "#A9C5ED"; c.font = B(28); c.textAlign = "center"; c.fillText("Walk · Run · Bike · Collect · Build — walkie.run", W / 2, H - 80); c.textAlign = "left";
}

export function ShareSheet({ open, onClose, d }: { open: boolean; onClose: () => void; d: CompletionData }) {
  const toast = useToast();
  const [o, setO] = useState<Opts>({ route: d.route.length >= 3, name: true, details: true, format: "story" });
  const [preview, setPreview] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mascot = useRef<HTMLDivElement>(null);
  const meta = ACTIVITY_META[d.activity.type as ActivityType];

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      await document.fonts?.ready;
      const svg = mascot.current?.querySelector("svg");
      if (!canvas.current || !svg) return;
      await renderShareCard(canvas.current, d, o, svg);
      if (alive) setPreview(canvas.current.toDataURL("image/png"));
    })().catch(() => toast("error", "Couldn't draw the share image"));
    return () => { alive = false; };
  }, [open, o, d, toast]);

  const blob = () => new Promise<Blob>((res) => canvas.current!.toBlob((b) => res(b!), "image/png"));
  const fileName = `walkie-${d.activity.type.toLowerCase()}-${d.activity.startedAt.slice(0, 10)}.png`;
  async function nativeShare() {
    try {
      const file = new File([await blob()], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "My Walkie activity" });
      else { download(); toast("info", "Sharing images isn't supported here — downloaded instead"); }
      api("/api/analytics", { body: { name: "share_tapped", props: { kind: "activity", format: o.format } } }).catch(() => {});
    } catch { /* user cancelled */ }
  }
  async function download() { const url = URL.createObjectURL(await blob()); const a = document.createElement("a"); a.href = url; a.download = fileName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  async function copyLink() {
    try { const r = await api<{ url: string }>(`/api/activities/${d.activity.id}/share`, { body: { route: o.route, name: o.name, details: o.details } }); await navigator.clipboard.writeText(r.url); toast("success", "Public link copied"); }
    catch (e: any) { toast("error", e.message); }
  }
  const T = ({ k, label, sub }: { k: "route" | "name" | "details"; label: string; sub: string }) => (
    <label className="flex items-center gap-3 py-2"><span className="flex-1"><span className="block text-[14px] font-bold">{label}</span><span className="block text-[12px] text-walkie-muted">{sub}</span></span><input type="checkbox" className="h-5 w-5 accent-walkie-blue" checked={o[k]} onChange={(e) => setO({ ...o, [k]: e.target.checked })} /></label>
  );
  return (
    <Sheet open={open} onClose={onClose} title="Share activity" wide>
      <div ref={mascot} className="hidden" aria-hidden><Walkie mood={meta?.family === "bike" ? "bike" : "happy"} size={400} accessories={meta?.family === "bike" ? [] : [{ key: "acc_bandana", color: "#6B8FD6" }]} /></div>
      <canvas ref={canvas} className="hidden" />
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="mx-auto w-[200px]">{preview ? <img src={preview} alt="Share card preview" className="w-full rounded-2xl shadow-lift" /> : <div className="aspect-[9/16] animate-shimmer rounded-2xl bg-walkie-gray/50" />}</div>
        <div>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-card">{(["story", "square"] as const).map((f) => <button key={f} onClick={() => setO({ ...o, format: f })} className={`rounded-full py-2 text-[13px] font-extrabold ${o.format === f ? "bg-walkie-blue text-white" : "text-walkie-muted"}`}>{f === "story" ? "Story 9:16" : "Square 1:1"}</button>)}</div>
          <div className="mt-2 divide-y divide-walkie-light rounded-2xl bg-white px-4 shadow-card">
            <T k="route" label="Show route" sub="Start & finish hidden for privacy" />
            <T k="name" label="Show my name" sub={d.userName} />
            <T k="details" label="Show pace / speed" sub="Distance & time always shown" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="btn-primary px-2 text-[13px]" onClick={nativeShare}><Icon name="share" size={16} />Share</button>
            <button className="btn-soft px-2 text-[13px]" onClick={download}><Icon name="download" size={16} />Save</button>
            <button className="btn-soft px-2 text-[13px]" onClick={copyLink}><Icon name="link" size={16} />Link</button>
          </div>
          <p className="mt-2 text-[11px] text-walkie-muted">Sharing is opt-in. A link only works while you keep sharing on; stop it any time from the activity page.</p>
        </div>
      </div>
    </Sheet>
  );
}
