// Copies browser-side worker files that must be served from our own origin (CSP: worker-src 'self').
import { copyFileSync, mkdirSync } from "node:fs";
const out = new URL("../public/vendor/maplibre/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(new URL(`../node_modules/maplibre-gl/dist/${f}`, import.meta.url), new URL(f, out));
console.log("vendor: maplibre worker copied");
