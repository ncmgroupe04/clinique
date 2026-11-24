import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const email = `del3-${Date.now()}@test.sn`;
await page.goto("http://127.0.0.1:3000/inscription");
await page.fill("#structureName", "Clinique Del3");
await page.fill("#fullName", "Admin Del3");
await page.fill("#email", email);
await page.fill("#password", "Motdepasse1");
await page.click('button[type="submit"]');
await page.waitForURL("**/tableau", { timeout: 20000 });
await page.goto("http://127.0.0.1:3000/tarifs");
await page.fill("#service-name", "ServiceTestDel3");
await page.fill("#service-price", "1000");
await page.click('button:has-text("Enregistrer")');
await page.waitForLoadState("networkidle");

// find delete button and submit its form via JS
const result = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Supprimer");
  const form = btn?.closest("form");
  if (form) {
    form.requestSubmit(btn);
    return "submitted";
  }
  return "no form";
});
console.log("result:", result);
await page.waitForTimeout(3000);
console.log("after url:", page.url());
const stillThere = await page.locator("text=ServiceTestDel3").count();
console.log("service still visible:", stillThere);

await browser.close();
console.log("DONE");
