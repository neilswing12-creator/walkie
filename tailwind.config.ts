import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        walkie: {
          blue: "#6B8FD6",
          slate: "#425A7C",
          soft: "#A9C5ED",
          pale: "#EAF2FC",
          gray: "#D9E0E8",
          light: "#F4F6F8",
          white: "#FAFAF7",
          ink: "#242B35",
          muted: "#6B7685",
        },
        rarity: {
          common: "#9AA5B4",
          uncommon: "#5DBE9A",
          rare: "#6B8FD6",
          epic: "#A08BE0",
          legendary: "#E2B64A",
          mythical: "#E98BB5",
        },
        mint: "#BFEBD8",
        lavender: "#DCD3F7",
        butter: "#FBEFC0",
        blush: "#F9D9E5",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-rounded", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "28px", xl2: "20px" },
      boxShadow: {
        card: "0 1px 2px rgba(36,43,53,.04), 0 8px 24px -12px rgba(66,90,124,.18)",
        lift: "0 2px 4px rgba(36,43,53,.05), 0 16px 40px -16px rgba(66,90,124,.30)",
        button: "0 6px 16px -6px rgba(107,143,214,.65)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(.85)", opacity: "0" }, "60%": { transform: "scale(1.04)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        drift: { from: { transform: "translateX(-10%)" }, to: { transform: "translateX(110%)" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .5s cubic-bezier(.2,.8,.2,1) both",
        floaty: "floaty 4s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
