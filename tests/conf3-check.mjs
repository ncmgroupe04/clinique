import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const email = `conf3-${Date.now()}@test.sn`;

await page.goto("http://127.0.0.1:3000/inscription");
await page.fill("#structureName", "Clinique Conf3");
await page.fill("#fullName", "Admin Conf3");
await page.fill("#email", email);
await page.fill("#password", "Motdepasse1");
await page.click('button[type="submit"]');
await page.waitForURL("**/tableau", { timeout: 20000 });

await page.goto("http://127.0.0.1:3000/tarifs");
await page.fill("#service-name", "ServiceConf3");
await page.fill("#service-price", "1000");
await page.click('button:has-text("Enregistrer")');
await page.waitForLoadState("networkidle");

// open modal
const desactiver = page.locator('button:has-text("Désactiver ce service")').first();
console.log("desactiver count:", await desactiver.count());
await desactiver.click();
await page.waitForTimeout(500);
const modal = page.locator('button:has-text("Confirmer")');
console.log("modal confirm count:", await modal.count());

if (await modal.count()) {
  await modal.click();
  await page.waitForTimeout(3000);
}
console.log("after url:", page.url());
const text = await page.locator("body").innerText();
console.log("has Inactif:", text.includes("Inactif"));
console.log("modal still open:", await page.locator('button:has-text("Confirmer")').count());

await page.screenshot({ path: "C:/Users/NCM/AppData/Local/Temp/opencode/shot-conf3.png" });
await browser.close();
console.log("DONE");
