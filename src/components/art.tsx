import type { ReactNode } from "react";
import type { CategoryId } from "@/lib/content";

export function WorldBackdrop({ mood = "day" }: { mood?: "day" | "dusk" | "night" }) {
  const sky =
    mood === "night"
      ? ["#2A2B6B", "#5B4B9A"]
      : mood === "dusk"
        ? ["#7EC8FF", "#FFD6A8"]
        : ["#8FD3FF", "#E8F7FF"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 42%, #C8F2A8 72%, #8FDE6A 100%)`,
        }}
      />
      <svg className="absolute inset-x-0 top-0 h-[46%] w-full" viewBox="0 0 390 220" preserveAspectRatio="xMidYMin slice">
        <circle cx="318" cy="54" r="34" fill="#FFE566" />
        <circle cx="318" cy="54" r="24" fill="#FFF3A0" />
        <g className="origin-center animate-[float_9s_ease-in-out_infinite]" fill="white" opacity="0.92">
          <ellipse cx="62" cy="48" rx="28" ry="16" />
          <ellipse cx="86" cy="46" rx="22" ry="14" />
          <ellipse cx="44" cy="52" rx="16" ry="11" />
        </g>
        <g className="animate-[float_11s_ease-in-out_infinite_reverse]" fill="white" opacity="0.75">
          <ellipse cx="210" cy="36" rx="22" ry="12" />
          <ellipse cx="228" cy="34" rx="16" ry="10" />
        </g>
        <path d="M-10 168 C 40 128, 90 148, 140 138 C 190 128, 230 154, 280 140 C 330 126, 370 150, 410 138 L 410 230 L -10 230 Z" fill="#9BE36A" />
        <path d="M-10 188 C 50 158, 110 176, 170 164 C 230 152, 290 180, 360 166 C 400 158, 420 172, 430 168 L 430 240 L -10 240 Z" fill="#7ED957" />
      </svg>
      <svg className="absolute inset-x-0 bottom-0 h-[28%] w-full" viewBox="0 0 390 140" preserveAspectRatio="xMidYMax slice">
        <path d="M0 48 C 40 20, 90 40, 140 22 C 190 6, 240 36, 300 18 C 340 8, 370 28, 390 20 L 390 140 L 0 140 Z" fill="#62C94A" />
        <path d="M0 78 C 60 50, 120 72, 190 54 C 250 40, 310 74, 390 52 L 390 140 L 0 140 Z" fill="#49B53A" />
        <g fill="#FF7AB0">
          <circle cx="36" cy="96" r="5" />
          <circle cx="118" cy="108" r="4" />
          <circle cx="248" cy="92" r="5" />
          <circle cx="342" cy="110" r="4" />
        </g>
        <g fill="#FFD84A">
          <circle cx="78" cy="112" r="4" />
          <circle cx="196" cy="100" r="4" />
          <circle cx="300" cy="118" r="3.5" />
        </g>
      </svg>
    </div>
  );
}

function Face({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="-7" cy="2" rx="3.2" ry="2.2" fill="#FF9BB0" opacity="0.9" />
      <ellipse cx="7" cy="2" rx="3.2" ry="2.2" fill="#FF9BB0" opacity="0.9" />
      <circle cx="-5.5" cy="-1" r="1.7" fill="#2A2740" />
      <circle cx="5.5" cy="-1" r="1.7" fill="#2A2740" />
      <circle cx="-4.9" cy="-1.6" r="0.6" fill="white" />
      <circle cx="6.1" cy="-1.6" r="0.6" fill="white" />
      <ellipse cx="0" cy="3.2" rx="1.5" ry="1.1" fill="#F5A3B5" />
      <path d="M-3 6.2 Q 0 8.6 3 6.2" fill="none" stroke="#2A2740" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

export function Mascot({
  pose = "wave",
  className = "h-36 w-36",
}: {
  pose?: "wave" | "sing" | "listen" | "read";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 160 170" className={className} aria-hidden>
      <ellipse cx="80" cy="158" rx="38" ry="8" fill="#2A2740" opacity="0.12" />
      <g className={pose === "wave" ? "origin-[80px_70px] animate-[sway_2.4s_ease-in-out_infinite]" : undefined}>
        <ellipse cx="48" cy="28" rx="14" ry="22" fill="#FFF6EA" />
        <ellipse cx="48" cy="30" rx="8" ry="14" fill="#FFB3C7" />
        <ellipse cx="112" cy="28" rx="14" ry="22" fill="#FFF6EA" />
        <ellipse cx="112" cy="30" rx="8" ry="14" fill="#FFB3C7" />
        <ellipse cx="80" cy="86" rx="42" ry="48" fill="#FFF6EA" />
        <ellipse cx="80" cy="62" rx="34" ry="30" fill="#FFF6EA" />
        <Face x={80} y={62} scale={1.35} />
        {pose === "sing" && (
          <>
            <path d="M118 44 c 10 -16 24 -10 22 4" fill="none" stroke="#FF6B4A" strokeWidth="4" strokeLinecap="round" />
            <circle cx="142" cy="36" r="6" fill="#FF6B4A" />
            <path d="M26 52 c -10 -14 -22 -6 -18 6" fill="none" stroke="#5B7CFF" strokeWidth="4" strokeLinecap="round" />
            <circle cx="12" cy="46" r="5" fill="#5B7CFF" />
          </>
        )}
        {pose === "listen" && (
          <path d="M118 70 h18 a10 10 0 0 1 0 20 h-10" fill="none" stroke="#39C15B" strokeWidth="5" strokeLinecap="round" />
        )}
        {pose === "read" && (
          <g transform="translate(52 104)">
            <path d="M0 18 L28 10 L56 18 L56 36 L28 28 L0 36 Z" fill="#FFF8E7" />
            <path d="M28 10 V28" stroke="#E7C37A" strokeWidth="2" />
            <path d="M0 18 L28 28 L56 18" fill="#FFE08A" />
          </g>
        )}
        {pose === "wave" && (
          <g className="origin-[128px_96px] animate-[wave-hand_1.2s_ease-in-out_infinite]">
            <ellipse cx="128" cy="96" rx="10" ry="14" fill="#FFF6EA" />
          </g>
        )}
        {pose !== "wave" && <ellipse cx="128" cy="100" rx="10" ry="13" fill="#FFF6EA" />}
        <ellipse cx="32" cy="100" rx="10" ry="13" fill="#FFF6EA" />
        <ellipse cx="62" cy="136" rx="12" ry="9" fill="#FFF6EA" />
        <ellipse cx="98" cy="136" rx="12" ry="9" fill="#FFF6EA" />
      </g>
    </svg>
  );
}

export function PlayBadge({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#FF6B4A" />
      <circle cx="32" cy="30" r="26" fill="#FF8A6A" />
      <path d="M27 20 L46 32 L27 44 Z" fill="white" />
    </svg>
  );
}

export function CategoryScene({ id }: { id: CategoryId }) {
  if (id === "zh-songs") return <GardenScene />;
  if (id === "en-songs") return <CastleScene />;
  if (id === "animals") return <FarmScene />;
  return <TreehouseScene />;
}

function GardenScene() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <rect width="320" height="180" fill="#FFD3B6" />
      <circle cx="268" cy="36" r="22" fill="#FFE566" />
      <path d="M0 118 C 50 96, 110 124, 160 104 C 210 86, 260 118, 320 100 L 320 180 L 0 180 Z" fill="#8FE06A" />
      <path d="M0 142 C 70 128, 140 150, 210 132 C 260 120, 300 142, 320 136 L 320 180 L 0 180 Z" fill="#62C94A" />
      <rect x="46" y="78" width="52" height="46" rx="8" fill="#FF8A5B" />
      <polygon points="40,82 72,52 104,82" fill="#FF6B4A" />
      <rect x="64" y="98" width="16" height="26" fill="#C75A38" />
      <circle cx="168" cy="118" r="28" fill="#FFF6EA" />
      <ellipse cx="152" cy="88" rx="8" ry="14" fill="#FFF6EA" />
      <ellipse cx="184" cy="88" rx="8" ry="14" fill="#FFF6EA" />
      <ellipse cx="152" cy="90" rx="4" ry="8" fill="#FFB3C7" />
      <ellipse cx="184" cy="90" rx="4" ry="8" fill="#FFB3C7" />
      <Face x={168} y={116} />
      <path d="M204 96 c 12 -18 26 -8 22 8" fill="none" stroke="#FF6B4A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="228" cy="88" r="6" fill="#FF6B4A" />
      <circle cx="34" cy="156" r="6" fill="#FF7AB0" />
      <circle cx="78" cy="164" r="5" fill="#FFD84A" />
      <circle cx="250" cy="158" r="6" fill="#FF7AB0" />
      <circle cx="292" cy="150" r="5" fill="#7EC8FF" />
    </svg>
  );
}

function CastleScene() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <rect width="320" height="180" fill="#3D4A9A" />
      <circle cx="58" cy="40" r="16" fill="#FFF4B0" />
      <circle cx="120" cy="24" r="2.4" fill="white" />
      <circle cx="168" cy="38" r="1.8" fill="white" />
      <circle cx="250" cy="22" r="2.2" fill="white" />
      <circle cx="286" cy="48" r="1.6" fill="white" />
      <path d="M0 138 C 70 118, 150 146, 230 124 C 280 112, 310 130, 320 126 L 320 180 L 0 180 Z" fill="#2C3480" />
      <rect x="108" y="70" width="104" height="78" rx="8" fill="#8FA4FF" />
      <rect x="86" y="92" width="28" height="56" rx="6" fill="#6C7BFF" />
      <rect x="206" y="86" width="28" height="62" rx="6" fill="#6C7BFF" />
      <polygon points="80,94 100,68 120,94" fill="#FFD84A" />
      <polygon points="200,88 220,60 240,88" fill="#FFD84A" />
      <polygon points="124,72 160,42 196,72" fill="#FFC857" />
      <rect x="148" y="108" width="24" height="40" rx="4" fill="#2A2740" />
      <circle cx="248" cy="70" r="10" fill="#FFE566" />
      <path d="M248 58 l2 6 h6 l-5 4 2 6 -5 -3 -5 3 2 -6 -5 -4 h6 z" fill="#FFF8C8" />
    </svg>
  );
}

function FarmScene() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <rect width="320" height="180" fill="#B8ECFF" />
      <circle cx="46" cy="36" r="20" fill="#FFE566" />
      <path d="M0 108 C 80 86, 140 116, 210 94 C 260 80, 300 108, 320 98 L 320 180 L 0 180 Z" fill="#8FE06A" />
      <path d="M0 138 C 90 120, 170 150, 260 128 L 320 140 L 320 180 L 0 180 Z" fill="#57C448" />
      <rect x="210" y="78" width="70" height="46" fill="#F2C14E" />
      <polygon points="200,82 245,48 290,82" fill="#E24A2C" />
      <rect x="238" y="98" width="16" height="26" fill="#8A4A22" />
      <g transform="translate(70 108)">
        <ellipse cx="0" cy="10" rx="22" ry="16" fill="#F4D2A6" />
        <circle cx="0" cy="-6" r="14" fill="#F4D2A6" />
        <ellipse cx="-10" cy="-16" rx="5" ry="8" fill="#F4D2A6" />
        <ellipse cx="10" cy="-16" rx="5" ry="8" fill="#F4D2A6" />
        <Face x={0} y={-6} scale={0.85} />
      </g>
      <g transform="translate(132 118)">
        <ellipse cx="0" cy="8" rx="20" ry="14" fill="#FFF8F0" />
        <circle cx="0" cy="-4" r="12" fill="#FFF8F0" />
        <ellipse cx="-7" cy="-2" rx="4" ry="3.2" fill="#FFB3C7" />
        <Face x={0} y={-4} scale={0.75} />
      </g>
      <g transform="translate(176 128)">
        <ellipse cx="0" cy="6" rx="12" ry="9" fill="#FFE566" />
        <circle cx="0" cy="-2" r="8" fill="#FFE566" />
        <circle cx="-2.5" cy="-3" r="1.1" fill="#2A2740" />
        <circle cx="2.5" cy="-3" r="1.1" fill="#2A2740" />
      </g>
    </svg>
  );
}

function TreehouseScene() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <rect width="320" height="180" fill="#C9B6FF" />
      <circle cx="268" cy="34" r="18" fill="#FFF4B0" />
      <path d="M0 128 C 80 108, 150 138, 230 116 C 280 104, 310 126, 320 120 L 320 180 L 0 180 Z" fill="#5B4B9A" />
      <rect x="148" y="86" width="16" height="62" fill="#8A5A32" />
      <ellipse cx="156" cy="70" rx="46" ry="32" fill="#6C4CC4" />
      <ellipse cx="128" cy="86" rx="28" ry="20" fill="#7A58D4" />
      <ellipse cx="186" cy="88" rx="26" ry="18" fill="#7A58D4" />
      <rect x="118" y="78" width="52" height="34" rx="8" fill="#FFE9B8" />
      <rect x="136" y="90" width="16" height="22" fill="#9B6CFF" />
      <circle cx="228" cy="96" r="16" fill="#EDE0FF" />
      <circle cx="222" cy="92" r="2" fill="#2A2740" />
      <circle cx="232" cy="92" r="2" fill="#2A2740" />
      <path d="M222 100 Q 227 104 232 100" fill="none" stroke="#2A2740" strokeWidth="1.4" />
      <path d="M70 150 q 10 -28 0 -46" fill="none" stroke="#E7C37A" strokeWidth="3" />
      <rect x="52" y="96" width="28" height="20" rx="3" fill="#FFF8E7" />
    </svg>
  );
}

function SceneFrame({
  bg,
  children,
}: {
  bg: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden>
      <rect width="200" height="150" fill={bg} />
      <ellipse cx="100" cy="128" rx="70" ry="14" fill="#2A2740" opacity="0.08" />
      {children}
    </svg>
  );
}

function BunnyMini({ x = 100, y = 78 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="-16" cy="-28" rx="8" ry="14" fill="#FFF6EA" />
      <ellipse cx="16" cy="-28" rx="8" ry="14" fill="#FFF6EA" />
      <ellipse cx="-16" cy="-28" rx="4" ry="8" fill="#FFB3C7" />
      <ellipse cx="16" cy="-28" rx="4" ry="8" fill="#FFB3C7" />
      <circle cx="0" cy="0" r="28" fill="#FFF6EA" />
      <Face x={0} y={-2} scale={1.15} />
    </g>
  );
}

export function ItemArt({ id }: { id: string }) {
  const art: Record<string, ReactNode> = {
    bunny: (
      <SceneFrame bg="#FFD3B6">
        <BunnyMini />
        <rect x="28" y="96" width="36" height="28" rx="6" fill="#FF8A5B" />
        <polygon points="24,100 46,78 68,100" fill="#FF6B4A" />
      </SceneFrame>
    ),
    tigers: (
      <SceneFrame bg="#FFE2A8">
        <circle cx="100" cy="78" r="30" fill="#FFB347" />
        <ellipse cx="72" cy="56" rx="8" ry="12" fill="#FFB347" />
        <ellipse cx="128" cy="56" rx="8" ry="12" fill="#FFB347" />
        <path d="M86 70 v10 M100 66 v12 M114 70 v10" stroke="#C67A1A" strokeWidth="3" />
        <Face x={100} y={80} />
      </SceneFrame>
    ),
    "stars-zh": (
      <SceneFrame bg="#2A2B6B">
        <circle cx="100" cy="78" r="26" fill="#FFE566" />
        <path d="M100 48 l6 16 h17 l-14 11 5 16 -14 -10 -14 10 5 -16 -14 -11 h17 z" fill="#FFF3A0" />
        <circle cx="40" cy="40" r="2" fill="white" />
        <circle cx="168" cy="36" r="2" fill="white" />
        <circle cx="156" cy="70" r="1.6" fill="white" />
      </SceneFrame>
    ),
    ducks: (
      <SceneFrame bg="#B8ECFF">
        <ellipse cx="100" cy="118" rx="70" ry="16" fill="#7EC8FF" />
        <ellipse cx="86" cy="88" rx="26" ry="16" fill="#FFE566" />
        <circle cx="112" cy="74" r="14" fill="#FFE566" />
        <path d="M124 74 h14 l-14 6 z" fill="#FF8A5B" />
        <circle cx="116" cy="70" r="2" fill="#2A2740" />
      </SceneFrame>
    ),
    radish: (
      <SceneFrame bg="#D9F5C8">
        <ellipse cx="100" cy="54" rx="16" ry="10" fill="#39C15B" />
        <path d="M84 58 Q 100 130 116 58" fill="#FF6B4A" />
        <ellipse cx="100" cy="96" rx="22" ry="28" fill="#FF6B4A" />
        <ellipse cx="90" cy="90" rx="6" ry="10" fill="#FF8A6A" />
      </SceneFrame>
    ),
    friends: (
      <SceneFrame bg="#FFD6E8">
        <BunnyMini x={72} y={86} />
        <g transform="translate(132 90) scale(0.72)">
          <circle cx="0" cy="0" r="28" fill="#8FD3FF" />
          <Face x={0} y={-2} scale={1.1} />
        </g>
      </SceneFrame>
    ),
    twinkle: (
      <SceneFrame bg="#1F2A6B">
        <circle cx="100" cy="78" r="18" fill="#FFF4B0" />
        <path d="M100 40 l7 20 h21 l-17 13 6 20 -17 -12 -17 12 6 -20 -17 -13 h21 z" fill="#FFE566" />
        <circle cx="44" cy="44" r="2" fill="white" />
        <circle cx="166" cy="50" r="2" fill="white" />
      </SceneFrame>
    ),
    abc: (
      <SceneFrame bg="#C8F4EC">
        <rect x="40" y="48" width="40" height="48" rx="10" fill="#39C15B" />
        <rect x="80" y="40" width="40" height="56" rx="10" fill="#5B7CFF" />
        <rect x="120" y="54" width="40" height="42" rx="10" fill="#FF6B4A" />
        <text x="52" y="80" fill="white" fontSize="22" fontWeight="700">A</text>
        <text x="92" y="76" fill="white" fontSize="22" fontWeight="700">B</text>
        <text x="132" y="82" fill="white" fontSize="22" fontWeight="700">C</text>
      </SceneFrame>
    ),
    macdonald: (
      <SceneFrame bg="#C8F0B0">
        <rect x="60" y="70" width="80" height="44" fill="#F2C14E" />
        <polygon points="50,74 100,40 150,74" fill="#E24A2C" />
        <circle cx="148" cy="108" r="16" fill="#F4D2A6" />
        <ellipse cx="148" cy="118" rx="8" ry="5" fill="#C67A1A" />
      </SceneFrame>
    ),
    spider: (
      <SceneFrame bg="#DCE6FF">
        <path d="M100 20 V70" stroke="#6B6580" strokeWidth="3" />
        <circle cx="100" cy="88" r="16" fill="#2A2740" />
        <path d="M84 80 L60 68 M84 92 L58 96 M116 80 L140 68 M116 92 L142 96" stroke="#2A2740" strokeWidth="4" strokeLinecap="round" />
        <circle cx="94" cy="84" r="2.4" fill="white" />
        <circle cx="106" cy="84" r="2.4" fill="white" />
      </SceneFrame>
    ),
    lamb: (
      <SceneFrame bg="#EEF2FF">
        <circle cx="100" cy="86" r="28" fill="#FFF8F0" />
        <circle cx="80" cy="78" r="12" fill="#FFF8F0" />
        <circle cx="120" cy="78" r="12" fill="#FFF8F0" />
        <circle cx="100" cy="64" r="14" fill="#FFF8F0" />
        <Face x={100} y={70} scale={0.8} />
      </SceneFrame>
    ),
    boat: (
      <SceneFrame bg="#8FD3FF">
        <path d="M46 100 L154 100 L138 124 L62 124 Z" fill="#FF6B4A" />
        <path d="M100 40 L100 100" stroke="#8A5A32" strokeWidth="5" />
        <path d="M104 46 L148 92 L104 92 Z" fill="white" />
        <ellipse cx="100" cy="132" rx="60" ry="8" fill="#5B7CFF" opacity="0.35" />
      </SceneFrame>
    ),
    cat: <AnimalCover bg="#FFE2C2" body="#F4C48A" ear />,
    dog: <AnimalCover bg="#F3D7B8" body="#E0B07A" ear />,
    chick: <AnimalCover bg="#FFF3B0" body="#FFE566" />,
    duck: <AnimalCover bg="#C8F0B0" body="#FFE566" beak />,
    cow: <AnimalCover bg="#F0E8DC" body="#FFF8F0" spot />,
    sheep: <AnimalCover bg="#EEF2FF" body="#FFF8F0" fluff />,
    pig: <AnimalCover bg="#FFD6E0" body="#FFB3C7" snout />,
    bird: <AnimalCover bg="#C8EEF8" body="#7EC8FF" wing />,
    frog: <AnimalCover bg="#C8F0B8" body="#62C94A" />,
    horse: <AnimalCover bg="#E8D4B8" body="#C49258" />,
    lion: <AnimalCover bg="#FFE7B0" body="#FFB347" mane />,
    elephant: <AnimalCover bg="#D8DCE8" body="#B7BDD0" trunk />,
    crow: (
      <SceneFrame bg="#C5D6EA">
        <ellipse cx="100" cy="90" rx="30" ry="20" fill="#2A2740" />
        <circle cx="122" cy="78" r="14" fill="#2A2740" />
        <path d="M134 78 h16 l-16 7 z" fill="#FF8A5B" />
        <rect x="148" y="96" width="18" height="28" rx="4" fill="#8FA4FF" />
      </SceneFrame>
    ),
    race: (
      <SceneFrame bg="#D4F0C8">
        <ellipse cx="70" cy="104" rx="24" ry="14" fill="#62C94A" />
        <circle cx="58" cy="92" r="8" fill="#62C94A" />
        <circle cx="148" cy="86" r="18" fill="#FFF6EA" />
        <ellipse cx="138" cy="68" rx="6" ry="10" fill="#FFF6EA" />
        <ellipse cx="158" cy="68" rx="6" ry="10" fill="#FFF6EA" />
      </SceneFrame>
    ),
    pigs: (
      <SceneFrame bg="#FFD6E0">
        <circle cx="70" cy="90" r="18" fill="#FFB3C7" />
        <circle cx="100" cy="82" r="20" fill="#FFB3C7" />
        <circle cx="132" cy="92" r="16" fill="#FFB3C7" />
        <ellipse cx="100" cy="88" rx="5" ry="3.5" fill="#F48AA4" />
      </SceneFrame>
    ),
    tadpole: (
      <SceneFrame bg="#B8ECFF">
        <ellipse cx="100" cy="120" rx="70" ry="16" fill="#7EC8FF" />
        <circle cx="86" cy="90" r="14" fill="#2A2740" />
        <path d="M98 90 q 40 0 46 18" fill="none" stroke="#2A2740" strokeWidth="6" strokeLinecap="round" />
        <circle cx="82" cy="86" r="2" fill="white" />
      </SceneFrame>
    ),
    fox: (
      <SceneFrame bg="#FFD8C0">
        <circle cx="100" cy="88" r="26" fill="#FF8A4A" />
        <polygon points="78,70 74,44 96,68" fill="#FF8A4A" />
        <polygon points="122,70 126,44 104,68" fill="#FF8A4A" />
        <Face x={100} y={90} />
      </SceneFrame>
    ),
    "radish-story": (
      <SceneFrame bg="#FFE0C0">
        <ellipse cx="100" cy="50" rx="18" ry="12" fill="#39C15B" />
        <ellipse cx="100" cy="96" rx="24" ry="30" fill="#FF6B4A" />
        <circle cx="64" cy="118" r="12" fill="#FFF6EA" />
        <circle cx="136" cy="118" r="12" fill="#FFB3C7" />
      </SceneFrame>
    ),
  };

  return (
    art[id] ?? (
      <SceneFrame bg="#FFF3D6">
        <BunnyMini />
      </SceneFrame>
    )
  );
}

function AnimalCover({
  bg,
  body,
  ear,
  beak,
  spot,
  fluff,
  snout,
  wing,
  mane,
  trunk,
}: {
  bg: string;
  body: string;
  ear?: boolean;
  beak?: boolean;
  spot?: boolean;
  fluff?: boolean;
  snout?: boolean;
  wing?: boolean;
  mane?: boolean;
  trunk?: boolean;
}) {
  return (
    <SceneFrame bg={bg}>
      {mane && <circle cx="100" cy="80" r="40" fill="#E0892C" />}
      {fluff && (
        <>
          <circle cx="74" cy="86" r="16" fill={body} />
          <circle cx="126" cy="86" r="16" fill={body} />
        </>
      )}
      <circle cx="100" cy="84" r="30" fill={body} />
      {ear && (
        <>
          <ellipse cx="80" cy="56" rx="7" ry="12" fill={body} />
          <ellipse cx="120" cy="56" rx="7" ry="12" fill={body} />
        </>
      )}
      {spot && (
        <>
          <circle cx="84" cy="96" r="6" fill="#2A2740" opacity="0.2" />
          <circle cx="118" cy="90" r="5" fill="#2A2740" opacity="0.2" />
        </>
      )}
      {snout && <ellipse cx="100" cy="92" rx="8" ry="5" fill="#F48AA4" />}
      {beak && <path d="M128 84 h16 l-16 7 z" fill="#FF8A5B" />}
      {wing && <ellipse cx="68" cy="96" rx="12" ry="8" fill="#5B7CFF" />}
      {trunk && <path d="M128 90 q 24 8 18 28" fill="none" stroke={body} strokeWidth="10" strokeLinecap="round" />}
      <Face x={100} y={82} />
    </SceneFrame>
  );
}

export function Balloon({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 70" className={className} aria-hidden>
      <path d="M20 56 C 20 56 16 62 20 66 C 24 62 20 56 20 56" fill={color} />
      <ellipse cx="20" cy="28" rx="16" ry="22" fill={color} />
      <ellipse cx="14" cy="20" rx="5" ry="8" fill="white" opacity="0.35" />
      <path d="M20 50 V70" stroke="#6B6580" strokeWidth="1.5" />
    </svg>
  );
}
