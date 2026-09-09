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

await page.goto(`${BASE}/?night=0&go=welcome&v=tap`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("开始听"));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("开始听"));
  btn?.click();
});
await page.waitForFunction(() => document.body.innerText.includes("汪汪汪"));
await page.waitForFunction(() => window.__spoken.includes("小狗"));
const dogBtn = await page.$("button[aria-label*='点狗']");
if (!dogBtn) throw new Error("no dog tap target");
await dogBtn.click();
await page.waitForFunction(() => window.__spoken.filter((t) => t.includes("汪")).length >= 1);
await new Promise((r) => setTimeout(r, 1200));
const body = await page.evaluate(() => document.body.innerText);
await browser.close();
if (!body.includes("狗") || body.includes("第 5 只") || body.includes("第 2 只") || body.includes("牛")) {
  console.error("FAIL tap jumped away\n", body.slice(0, 400));
  process.exit(1);
}
console.log("PASS tap holds on dog under chain mode");
