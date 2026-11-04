"use client";
/**
 * Route map using the provider the admin configured for this platform (Google, Apple MapKit JS or open tiles —
 * see lib/client/maps.ts). If no enabled provider can load, it falls back to the SVG route drawing — never a fake map.
 */
import { useEffect, useRef, useState } from "react";
import { RouteSvg } from "./RouteSvg";
import { mountRouteMap, type MapHandle } from "@/lib/client/maps";
import type { MapProvider } from "@/lib/maps/types";

export function RouteMap({ points, height = 260, only, onProvider }: { points: [number, number][]; height?: number; only?: MapProvider; onProvider?: (impl: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "map" | "svg">("loading");
  const key = points.length + ":" + (points[0]?.join(",") ?? "") + (only ?? "");
  useEffect(() => {
    let h: MapHandle | null = null, cancelled = false;
    setState("loading");
    (async () => {
      if (!ref.current || points.length < 2) { setState("svg"); return; }
      h = await mountRouteMap(ref.current, points, { only }).catch(() => null);
      if (cancelled) { h?.destroy(); return; }
      setState(h ? "map" : "svg"); onProvider?.(h?.impl ?? null);
    })();
    return () => { cancelled = true; h?.destroy(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={ref} className={`absolute inset-0 overflow-hidden rounded-3xl ${state === "map" ? "" : "invisible"}`} />
      {state !== "map" && <div className="absolute inset-0"><RouteSvg points={points} height={height} /></div>}
    </div>
  );
}
