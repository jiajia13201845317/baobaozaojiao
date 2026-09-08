export function Sun() {
  return (
    <svg viewBox="0 0 80 80" className="h-14 w-14 drop-shadow-sm" aria-hidden>
      <circle cx="40" cy="40" r="16" fill="#FFC857" />
      <circle cx="40" cy="40" r="12" fill="#FFE08A" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 40 + Math.cos(a) * 22;
        const y1 = 40 + Math.sin(a) * 22;
        const x2 = 40 + Math.cos(a) * 32;
        const y2 = 40 + Math.sin(a) * 32;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#FFC857"
            strokeWidth="4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function Cloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden>
      <ellipse cx="40" cy="36" rx="28" ry="18" fill="white" />
      <ellipse cx="68" cy="32" rx="32" ry="20" fill="white" />
      <ellipse cx="90" cy="38" rx="22" ry="14" fill="white" />
    </svg>
  );
}

export function SoundRings({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <span
        className="absolute h-44 w-44 rounded-full opacity-30 animate-[ping_1.8s_ease-out_infinite]"
        style={{ background: color }}
      />
      <span
        className="absolute h-56 w-56 rounded-full opacity-20 animate-[ping_1.8s_ease-out_infinite] [animation-delay:400ms]"
        style={{ background: color }}
      />
    </div>
  );
}
