/** Renders the app's real isometric shop (world.ts) with a showcase layout, transparent background. */
import { ShopWorld } from "../../src/components/shop/world";
const L = [
  { id: "s", model: "shop", color: "#A9C5ED", x: 2, z: 1, rotation: 0, w: 3, d: 3 },
  { id: "c", model: "cafe", color: "#F9D9E5", x: 5, z: 5, rotation: 1, w: 3, d: 2 },
  { id: "f", model: "fountain", color: "#A9C5ED", x: 2, z: 5, rotation: 0, w: 2, d: 2 },
  { id: "t1", model: "tree_round", color: "#6DBB8A", x: 0, z: 0, rotation: 0, w: 1, d: 1 },
  { id: "t2", model: "tree_pine", color: "#4FA27A", x: 7, z: 0, rotation: 0, w: 1, d: 1 },
  { id: "t3", model: "tree_round", color: "#6DBB8A", x: 0, z: 7, rotation: 0, w: 1, d: 1 },
  { id: "b1", model: "bush", color: "#7CC49A", x: 6, z: 2, rotation: 0, w: 1, d: 1 },
  { id: "l1", model: "lamp", color: "#FBEFC0", x: 1, z: 4, rotation: 0, w: 1, d: 1 },
  { id: "p1", model: "flowerpot", color: "#F2A7C0", x: 5, z: 1, rotation: 0, w: 1, d: 1 },
  { id: "p2", model: "flowerpot", color: "#C7B8F5", x: 0, z: 3, rotation: 0, w: 1, d: 1 },
  { id: "bn", model: "bench", color: "#C99A6B", x: 4, z: 4, rotation: 1, w: 1, d: 1 },
  { id: "bd", model: "petbed", color: "#A9C5ED", x: 5, z: 3, rotation: 0, w: 1, d: 1 },
  { id: "um", model: "umbrella", color: "#F7C66B", x: 7, z: 4, rotation: 0, w: 1, d: 1 },
  { id: "dh", model: "doghouse", color: "#6B8FD6", x: 0, z: 5, rotation: 0, w: 2, d: 2 },
];
const canvas = document.getElementById("c") as HTMLCanvasElement;
const w = new ShopWorld(canvas);
w.setLayout(8, "starter", "floor_grass", "wall_picket");
w.setPlacements(L as never);
w.setPets([]);
setTimeout(() => { (window as unknown as { __done: boolean }).__done = true; }, 2500);
