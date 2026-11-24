import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const email = `conf2-${Date.now()}@test.sn`;

await page.goto("http://127.0.0.1:3000/inscription");
await page.fill("#structureName", "Clinique Conf2");
await page.fill("#fullName", "Admin Conf2");
await page.fill("#email", email);
await page.fill("#password", "Motdepasse1");
await page.click('button[type="submit"]');
await page.waitForURL("**/tableau", { timeout: 20000 });

await page.goto("http://127.0.0.1:3000/tarifs");
await page.fill("#service-name", "ServiceConf2");
await page.fill("#service-price", "1000");
await page.click('button:has-text("Enregistrer")');
await page.waitForLoadState("networkidle");

const btns = await page.evaluate(() =>
  Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim()).filter(Boolean),
);
console.log("buttons:", JSON.stringify(btns));

await browser.close();
console.log("DONE");
