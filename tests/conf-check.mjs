import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const email = `conf-${Date.now()}@test.sn`;

await page.goto("http://127.0.0.1:3000/inscription");
await page.fill("#structureName", "Clinique Conf");
await page.fill("#fullName", "Admin Conf");
await page.fill("#email", email);
await page.fill("#password", "Motdepasse1");
await page.click('button[type="submit"]');
await page.waitForURL("**/tableau", { timeout: 20000 });

// create a service
await page.goto("http://127.0.0.1:3000/tarifs");
await page.fill("#service-name", "ServiceConf");
await page.fill("#service-price", "1000");
await page.click('button:has-text("Enregistrer")');
await page.waitForLoadState("networkidle");

// click Desactiver (opens modal)
const desactiver = page.locator('button:has-text("Désactiver ce service")');
console.log("desactiver count:", await desactiver.count());
await desactiver.click();
await page.waitForTimeout(500);
const modal = page.locator('button:has-text("Confirmer")');
console.log("modal confirm count:", await modal.count());

// click confirm
if (await modal.count()) {
  await modal.click();
  await page.waitForTimeout(3000);
  console.log("after confirm url:", page.url());
}
const stillActive = await page.locator("text=ServiceConf").count();
console.log("service still visible:", stillActive);
const text = await page.locator("body").innerText();
console.log("has Inactif:", text.includes("Inactif"));

await page.screenshot({ path: "C:/Users/NCM/AppData/Local/Temp/opencode/shot-conf.png" });
await browser.close();
console.log("DONE");
