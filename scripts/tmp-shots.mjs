import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--disable-dev-shm-usage"], defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
const p = await b.newPage();
const tap = async (text, tag = "button") => {
  const ok = await p.evaluate((t, g) => {
    const n = [...document.querySelectorAll(g)].find((e) => (e.innerText || "").includes(t));
    if (n) { n.click(); return true; }
    return false;
  }, text, tag);
  await new Promise(r => setTimeout(r, 700));
  return ok;
};
await p.goto("http://127.0.0.1:43147/", { waitUntil: "networkidle0" });
await new Promise(r=>setTimeout(r,1200));
await p.screenshot({ path: "/tmp/s-consent.png", fullPage: true });
// consent
await tap("基础记录");
await tap("我是这个孩子的父母或监护人");
await tap("知道了，开始用");
await new Promise(r=>setTimeout(r,600));
await p.screenshot({ path: "/tmp/s-onboard.png", fullPage: true });
await p.type("#baby-name", "小满");
await p.click("#baby-birthday");
await p.keyboard.type("02/10/2025");
await tap("女宝");
await new Promise(r=>setTimeout(r,500));
await p.screenshot({ path: "/tmp/s-onboard2.png", fullPage: true });
await tap("开始");
await new Promise(r=>setTimeout(r,900));
await p.screenshot({ path: "/tmp/s-home.png", fullPage: true });
await tap("听听");
await new Promise(r=>setTimeout(r,1500));
await p.screenshot({ path: "/tmp/s-listen.png", fullPage: true });
await tap("开始听");
await new Promise(r=>setTimeout(r,2200));
await p.screenshot({ path: "/tmp/s-listen2.png", fullPage: true });
await tap("我的");
await new Promise(r=>setTimeout(r,800));
await p.screenshot({ path: "/tmp/s-me.png", fullPage: true });
await b.close();
console.log("done");
