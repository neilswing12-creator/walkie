/**
 * Walkie pet-shop world — a lightweight isometric Three.js scene.
 * Performance: procedural low-poly meshes with cached geometries/materials, instanced floor,
 * Lambert shading, DPR ≤ 2, ~30fps cap, render loop pauses when hidden/off-screen.
 */
import * as THREE from "three";

export type PlacementView = { id: string; model: string; color: string; x: number; z: number; rotation: number; w: number; d: number };
export type PetView = { id: string; species: string };
export type Ghost = { model: string; color: string; w: number; d: number; x: number; z: number; rotation: number; valid: boolean } | null;

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.Material>();
const geo = (k: string, f: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = f(); geoCache.set(k, g); } return g; };
const mat = (color: string, emissive = 0) => {
  const k = `${color}|${emissive}`;
  let m = matCache.get(k);
  if (!m) { m = new THREE.MeshLambertMaterial({ color, emissive: emissive ? new THREE.Color(color) : undefined, emissiveIntensity: emissive }); matCache.set(k, m); }
  return m;
};
const box = (w: number, h: number, d: number) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt: number, rb: number, h: number, s = 12) => geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const sph = (r: number, s = 12) => geo(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s - 4)));
const cone = (r: number, h: number, s = 8) => geo(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
function mesh(g: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0, emissive = 0) {
  const m = new THREE.Mesh(g, mat(color, emissive));
  m.position.set(x, y, z);
  m.castShadow = false;
  return m;
}

/** Builds a model centred on its footprint (w×d tiles, 1 tile = 1 unit). */
export function buildModel(model: string, color: string, w = 1, d = 1): THREE.Group {
  const g = new THREE.Group();
  const add = (...m: THREE.Object3D[]) => m.forEach((o) => g.add(o));
  switch (model) {
    case "bush": add(mesh(sph(0.34), color, 0, 0.3, 0), mesh(sph(0.24), color, 0.22, 0.24, 0.12), mesh(sph(0.22), color, -0.2, 0.22, -0.1)); break;
    case "tree_round": add(mesh(cyl(0.07, 0.09, 0.5), "#A57A4E", 0, 0.25, 0), mesh(sph(0.38), color, 0, 0.78, 0), mesh(sph(0.22), "#8FD0A6", -0.15, 0.92, 0.1)); break;
    case "tree_pine": add(mesh(cyl(0.07, 0.08, 0.3), "#A57A4E", 0, 0.15, 0), mesh(cone(0.4, 0.6), color, 0, 0.55, 0), mesh(cone(0.3, 0.5), color, 0, 0.85, 0), mesh(cone(0.18, 0.35), color, 0, 1.1, 0)); break;
    case "flowerpot": add(mesh(cyl(0.2, 0.15, 0.25), "#D7A07E", 0, 0.12, 0), mesh(sph(0.18), "#7CC49A", 0, 0.35, 0), mesh(sph(0.07), color, 0.08, 0.48, 0.05), mesh(sph(0.07), "#FBEFC0", -0.08, 0.46, -0.04), mesh(sph(0.06), color, 0, 0.5, -0.1)); break;
    case "lamp": add(mesh(cyl(0.04, 0.05, 1), "#425A7C", 0, 0.5, 0), mesh(sph(0.13), color, 0, 1.06, 0, 0.0), mesh(cyl(0.12, 0.14, 0.05), "#425A7C", 0, 0.03, 0)); g.userData.light = g.children[1]; break;
    case "fountain": add(mesh(cyl(0.8, 0.85, 0.25, 16), "#D9E0E8", 0, 0.12, 0), mesh(cyl(0.68, 0.68, 0.06, 16), color, 0, 0.26, 0), mesh(cyl(0.1, 0.12, 0.6), "#D9E0E8", 0, 0.5, 0), mesh(cyl(0.3, 0.25, 0.08, 12), "#D9E0E8", 0, 0.8, 0), mesh(sph(0.1), color, 0, 0.92, 0)); g.userData.spin = true; break;
    case "pond": add(mesh(cyl(0.85, 0.85, 0.06, 18), color, 0, 0.03, 0), mesh(cyl(0.16, 0.16, 0.02, 10), "#7CC49A", 0.3, 0.07, 0.2), mesh(cyl(0.12, 0.12, 0.02, 10), "#7CC49A", -0.35, 0.07, -0.15), mesh(sph(0.05), "#F2A7C0", 0.3, 0.1, 0.2)); break;
    case "sign": add(mesh(box(0.06, 0.6, 0.06), "#A57A4E", -0.25, 0.3, 0), mesh(box(0.06, 0.6, 0.06), "#A57A4E", 0.25, 0.3, 0), mesh(box(0.7, 0.32, 0.06), color, 0, 0.55, 0.02), mesh(box(0.5, 0.06, 0.07), "#FFFFFF", 0, 0.58, 0.03)); break;
    case "snowman": add(mesh(sph(0.3), "#FFFFFF", 0, 0.28, 0), mesh(sph(0.21), "#FFFFFF", 0, 0.68, 0), mesh(cone(0.04, 0.16), "#F29D52", 0, 0.7, 0.24), mesh(cyl(0.16, 0.18, 0.05), "#6B8FD6", 0, 0.86, 0)); g.children[2].rotation.x = Math.PI / 2; break;
    case "crystal": add(mesh(geo("oct", () => new THREE.OctahedronGeometry(0.32)), color, 0, 0.6, 0, 0.35), mesh(cyl(0.25, 0.3, 0.12, 8), "#D9E0E8", 0, 0.06, 0)); g.userData.spin = true; g.children[0].scale.y = 1.6; break;
    case "bench": add(mesh(box(0.8, 0.07, 0.3), color, 0, 0.3, 0), mesh(box(0.8, 0.25, 0.06), color, 0, 0.48, -0.13), mesh(box(0.06, 0.3, 0.26), "#425A7C", -0.34, 0.15, 0), mesh(box(0.06, 0.3, 0.26), "#425A7C", 0.34, 0.15, 0)); break;
    case "picnic": add(mesh(box(1.6, 0.07, 0.6), color, 0, 0.42, 0), mesh(box(1.6, 0.06, 0.22), color, 0, 0.24, 0.45), mesh(box(1.6, 0.06, 0.22), color, 0, 0.24, -0.45), mesh(box(0.08, 0.42, 0.08), "#A57A4E", -0.6, 0.21, 0), mesh(box(0.08, 0.42, 0.08), "#A57A4E", 0.6, 0.21, 0), mesh(box(0.3, 0.02, 0.3), "#F9D9E5", 0.2, 0.47, 0)); break;
    case "umbrella": add(mesh(cyl(0.03, 0.03, 1.1), "#FFFFFF", 0, 0.55, 0), mesh(cone(0.55, 0.3, 10), color, 0, 1.15, 0), mesh(cyl(0.25, 0.25, 0.05, 12), "#F9D9E5", 0.25, 0.03, 0.2)); break;
    case "petbed": add(mesh(cyl(0.4, 0.42, 0.14, 16), color, 0, 0.07, 0), mesh(cyl(0.3, 0.3, 0.06, 16), "#FFFFFF", 0, 0.13, 0)); break;
    case "tunnel": { const t = mesh(geo("tun", () => new THREE.CylinderGeometry(0.35, 0.35, 1.6, 14, 1, true)), color, 0, 0.35, 0); t.rotation.z = Math.PI / 2; (t.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide; add(t); break; }
    case "doghouse": add(mesh(box(1.3, 0.8, 1.2), color, 0, 0.4, 0), mesh(box(0.5, 0.55, 0.05), "#425A7C", 0, 0.3, 0.6)); { const roof = mesh(geo("roof13", () => { const s = new THREE.Shape(); s.moveTo(-0.8, 0); s.lineTo(0, 0.6); s.lineTo(0.8, 0); s.lineTo(-0.8, 0); return new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: false }); }), "#425A7C", 0, 0.8, -0.7); add(roof); } add(mesh(box(0.4, 0.12, 0.06), "#F2C94C", 0, 0.72, 0.62)); break;
    case "shop": {
      add(mesh(box(2.4, 1.3, 2.2), color, 0, 0.65, 0), mesh(box(2.6, 0.12, 2.4), "#FFFFFF", 0, 1.36, 0), mesh(box(0.7, 0.9, 0.06), "#425A7C", -0.4, 0.45, 1.11), mesh(box(0.8, 0.55, 0.06), "#EAF2FC", 0.6, 0.75, 1.11));
      for (let i = 0; i < 6; i++) add(mesh(box(0.4, 0.12, 0.5), i % 2 ? "#FFFFFF" : "#F28DAA", -1 + i * 0.4, 1.25, 1.3));
      const roof = mesh(geo("roofshop", () => { const s = new THREE.Shape(); s.moveTo(-1.3, 0); s.lineTo(0, 0.8); s.lineTo(1.3, 0); s.lineTo(-1.3, 0); return new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: false }); }), "#6B8FD6", 0, 1.42, -1.2); add(roof);
      add(mesh(box(0.9, 0.3, 0.08), "#FFFFFF", 0, 1.9, 1.15)); break;
    }
    case "cafe": add(mesh(box(2.6, 1.1, 1.6), color, 0, 0.55, 0), mesh(box(2.8, 0.1, 1.8), "#FFFFFF", 0, 1.15, 0), mesh(box(1.2, 0.5, 0.06), "#EAF2FC", -0.5, 0.65, 0.81), mesh(box(0.5, 0.8, 0.06), "#C99A6B", 0.8, 0.4, 0.81), mesh(cyl(0.3, 0.3, 0.3, 12), "#F2C94C", 0.6, 1.4, 0), mesh(sph(0.2), "#F28DAA", 0.6, 1.62, 0)); break;
    case "greenhouse": add(mesh(box(1.6, 0.1, 1.6), "#D9E0E8", 0, 0.05, 0), new THREE.Mesh(box(1.5, 0.9, 1.5), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.55 })), mesh(sph(0.25), "#6DBB8A", -0.35, 0.3, -0.3), mesh(sph(0.22), "#6DBB8A", 0.35, 0.28, 0.3), mesh(sph(0.08), "#F29D52", 0.3, 0.45, 0.32)); g.children[1].position.y = 0.55; break;
    case "cattower": add(mesh(cyl(0.38, 0.38, 0.1, 12), color, 0, 0.05, 0), mesh(cyl(0.08, 0.08, 1.1), "#E6CBA8", 0, 0.6, 0), mesh(cyl(0.3, 0.3, 0.08, 12), color, 0, 0.7, 0), mesh(cyl(0.28, 0.28, 0.1, 12), color, 0, 1.15, 0), mesh(sph(0.08), "#F28DAA", 0.25, 0.5, 0)); break;
    default: add(mesh(box(0.6, 0.6, 0.6), color, 0, 0.3, 0));
  }
  return g;
}

const PET_COLORS: Record<string, [string, string]> = {
  husky: ["#8592A6", "#FFFFFF"], corgi: ["#E9A65A", "#FFFFFF"], shiba: ["#E7A863", "#FFF3E2"], golden: ["#E2B46A", "#F2CF92"], cat: ["#B9A089", "#F4EBDD"],
  bunny: ["#F3ECE6", "#FFFFFF"], duck: ["#FCD96B", "#F29D52"], redpanda: ["#C8633A", "#FFFFFF"], capybara: ["#A87E5A", "#9A7150"], fox: ["#E07B3C", "#FFFFFF"],
  penguin: ["#2F3D52", "#FFFFFF"], hamster: ["#E9B988", "#FFF4E6"], otter: ["#8C6A52", "#D9C2A7"], raccoon: ["#8D96A3", "#3A414D"],
};
function buildPet(species: string) {
  const [a, b] = PET_COLORS[species] ?? PET_COLORS.husky;
  const g = new THREE.Group();
  const body = mesh(sph(0.22, 10), a, 0, 0.24, 0); body.scale.set(1, 0.85, 1.3);
  const belly = mesh(sph(0.16, 10), b, 0, 0.2, 0.08); belly.scale.set(1, 0.8, 1.2);
  const head = mesh(sph(0.2, 12), a, 0, 0.5, 0.22);
  const face = mesh(sph(0.13, 10), b, 0, 0.46, 0.34);
  const eyeL = mesh(sph(0.03, 6), "#26303C", -0.07, 0.53, 0.39); const eyeR = mesh(sph(0.03, 6), "#26303C", 0.07, 0.53, 0.39);
  g.add(body, belly, head, face, eyeL, eyeR);
  if (species === "bunny") { g.add(mesh(box(0.06, 0.28, 0.06), a, -0.08, 0.72, 0.18), mesh(box(0.06, 0.28, 0.06), a, 0.08, 0.72, 0.18)); }
  else if (species === "duck" || species === "penguin") { const beak = mesh(cone(0.05, 0.12, 6), "#F29D52", 0, 0.48, 0.44); beak.rotation.x = Math.PI / 2; g.add(beak); }
  else if (["husky", "corgi", "shiba", "cat", "fox", "raccoon", "redpanda"].includes(species)) { g.add(mesh(cone(0.07, 0.16, 4), a, -0.1, 0.7, 0.2), mesh(cone(0.07, 0.16, 4), a, 0.1, 0.7, 0.2)); }
  else { g.add(mesh(sph(0.05, 6), a, -0.12, 0.66, 0.2), mesh(sph(0.05, 6), a, 0.12, 0.66, 0.2)); }
  if (!["duck", "penguin", "hamster", "capybara", "bunny"].includes(species)) { const tail = mesh(sph(0.08, 6), species === "fox" ? "#FFFFFF" : a, 0, 0.34, -0.3); tail.scale.set(1, 1, 1.6); g.add(tail); g.userData.tail = tail; }
  return g;
}

const ENV: Record<string, { sky: string; ground: string; side: string }> = {
  starter: { sky: "#EAF2FC", ground: "#CFE8C4", side: "#B7A08A" },
  garden: { sky: "#EEF7EC", ground: "#CFE8C4", side: "#A88F78" },
  beach: { sky: "#E6F4FB", ground: "#F4E4BE", side: "#D8C08E" },
  winter: { sky: "#EEF3FA", ground: "#F3F7FC", side: "#B9C4D3" },
};
const FLOOR: Record<string, [string, string]> = { floor_grass: ["#CFE8C4", "#C3E0B7"], floor_wood: ["#E6CBA8", "#DDBF98"], floor_stone: ["#E3E8EE", "#D5DCE4"], floor_sand: ["#F4E4BE", "#EEDBAF"], floor_snow: ["#F6F9FD", "#EAF0F7"] };

export class ShopWorld {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  private root = new THREE.Group();
  private floor?: THREE.InstancedMesh;
  private base?: THREE.Mesh;
  private walls = new THREE.Group();
  private items = new Map<string, THREE.Group>();
  private pets: { obj: THREE.Group; target: THREE.Vector3; speed: number; pause: number }[] = [];
  private ghost?: THREE.Group;
  private selection?: THREE.Mesh;
  private hemi = new THREE.HemisphereLight("#ffffff", "#b9c4d3", 1.3);
  private sun = new THREE.DirectionalLight("#ffffff", 1.2);
  private size = 8;
  private angle = Math.PI / 4;
  private target = new THREE.Vector3();
  private raf = 0;
  private last = 0;
  private running = true;
  private clock = new THREE.Clock();
  night = false;
  occupied = new Set<string>();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 200);
    this.scene.add(this.root, this.hemi, this.sun);
    this.sun.position.set(6, 12, 4);
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  setLayout(size: number, env: string, floorKey: string, wallKey: string) {
    this.size = size;
    const e = ENV[env] ?? ENV.starter;
    const [f1, f2] = FLOOR[floorKey] ?? [e.ground, e.ground];
    this.scene.background = null;
    (this.canvas.parentElement as HTMLElement | null)?.style.setProperty("--sky", e.sky);
    if (this.floor) { this.root.remove(this.floor); this.floor.dispose(); }
    if (this.base) this.root.remove(this.base);
    const tileGeo = geo("tile", () => new THREE.BoxGeometry(0.98, 0.08, 0.98));
    const inst = new THREE.InstancedMesh(tileGeo, new THREE.MeshLambertMaterial({ color: "#ffffff" }), size * size);
    const m = new THREE.Matrix4(); const c1 = new THREE.Color(f1); const c2 = new THREE.Color(f2);
    let i = 0;
    for (let x = 0; x < size; x++) for (let z = 0; z < size; z++) { m.setPosition(x + 0.5, -0.04, z + 0.5); inst.setMatrixAt(i, m); inst.setColorAt(i, (x + z) % 2 ? c1 : c2); i++; }
    inst.instanceColor!.needsUpdate = true;
    this.floor = inst; this.root.add(inst);
    this.base = mesh(geo(`base${size}`, () => new THREE.BoxGeometry(size + 0.3, 0.5, size + 0.3)), e.side, size / 2, -0.33, size / 2);
    this.root.add(this.base);
    this.buildWalls(wallKey);
    this.target.set(size / 2, 0, size / 2);
    this.frame();
  }

  private buildWalls(key: string) {
    this.root.remove(this.walls); this.walls = new THREE.Group();
    const s = this.size;
    const seg = (x: number, z: number, rot: boolean) => {
      if (key === "wall_hedge") { const h = mesh(box(1, 0.35, 0.22), "#8CCB9E", x, 0.17, z); if (rot) h.rotation.y = Math.PI / 2; this.walls.add(h); }
      else if (key === "wall_brick") { const h = mesh(box(1, 0.3, 0.18), "#E3A58C", x, 0.15, z); if (rot) h.rotation.y = Math.PI / 2; this.walls.add(h); }
      else { const rail = mesh(box(1, 0.05, 0.05), "#FFFFFF", x, 0.22, z); if (rot) rail.rotation.y = Math.PI / 2; this.walls.add(rail, mesh(box(0.07, 0.34, 0.07), "#FFFFFF", x, 0.17, z)); }
    };
    for (let i = 0; i < s; i++) { seg(i + 0.5, -0.05, false); seg(-0.05, i + 0.5, true); }
    this.root.add(this.walls);
  }

  setPlacements(list: PlacementView[]) {
    const keep = new Set(list.map((p) => p.id));
    for (const [id, obj] of this.items) if (!keep.has(id)) { this.root.remove(obj); this.items.delete(id); }
    this.occupied.clear();
    for (const p of list) {
      let obj = this.items.get(p.id);
      if (!obj || obj.userData.model !== p.model) {
        if (obj) this.root.remove(obj);
        obj = buildModel(p.model, p.color, p.w, p.d); obj.userData.model = p.model; obj.userData.id = p.id;
        this.items.set(p.id, obj); this.root.add(obj);
      }
      const fw = p.rotation % 2 ? p.d : p.w, fd = p.rotation % 2 ? p.w : p.d;
      obj.position.set(p.x + fw / 2, 0, p.z + fd / 2);
      obj.rotation.y = -p.rotation * (Math.PI / 2);
      for (let i = 0; i < fw; i++) for (let j = 0; j < fd; j++) this.occupied.add(`${p.x + i},${p.z + j}`);
    }
    this.applyNight();
  }

  setPets(pets: PetView[]) {
    for (const p of this.pets) this.root.remove(p.obj);
    this.pets = pets.slice(0, 12).map((p) => {
      const obj = buildPet(p.species); obj.scale.setScalar(1.35);
      const start = this.randomFree(); obj.position.copy(start);
      this.root.add(obj);
      return { obj, target: this.randomFree(), speed: 0.5 + Math.random() * 0.4, pause: Math.random() * 2 };
    });
  }

  private randomFree() {
    for (let i = 0; i < 30; i++) { const x = Math.floor(Math.random() * this.size), z = Math.floor(Math.random() * this.size); if (!this.occupied.has(`${x},${z}`)) return new THREE.Vector3(x + 0.5, 0, z + 0.5); }
    return new THREE.Vector3(this.size / 2, 0, this.size / 2);
  }

  setGhost(g: Ghost) {
    if (this.ghost) { this.root.remove(this.ghost); this.ghost = undefined; }
    if (!g) return;
    const model = buildModel(g.model, g.color, g.w, g.d);
    model.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = new THREE.MeshLambertMaterial({ color: ((o as THREE.Mesh).material as THREE.MeshLambertMaterial).color, transparent: true, opacity: 0.7 }); });
    const fw = g.rotation % 2 ? g.d : g.w, fd = g.rotation % 2 ? g.w : g.d;
    const pad = mesh(box(fw - 0.06, 0.02, fd - 0.06), g.valid ? "#6B8FD6" : "#F07C8E", 0, 0.02, 0);
    pad.material = new THREE.MeshLambertMaterial({ color: g.valid ? "#6B8FD6" : "#F07C8E", transparent: true, opacity: 0.45 });
    const grp = new THREE.Group(); model.rotation.y = -g.rotation * (Math.PI / 2); grp.add(pad, model);
    grp.position.set(g.x + fw / 2, 0.02, g.z + fd / 2);
    this.ghost = grp; this.root.add(grp);
  }

  setSelected(id: string | null) {
    if (this.selection) { this.root.remove(this.selection); this.selection = undefined; }
    const obj = id ? this.items.get(id) : undefined;
    if (!obj) return;
    const b = new THREE.Box3().setFromObject(obj); const s = b.getSize(new THREE.Vector3());
    const ring = new THREE.Mesh(geo(`sel${s.x.toFixed(1)}${s.z.toFixed(1)}`, () => new THREE.BoxGeometry(Math.max(0.9, s.x + 0.1), 0.03, Math.max(0.9, s.z + 0.1))), new THREE.MeshBasicMaterial({ color: "#6B8FD6", transparent: true, opacity: 0.5 }));
    ring.position.set(obj.position.x, 0.02, obj.position.z);
    this.selection = ring; this.root.add(ring);
  }

  setNight(n: boolean) { this.night = n; this.applyNight(); }
  private applyNight() {
    this.hemi.intensity = this.night ? 0.55 : 1.3;
    this.hemi.color.set(this.night ? "#9fb3e6" : "#ffffff");
    this.sun.intensity = this.night ? 0.25 : 1.2;
    for (const obj of this.items.values()) {
      const light = obj.userData.light as THREE.Mesh | undefined;
      if (light) light.material = mat("#FBEFC0", this.night ? 1.2 : 0);
    }
  }

  rotate(dir: 1 | -1) { this.angle += (dir * Math.PI) / 2; this.frame(); }
  pan(dxPx: number, dyPx: number) {
    const rect = this.canvas.getBoundingClientRect();
    const worldPerPx = (this.camera.right - this.camera.left) / this.camera.zoom / rect.width;
    const right = new THREE.Vector3(Math.cos(this.angle), 0, -Math.sin(this.angle));
    const fwd = new THREE.Vector3(-Math.sin(this.angle), 0, -Math.cos(this.angle));
    this.target.addScaledVector(right, -dxPx * worldPerPx).addScaledVector(fwd, -dyPx * worldPerPx * 1.6);
    this.target.x = Math.max(-1, Math.min(this.size + 1, this.target.x)); this.target.z = Math.max(-1, Math.min(this.size + 1, this.target.z));
    this.frame();
  }
  zoomBy(f: number) { this.camera.zoom = Math.max(0.6, Math.min(3, this.camera.zoom * f)); this.camera.updateProjectionMatrix(); }
  recenter() { this.target.set(this.size / 2, 0, this.size / 2); this.camera.zoom = 1; this.camera.updateProjectionMatrix(); this.frame(); }

  private frame() {
    const d = 30;
    this.camera.position.set(this.target.x + Math.sin(this.angle) * d, d * 0.95, this.target.z + Math.cos(this.angle) * d);
    this.camera.lookAt(this.target);
  }

  resize() {
    const p = this.canvas.parentElement!;
    const w = p.clientWidth, h = p.clientHeight;
    this.renderer.setSize(w, h, false);
    const view = this.size * 1.3 + 1; // fits the full diamond across a portrait phone
    const aspect = w / Math.max(1, h);
    this.camera.left = -view * aspect / 2 * (aspect < 1 ? 1 : 1); this.camera.right = view * aspect / 2;
    this.camera.top = view / 2; this.camera.bottom = -view / 2;
    if (aspect < 1) { this.camera.left = -view / 2; this.camera.right = view / 2; this.camera.top = view / aspect / 2; this.camera.bottom = -view / aspect / 2; }
    this.camera.updateProjectionMatrix();
    this.frame();
  }

  /** Screen point → tile + any placement hit. */
  pick(clientX: number, clientY: number): { x: number; z: number; placementId: string | null; pet: boolean } | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const objs = [...this.items.values()];
    const hit = ray.intersectObjects(objs, true)[0];
    let placementId: string | null = null;
    if (hit) { let o: THREE.Object3D | null = hit.object; while (o && !o.userData.id) o = o.parent; placementId = (o?.userData.id as string) ?? null; }
    const petHit = ray.intersectObjects(this.pets.map((p) => p.obj), true).length > 0;
    const pt = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pt)) return null;
    const x = Math.floor(pt.x), z = Math.floor(pt.z);
    return { x, z, placementId, pet: petHit };
  }

  setRunning(r: boolean) { this.running = r; if (r) { this.clock.getDelta(); this.raf = requestAnimationFrame(this.loop); } }

  private loop(t: number) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    if (t - this.last < 33) return; // ~30fps cap to save battery
    this.last = t;
    const dt = Math.min(0.1, this.clock.getDelta());
    const time = this.clock.elapsedTime;
    for (const p of this.pets) {
      if (p.pause > 0) { p.pause -= dt; p.obj.position.y = Math.abs(Math.sin(time * 2)) * 0.02; continue; }
      const dir = p.target.clone().sub(p.obj.position); dir.y = 0;
      const dist = dir.length();
      if (dist < 0.05) { p.target = this.randomFree(); p.pause = 1 + Math.random() * 3; continue; }
      dir.normalize();
      p.obj.position.addScaledVector(dir, Math.min(dist, p.speed * dt));
      p.obj.position.y = Math.abs(Math.sin(time * 10)) * 0.06;
      p.obj.rotation.y = Math.atan2(dir.x, dir.z);
      const tail = p.obj.userData.tail as THREE.Mesh | undefined; if (tail) tail.rotation.y = Math.sin(time * 14) * 0.6;
    }
    for (const obj of this.items.values()) if (obj.userData.spin) obj.children[obj.children.length - 1].rotation.y = time;
    if (this.ghost) this.ghost.position.y = 0.04 + Math.sin(time * 4) * 0.02;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false; cancelAnimationFrame(this.raf);
    this.root.traverse((o) => { const m = o as THREE.Mesh; if ((m as any).isInstancedMesh) (m as unknown as THREE.InstancedMesh).dispose(); });
    this.renderer.dispose();
  }
}
