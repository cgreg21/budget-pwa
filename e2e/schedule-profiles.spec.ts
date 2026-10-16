import { expect, open, test } from './fixtures';

test.describe('schedule', () => {
  test('is empty without recurring transactions', async ({ app, page }) => {
    await open(app, '/schedule');
    await expect(page.getByText(/Aucune échéance à venir/)).toBeVisible();
  });

  test('lists the upcoming occurrences of a series with totals', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByLabel('Montant').fill('15');
    await page.getByLabel('Description').fill('Marché test');
    await page.getByRole('switch').first().click();
    await page.getByRole('button', { name: 'Mensuelle', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Personnalisée', exact: true }).click();
    await page.getByRole('button', { name: 'Mois', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Semaines', exact: true }).click();
    await page.getByLabel('Répéter tous les').fill('1');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Transaction ajoutée')).toBeVisible();

    await page.goto('/schedule');
    await expect(page.getByText('Marché test').first()).toBeVisible();
    await expect(page.getByTestId('schedule-total')).toBeVisible();
    const sixMonths = page.getByRole('button', { name: '6 mois', exact: true });
    await sixMonths.click();
    await expect(sixMonths).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('section[data-month]').first()).toBeVisible();
  });
});

test.describe('profiles', () => {
  test('creates a profile with its own data and switches back', async ({ app, page }) => {
    await open(app, '/settings/profiles');
    await expect(page.getByTestId('profile')).toHaveCount(1);

    await page.getByLabel('Nom du nouveau profil').fill('Société');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByTestId('profile')).toHaveCount(2);

    await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Utiliser', exact: true }).click();
    await expect(page.getByTestId('profile').nth(1).getByText('Actif')).toBeVisible();

    await open(app, '/budget');
    await expect(page.getByText('Salaire')).toHaveCount(0);

    await open(app, '/settings/profiles');
    await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Utiliser', exact: true }).click();
    await open(app, '/budget');
    await expect(page.getByText('Salaire')).toBeVisible();
  });

  test('deletes an inactive profile', async ({ app, page }) => {
    await open(app, '/settings/profiles');
    await page.getByLabel('Nom du nouveau profil').fill('Temporaire');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByTestId('profile')).toHaveCount(2);
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(page.getByTestId('profile')).toHaveCount(1);
  });
});
