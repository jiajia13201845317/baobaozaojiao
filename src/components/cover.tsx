import type { Flashcard } from "@/lib/content";

export function CoverImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`h-full w-full object-contain ${className}`} />
  );
}

export function Portrait({
  card,
  className = "",
}: {
  card: Flashcard;
  className?: string;
}) {
  if (card.swatch) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ background: card.color }}>
        <span className="h-[62%] w-[62%] rounded-full shadow-inner" style={{ background: card.swatch }} />
      </div>
    );
  }
  if (card.numeral) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ background: card.color }}>
        <span className="font-rounded text-7xl font-black" style={{ color: card.accent }}>
          {card.numeral}
        </span>
      </div>
    );
  }
  return (
    <div className={`grid place-items-center p-3 ${className}`} style={{ background: card.color }}>
      <CoverImage src={card.image} alt={card.zh} />
    </div>
  );
}

export function RoomHero({
  src,
  tint,
  alt,
}: {
  src: string;
  tint: string;
  alt: string;
}) {
  return (
    <div className="grid aspect-square place-items-center p-3" style={{ background: tint }}>
      <CoverImage src={src} alt={alt} />
    </div>
  );
}
