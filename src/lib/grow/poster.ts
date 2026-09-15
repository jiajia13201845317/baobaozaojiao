/**
 * 11.7 一键生成成长海报.
 *
 * Drawn on a canvas rather than screenshotting the DOM, for one privacy
 * reason: a share image must contain exactly what we chose to put in it. A
 * DOM capture would happily pick up the sibling switcher, a half-open sheet,
 * or the notification card that happened to be on screen. Here the fields are
 * an explicit list, so nothing can leak into a picture that is about to be
 * sent to a family group chat.
 *
 * Nothing is uploaded. The canvas becomes a blob in the page and the parent
 * saves or shares it themselves.
 */
import { themedPetArt } from "./pets";
import type { Sex } from "./store";

export type PosterInput = {
  headline: string;
  name: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  lines: string[];
  art: string;
  sex: Sex;
};

const W = 1080;
const H = 1440;

const THEME: Record<Sex, { brand: string; dark: string; tint: string; wash: [string, string] }> = {
  boy: { brand: "#2fc48b", dark: "#17996a", tint: "#ddf6ea", wash: ["#c3f2dd", "#fff4e8"] },
  girl: { brand: "#ff6fa5", dark: "#df4a83", tint: "#ffe3ed", wash: ["#ffd9e7", "#fff4ec"] },
};

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function drawPoster(input: PosterInput): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");
  if (!c) return null;
  const theme = THEME[input.sex];
  const font = '900 1px "Noto Sans SC", system-ui, sans-serif';
  const set = (size: number, weight = 900) => {
    c.font = font.replace("900 1px", `${weight} ${size}px`);
  };

  const wash = c.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, theme.wash[0]);
  wash.addColorStop(1, theme.wash[1]);
  c.fillStyle = wash;
  c.fillRect(0, 0, W, H);

  const pad = 64;
  const cardX = pad;
  const cardW = W - pad * 2;

  c.fillStyle = "rgba(43, 52, 80, 0.10)";
  roundRect(c, cardX, 112, cardW, H - 200, 56);
  c.fill();
  c.fillStyle = "#ffffff";
  roundRect(c, cardX, 100, cardW, H - 200, 56);
  c.fill();

  c.textAlign = "center";
  set(32);
  c.fillStyle = theme.dark;
  c.fillText("一起长大", W / 2, 196);

  set(60);
  c.fillStyle = "#2b3450";
  c.fillText(input.headline, W / 2, 274);

  set(30, 700);
  c.fillStyle = "#6c7694";
  c.fillText(input.subtitle, W / 2, 324);

  const winY = 366;
  const winH = 400;
  const win = c.createLinearGradient(cardX, winY, cardX + cardW, winY + winH);
  win.addColorStop(0, theme.tint);
  win.addColorStop(1, "#ffffff");
  c.fillStyle = win;
  roundRect(c, cardX + 44, winY, cardW - 88, winH, 44);
  c.fill();

  const art = await loadImage(themedPetArt(input.art, input.sex));
  if (art) {
    const size = 330;
    c.drawImage(art, W / 2 - size / 2, winY + (winH - size) / 2, size, size);
  }

  let y = winY + winH + 84;
  const cols = 3;
  const cellW = (cardW - 88) / cols;
  input.stats.slice(0, 6).forEach((stat, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = cardX + 44 + cellW * col + cellW / 2;
    const cy = y + row * 132;
    set(44);
    c.fillStyle = theme.dark;
    c.fillText(stat.value, cx, cy);
    set(26, 700);
    c.fillStyle = "#6c7694";
    c.fillText(stat.label, cx, cy + 40);
  });

  y += Math.ceil(Math.min(6, input.stats.length) / cols) * 132 + 20;
  set(28, 700);
  for (const line of input.lines.slice(0, 4)) {
    c.fillStyle = "#6c7694";
    c.fillText(line, W / 2, y);
    y += 46;
  }

  set(24, 700);
  c.fillStyle = "#9ba3bc";
  c.fillText("记录由家长自己填写 · 不含任何评价或结论", W / 2, H - 132);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

export async function sharePoster(blob: Blob, name: string) {
  const file = new File([blob], `${name}.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "一起长大" });
      return "shared" as const;
    } catch {
      return "cancelled" as const;
    }
  }
  return "unsupported" as const;
}
