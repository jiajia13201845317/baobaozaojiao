"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PET_STAGES, stageProgress } from "@/lib/grow/pet";

/**
 * The pet plus the ring of accumulated points. When the stage index goes up
 * we hold the celebration for a beat — this is the emotional payoff the whole
 * point system exists to deliver, so it gets a real moment rather than a
 * silent image swap.
 */
export function PetHero({ points, compact = false }: { points: number; compact?: boolean }) {
  const { stage, next, ratio, need, index } = stageProgress(points);
  const [evolving, setEvolving] = useState(false);
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (seen.current == null) {
      seen.current = index;
      return;
    }
    if (index > seen.current) {
      seen.current = index;
      setEvolving(true);
      const id = window.setTimeout(() => setEvolving(false), 2600);
      return () => window.clearTimeout(id);
    }
    seen.current = index;
  }, [index]);

  const r = 86;
  const c = 2 * Math.PI * r;

  return (
    <div className={`pet-hero ${compact ? "pet-hero-compact" : ""} ${evolving ? "is-evolving" : ""}`}>
      <div className="pet-stage">
        <svg className="pet-ring" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r={r} className="pet-ring-track" />
          <circle
            cx="100"
            cy="100"
            r={r}
            className="pet-ring-fill"
            strokeDasharray={`${(c * ratio).toFixed(1)} ${c.toFixed(1)}`}
          />
        </svg>
        <div className="pet-art">
          <Image src={stage.image} alt={`宠物 · ${stage.name}`} width={360} height={360} priority />
        </div>
        {evolving && (
          <div className="pet-burst" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
        )}
      </div>

      <p className="pet-line" aria-live="polite">
        {evolving ? `长大啦 · ${stage.name}` : stage.line}
      </p>

      {!compact && (
        <div className="pet-meta">
          <div className="pet-dots" aria-hidden>
            {PET_STAGES.map((s, i) => (
              <span key={s.id} className={i <= index ? "on" : ""} />
            ))}
          </div>
          <p className="pet-progress">
            {next ? (
              <>
                <b>{stage.name}</b> · 共 <b>{points}</b> 分，再 <b>{need}</b> 分变成{next.name}
              </>
            ) : (
              <>
                <b>{stage.name}</b> · 共 <b>{points}</b> 分，已经是最终形态了
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
