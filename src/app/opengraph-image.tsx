import { ImageResponse } from "next/og";
export const alt = "Walkie — Every step is an adventure";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "linear-gradient(135deg,#EAF2FC,#FAFAF7)", padding: 80, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 40, color: "#6B8FD6", fontWeight: 800 }}>🐾 Walkie</div>
          <div style={{ fontSize: 84, color: "#242B35", fontWeight: 800, lineHeight: 1.05, marginTop: 20 }}>Every step is an adventure.</div>
          <div style={{ fontSize: 32, color: "#6B7685", marginTop: 24 }}>Walk, run, collect pets & build your cozy pet shop.</div>
        </div>
        <svg width="360" height="360" viewBox="0 0 64 64"><path d="M14 30 L17 10 L28 22Z M50 30 L47 10 L36 22Z" fill="#8592A6" /><ellipse cx="32" cy="34" rx="20" ry="17" fill="#8592A6" /><path d="M13 37c0-9 6-12 12-10 3 1 5 4 7 8 2-4 4-7 7-8 6-2 12 1 12 10 0 10-9 15-19 15S13 47 13 37z" fill="#fff" /><circle cx="25" cy="35" r="4" fill="#6FA3E8" /><circle cx="39" cy="35" r="4" fill="#6FA3E8" /><circle cx="25" cy="35.5" r="2.2" fill="#26303C" /><circle cx="39" cy="35.5" r="2.2" fill="#26303C" /><path d="M29 41c0-1.5 6-1.5 6 0 0 1.5-1.8 2.8-3 2.8s-3-1.3-3-2.8z" fill="#26303C" /></svg>
      </div>
    ),
    size,
  );
}
