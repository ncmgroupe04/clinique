import { test, expect } from "@playwright/test";

test("création d'un ticket en deux étapes et affichage du reçu", async ({ page }) => {
  const email = `ticket-${Date.now()}@test.sn`;
  await page.goto("/inscription");
  await page.fill("#structureName", "Clinique Ticket");
  await page.fill("#fullName", "Caissier Ticket");
  await page.fill("#address", "Touba");
  await page.fill("#phone", "770000000");
  await page.fill("#email", email);
  await page.fill("#password", "Motdepasse1@");
  await page.fill("#confirmPassword", "Motdepasse1@");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/tableau", { timeout: 15_000 });

  // Étape 1 : choix du service dans les cartes.
  await page.goto("/tickets/nouveau");
  await page.getByRole("button", { name: /Consultation/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL("**/tickets/nouveau?service=*", { timeout: 15_000 });

  // Étape 2 : patient et paiement.
  await page.fill("#patient_name", "Fatou Ndiaye");
  await page.fill("#advance", "2000");
  await page.click('button:has-text("Imprimer le ticket")');
  await page.waitForURL(/\/tickets\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Reçu 2026-/ })).toBeVisible();
  await expect(page.getByText("Reste à payer")).toBeVisible();
});
