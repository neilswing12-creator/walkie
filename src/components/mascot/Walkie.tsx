/**
 * Walkie — the original Siberian husky mascot. Pure SVG + CSS animation (see globals.css "wk-*"),
 * so it's tiny, crisp at any size, and respects prefers-reduced-motion.
 */
import type { CSSProperties } from "react";
import { WearLayer, type AccessoryProp } from "./Accessories";
import { Biped, FIGURE, HEAD_LIFT, TorsoWear } from "./Biped";
import { FURS, LOOKS, slotOf, type FurKey, type LookKey } from "@/lib/wardrobe";

export const MOODS = [
  "idle", "wag", "sit", "sleep", "walk", "run", "bike", "jump", "celebrate", "happy", "sad",
  "eat", "drink", "play", "reward", "levelup", "discover", "greet", "interact",
] as const;
export type Mood = (typeof MOODS)[number];

const WHITE = "#FFFFFF";
const INK = "#26303C";
const PINK = "#F5B9CB";

export type Expression = "ooh" | "squint" | "blink" | "wide" | "yawn" | "smile" | null;
export type WalkieProps = {
  mood?: Mood; size?: number; className?: string; accessories?: AccessoryProp[]; title?: string; style?: CSSProperties;
  /** Presentation style — same husky, subtle styling differences only. */
  look?: LookKey | string | null; fur?: FurKey | string | null;
  /** Transient overrides driven by LivingWalkie (idle behaviours, reactions). */
  expr?: Expression; act?: string | null; gaze?: { x: number; y: number } | null;
};

export function Walkie({ mood = "idle", size = 160, className = "", accessories = [], title = "Walkie the husky", style, look, fur, expr = null, act = null, gaze = null }: WalkieProps) {
  const pal = FURS[(fur as FurKey) ?? "classic"] ?? FURS.classic;
  const FUR = pal.fur, FUR_LIGHT = pal.light, FUR_DARK = pal.dark;
  const lk = (look as LookKey) in LOOKS ? (look as LookKey) : "classic";
  const items = mood === "bike" && !accessories.some((a) => slotOf(a.key) === "HEAD") ? [...accessories, { key: "acc_helmet", color: "#6B8FD6" }] : accessories;
  const eyes = expr === "blink" || expr === "yawn" || mood === "sleep" ? "closed"
    : expr === "squint" || (!expr && ["happy", "celebrate", "interact", "levelup"].includes(mood)) ? "happy" : "open";
  const mouth = expr === "ooh" ? "ooh" : expr === "yawn" ? "yawn" : expr === "smile" ? "smile"
    : ["happy", "celebrate", "run", "bike", "play", "greet", "levelup", "reward", "jump", "interact", "drink"].includes(mood) ? "open" : mood === "sad" ? "sad" : "smile";
  const tired = mood === "sad";
  const vars = { ...(style ?? {}), ...(gaze ? { ["--lx" as string]: `${gaze.x.toFixed(2)}px`, ["--ly" as string]: `${gaze.y.toFixed(2)}px` } : {}) } as CSSProperties;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`wk select-none ${className}`} data-mood={mood} data-act={act ?? undefined} data-expr={expr ?? undefined} role="img" aria-label={title} style={vars}>
      <title>{title}</title>
      <ellipse cx="100" cy="188" rx="62" ry="9" fill="url(#wkg-ground) rgba(66,90,124,.12)" className="wk-ground" />

      {/* speed lines (run) */}
      <g className="wk-fx wk-fx-speed" stroke="#A9C5ED" strokeWidth="4" strokeLinecap="round" style={{ opacity: mood === "run" ? undefined : 0 }}>
        <line x1="10" y1="120" x2="34" y2="120" />
        <line x1="4" y1="140" x2="30" y2="140" />
        <line x1="14" y1="160" x2="36" y2="160" />
      </g>

      {mood === "bike" && <Bike />}
      <g transform={FIGURE}><g className="wk-all" style={mood === "bike" ? { transform: "translateY(-16px)" } : undefined}>
        <WearLayer items={items} layer="behind" />
        {/* tail */}
        <g className="wk-tail" style={{ transformOrigin: "138px 158px" }}>
          <path d="M134 160 C158 160 182 142 178 112 C176 97 163 90 155 98 C163 114 156 133 132 142 Z" fill={FUR} />
          <path d="M134 160 C158 160 182 142 178 112 C176 97 163 90 155 98 C163 114 156 133 132 142 Z" fill="url(#wkg-fur)" />
          <path d="M178 112 C176 97 163 90 155 98 C159 105 163 111 165 118 C171 118 176 116 178 112 Z" fill={WHITE} />
          <path d="M150 150 C160 144 167 134 168 124" stroke={FUR_DARK} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".35" />
          <path d="M160 102 C166 106 170 112 171 118" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".5" />
        </g>

        <Biped items={items} p={{
          fur: FUR, furLight: FUR_LIGHT, belly: WHITE, leg: WHITE, arm: FUR, hand: WHITE, texture: true, toes: "#D9E0E8",
          chest: <path d="M86 140 l4 6 l3 -5 l4 6 l3 -6 l4 6 l3 -5 l4 5" stroke="#E4E9F0" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />,
        }} />
        <TorsoWear items={items} layer="front" />
        <TorsoWear items={items} layer="neck" />

        {/* head */}
        <g transform={HEAD_LIFT}>
        <g className="wk-head" style={{ transformOrigin: "100px 120px" }}>
          <g className="wk-ear-l" style={{ transformOrigin: "80px 62px" }}>
            <path d="M54 76 C52 56 58 38 66 28 C76 36 88 48 94 60 Z" fill={FUR} stroke={FUR} strokeWidth="6" strokeLinejoin="round" />
            <path d="M64 66 C63 54 66 44 70 38 C76 44 82 52 85 60 Z" fill={PINK} />
            <path d="M66 64 C66 56 68 49 70 44" stroke="#E79AB0" strokeWidth="2" fill="none" opacity=".7" strokeLinecap="round" />
            <path d="M57 70 C56 56 60 44 65 34" stroke={FUR_LIGHT} strokeWidth="2.4" fill="none" opacity=".55" strokeLinecap="round" />
          </g>
          <g className="wk-ear-r" style={{ transformOrigin: "120px 62px" }}>
            <path d="M146 76 C148 56 142 38 134 28 C124 36 112 48 106 60 Z" fill={FUR} stroke={FUR} strokeWidth="6" strokeLinejoin="round" />
            <path d="M136 66 C137 54 134 44 130 38 C124 44 118 52 115 60 Z" fill={PINK} />
            <path d="M134 64 C134 56 132 49 130 44" stroke="#E79AB0" strokeWidth="2" fill="none" opacity=".7" strokeLinecap="round" />
          </g>
          {/* head shape — slightly oversized for cuteness */}
          <ellipse cx="100" cy="90" rx="54" ry="46" fill={FUR} />
          <ellipse cx="100" cy="90" rx="54" ry="46" fill="url(#wkg-fur)" />
          <ellipse cx="100" cy="90" rx="54" ry="46" fill="url(#wkg-hl)" />
          {/* head-top tufts */}
          <path d="M92 46 l3 -6 l3 5 l3 -6 l3 6" stroke={FUR} strokeWidth="5" fill={FUR} strokeLinejoin="round" />
          <ellipse cx="86" cy="62" rx="22" ry="10" fill={FUR_LIGHT} opacity=".45" />
          {/* classic husky mask with widow's peak */}
          <path d="M48 96 C47 72 62 63 78 67 C88 70 95 78 100 89 C105 78 112 70 122 67 C138 63 153 72 152 96 C151 123 128 136 100 136 C72 136 49 123 48 96 Z" fill={WHITE} />
          <path d="M48 96 C47 72 62 63 78 67 C88 70 95 78 100 89 C105 78 112 70 122 67 C138 63 153 72 152 96 C151 123 128 136 100 136 C72 136 49 123 48 96 Z" fill="url(#wkg-shade)" opacity=".55" />
          {/* eyebrow spots */}
          {lk === "sporty"
            ? <><ellipse cx="78" cy="65" rx="7.5" ry="4.2" fill={WHITE} transform="rotate(-10 78 65)" /><ellipse cx="122" cy="65" rx="7.5" ry="4.2" fill={WHITE} transform="rotate(10 122 65)" /></>
            : <><ellipse cx="79" cy="66" rx="6" ry="4" fill={WHITE} /><ellipse cx="121" cy="66" rx="6" ry="4" fill={WHITE} /></>}
          {/* cheek fluff */}
          <path d="M48 104 l-8 6 l10 2 l-6 7 l12 -2" fill={WHITE} />
          <path d="M152 104 l8 6 l-10 2 l6 7 l-12 -2" fill={WHITE} />
          {lk === "sporty" && <><path d="M50 112 l-9 9 l12 -1" fill={WHITE} /><path d="M150 112 l9 9 l-12 -1" fill={WHITE} /></>}

          {/* eyes */}
          {eyes === "closed" ? (
            <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none">
              <path d="M71 93 Q79 99 87 93" />
              <path d="M113 93 Q121 99 129 93" />
            </g>
          ) : eyes === "happy" ? (
            <g stroke={INK} strokeWidth="3.6" strokeLinecap="round" fill="none">
              <path d="M71 95 Q79 85 87 95" />
              <path d="M113 95 Q121 85 129 95" />
            </g>
          ) : (
            <g className="wk-eyes" style={{ transformOrigin: "100px 92px" }}>
              {[79, 121].map((cx) => (
                <g key={cx} className={expr === "wide" ? "wk-eye-wide" : undefined} style={{ transformOrigin: `${cx}px 92px` }}>
                  <circle cx={cx} cy="92" r="10.5" fill="url(#wkg-iris) #6FA3E8" />
                  <circle cx={cx} cy="92" r="10.5" fill="none" stroke="#2F5CA8" strokeOpacity=".45" strokeWidth="1.2" />
                  <g className="wk-look">
                    <circle cx={cx} cy="93" r="6" fill={INK} />
                    <circle cx={cx + 3.2} cy="88.5" r="3" fill={WHITE} />
                    <circle cx={cx - 3} cy="96" r="1.4" fill={WHITE} opacity=".8" />
                  </g>
                  {tired && <path d={`M${cx - 12} 86 Q${cx} 80 ${cx + 12} 86 L${cx + 12} 82 L${cx - 12} 82 Z`} fill={FUR} />}
                </g>
              ))}
            </g>
          )}
          {lk === "sunny" && eyes !== "closed" && (
            <g stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none">
              <path d="M69 86 l-5 -3.5 M71.5 83 l-3 -4.5" /><path d="M131 86 l5 -3.5 M128.5 83 l3 -4.5" />
            </g>
          )}
          {/* blush */}
          <ellipse cx="66" cy="110" rx="8" ry="5" fill={PINK} opacity={lk === "sunny" ? 0.9 : 0.7} />
          <ellipse cx="134" cy="110" rx="8" ry="5" fill={PINK} opacity={lk === "sunny" ? 0.9 : 0.7} />
          {/* muzzle */}
          <ellipse cx="100" cy="112" rx="18" ry="13" fill="#F4F6F8" />
          <path d="M92.5 103 C92.5 99.5 107.5 99.5 107.5 103 C107.5 107 103 110 100 110 C97 110 92.5 107 92.5 103 Z" fill={INK} />
          <ellipse cx="97" cy="102.5" rx="2.4" ry="1.3" fill={WHITE} opacity=".7" />
          {mouth === "open" ? (
            <g>
              <path d="M91 114 Q100 130 109 114 Q100 118 91 114 Z" fill="#5B3442" />
              <ellipse cx="100" cy="122" rx="5" ry="4" fill="#F28DAA" />
            </g>
          ) : mouth === "ooh" ? (
            <g><ellipse cx="100" cy="118" rx="4.6" ry="5.4" fill="#5B3442" /><ellipse cx="100" cy="120.5" rx="2.6" ry="2" fill="#F28DAA" /></g>
          ) : mouth === "yawn" ? (
            <g><ellipse cx="100" cy="120" rx="8" ry="9" fill="#5B3442" /><ellipse cx="100" cy="125" rx="5" ry="3.6" fill="#F28DAA" /></g>
          ) : mouth === "sad" ? (
            <path d="M93 118 Q100 114 107 118" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M91 113 Q95.5 118.5 100 113.5 Q104.5 118.5 109 113" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
          <WearLayer items={items} layer="face" />
          <WearLayer items={items} layer="head" />
        </g>
        </g>
      </g></g>
      {mood === "bike" && <BikeFront />}

      {/* ── effects ── */}
      {mood === "sleep" && (
        <g fill="#6B8FD6" fontFamily="var(--font-display)" fontWeight="700">
          <text className="wk-fx wk-fx-z" x="150" y="54" fontSize="18">z</text>
          <text className="wk-fx wk-fx-z" x="160" y="40" fontSize="14">z</text>
          <text className="wk-fx wk-fx-z" x="144" y="30" fontSize="11">z</text>
        </g>
      )}
      {(mood === "interact" || mood === "happy") && (
        <g fill="#F28DAA">
          {[[150, 50], [40, 62], [160, 78]].map(([x, y], i) => (
            <path key={i} className="wk-fx wk-fx-heart" d={`M${x} ${y} c-4 -6 -12 -2 -8 5 l8 7 l8 -7 c4 -7 -4 -11 -8 -5z`} />
          ))}
        </g>
      )}
      {(mood === "celebrate" || mood === "reward" || mood === "levelup" || mood === "discover") && (
        <g fill="#E2B64A">
          {[[34, 50], [166, 44], [26, 110], [176, 100]].map(([x, y], i) => (
            <path key={i} className="wk-fx wk-fx-spark" style={{ transformOrigin: `${x}px ${y}px` }} d={`M${x} ${y - 8} L${x + 2.5} ${y - 2.5} L${x + 8} ${y} L${x + 2.5} ${y + 2.5} L${x} ${y + 8} L${x - 2.5} ${y + 2.5} L${x - 8} ${y} L${x - 2.5} ${y - 2.5} Z`} />
          ))}
        </g>
      )}
      {mood === "celebrate" && (
        <g>
          {[["#6B8FD6", 40, 20], ["#F28DAA", 70, 10], ["#5DBE9A", 130, 14], ["#E2B64A", 160, 22], ["#A08BE0", 100, 4]].map(([c, x, y], i) => (
            <rect key={i} className="wk-fx wk-fx-confetti" x={x as number} y={y as number} width="7" height="11" rx="2" fill={c as string} style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </g>
      )}
      {mood === "levelup" && (
        <g className="wk-fx wk-fx-pop" style={{ transformOrigin: "100px 22px" }}>
          <rect x="66" y="8" width="68" height="26" rx="13" fill="#6B8FD6" />
          <text x="100" y="26" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="var(--font-display)">LEVEL UP</text>
        </g>
      )}
      {mood === "discover" && (
        <g className="wk-fx wk-fx-pop" style={{ transformOrigin: "160px 40px" }}>
          <circle cx="160" cy="40" r="15" fill="#FBEFC0" />
          <text x="160" y="47" textAnchor="middle" fontSize="20" fontWeight="800" fill="#B8892A" fontFamily="var(--font-display)">!</text>
        </g>
      )}
      {mood === "reward" && (
        <g className="wk-fx wk-fx-pop" style={{ transformOrigin: "160px 166px" }}>
          <rect x="144" y="152" width="32" height="28" rx="6" fill="#A08BE0" />
          <rect x="141" y="146" width="38" height="10" rx="4" fill="#C7B8F5" />
          <rect x="157" y="146" width="6" height="34" fill="#FBEFC0" />
        </g>
      )}
      {(mood === "eat" || mood === "drink") && (
        <g>
          <path d="M70 176 h60 l-6 14 h-48 z" fill={mood === "eat" ? "#6B8FD6" : "#A9C5ED"} />
          {mood === "eat" ? (
            <g fill="#C99A6B"><circle cx="88" cy="174" r="4" /><circle cx="98" cy="172" r="4" /><circle cx="108" cy="174" r="4" /><circle cx="114" cy="172" r="3.5" /></g>
          ) : (
            <g><ellipse cx="100" cy="176" rx="26" ry="3" fill="#EAF2FC" /><path className="wk-fx wk-fx-drop" d="M118 160 q4 6 0 8 q-4 -2 0 -8z" fill="#6B8FD6" /></g>
          )}
        </g>
      )}
      {mood === "sad" && <path className="wk-fx wk-fx-drop" d="M146 62 q6 9 0 12 q-6 -3 0 -12z" fill="#A9C5ED" />}
      {mood === "play" && (
        <g className="wk-fx wk-fx-ball">
          <circle cx="168" cy="170" r="11" fill="#F28DAA" />
          <path d="M158 166 q10 6 20 0" stroke="#fff" strokeWidth="2.5" fill="none" />
        </g>
      )}
    </svg>
  );
}

/** Walkie's little blue bicycle (rear part — drawn behind the body). */
function Bike() {
  const wheel = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy="172" r="19" fill="none" stroke="#425A7C" strokeWidth="5" />
      <g className="wk-wheel" style={{ transformOrigin: `${cx}px 172px` }}>
        <path d={`M${cx - 15} 172 H${cx + 15} M${cx} 157 V187 M${cx - 10.6} 161.4 L${cx + 10.6} 182.6 M${cx + 10.6} 161.4 L${cx - 10.6} 182.6`} stroke="#A9C5ED" strokeWidth="2" />
      </g>
      <circle cx={cx} cy="172" r="3.5" fill="#425A7C" />
    </g>
  );
  return (
    <g className="wk-bike">
      {wheel(56)}{wheel(146)}
      <path d="M56 172 L88 172 L118 140 L80 140 Z M88 172 L74 130" fill="none" stroke="#6B8FD6" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M64 128 h22" stroke="#425A7C" strokeWidth="7" strokeLinecap="round" />
    </g>
  );
}
/** Front fork + handlebar (drawn over the paws so Walkie "holds" it). */
function BikeFront() {
  return (
    <g>
      <path d="M146 172 L122 126" stroke="#6B8FD6" strokeWidth="6" strokeLinecap="round" />
      <path d="M112 124 q10 -6 22 -2" stroke="#425A7C" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="88" cy="172" r="5" fill="#425A7C" />
    </g>
  );
}
