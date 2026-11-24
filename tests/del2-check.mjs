import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const email = `del2-${Date.now()}@test.sn`;
await page.goto("http://127.0.0.1:3000/inscription");
await page.fill("#structureName", "Clinique Del2");
await page.fill("#fullName", "Admin Del2");
await page.fill("#email", email);
await page.fill("#password", "Motdepasse1");
await page.click('button[type="submit"]');
await page.waitForURL("**/tableau", { timeout: 20000 });
await page.goto("http://127.0.0.1:3000/tarifs");
await page.fill("#service-name", "ServiceTestDel2");
await page.fill("#service-price", "1000");
await page.click('button:has-text("Enregistrer")');
await page.waitForLoadState("networkidle");

const html = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Supprimer");
  const form = btn?.closest("form");
  return form ? form.outerHTML : "no form";
});
console.log("form html:", html.slice(0, 400));

await browser.close();
console.log("DONE");
