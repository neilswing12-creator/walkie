"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Ghost, PetView, PlacementView, ShopWorld } from "./world";

export type ShopCanvasHandle = { rotate: (d: 1 | -1) => void; recenter: () => void; zoom: (f: number) => void };
type Props = {
  size: number; environment: string; floorKey: string; wallKey: string;
  placements: PlacementView[]; pets: PetView[]; ghost: Ghost; selectedId: string | null; night: boolean;
  onTap?: (hit: { x: number; z: number; placementId: string | null; pet: boolean }) => void;
  onHover?: (hit: { x: number; z: number }) => void;
  className?: string;
};

/** React wrapper: touch pan / pinch-zoom / wheel, tap picking, pauses rendering when hidden. */
export const ShopCanvas = forwardRef<ShopCanvasHandle, Props>(function ShopCanvas(p, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<ShopWorld | null>(null);
  const cb = useRef(p); cb.current = p;
  const ready = useRef(false);

  useImperativeHandle(ref, () => ({ rotate: (d) => world.current?.rotate(d), recenter: () => world.current?.recenter(), zoom: (f) => world.current?.zoomBy(f) }), []);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    import("./world").then(({ ShopWorld }) => {
      if (disposed || !canvas.current) return;
      let w: ShopWorld;
      try { w = new ShopWorld(canvas.current); } catch { canvas.current.parentElement?.setAttribute("data-webgl", "unsupported"); return; }
      world.current = w;
      const { size, environment, floorKey, wallKey, placements, pets, ghost, selectedId, night } = cb.current;
      w.setLayout(size, environment, floorKey, wallKey); w.setPlacements(placements); w.setPets(pets); w.setGhost(ghost); w.setSelected(selectedId); w.setNight(night);
      ready.current = true;
      const ro = new ResizeObserver(() => w.resize()); ro.observe(canvas.current.parentElement!);
      const io = new IntersectionObserver(([e]) => w.setRunning(e.isIntersecting && !document.hidden)); io.observe(canvas.current);
      const vis = () => w.setRunning(!document.hidden);
      document.addEventListener("visibilitychange", vis);

      // gestures
      const el = canvas.current;
      const pts = new Map<number, { x: number; y: number }>();
      let moved = 0, pinch0 = 0, downAt = 0;
      const down = (e: PointerEvent) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; downAt = Date.now(); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } };
      const move = (e: PointerEvent) => {
        const prev = pts.get(e.pointerId);
        if (!prev) { const h = w.pick(e.clientX, e.clientY); if (h) cb.current.onHover?.(h); return; }
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) w.zoomBy(d / pinch0); pinch0 = d; moved += 10; return; }
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y; moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 6) w.pan(dx, dy);
      };
      const up = (e: PointerEvent) => {
        const wasTap = pts.size === 1 && moved <= 6 && Date.now() - downAt < 500;
        pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0;
        if (wasTap) { const h = w.pick(e.clientX, e.clientY); if (h) cb.current.onTap?.(h); }
      };
      const wheel = (e: WheelEvent) => { e.preventDefault(); w.zoomBy(e.deltaY > 0 ? 0.9 : 1.1); };
      el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
      el.addEventListener("wheel", wheel, { passive: false });
      cleanup = () => { ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", vis); el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.removeEventListener("wheel", wheel); w.dispose(); world.current = null; };
    });
    return () => { disposed = true; cleanup(); };
  }, []);

  useEffect(() => { if (ready.current) world.current?.setLayout(p.size, p.environment, p.floorKey, p.wallKey); }, [p.size, p.environment, p.floorKey, p.wallKey]);
  useEffect(() => { if (ready.current) { world.current?.setPlacements(p.placements); world.current?.setSelected(p.selectedId); } }, [p.placements, p.selectedId]);
  useEffect(() => { if (ready.current) world.current?.setPets(p.pets); }, [p.pets]);
  useEffect(() => { if (ready.current) world.current?.setGhost(p.ghost); }, [p.ghost]);
  useEffect(() => { if (ready.current) world.current?.setNight(p.night); }, [p.night]);

  return (
    <div className={`absolute inset-0 touch-none select-none bg-[radial-gradient(ellipse_at_50%_35%,#fff_0%,var(--sky,#EAF2FC)_70%)] transition-colors ${p.night ? "!bg-[radial-gradient(ellipse_at_50%_35%,#3B4D72_0%,#1E2840_75%)]" : ""} ${p.className ?? ""}`}>
      <canvas ref={canvas} className="absolute inset-0 block h-full w-full" aria-label="Your isometric pet shop. Drag to pan, pinch to zoom." />
    </div>
  );
});
