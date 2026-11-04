"use client";
import { useEffect, useRef, useState } from "react";
import { injectDefs } from "../mascot/WalkieDefs";
import { api } from "@/lib/client/api";
import { CATEGORY_LABEL } from "@/lib/achievements/catalog";
import { RARITY_META, type Rarity } from "@/lib/constants";
import { Sheet } from "../ui/Sheet";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { BadgeArt } from "./BadgeArt";
import { Walkie } from "../mascot/Walkie";
import type { Badge } from "./BadgesClient";

type Fmt = "story" | "square" | "wide";
const SIZES: Record<Fmt, [number, number]> = { story: [1080, 1920], square: [1080, 1080], wide: [1200, 630] };

async function toImg(el: Element, w: number, h: number) {
  const clone = injectDefs(el.cloneNode(true) as SVGSVGElement);
  clone.setAttribute("width", String(w)); clone.setAttribute("height", String(h));
  clone.querySelectorAll(".wk-fx,.badge-twinkle").forEach((n) => n.remove());
  clone.querySelectorAll("text").forEach((t) => t.setAttribute("font-family", "Fredoka Variable, Arial Rounded MT Bold, sans-serif"));
  const img = new Image(); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`; await img.decode(); return img;
}

/** Achievement card: badge, title, description, optional name, unlock date, branding. No routes or health data. */
export function BadgeShareSheet({ open, onClose, badge, userName }: { open: boolean; onClose: () => void; badge: Badge; userName: string }) {
  const toast = useToast();
  const [fmt, setFmt] = useState<Fmt>("story");
  const [showName, setShowName] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const pup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    (async () => {
      await document.fonts?.ready;
      const c = canvas.current!, [W, H] = SIZES[fmt]; c.width = W; c.height = H;
      const x = c.getContext("2d")!;
      const rm = RARITY_META[badge.rarity as Rarity] ?? RARITY_META.COMMON;
      const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#EAF2FC"); g.addColorStop(1, rm.bg); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = "rgba(107,143,214,.08)"; for (let i = 0; i < 14; i++) { x.beginPath(); x.arc((i * 197) % W, (i * 331) % H, 40 + (i % 3) * 20, 0, Math.PI * 2); x.fill(); }
      const D = (s: number) => `600 ${s}px "Fredoka Variable", ui-rounded, sans-serif`, B = (s: number) => `700 ${s}px "Nunito Variable", sans-serif`;
      const wide = fmt === "wide", story = fmt === "story";
      const bs = wide ? 420 : story ? 720 : 560;
      const svg = art.current!.querySelector("svg")!, dog = pup.current!.querySelector("svg")!;
      const bx = wide ? 70 : (W - bs) / 2, by = wide ? 80 : story ? 300 : 150;
      x.drawImage(await toImg(svg, bs, bs * 1.14), bx, by, bs, bs * 1.14);
      x.drawImage(await toImg(dog, wide ? 200 : 260, wide ? 200 : 260), wide ? W - 240 : W - 300, wide ? H - 230 : by + bs * 1.14 - 120, wide ? 200 : 260, wide ? 200 : 260);
      x.textAlign = wide ? "left" : "center";
      const tx = wide ? 540 : W / 2;
      x.fillStyle = "#425A7C"; x.font = D(wide ? 34 : 44); x.fillText("🐾 Walkie.run", wide ? 540 : W / 2, wide ? 110 : story ? 120 : 70);
      x.fillStyle = rm.color; x.font = B(wide ? 28 : 36); x.fillText(`NEW ACHIEVEMENT · ${rm.label.toUpperCase()}`, tx, wide ? 190 : story ? 220 : 125);
      const ty = wide ? 260 : by + bs * 1.14 + (story ? 120 : 60);
      x.fillStyle = "#242B35"; x.font = D(wide ? 60 : story ? 92 : 70); x.fillText(badge.title, tx, ty);
      x.fillStyle = "#6B7685"; x.font = B(wide ? 28 : 38);
      const words = badge.description.split(" "); let line = "", ly = ty + (wide ? 56 : 72);
      for (const w of words) { const t = line ? `${line} ${w}` : w; if (x.measureText(t).width > (wide ? 560 : W - 180)) { x.fillText(line, tx, ly); line = w; ly += wide ? 38 : 50; } else line = t; }
      x.fillText(line, tx, ly);
      const meta = [showName ? userName : null, badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null, CATEGORY_LABEL[badge.category]].filter(Boolean).join(" · ");
      x.fillStyle = "#425A7C"; x.font = B(wide ? 26 : 34); x.fillText(meta, tx, ly + (wide ? 56 : 80));
      x.fillStyle = "#A9C5ED"; x.font = B(wide ? 22 : 28); x.fillText("Walk · Run · Bike · Collect · Build — walkie.run", wide ? 540 : W / 2, H - (wide ? 40 : 70));
      setPreview(c.toDataURL("image/png"));
    })().catch(() => toast("error", "Couldn't draw the share card"));
  }, [open, fmt, showName, badge, userName, toast]);
  const blob = () => new Promise<Blob>((r) => canvas.current!.toBlob((b) => r(b!), "image/png"));
  const name = `walkie-badge-${badge.key}.png`;
  const download = async () => { const u = URL.createObjectURL(await blob()); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); };
  return (
    <Sheet open={open} onClose={onClose} title="Share badge" wide>
      <div ref={art} className="hidden" aria-hidden><BadgeArt rarity={badge.rarity} art={badge.art} imageUrl={badge.imageUrl} size={400} /></div>
      <div ref={pup} className="hidden" aria-hidden><Walkie mood="celebrate" size={260} accessories={[{ key: "acc_medal", color: "#E2B64A" }]} /></div>
      <canvas ref={canvas} className="hidden" />
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="mx-auto w-[200px]">{preview ? <img src={preview} alt="Achievement card preview" className="w-full rounded-2xl shadow-lift" /> : <div className="aspect-[9/16] animate-shimmer rounded-2xl bg-walkie-gray/50" />}</div>
        <div>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-white p-1 shadow-card">{(["story", "square", "wide"] as Fmt[]).map((f) => <button key={f} onClick={() => setFmt(f)} className={`rounded-full py-2 text-[12px] font-extrabold ${fmt === f ? "bg-walkie-blue text-white" : "text-walkie-muted"}`}>{f === "story" ? "Story" : f === "square" ? "Square" : "Post"}</button>)}</div>
          <label className="mt-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card"><span className="flex-1 text-[14px] font-bold">Show my name</span><input type="checkbox" className="h-5 w-5 accent-walkie-blue" checked={showName} onChange={(e) => setShowName(e.target.checked)} /></label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="btn-primary px-2 text-[13px]" onClick={async () => { try { const f = new File([await blob()], name, { type: "image/png" }); if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: badge.title }); else { await download(); toast("info", "Downloaded — share it from your photos"); } } catch { /* cancelled */ } }}><Icon name="share" size={16} />Share</button>
            <button className="btn-soft px-2 text-[13px]" onClick={download}><Icon name="download" size={16} />Save</button>
            <button className="btn-soft px-2 text-[13px]" onClick={async () => { try { const r = await api<{ url: string }>(`/api/achievements/${badge.id}/share`, { method: "POST" }); await navigator.clipboard.writeText(r.url); toast("success", "Public link copied"); } catch (e: any) { toast("error", e.message); } }}><Icon name="link" size={16} />Link</button>
          </div>
          <p className="mt-2 text-[11px] text-walkie-muted">Cards and links show the badge, your first name (optional) and the date — never routes or health data.</p>
        </div>
      </div>
    </Sheet>
  );
}
