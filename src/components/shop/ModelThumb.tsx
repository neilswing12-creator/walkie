"use client";
/**
 * Premium 3D item icons for the market and inventory. Each icon is rendered from the *same* low-poly model the
 * isometric shop places (world.ts › buildModel), with the shop's lighting, from one shared offscreen WebGL renderer.
 * Results are cached per item, rendering is queued (one at a time) and only starts when the card scrolls into view.
 * Items that aren't placed in the shop (food, toys, boosts, floors, fences, places) get small dedicated models here.
 * Without WebGL the card keeps its colour swatch — nothing breaks.
 */
import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";

type Spec = { key: string; category: string; model?: string | null; color?: string | null; w?: number | null; d?: number | null };
type Rig = { T: typeof THREE_NS; renderer: THREE_NS.WebGLRenderer; scene: THREE_NS.Scene; camera: THREE_NS.OrthographicCamera; build: (m: string, c: string, w?: number, d?: number) => THREE_NS.Group };

const PX = 256;
const cache = new Map<string, string | null>();
let rigP: Promise<Rig | null> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function getRig() {
  rigP ??= (async () => {
    try {
      const T = await import("three");
      const { buildModel } = await import("./world");
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = PX;
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
      renderer.outputColorSpace = T.SRGBColorSpace; renderer.setSize(PX, PX, false); renderer.setClearColor(0x000000, 0);
      const scene = new T.Scene();
      const sun = new T.DirectionalLight("#ffffff", 1.35); sun.position.set(5, 11, 7);
      const rim = new T.DirectionalLight("#dfe9ff", 0.45); rim.position.set(-6, 4, -5);
      scene.add(new T.HemisphereLight("#ffffff", "#b9c4d3", 1.25), sun, rim);
      const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      return { T, renderer, scene, camera, build: buildModel };
    } catch { return null; }
  })();
  return rigP;
}

/** Thumbnail-only models for things the shop doesn't place. */
function extraModel(T: typeof THREE_NS, s: Spec): THREE_NS.Group | null {
  const g = new T.Group();
  const m = (geo: THREE_NS.BufferGeometry, color: string, x = 0, y = 0, z = 0, emissive = 0) => {
    const o = new T.Mesh(geo, new T.MeshLambertMaterial({ color, emissive: emissive ? new T.Color(color) : undefined, emissiveIntensity: emissive }));
    o.position.set(x, y, z); g.add(o); return o;
  };
  const sph = (r: number) => new T.SphereGeometry(r, 20, 14), cyl = (a: number, b: number, h: number, n = 24) => new T.CylinderGeometry(a, b, h, n);
  const c = s.color ?? "#A9C5ED";
  switch (s.key) {
    case "food_kibble": m(cyl(0.5, 0.36, 0.3), "#6B8FD6", 0, 0.15); m(cyl(0.42, 0.42, 0.04), "#4E6FB8", 0, 0.3); for (let i = 0; i < 9; i++) m(sph(0.1), i % 2 ? "#C99A6B" : "#B98652", Math.cos(i) * 0.24, 0.36 + (i % 3) * 0.03, Math.sin(i * 1.7) * 0.22); return g;
    case "food_carrot": { const k = m(new T.ConeGeometry(0.17, 0.85, 16), "#F59A3C", 0, 0.45); k.rotation.z = Math.PI; k.rotation.x = 0.5; [-0.3, 0, 0.3].forEach((r) => { const l = m(new T.ConeGeometry(0.06, 0.35, 8), "#5DBE7E", Math.sin(r) * 0.12, 0.95, -0.18); l.rotation.z = r; l.rotation.x = 0.5; }); return g; }
    case "food_salmon": { const b = m(sph(0.32), "#F59A86", 0, 0.32); b.scale.set(1.6, 0.75, 0.7); const t = m(new T.ConeGeometry(0.22, 0.34, 3), "#E9806C", -0.62, 0.32); t.rotation.z = -Math.PI / 2; m(sph(0.05), "#26303C", 0.36, 0.38, 0.17); m(new T.BoxGeometry(0.5, 0.05, 0.5), "#FFFFFF", 0, 0.03).scale.set(2.2, 1, 1.2); return g; }
    case "food_cake": m(cyl(0.38, 0.3, 0.36), "#F2C38F", 0, 0.18); m(cyl(0.44, 0.42, 0.18), "#F9D9E5", 0, 0.44); m(sph(0.3), "#FBE6EE", 0, 0.56).scale.set(1.3, 0.6, 1.3); m(sph(0.09), "#E3485F", 0, 0.78); return g;
    case "toy_ball": m(sph(0.42), "#F28DAA", 0, 0.42); m(new T.TorusGeometry(0.42, 0.05, 8, 32), "#FFFFFF", 0, 0.42).rotation.y = 0.6; return g;
    case "toy_frisbee": { const f = m(cyl(0.55, 0.5, 0.08, 32), "#6FCAE0", 0, 0.25); f.rotation.x = 0.45; const r = m(new T.TorusGeometry(0.52, 0.05, 8, 32), "#4AAFCB", 0, 0.25); r.rotation.x = Math.PI / 2 + 0.45; return g; }
    case "toy_rope": { const r = m(new T.TorusGeometry(0.34, 0.1, 10, 28), "#E36D5D", 0, 0.45); r.rotation.x = 1.1; m(sph(0.15), "#F2C94C", 0.38, 0.2, 0.1); m(sph(0.15), "#F2C94C", -0.38, 0.2, 0.1); return g; }
    case "boost_freeze": m(new T.OctahedronGeometry(0.4), "#9BD2F5", 0, 0.55, 0, 0.25).scale.set(0.8, 1.2, 0.8); m(cyl(0.34, 0.4, 0.12), "#DCE6F2", 0, 0.06); return g;
  }
  if (s.category === "FLOOR") { for (let x = 0; x < 2; x++) for (let z = 0; z < 2; z++) m(new T.BoxGeometry(0.96, 0.14, 0.96), (x + z) % 2 ? c : new T.Color(c).multiplyScalar(0.92).getStyle(), x - 0.5, 0.07, z - 0.5); return g; }
  if (s.category === "WALL") {
    if (s.key.includes("hedge")) { m(new T.BoxGeometry(1.8, 0.55, 0.36), c, 0, 0.28); for (let i = 0; i < 5; i++) m(sph(0.2), c, -0.8 + i * 0.4, 0.58, 0); return g; }
    if (s.key.includes("brick")) { for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) m(new T.BoxGeometry(0.42, 0.18, 0.3), r % 2 ? c : new T.Color(c).multiplyScalar(0.9).getStyle(), -0.66 + i * 0.44 + (r % 2) * 0.22 - 0.11, 0.1 + r * 0.2, 0); return g; }
    for (let i = 0; i < 5; i++) { m(new T.BoxGeometry(0.16, 0.7, 0.06), c, -0.72 + i * 0.36, 0.35); m(new T.ConeGeometry(0.11, 0.12, 4), c, -0.72 + i * 0.36, 0.76).rotation.y = Math.PI / 4; }
    m(new T.BoxGeometry(1.7, 0.08, 0.05), "#E4E9F0", 0, 0.22, -0.05); m(new T.BoxGeometry(1.7, 0.08, 0.05), "#E4E9F0", 0, 0.5, -0.05); return g;
  }
  if (s.category === "ENVIRONMENT") {
    m(cyl(0.95, 0.85, 0.26, 28), new T.Color(c).multiplyScalar(0.82).getStyle(), 0, 0.0); m(cyl(0.95, 0.95, 0.08, 28), c, 0, 0.16);
    if (s.key.includes("beach")) { m(cyl(0.04, 0.06, 0.8), "#B98652", 0.3, 0.6); for (let i = 0; i < 5; i++) { const l = m(new T.ConeGeometry(0.1, 0.55, 4), "#5DBE7E", 0.3, 1.0, 0); l.rotation.z = Math.PI / 2.3; l.rotation.y = (i / 5) * Math.PI * 2; } m(cyl(0.5, 0.5, 0.04, 24), "#8FD3E8", -0.35, 0.21, 0.3); }
    else if (s.key.includes("winter")) { m(new T.ConeGeometry(0.3, 0.6, 10), "#4FA27A", 0.35, 0.5); m(new T.ConeGeometry(0.22, 0.4, 10), "#FFFFFF", 0.35, 0.78); m(sph(0.2), "#FFFFFF", -0.3, 0.36, 0.2); m(sph(0.14), "#FFFFFF", -0.3, 0.6, 0.2); }
    else { [["#F28DAA", -0.4, 0.2], ["#FBEFC0", 0.1, 0.45], ["#C7B8F5", 0.45, -0.1], ["#F28DAA", -0.1, -0.4]].forEach(([fc, x, z]) => { m(cyl(0.02, 0.02, 0.25, 6), "#5DBE7E", x as number, 0.32, z as number); m(sph(0.1), fc as string, x as number, 0.48, z as number); }); m(sph(0.3), "#7CC49A", 0.35, 0.42, 0.35); }
    return g;
  }
  return null;
}

async function render(s: Spec): Promise<string | null> {
  const rig = await getRig();
  if (!rig) return null;
  const { T, renderer, scene, camera } = rig;
  const obj = s.model ? rig.build(s.model, s.color ?? "#A9C5ED", s.w ?? 1, s.d ?? 1) : extraModel(T, s);
  if (!obj) return null;
  scene.add(obj);
  // isometric view, framed tightly on the model's projected bounds
  const box = new T.Box3().setFromObject(obj), centre = box.getCenter(new T.Vector3());
  const dir = new T.Vector3(1, 0.82, 1).normalize();
  camera.position.copy(centre).addScaledVector(dir, 20); camera.up.set(0, 1, 0); camera.lookAt(centre); camera.updateMatrixWorld();
  const inv = camera.matrixWorldInverse; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const v = new T.Vector3(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
  }
  const half = Math.max(x1 - x0, y1 - y0) / 2 * 1.1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  Object.assign(camera, { left: cx - half, right: cx + half, top: cy + half, bottom: cy - half }); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(obj);
  obj.traverse((o) => { const mm = o as THREE_NS.Mesh; if (mm.isMesh && !s.model) { mm.geometry.dispose(); (mm.material as THREE_NS.Material).dispose(); } });
  return url;
}

export function thumbKey(s: Spec) { return `${s.key}|${s.model ?? ""}|${s.color ?? ""}`; }

/** Renders (once, cached) and shows a 3D icon; `fallback` is shown until it's ready or if WebGL isn't available. */
export function ModelThumb({ spec, size = 64, fallback, className = "" }: { spec: Spec; size?: number; fallback?: React.ReactNode; className?: string }) {
  const k = thumbKey(spec);
  const [url, setUrl] = useState<string | null | undefined>(() => cache.get(k));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cache.has(k)) { setUrl(cache.get(k)); return; }
    let alive = true;
    const go = () => { queue = queue.then(async () => { if (!cache.has(k)) cache.set(k, await render(spec).catch(() => null)); if (alive) setUrl(cache.get(k)); }); };
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { go(); return () => { alive = false; }; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "120px" });
    io.observe(el);
    return () => { alive = false; io.disconnect(); };
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref} className={`grid place-items-center ${className}`} style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" width={size} height={size} className="h-full w-full object-contain drop-shadow-[0_6px_8px_rgba(27,37,56,.22)]" draggable={false} /> : fallback}
    </div>
  );
}
