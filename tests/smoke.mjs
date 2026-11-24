import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const email = `smoke-${Date.now()}@test.sn`;

await page.goto("http://127.0.0.1:3000/inscription");
await page.fill("#structureName", "Clinique Smoke");
await page.fill("#fullName", "Admin Smoke");
await page.fill("#email", email);
await page.fill("#password", "Motdepasse1");
await page.click('button[type="submit"]');
await page.waitForURL("**/tableau", { timeout: 20000 });

// 1. cursor pointer on a button
const cursor = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent?.includes("Déconnexion"));
  return b ? getComputedStyle(b).cursor : "none";
});
console.log("logout cursor:", cursor);

// 2. Deactivate modal confirms and closes
await page.goto("http://127.0.0.1:3000/tarifs");
await page.waitForLoadState("networkidle");
const desactiver = page.locator('button:has-text("Désactiver ce service")').first();
console.log("desactiver count:", await desactiver.count());
await desactiver.click();
await page.waitForTimeout(300);
console.log("modal open:", await page.locator('button:has-text("Confirmer")').count());
await page.locator('button:has-text("Confirmer")').click();
await page.waitForTimeout(2500);
console.log("modal after confirm:", await page.locator('button:has-text("Confirmer")').count());
console.log("has Inactif:", (await page.locator("body").innerText()).includes("Inactif"));

// 3. Ticket cancel + restore
await page.goto("http://127.0.0.1:3000/tickets/nouveau");
await page.getByRole("button", { name: /Consultation/ }).first().click();
await page.getByRole("button", { name: "Continuer" }).click();
await page.waitForURL("**/tickets/nouveau?service=*");
await page.fill("#patient_name", "Test Restore");
await page.click('button:has-text("Imprimer le ticket")');
await page.waitForURL(/\/tickets\/[0-9a-f-]{36}$/, { timeout: 20000 });

await page.goto("http://127.0.0.1:3000/tickets/historique");
await page.waitForLoadState("networkidle");
const annuler = page.locator('button:has-text("Annuler le ticket")').first();
console.log("annuler count:", await annuler.count());
await annuler.click();
await page.waitForTimeout(300);
await page.fill('input[name="reason"]', "Test annulation");
await page.locator('form button:has-text("Annuler le ticket")').click();
await page.waitForTimeout(2500);
console.log("annule visible:", (await page.locator("body").innerText()).includes("Annulé"));
console.log("retablir count:", await page.locator('button:has-text("Rétablir")').count());
await page.locator('button:has-text("Rétablir")').first().click();
await page.waitForTimeout(2500);
console.log("after restore - Valide visible:", (await page.locator("body").innerText()).includes("Valide"));

await browser.close();
console.log("DONE");
