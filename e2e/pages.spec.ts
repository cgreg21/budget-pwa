import { expect, open, test } from './fixtures';

test.describe('categories, statistics and history', () => {
  test('lists the categories', async ({ app, page }) => {
    await open(app, '/categories');
    await expect(page.locator('h1')).toHaveText('Catégories');
    for (const name of ['Alimentation', 'Logement', 'Transport', 'Loisirs', 'Santé']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test('shows the expenses by category', async ({ app, page }) => {
    await open(app, '/stats');
    await expect(page.locator('h1')).toHaveText('Statistiques');
    await expect(page.getByText('Autres dépenses par catégorie')).toBeVisible();
    await expect(page.getByText('Alimentation').first()).toBeVisible();
  });

  test('shows the history', async ({ app, page }) => {
    await open(app, '/history');
    await expect(page.locator('h1')).toHaveText('Historique');
  });

  test('the trash is empty on a clean budget', async ({ app, page }) => {
    await open(app, '/trash');
    await expect(page.getByText('La corbeille est vide.')).toBeVisible();
  });

  test('swipes a category away, finds it in the trash and restores it', async ({ app, page }) => {
    await open(app, '/categories');
    const row = page.locator('app-swipe-row', { hasText: 'Loisirs' });
    const box = (await row.locator('.row').boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width - 20, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 60, y, { steps: 4 });
    await page.mouse.move(box.x + box.width - 140, y, { steps: 4 });
    await page.mouse.up();
    await row.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(page.getByText('Loisirs', { exact: true })).toHaveCount(0);

    await page.goto('/trash');
    const trashed = page.getByTestId('trashed-categories');
    await expect(trashed.getByText('Loisirs', { exact: true })).toBeVisible();

    const trashedRow = trashed.locator('app-swipe-row', { hasText: 'Loisirs' });
    const trashedBox = (await trashedRow.locator('.row').boundingBox())!;
    const trashedY = trashedBox.y + trashedBox.height / 2;
    await page.mouse.move(trashedBox.x + 20, trashedY);
    await page.mouse.down();
    await page.mouse.move(trashedBox.x + 60, trashedY, { steps: 4 });
    await page.mouse.move(trashedBox.x + 140, trashedY, { steps: 4 });
    await page.mouse.up();
    await trashedRow.getByRole('button', { name: 'Restaurer', exact: true }).click();
    await expect(trashed).toHaveCount(0);

    await page.goto('/categories');
    await expect(page.getByText('Loisirs', { exact: true })).toBeVisible();
  });
});

test.describe('settings', () => {
  test('validates and saves the balance thresholds', async ({ app, page }) => {
    await open(app, '/settings');
    await page.getByRole('tab', { name: 'Budget' }).click();

    await page.getByLabel('Faible (x)').fill('2000');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Les seuils doivent respecter x < y < z.')).toBeVisible();

    await page.getByLabel('Faible (x)').fill('100');
    await page.getByLabel('Moyen (y)').fill('600');
    await page.getByLabel('Élevé (z)').fill('3000');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Seuils enregistrés')).toBeVisible();

    await page.reload();
    await page.getByRole('tab', { name: 'Budget' }).click();
    await expect(page.getByLabel('Moyen (y)')).toHaveValue(/600/);
  });

  test('switches the language to English', async ({ app, page }) => {
    await open(app, '/settings');
    await page.getByRole('button', { name: /Langue/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'English' }).click();
    await expect(page.locator('h1')).toHaveText('Settings');
  });

  test('opens the About page with the libraries from the header', async ({ app, page }) => {
    await open(app, '/settings');
    await page.getByRole('button', { name: 'À propos', exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/about$/);
    await expect(page.locator('h1')).toHaveText('À propos');
    await expect(page.getByTestId('library').filter({ hasText: '@angular/core' })).toContainText('Licence MIT');
    await expect(page.getByTestId('library').filter({ hasText: 'budget-lib' })).toContainText('Licence Apache-2.0');
  });
});
