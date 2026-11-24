import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const email = `dbg-${Date.now()}@test.sn`;
await page.goto("http://127.0.0.1:3000/inscription");
await page.fill("#structureName", "Clinique Dbg");
await page.fill("#fullName", "Admin Dbg");
await page.fill("#email", email);
await page.fill("#password", "Motdepasse1");
await page.click('button[type="submit"]');
await page.waitForURL("**/tableau", { timeout: 20000 });
await page.goto("http://127.0.0.1:3000/tarifs");
await page.waitForLoadState("networkidle");

const html = await page.evaluate(() => {
  const row = document.querySelector(".ln");
  return row ? row.outerHTML.slice(0, 600) : "no row";
});
console.log("row html:", html);

await browser.close();
console.log("DONE");
