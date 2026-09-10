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

export function neteaseFor(songId: string) {
  return NETEASE_TRACK[songId] ?? null;
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
