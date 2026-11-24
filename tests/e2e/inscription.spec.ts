import { test, expect } from "@playwright/test";

test("inscription d'une structure puis connexion", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.sn`;
  await page.goto("/inscription");
  await page.fill("#structureName", "Clinique E2E");
  await page.fill("#fullName", "Admin E2E");
  await page.fill("#address", "Touba");
  await page.fill("#phone", "770000000");
  await page.fill("#email", email);
  await page.fill("#password", "Motdepasse1@");
  await page.fill("#confirmPassword", "Motdepasse1@");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/tableau", { timeout: 15_000 });
  await expect(page.getByText("structure_admin")).toBeVisible();

  // logout + login
  await page.click('button:has-text("Déconnexion")');
  await page.waitForURL("**/connexion");
  await page.fill("#email", email);
  await page.fill("#password", "Motdepasse1@");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/tableau", { timeout: 15_000 });
});