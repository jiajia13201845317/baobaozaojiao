import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_URL || "http://127.0.0.1:43147";
const chrome = process.env.CHROME || "/usr/bin/google-chrome";

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);

await page.evaluateOnNewDocument(() => {
  localStorage.setItem("bao-mode", "chain");
  localStorage.setItem("bao-vol", "2");
  window.__spoken = [];
  const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = (u) => {
    window.__spoken.push(u.text);
    try {
      origSpeak(u);
    } catch {
      /* ignore */
    }
    queueMicrotask(() => {
      try {
        u.onend?.(new Event("end"));
      } catch {
        /* ignore */
      }
    });
  };
});

await page.goto(`${BASE}/?night=0&go=zh-songs&v=holdsong`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("小兔子乖乖"));
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("小兔子乖乖"));
  btn?.click();
});
await page.waitForFunction(() =>
  [...document.querySelectorAll("button")].some((b) => b.innerText.includes("下一首")),
);
await page.evaluate(() => {
  const next = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("下一首"));
  next?.click();
});
await page.waitForFunction(() => document.body.innerText.includes("正在听"));
await new Promise((r) => setTimeout(r, 5200));
const body = await page.evaluate(() => document.body.innerText);
const spoken = await page.evaluate(() => window.__spoken);
const current = await page.evaluate(() => {
  const audio = document.querySelector("audio[data-bao-track]");
  return {
    title: document.body.innerText.includes("小兔子乖乖"),
    tigers: document.body.innerText.includes("两只老虎"),
    time: audio ? audio.currentTime : null,
    paused: audio ? audio.paused : null,
  };
});
await browser.close();

if (!body.includes("正在听") || !current.title || current.tigers || (current.time != null && current.time < 1.2)) {
  console.error("FAIL song did not stay on 小兔子乖乖\n", body.slice(0, 400), current);
  process.exit(1);
}
console.log("PASS song stays playing", spoken.slice(0, 3).join(" | "));
