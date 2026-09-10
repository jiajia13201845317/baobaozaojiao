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

/** Soft cartoon nursery clips — not wildlife SFX. Official outchain only. */
export const NETEASE_CRY: Record<string, { id: string; ms: number }> = {
  dog: { id: "2628348090", ms: 12000 },
  cat: { id: "2620036575", ms: 12000 },
  chick: { id: "3359659300", ms: 12000 },
  duck: { id: "3364582988", ms: 12000 },
  cow: { id: "2651524134", ms: 12000 },
  sheep: { id: "1299844750", ms: 12000 },
  pig: { id: "3359658503", ms: 12000 },
  bird: { id: "2719642120", ms: 12000 },
  frog: { id: "2613667349", ms: 12000 },
  horse: { id: "5240736", ms: 12000 },
  lion: { id: "2620036579", ms: 12000 },
  elephant: { id: "28710563", ms: 12000 },
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
