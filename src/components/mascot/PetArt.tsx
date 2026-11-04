/**
 * Original illustrated companions. Each species has its own silhouette, markings and features
 * (not a recolour). They share Walkie's animation rig classes so moods (idle / happy / sleep…) work for all.
 */
import type { ReactNode } from "react";
import { Walkie, type Mood } from "./Walkie";
import { PET_SLOTS, slotOf } from "@/lib/wardrobe";
import { Accessories, type AccessoryProp } from "./Accessories";

const INK = "#26303C";
const W = "#FFFFFF";
const BLUSH = "#F5B9CB";

function Eyes({ y = 92, gap = 21, r = 8, iris = INK, mood }: { y?: number; gap?: number; r?: number; iris?: string; mood: Mood }) {
  const xs = [100 - gap, 100 + gap];
  if (mood === "sleep") return <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none">{xs.map((x) => <path key={x} d={`M${x - 7} ${y} Q${x} ${y + 6} ${x + 7} ${y}`} />)}</g>;
  if (mood === "happy" || mood === "celebrate" || mood === "interact") return <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none">{xs.map((x) => <path key={x} d={`M${x - 7} ${y + 2} Q${x} ${y - 7} ${x + 7} ${y + 2}`} />)}</g>;
  return (
    <g className="wk-eyes" style={{ transformOrigin: `100px ${y}px` }}>
      {xs.map((x) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill={iris} />
          {iris !== INK && <circle cx={x} cy={y + 1} r={r * 0.55} fill={INK} />}
          <circle cx={x + r * 0.35} cy={y - r * 0.4} r={r * 0.32} fill={W} />
        </g>
      ))}
    </g>
  );
}
const Cheeks = ({ y = 108, gap = 34 }: { y?: number; gap?: number }) => (<><ellipse cx={100 - gap} cy={y} rx="7.5" ry="4.5" fill={BLUSH} opacity=".75" /><ellipse cx={100 + gap} cy={y} rx="7.5" ry="4.5" fill={BLUSH} opacity=".75" /></>);
const Smile = ({ y = 112, open, mood }: { y?: number; open?: boolean; mood: Mood }) =>
  open || mood === "happy" || mood === "celebrate"
    ? <g><path d={`M92 ${y} Q100 ${y + 14} 108 ${y} Q100 ${y + 4} 92 ${y}Z`} fill="#5B3442" /><ellipse cx="100" cy={y + 7} rx="4" ry="3" fill="#F28DAA" /></g>
    : <path d={`M92 ${y} Q96 ${y + 5} 100 ${y + 0.5} Q104 ${y + 5} 108 ${y}`} stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
const Shadow = () => <ellipse cx="100" cy="188" rx="52" ry="7" fill="#425A7C" opacity=".12" />;

type Draw = (mood: Mood) => ReactNode;

const SPECIES: Record<string, Draw> = {
  corgi: (m) => (<>
    <g className="wk-tail" style={{ transformOrigin: "140px 160px" }}><ellipse cx="146" cy="158" rx="10" ry="8" fill="#E9A65A" /></g>
    <g className="wk-body">
      <path d="M50 184 C44 150 64 124 100 122 C136 124 156 150 150 184 Z" fill="#E9A65A" />
      <path d="M76 184 C74 158 86 140 100 140 C114 140 126 158 124 184 Z" fill={W} />
      <rect x="72" y="170" width="18" height="16" rx="8" fill={W} /><rect x="110" y="170" width="18" height="16" rx="8" fill={W} />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 124px" }}>
      <path d="M50 78 L58 22 L92 56 Z" fill="#E9A65A" stroke="#E9A65A" strokeWidth="8" strokeLinejoin="round" /><path d="M62 66 L64 36 L84 56Z" fill="#F7C9A8" />
      <path d="M150 78 L142 22 L108 56 Z" fill="#E9A65A" stroke="#E9A65A" strokeWidth="8" strokeLinejoin="round" /><path d="M138 66 L136 36 L116 56Z" fill="#F7C9A8" />
      <ellipse cx="100" cy="92" rx="54" ry="42" fill="#E9A65A" />
      <path d="M100 58 C92 72 88 84 70 100 C64 118 80 132 100 132 C120 132 136 118 130 100 C112 84 108 72 100 58Z" fill={W} />
      <Eyes y={90} gap={24} r={7.5} mood={m} /><Cheeks y={106} gap={38} />
      <ellipse cx="100" cy="106" rx="7" ry="5" fill={INK} /><Smile y={114} mood={m} />
    </g>
  </>),
  shiba: (m) => (<>
    <g className="wk-tail" style={{ transformOrigin: "136px 140px" }}><path d="M132 150 C150 150 166 132 156 116 C148 104 130 112 138 124 C144 132 138 140 128 140Z" fill="#E7A863" /><path d="M156 116 C148 104 130 112 138 124 C140 116 148 112 156 116Z" fill="#FFF3E2" /></g>
    <g className="wk-body">
      <path d="M62 184 C54 152 70 122 100 120 C130 122 146 152 138 184 Z" fill="#E7A863" />
      <path d="M80 184 C78 158 88 136 100 136 C112 136 122 158 120 184 Z" fill="#FFF3E2" />
      <rect x="82" y="150" width="14" height="36" rx="7" fill="#FFF3E2" /><rect x="104" y="150" width="14" height="36" rx="7" fill="#FFF3E2" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 122px" }}>
      <path d="M58 70 L66 36 L90 58Z" fill="#E7A863" stroke="#E7A863" strokeWidth="8" strokeLinejoin="round" /><path d="M142 70 L134 36 L110 58Z" fill="#E7A863" stroke="#E7A863" strokeWidth="8" strokeLinejoin="round" />
      <ellipse cx="100" cy="90" rx="50" ry="42" fill="#E7A863" />
      <path d="M52 100 C58 128 80 134 100 134 C120 134 142 128 148 100 C136 96 120 102 100 104 C80 102 64 96 52 100Z" fill="#FFF3E2" />
      <ellipse cx="80" cy="74" rx="6" ry="3.5" fill="#FFF3E2" /><ellipse cx="120" cy="74" rx="6" ry="3.5" fill="#FFF3E2" />
      <Eyes y={89} gap={20} r={6} mood={m} /><Cheeks y={104} gap={34} />
      <ellipse cx="100" cy="104" rx="6" ry="4.5" fill={INK} /><Smile y={112} mood={m} />
    </g>
  </>),
  golden: (m) => (<>
    <g className="wk-tail" style={{ transformOrigin: "138px 162px" }}><path d="M134 166 C160 166 178 150 176 126 C168 134 160 146 136 150Z" fill="#E2B46A" /><path d="M176 126 C170 136 168 142 160 150" stroke="#F2CF92" strokeWidth="4" fill="none" strokeLinecap="round" /></g>
    <g className="wk-body">
      <path d="M58 184 C50 150 66 118 100 116 C134 118 150 150 142 184 Z" fill="#E2B46A" />
      <path d="M80 140 l8 10 l6 -10 l6 10 l6 -10 l6 10 l8 -10 C122 160 114 176 100 176 C86 176 78 160 80 140Z" fill="#F2CF92" />
      <rect x="80" y="152" width="15" height="34" rx="7.5" fill="#E2B46A" /><rect x="105" y="152" width="15" height="34" rx="7.5" fill="#E2B46A" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 120px" }}>
      <ellipse cx="100" cy="88" rx="48" ry="44" fill="#E2B46A" />
      <ellipse cx="100" cy="64" rx="24" ry="12" fill="#ECC585" opacity=".7" />
      <path d="M54 66 C36 72 34 110 48 122 C58 126 64 110 62 92Z" fill="#C9954C" />
      <path d="M146 66 C164 72 166 110 152 122 C142 126 136 110 138 92Z" fill="#C9954C" />
      <ellipse cx="100" cy="112" rx="22" ry="16" fill="#F2CF92" />
      <Eyes y={90} gap={20} r={7.5} mood={m} /><Cheeks y={108} gap={34} />
      <ellipse cx="100" cy="104" rx="7.5" ry="5.5" fill={INK} /><Smile y={113} open mood={m} />
    </g>
  </>),
  cat: (m) => (<>
    <g className="wk-tail" style={{ transformOrigin: "136px 172px" }}><path d="M134 178 C168 176 176 140 160 116" stroke="#B9A089" strokeWidth="13" fill="none" strokeLinecap="round" /><path d="M163 124 l10 -4 M168 140 l10 0 M164 156 l9 5" stroke="#8E745E" strokeWidth="4" strokeLinecap="round" /></g>
    <g className="wk-body">
      <path d="M66 184 C58 152 72 122 100 120 C128 122 142 152 134 184 Z" fill="#B9A089" />
      <path d="M84 184 C82 160 90 140 100 140 C110 140 118 160 116 184 Z" fill="#F4EBDD" />
      <path d="M70 150 l12 4 M68 164 l12 2" stroke="#8E745E" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="88" cy="182" rx="10" ry="6" fill="#F4EBDD" /><ellipse cx="112" cy="182" rx="10" ry="6" fill="#F4EBDD" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 122px" }}>
      <path d="M54 82 L60 34 L92 60Z" fill="#B9A089" stroke="#B9A089" strokeWidth="6" strokeLinejoin="round" /><path d="M62 68 L64 44 L82 60Z" fill="#F2BFCB" />
      <path d="M146 82 L140 34 L108 60Z" fill="#B9A089" stroke="#B9A089" strokeWidth="6" strokeLinejoin="round" /><path d="M138 68 L136 44 L118 60Z" fill="#F2BFCB" />
      <ellipse cx="100" cy="94" rx="52" ry="40" fill="#B9A089" />
      <path d="M90 58 l2 14 M100 56 v16 M110 58 l-2 14" stroke="#8E745E" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="100" cy="114" rx="20" ry="13" fill="#F4EBDD" />
      <Eyes y={94} gap={22} r={8.5} iris="#8BC79E" mood={m} /><Cheeks y={110} gap={36} />
      <path d="M95 106 h10 l-5 5z" fill="#E98BA6" /><Smile y={114} mood={m} />
      <g stroke="#8E745E" strokeWidth="1.6" strokeLinecap="round"><path d="M70 112 h-20 M70 118 l-18 4 M130 112 h20 M130 118 l18 4" /></g>
    </g>
  </>),
  bunny: (m) => (<>
    <g className="wk-body">
      <ellipse cx="146" cy="170" rx="12" ry="11" fill={W} />
      <path d="M58 184 C52 150 70 124 100 122 C130 124 148 150 142 184 Z" fill="#F3ECE6" />
      <ellipse cx="100" cy="162" rx="24" ry="22" fill={W} />
      <ellipse cx="80" cy="182" rx="14" ry="7" fill={W} /><ellipse cx="120" cy="182" rx="14" ry="7" fill={W} />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 124px" }}>
      <g className="wk-ear-l" style={{ transformOrigin: "66px 66px" }}><path d="M64 62 C40 64 30 104 38 126 C46 134 60 116 70 82Z" fill="#E7DCD3" /><path d="M60 74 C46 80 42 104 46 116 C52 116 60 100 64 84Z" fill="#F6C9D6" /></g>
      <g className="wk-ear-r" style={{ transformOrigin: "134px 66px" }}><path d="M136 62 C160 64 170 104 162 126 C154 134 140 116 130 82Z" fill="#E7DCD3" /><path d="M140 74 C154 80 158 104 154 116 C148 116 140 100 136 84Z" fill="#F6C9D6" /></g>
      <ellipse cx="100" cy="92" rx="46" ry="42" fill="#F3ECE6" />
      <ellipse cx="100" cy="62" rx="14" ry="8" fill={W} opacity=".9" />
      <Eyes y={92} gap={20} r={8} mood={m} /><Cheeks y={108} gap={32} />
      <ellipse cx="100" cy="106" rx="5" ry="3.6" fill="#E98BA6" />
      <path d="M100 109 v4" stroke={INK} strokeWidth="2.2" /><Smile y={113} mood={m} />
      <rect x="96" y="116" width="8" height="6" rx="2" fill={W} stroke="#E7DCD3" />
    </g>
  </>),
  duck: (m) => (<>
    <g className="wk-body">
      <ellipse cx="100" cy="150" rx="50" ry="36" fill="#FCD96B" />
      <g className="wk-tail" style={{ transformOrigin: "146px 148px" }}><path d="M144 140 L166 128 L158 152Z" fill="#F7C948" /></g>
      <path d="M58 146 C64 130 80 128 90 138 C84 150 70 156 58 146Z" fill="#F7C948" />
      <path d="M142 146 C136 130 120 128 110 138 C116 150 130 156 142 146Z" fill="#F7C948" />
      <path d="M78 182 l-10 6 h24 z M122 182 l-10 6 h24 z" fill="#F29D52" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 120px" }}>
      <circle cx="100" cy="86" r="42" fill="#FCD96B" />
      <path d="M96 44 C92 32 102 28 104 36 C108 28 116 34 108 44Z" fill="#F7C948" />
      <Eyes y={82} gap={18} r={7} mood={m} /><Cheeks y={98} gap={30} />
      <path d="M78 100 C78 92 122 92 122 100 C122 112 78 112 78 100Z" fill="#F29D52" />
      <path d="M80 102 h40" stroke="#D97F37" strokeWidth="2" />
    </g>
  </>),
  redpanda: (m) => (<>
    <g className="wk-tail" style={{ transformOrigin: "136px 170px" }}>
      <path d="M130 176 C170 180 186 140 170 112 C162 104 150 110 156 120 C164 136 154 158 128 158Z" fill="#C8633A" />
      <path d="M170 118 l-14 4 M175 134 l-16 0 M170 150 l-16 -4 M160 164 l-12 -8" stroke="#8C3E22" strokeWidth="6" strokeLinecap="round" />
    </g>
    <g className="wk-body">
      <path d="M62 184 C54 152 70 122 100 120 C130 122 146 152 138 184 Z" fill="#C8633A" />
      <path d="M78 184 C78 160 88 144 100 144 C112 144 122 160 122 184Z" fill="#4A2A22" />
      <rect x="80" y="150" width="15" height="36" rx="7.5" fill="#3A2420" /><rect x="105" y="150" width="15" height="36" rx="7.5" fill="#3A2420" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 122px" }}>
      <path d="M52 72 C46 50 56 38 70 42 C78 46 84 56 84 62Z" fill="#C8633A" /><path d="M58 64 C56 52 62 46 70 48 C74 52 76 56 76 60Z" fill={W} />
      <path d="M148 72 C154 50 144 38 130 42 C122 46 116 56 116 62Z" fill="#C8633A" /><path d="M142 64 C144 52 138 46 130 48 C126 52 124 56 124 60Z" fill={W} />
      <ellipse cx="100" cy="92" rx="52" ry="42" fill="#C8633A" />
      <path d="M54 100 C60 124 80 132 100 132 C120 132 140 124 146 100 C134 104 120 106 100 106 C80 106 66 104 54 100Z" fill={W} />
      <ellipse cx="78" cy="74" rx="9" ry="6" fill={W} /><ellipse cx="122" cy="74" rx="9" ry="6" fill={W} />
      <path d="M70 100 C72 112 78 124 84 128 M130 100 C128 112 122 124 116 128" stroke="#8C3E22" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Eyes y={90} gap={20} r={7} mood={m} />
      <ellipse cx="100" cy="106" rx="6.5" ry="4.5" fill={INK} /><Smile y={113} mood={m} />
    </g>
  </>),
  capybara: (m) => (<>
    <g className="wk-body">
      <path d="M46 184 C40 146 64 120 100 118 C136 120 160 146 154 184 Z" fill="#A87E5A" />
      <path d="M70 146 C78 136 92 132 104 134" stroke="#BC9470" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="64" y="172" width="20" height="14" rx="6" fill="#8F6847" /><rect x="116" y="172" width="20" height="14" rx="6" fill="#8F6847" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 124px" }}>
      <ellipse cx="66" cy="56" rx="9" ry="7" fill="#8F6847" /><ellipse cx="134" cy="56" rx="9" ry="7" fill="#8F6847" />
      <rect x="54" y="50" width="92" height="80" rx="38" fill="#A87E5A" />
      <rect x="66" y="96" width="68" height="34" rx="17" fill="#9A7150" />
      <circle cx="118" cy="44" r="11" fill="#F7A84A" /><path d="M118 33 q4 -6 9 -4" stroke="#5DBE9A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <g>{m === "sleep" ? <Eyes y={82} gap={22} r={6} mood={m} /> : <g className="wk-eyes" style={{ transformOrigin: "100px 82px" }}><path d="M70 82 h14 M116 82 h14" stroke={INK} strokeWidth="4" strokeLinecap="round" /></g>}</g>
      <ellipse cx="88" cy="106" rx="4" ry="3" fill="#4A3628" /><ellipse cx="112" cy="106" rx="4" ry="3" fill="#4A3628" />
      <Cheeks y={96} gap={36} /><Smile y={116} mood={m} />
    </g>
  </>),
  fox: (m) => (<>
    <g className="wk-tail" style={{ transformOrigin: "134px 168px" }}>
      <path d="M128 176 C176 182 192 132 166 104 C156 112 160 140 128 150Z" fill="#E07B3C" />
      <path d="M166 104 C158 112 158 124 164 132 C176 126 178 112 166 104Z" fill={W} />
    </g>
    <g className="wk-body">
      <path d="M64 184 C56 152 72 122 100 120 C128 122 144 152 136 184 Z" fill="#E07B3C" />
      <path d="M84 184 C82 158 90 138 100 138 C110 138 118 158 116 184 Z" fill={W} />
      <rect x="80" y="160" width="14" height="26" rx="7" fill="#3A2C2A" /><rect x="106" y="160" width="14" height="26" rx="7" fill="#3A2C2A" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 122px" }}>
      <path d="M50 80 L56 24 L92 58Z" fill="#E07B3C" stroke="#E07B3C" strokeWidth="6" strokeLinejoin="round" /><path d="M54 40 L56 24 L66 34Z" fill="#3A2C2A" stroke="#3A2C2A" strokeWidth="5" strokeLinejoin="round" /><path d="M62 66 L62 42 L82 58Z" fill="#F7C9A8" />
      <path d="M150 80 L144 24 L108 58Z" fill="#E07B3C" stroke="#E07B3C" strokeWidth="6" strokeLinejoin="round" /><path d="M146 40 L144 24 L134 34Z" fill="#3A2C2A" stroke="#3A2C2A" strokeWidth="5" strokeLinejoin="round" /><path d="M138 66 L138 42 L118 58Z" fill="#F7C9A8" />
      <path d="M46 88 C46 64 70 54 100 54 C130 54 154 64 154 88 C154 104 132 120 100 134 C68 120 46 104 46 88Z" fill="#E07B3C" />
      <path d="M46 92 C60 100 80 104 100 134 C120 104 140 100 154 92 C150 112 128 130 100 138 C72 130 50 112 46 92Z" fill={W} />
      <Eyes y={88} gap={22} r={7.5} iris="#C98A2A" mood={m} />
      <ellipse cx="100" cy="118" rx="6" ry="4.5" fill={INK} /><Cheeks y={106} gap={38} />
    </g>
  </>),
  penguin: (m) => (<>
    <g className="wk-body">
      <ellipse cx="100" cy="140" rx="54" ry="48" fill="#2F3D52" />
      <ellipse cx="100" cy="148" rx="36" ry="38" fill={W} />
      <g className="wk-tail" style={{ transformOrigin: "52px 120px" }}><path d="M50 116 C34 128 34 152 44 162 C52 150 56 134 56 120Z" fill="#2F3D52" /></g>
      <path d="M150 116 C166 128 166 152 156 162 C148 150 144 134 144 120Z" fill="#2F3D52" />
      <path d="M76 184 c-10 0 -12 6 -2 6 h18 c4 0 2 -6 -4 -6z M124 184 c10 0 12 6 2 6 h-18 c-4 0 -2 -6 4 -6z" fill="#F29D52" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 120px" }}>
      <ellipse cx="100" cy="82" rx="48" ry="42" fill="#2F3D52" />
      <path d="M58 90 C58 70 80 64 100 78 C120 64 142 70 142 90 C142 110 124 118 100 118 C76 118 58 110 58 90Z" fill={W} />
      <Eyes y={88} gap={18} r={7} mood={m} /><Cheeks y={102} gap={28} />
      <path d="M90 100 L110 100 L100 112Z" fill="#F29D52" stroke="#F29D52" strokeWidth="3" strokeLinejoin="round" />
    </g>
  </>),
  hamster: (m) => (<>
    <g className="wk-body">
      <ellipse cx="100" cy="146" rx="54" ry="42" fill="#E9B988" />
      <ellipse cx="100" cy="156" rx="34" ry="30" fill="#FFF4E6" />
      <ellipse cx="88" cy="144" rx="7" ry="6" fill="#F6C9D6" /><ellipse cx="112" cy="144" rx="7" ry="6" fill="#F6C9D6" />
      <ellipse cx="100" cy="140" rx="8" ry="10" fill="#C99A6B" /><path d="M100 132 v16" stroke="#A57A4E" strokeWidth="1.5" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 122px" }}>
      <circle cx="62" cy="58" r="12" fill="#E9B988" /><circle cx="62" cy="58" r="6" fill="#F6C9D6" />
      <circle cx="138" cy="58" r="12" fill="#E9B988" /><circle cx="138" cy="58" r="6" fill="#F6C9D6" />
      <ellipse cx="100" cy="90" rx="52" ry="42" fill="#E9B988" />
      <ellipse cx="66" cy="108" rx="22" ry="18" fill="#FFF4E6" /><ellipse cx="134" cy="108" rx="22" ry="18" fill="#FFF4E6" />
      <path d="M100 56 v16" stroke="#D49C67" strokeWidth="6" strokeLinecap="round" />
      <Eyes y={88} gap={20} r={7} mood={m} /><Cheeks y={106} gap={34} />
      <ellipse cx="100" cy="102" rx="4.5" ry="3.4" fill="#E98BA6" /><Smile y={108} mood={m} />
    </g>
  </>),
  otter: (m) => (<>
    <g className="wk-tail" style={{ transformOrigin: "136px 176px" }}><path d="M132 182 C160 186 178 170 182 150 C170 160 154 166 132 166Z" fill="#7A5A44" /></g>
    <g className="wk-body">
      <path d="M64 184 C56 150 70 120 100 118 C130 120 144 150 136 184 Z" fill="#8C6A52" />
      <ellipse cx="100" cy="160" rx="26" ry="24" fill="#D9C2A7" />
      <g><ellipse cx="100" cy="150" rx="12" ry="9" fill="#F9D9E5" /><path d="M92 150 q8 -8 16 0" stroke="#E98BB5" strokeWidth="2" fill="none" /></g>
      <ellipse cx="86" cy="152" rx="8" ry="6" fill="#7A5A44" /><ellipse cx="114" cy="152" rx="8" ry="6" fill="#7A5A44" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 120px" }}>
      <circle cx="60" cy="68" r="9" fill="#7A5A44" /><circle cx="140" cy="68" r="9" fill="#7A5A44" />
      <ellipse cx="100" cy="88" rx="46" ry="40" fill="#8C6A52" />
      <ellipse cx="100" cy="104" rx="32" ry="22" fill="#D9C2A7" />
      <Eyes y={84} gap={20} r={6.5} mood={m} /><Cheeks y={100} gap={32} />
      <ellipse cx="100" cy="98" rx="8" ry="5.5" fill="#4A3628" /><Smile y={108} mood={m} />
      <g stroke="#7A5A44" strokeWidth="1.5" strokeLinecap="round"><path d="M78 102 h-16 M78 108 l-14 3 M122 102 h16 M122 108 l14 3" /></g>
    </g>
  </>),
  raccoon: (m) => (<>
    <g className="wk-tail" style={{ transformOrigin: "136px 170px" }}>
      <path d="M130 176 C168 178 182 146 172 120 C164 124 160 150 130 158Z" fill="#8D96A3" />
      <path d="M172 126 l-12 6 M176 142 l-14 2 M170 158 l-14 -2" stroke="#3A414D" strokeWidth="6" strokeLinecap="round" />
    </g>
    <g className="wk-body">
      <path d="M62 184 C54 152 70 122 100 120 C130 122 146 152 138 184 Z" fill="#8D96A3" />
      <path d="M82 184 C80 160 90 142 100 142 C110 142 120 160 118 184 Z" fill="#D9DEE5" />
      <rect x="80" y="160" width="14" height="26" rx="7" fill="#3A414D" /><rect x="106" y="160" width="14" height="26" rx="7" fill="#3A414D" />
    </g>
    <g className="wk-head" style={{ transformOrigin: "100px 122px" }}>
      <path d="M56 70 L62 38 L88 58Z" fill="#8D96A3" stroke="#8D96A3" strokeWidth="8" strokeLinejoin="round" /><path d="M64 62 L66 46 L80 58Z" fill="#3A414D" />
      <path d="M144 70 L138 38 L112 58Z" fill="#8D96A3" stroke="#8D96A3" strokeWidth="8" strokeLinejoin="round" /><path d="M136 62 L134 46 L120 58Z" fill="#3A414D" />
      <ellipse cx="100" cy="92" rx="52" ry="42" fill="#8D96A3" />
      <path d="M50 92 C60 76 84 80 100 92 C116 80 140 76 150 92 C140 106 116 104 100 98 C84 104 60 106 50 92Z" fill="#3A414D" />
      <ellipse cx="100" cy="114" rx="22" ry="16" fill="#EEF1F5" />
      <path d="M100 62 v22" stroke="#6E7887" strokeWidth="5" strokeLinecap="round" />
      <Eyes y={92} gap={22} r={7} iris="#E9EDF3" mood={m} />
      <ellipse cx="100" cy="108" rx="7" ry="5" fill={INK} /><Smile y={116} mood={m} />
    </g>
  </>),
};

export const PET_KEYS = ["husky", ...Object.keys(SPECIES)];

export function PetArt({ species, mood = "idle", size = 120, accessories = [], className = "", title, look, fur }: { species: string; mood?: Mood; size?: number; accessories?: AccessoryProp[]; className?: string; title?: string; look?: string | null; fur?: string | null }) {
  if (species === "husky" || !SPECIES[species]) return <Walkie mood={mood} size={size} accessories={accessories} className={className} title={title ?? "Walkie the husky"} look={look} fur={fur} />;
  accessories = accessories.filter((a) => { const s = slotOf(a.key); return !s || PET_SLOTS.includes(s); }); // other species: head/face/neck/back only
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`wk pet select-none ${className}`} data-mood={mood} role="img" aria-label={title ?? species}>
      <title>{title ?? species}</title>
      <Shadow />
      <g className="wk-all">
        {SPECIES[species](mood)}
        <Accessories items={accessories} />
      </g>
      {mood === "sleep" && <g fill="#6B8FD6" fontFamily="var(--font-display)" fontWeight="700"><text className="wk-fx wk-fx-z" x="150" y="54" fontSize="18">z</text><text className="wk-fx wk-fx-z" x="160" y="40" fontSize="14">z</text></g>}
      {(mood === "interact" || mood === "happy") && <g fill="#F28DAA">{[[150, 50], [42, 60]].map(([x, y], i) => <path key={i} className="wk-fx wk-fx-heart" d={`M${x} ${y} c-4 -6 -12 -2 -8 5 l8 7 l8 -7 c4 -7 -4 -11 -8 -5z`} />)}</g>}
    </svg>
  );
}

/** Silhouette used for undiscovered pets in the collection. */
export function PetSilhouette({ species, size = 120 }: { species: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, filter: "brightness(0) opacity(.12)" }} aria-hidden>
      <PetArt species={species} size={size} mood="sit" />
    </div>
  );
}
