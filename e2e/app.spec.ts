import { expect, isWide, open, test } from './fixtures';

test.describe('first launch', () => {
  test('shows the onboarding once and remembers it was dismissed', async ({ page }) => {
    await page.goto('/budget');
    const dialog = page.getByRole('dialog', { name: /.+/ }).first();
    await expect(page.getByRole('heading', { name: 'Bienvenue dans Budget' })).toBeVisible();

    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bienvenue dans Budget' })).toBeHidden();
    await expect(dialog).toBeVisible();

    await page.getByRole('button', { name: 'Passer' }).click();
    await expect(page.getByRole('heading', { name: 'Bienvenue dans Budget' })).toBeHidden();

    await page.reload();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Passer' })).toHaveCount(0);
  });

  test('starts with an empty budget', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('budget-pwa:onboarding-seen', '1'));
    await open(page, '/budget');
    await expect(page.getByText('Aucune transaction').first()).toBeVisible();
  });
});

test.describe('navigation', () => {
  const pages = [
    { label: 'Catégories', url: /\/categories$/ },
    { label: 'Statistiques', url: /\/stats$/ },
    { label: 'Historique', url: /\/history$/ },
    { label: 'Corbeille', url: /\/trash$/ },
    { label: 'Transactions', url: /\/budget$/ },
  ];

  test('the menu reaches every page', async ({ app, page }) => {
    await open(app, '/budget');
    for (const { label, url } of pages) {
      if (!isWide(page)) await page.getByRole('button').first().click();
      await page.getByRole('navigation').getByRole('button', { name: label }).click();
      await expect(page).toHaveURL(url);
      await expect(page.locator('h1')).toBeVisible();
    }

    if (!isWide(page)) await page.getByRole('button').first().click();
    await page.getByRole('button', { name: 'Réglages' }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('unknown routes fall back to the transactions page', async ({ app, page }) => {
    await app.goto('/nope');
    await expect(page).toHaveURL(/\/budget$/);
  });
});
