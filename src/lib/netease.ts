/** Official NetEase Cloud Music outchain player. We do not download or rehost tracks. */
export const NETEASE_TRACK: Record<string, { id: string; ms: number }> = {
  bunny: { id: "28700264", ms: 110000 },
  tigers: { id: "28700288", ms: 151000 },
  "stars-zh": { id: "1452601157", ms: 82000 },
  ducks: { id: "5242631", ms: 90000 },
  radish: { id: "1450764848", ms: 91000 },
  friends: { id: "28700250", ms: 81000 },
  twinkle: { id: "1436594119", ms: 151000 },
  abc: { id: "565181083", ms: 104000 },
  macdonald: { id: "444389605", ms: 88000 },
  spider: { id: "1436594248", ms: 118000 },
  lamb: { id: "28707964", ms: 89000 },
  boat: { id: "28707960", ms: 53000 },
};

/** Short baby-friendly animal clips on NetEase. Played via official outchain only. */
export const NETEASE_CRY: Record<string, { id: string; ms: number }> = {
  dog: { id: "5266517", ms: 8000 },
  cat: { id: "2604258111", ms: 8000 },
  chick: { id: "2604258106", ms: 8000 },
  duck: { id: "2604258118", ms: 8000 },
  cow: { id: "2604258113", ms: 8000 },
  sheep: { id: "2604258117", ms: 8000 },
  pig: { id: "2604257128", ms: 8000 },
  bird: { id: "3431764325", ms: 8000 },
  frog: { id: "2604257123", ms: 8000 },
  horse: { id: "2604258109", ms: 8000 },
  lion: { id: "2604257124", ms: 8000 },
  elephant: { id: "3397157443", ms: 8000 },
};

export function neteaseFor(songId: string) {
  return NETEASE_TRACK[songId] ?? null;
}

export function neteaseCryFor(animalId: string) {
  return NETEASE_CRY[animalId] ?? null;
}

export function neteasePlayerSrc(id: string, auto = true) {
  const params = new URLSearchParams({
    type: "2",
    id,
    auto: auto ? "1" : "0",
    height: "66",
  });
  return `https://music.163.com/outchain/player?${params.toString()}`;
}
