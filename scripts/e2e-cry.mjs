import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_URL || "http://127.0.0.1:43147";
const chrome = process.env.CHROME || "/usr/bin/google-chrome";

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
});

function fail(message, body) {
  console.error(`FAIL ${message}\n`, body?.slice(0, 400) ?? "");
  process.exitCode = 1;
}

const page = await browser.newPage();
page.setDefaultTimeout(25000);

const asked = [];
page.on("request", (req) => {
  if (req.url().includes("/sfx/")) asked.push(req.url());
});

await page.evaluateOnNewDocument(() => {
  localStorage.setItem("bao-vol", "2");
  localStorage.setItem("bao-mode", "once");
});

await page.goto(`${BASE}/?night=0&go=welcome&cry=real&v=cry`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("开始听"));
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.innerText.includes("开始听"))?.click();
});
await page.waitForFunction(() => document.body.innerText.includes("狗叫"));
await page.waitForFunction(() => document.body.innerText.includes("真的狗叫"));

// The lesson ends on the cry, so the recording must get requested.
const deadline = Date.now() + 15000;
while (Date.now() < deadline && !asked.some((url) => url.endsWith("/sfx/dog.mp3"))) {
  await new Promise((r) => setTimeout(r, 250));
}
if (!asked.some((url) => url.endsWith("/sfx/dog.mp3"))) {
  fail(`no request for the dog recording, saw ${JSON.stringify(asked)}`);
}

await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.innerText.includes("家长"))?.click();
});
await page.waitForFunction(() => document.body.innerText.includes("家长设置"));
let body = await page.evaluate(() => document.body.innerText);
if (!body.includes("动物叫声") || !body.includes("真声")) fail("parent panel is missing the cry switch", body);

await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.innerText.includes("动物叫声"))?.click();
});
await page.waitForFunction(() => document.body.innerText.includes("合成"));
body = await page.evaluate(() => document.body.innerText);
if (!body.includes("比真声还轻")) fail("switching to 合成 did not stick", body);

const stored = await page.evaluate(() => localStorage.getItem("bao-cry"));
if (stored !== "soft") fail(`bao-cry is ${stored}, expected soft`);

await browser.close();
if (!process.exitCode) console.log("PASS dog plays the recording, parent can switch to 合成");
