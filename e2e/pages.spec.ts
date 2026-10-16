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

  test('opens the recurring transactions page', async ({ app, page }) => {
    await open(app, '/settings');
    await page.getByRole('tab', { name: 'Budget' }).click();
    await page.getByRole('button', { name: /Transactions récurrentes/ }).click();
    await expect(page).toHaveURL(/\/settings\/recurrences$/);
  });
});
