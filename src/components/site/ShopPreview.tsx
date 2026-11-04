"use client";
import { useEffect, useRef, useState } from "react";
import { ShopCanvas } from "../shop/ShopCanvas";
import { ShopMini } from "../app/ShopMini";

/** Demo layout for the marketing page — clearly a preview, loads Three.js only when scrolled into view. */
const DEMO = [
  { id: "s", model: "shop", color: "#A9C5ED", x: 2, z: 1, rotation: 0, w: 3, d: 3 },
  { id: "c", model: "cafe", color: "#F9D9E5", x: 5, z: 5, rotation: 1, w: 3, d: 2 },
  { id: "f", model: "fountain", color: "#A9C5ED", x: 2, z: 5, rotation: 0, w: 2, d: 2 },
  { id: "t1", model: "tree_round", color: "#6DBB8A", x: 0, z: 0, rotation: 0, w: 1, d: 1 },
  { id: "t2", model: "tree_pine", color: "#4FA27A", x: 7, z: 0, rotation: 0, w: 1, d: 1 },
  { id: "t3", model: "tree_round", color: "#6DBB8A", x: 0, z: 7, rotation: 0, w: 1, d: 1 },
  { id: "b1", model: "bush", color: "#7CC49A", x: 6, z: 2, rotation: 0, w: 1, d: 1 },
  { id: "l1", model: "lamp", color: "#FBEFC0", x: 1, z: 4, rotation: 0, w: 1, d: 1 },
  { id: "p1", model: "flowerpot", color: "#F2A7C0", x: 5, z: 1, rotation: 0, w: 1, d: 1 },
  { id: "bn", model: "bench", color: "#C99A6B", x: 4, z: 4, rotation: 1, w: 1, d: 1 },
  { id: "dh", model: "doghouse", color: "#6B8FD6", x: 6, z: 3, rotation: 3, w: 2, d: 2 },
];
const PETS = [{ id: "1", species: "husky" }, { id: "2", species: "corgi" }, { id: "3", species: "cat" }, { id: "4", species: "duck" }];

export function ShopPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [night, setNight] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin: "200px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative aspect-square w-full overflow-hidden rounded-[40px] bg-white shadow-lift">
      {show ? <ShopCanvas size={8} environment="garden" floorKey="floor_grass" wallKey="wall_hedge" placements={DEMO} pets={PETS} ghost={null} selectedId={null} night={night} /> : <div className="grid h-full place-items-center"><ShopMini size={320} /></div>}
      <button onClick={() => setNight((n) => !n)} className="absolute bottom-4 right-4 rounded-full bg-white/95 px-4 py-2 text-[13px] font-bold shadow-card">{night ? "☀️ Day" : "🌙 Night"}</button>
    </div>
  );
}
