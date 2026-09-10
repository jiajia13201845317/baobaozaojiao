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
  localStorage.setItem("bao-mode", "once");
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

await page.goto(`${BASE}/?night=0&go=zh-songs&v=song`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("小兔子乖乖"));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("小兔子乖乖"));
  btn?.click();
});
await page.waitForFunction(() => document.body.innerText.includes("正在听"));
await new Promise((r) => setTimeout(r, 900));
const body = await page.evaluate(() => document.body.innerText);
const spoken = await page.evaluate(() => window.__spoken);
await browser.close();

if (!body.includes("正在听") || !body.includes("小兔子乖乖")) {
  console.error("FAIL song stopped after open\n", body.slice(0, 400));
  process.exit(1);
}
console.log("PASS song stays playing", spoken.slice(0, 3).join(" | "));
