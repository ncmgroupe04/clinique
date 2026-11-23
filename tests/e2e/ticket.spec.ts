import { test, expect } from "@playwright/test";

test("création d'un ticket et affichage du reçu", async ({ page }) => {
  const email = `ticket-${Date.now()}@test.sn`;
  await page.goto("/inscription");
  await page.fill("#structureName", "Clinique Ticket");
  await page.fill("#fullName", "Caissier Ticket");
  await page.fill("#email", email);
  await page.fill("#password", "Motdepasse1");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/tableau", { timeout: 15_000 });

  await page.goto("/tickets/nouveau");
  await page.fill("#patient_name", "Fatou Ndiaye");
  await page.selectOption("#service_id", "__other__");
  await page.fill("#other_label", "Consultation");
  await page.fill("#other_price", "5000");
  await page.fill("#advance", "2000");
  await page.click('button:has-text("Imprimer le ticket")');
  await page.waitForURL(/\/tickets\/.+/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Reçu 2026-/ })).toBeVisible();
  await expect(page.getByText("Reste à payer")).toBeVisible();
});