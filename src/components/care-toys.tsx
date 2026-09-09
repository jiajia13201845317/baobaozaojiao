"use client";

import { useEffect, useState } from "react";
import { fallbackCare, loadCare, type CareInfo, type DressKind, type MealKind, type SkyKind } from "@/lib/care";

export function useCare(night: boolean) {
  const [care, setCare] = useState<CareInfo>(() => fallbackCare(new Date(), night));

  useEffect(() => {
    let alive = true;
    void loadCare(night).then((next) => {
      if (alive) setCare(next);
    });
    return () => {
      alive = false;
    };
  }, [night]);

  return care;
}

export function SkyBuddy({
  care,
  onTalk,
}: {
  care: CareInfo;
  onTalk: (text: string) => void;
}) {
  return (
    <button
      type="button"
      className={`sky-buddy sky-${care.sky}`}
      onClick={(event) => {
        event.stopPropagation();
        onTalk(care.speakWeather);
      }}
      aria-label={care.weatherLine}
    >
      <SkyFace sky={care.sky} />
      <span className="sky-temp">{care.temp}°</span>
    </button>
  );
}

export function CareToys({
  care,
  onTalk,
}: {
  care: CareInfo;
  onTalk: (text: string) => void;
}) {
  return (
    <div className="care-toys">
      <button
        type="button"
        className="care-toy"
        onClick={(event) => {
          event.stopPropagation();
          onTalk(care.speakDress);
        }}
      >
        <DressIcon kind={care.dressKind} />
        <span>{care.dressLine}</span>
      </button>
      <button
        type="button"
        className="care-toy"
        onClick={(event) => {
          event.stopPropagation();
          onTalk(care.speakMeal);
        }}
      >
        <MealIcon kind={care.mealKind} />
        <span>{care.mealLine}</span>
      </button>
    </div>
  );
}

export function CareStrip({
  care,
  onTalk,
}: {
  care: CareInfo;
  onTalk: (text: string) => void;
}) {
  return (
    <div className="care-strip">
      <button type="button" className="care-chip" onClick={() => onTalk(care.speakWeather)}>
        <SkyFace sky={care.sky} />
        <span>
          {care.temp}° {care.weatherLine}
        </span>
      </button>
      <button type="button" className="care-chip" onClick={() => onTalk(care.speakDress)}>
        <DressIcon kind={care.dressKind} />
        <span>{care.dressLine}</span>
      </button>
      <button type="button" className="care-chip" onClick={() => onTalk(care.speakMeal)}>
        <MealIcon kind={care.mealKind} />
        <span>{care.mealLine}</span>
      </button>
    </div>
  );
}

export function PupOutfit({ kind }: { kind: DressKind }) {
  if (kind === "tee") {
    return <span className="pup-shade" aria-hidden />;
  }
  if (kind === "cardigan") {
    return <span className="pup-scarf" aria-hidden />;
  }
  return <span className="pup-hat" aria-hidden />;
}

function SkyFace({ sky }: { sky: SkyKind }) {
  if (sky === "night") {
    return (
      <svg viewBox="0 0 64 64" className="sky-face" aria-hidden>
        <circle cx="34" cy="32" r="18" fill="#FFE27A" />
        <circle cx="26" cy="28" r="14" fill="#3a3048" />
        <circle cx="44" cy="18" r="2" fill="#FFF6C8" />
        <circle cx="52" cy="28" r="1.5" fill="#FFF6C8" />
      </svg>
    );
  }
  if (sky === "rain") {
    return (
      <svg viewBox="0 0 64 64" className="sky-face" aria-hidden>
        <ellipse cx="32" cy="28" rx="20" ry="12" fill="#E8F4FF" />
        <ellipse cx="22" cy="30" rx="10" ry="8" fill="#D6ECFF" />
        <path d="M22 42 l-2 10" stroke="#5CB8E8" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 44 l-2 10" stroke="#5CB8E8" strokeWidth="3" strokeLinecap="round" />
        <path d="M42 42 l-2 10" stroke="#5CB8E8" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (sky === "cloud") {
    return (
      <svg viewBox="0 0 64 64" className="sky-face" aria-hidden>
        <ellipse cx="28" cy="34" rx="16" ry="11" fill="#FFFDF8" />
        <ellipse cx="40" cy="32" rx="13" ry="10" fill="#FFFDF8" />
        <circle cx="26" cy="32" r="2" fill="#3d2e28" />
        <circle cx="36" cy="31" r="2" fill="#3d2e28" />
        <path d="M28 38 Q 32 40 36 38" fill="none" stroke="#3d2e28" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="sky-face sky-sun" aria-hidden>
      <circle cx="32" cy="32" r="16" fill="#FFE27A" />
      <circle cx="32" cy="32" r="11" fill="#FFF3B0" />
      <circle cx="27" cy="30" r="2" fill="#3d2e28" />
      <circle cx="37" cy="30" r="2" fill="#3d2e28" />
      <path d="M27 37 Q 32 41 37 37" fill="none" stroke="#3d2e28" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DressIcon({ kind }: { kind: DressKind }) {
  return (
    <svg viewBox="0 0 48 48" className="care-icon" aria-hidden>
      {kind === "coat" ? (
        <>
          <path d="M10 16 L18 12 L24 16 L30 12 L38 16 L34 40 H14 Z" fill="#FF8A5C" />
          <circle cx="24" cy="10" r="5" fill="#FFE27A" />
        </>
      ) : kind === "cardigan" ? (
        <path d="M12 14 L20 12 L24 18 L28 12 L36 14 L32 40 H16 Z" fill="#7EC8FF" />
      ) : (
        <path d="M14 16 L24 20 L34 16 L32 40 H16 Z" fill="#8FDE7A" />
      )}
    </svg>
  );
}

function MealIcon({ kind }: { kind: MealKind }) {
  return (
    <svg viewBox="0 0 48 48" className="care-icon" aria-hidden>
      {kind === "milk" ? (
        <>
          <rect x="16" y="10" width="16" height="28" rx="6" fill="#FFFDF8" stroke="#E8C48A" strokeWidth="2" />
          <rect x="18" y="22" width="12" height="12" rx="3" fill="#FFE8B0" />
        </>
      ) : kind === "fruit" ? (
        <>
          <circle cx="24" cy="26" r="12" fill="#FF8A5C" />
          <path d="M24 14 Q 28 10 32 14" fill="none" stroke="#6FCC62" strokeWidth="3" />
        </>
      ) : (
        <>
          <ellipse cx="24" cy="30" rx="16" ry="8" fill="#FFFDF8" />
          <ellipse cx="24" cy="26" rx="12" ry="5" fill="#FFD27A" />
        </>
      )}
    </svg>
  );
}

export function bubbleFor(care: CareInfo) {
  if (care.sky === "rain") return "下雨啦，在家听";
  if (care.sky === "night") return "月亮也来听";
  if (care.sky === "cloud") return "云朵软软的";
  return "汪汪汪，来玩呀";
}
