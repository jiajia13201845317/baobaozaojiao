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
  localStorage.setItem("bao-seen", "1");
  localStorage.setItem("bao-mode", "once");
});

await page.goto(`${BASE}/?night=0&v=seehome`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("开始听"));

await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("开始听"));
  btn?.click();
});
await new Promise((r) => setTimeout(r, 250));
let body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("开始听") || body.includes("小狗软软地叫") || body.includes("狗叫")) {
  console.error("FAIL welcome jumped on first tap\n", body.slice(0, 400));
  await browser.close();
  process.exit(1);
}

await new Promise((r) => setTimeout(r, 900));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("开始听"));
  btn?.click();
});
await page.waitForFunction(() => document.body.innerText.includes("狗叫") || document.body.innerText.includes("点狗"));
body = await page.evaluate(() => document.body.innerText);
await browser.close();
if (!body.includes("狗")) {
  console.error("FAIL later start did not play dog\n", body.slice(0, 400));
  process.exit(1);
}
console.log("PASS welcome stays, then start plays dog");
