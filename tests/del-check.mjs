import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const email = `del-${Date.now()}@test.sn`;

await page.goto("http://127.0.0.1:3000/inscription");
await page.fill("#structureName", "Clinique Del");
await page.fill("#fullName", "Admin Del");
await page.fill("#email", email);
await page.fill("#password", "Motdepasse1");
await page.click('button[type="submit"]');
await page.waitForURL("**/tableau", { timeout: 20000 });

// Create a service
await page.goto("http://127.0.0.1:3000/tarifs");
await page.fill("#service-name", "ServiceTestDel");
await page.fill("#service-price", "1000");
await page.click('button:has-text("Enregistrer")');
await page.waitForLoadState("networkidle");

// Count services before
const before = await page.locator("text=ServiceTestDel").count();
console.log("before delete, service visible:", before);

// Click Supprimer
const delBtn = page.locator('button:has-text("Supprimer")').first();
console.log("delete btn count:", await delBtn.count());
await delBtn.click();
await page.waitForTimeout(2000);
console.log("after click url:", page.url());

const after = await page.locator("text=ServiceTestDel").count();
console.log("after delete, service visible:", after);

await page.screenshot({ path: "C:/Users/NCM/AppData/Local/Temp/opencode/shot-del.png" });
await browser.close();
console.log("DONE");
