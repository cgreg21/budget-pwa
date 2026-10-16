import { expect, open, test } from './fixtures';

test.describe('transactions', () => {
  test('lists the month with its totals', async ({ app, page }) => {
    await open(app, '/budget');
    await expect(page.getByText('Solde - Confortable')).toBeVisible();
    await expect(page.getByText('1 418,20 €').first()).toBeVisible();
    await expect(page.getByText('2 485,00 €')).toBeVisible();
    await expect(page.getByText('1 066,80 €')).toBeVisible();
    await expect(page.getByText('Salaire')).toBeVisible();
    await expect(page.getByText('Restaurant')).toBeVisible();
  });

  test('adds a transaction that survives a reload', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nouvelle transaction' })).toBeVisible();

    await page.getByLabel('Montant').fill('12,50');
    await page.getByLabel('Description').fill('Café test');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Transaction ajoutée')).toBeVisible();
    await expect(page.getByText('Café test')).toBeVisible();
    await expect(page.getByText('1 079,30 €')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Café test')).toBeVisible();
  });

  test('rejects an empty amount', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Saisissez un montant supérieur à zéro.')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('heading', { name: 'Nouvelle transaction' })).toBeHidden();
  });

  test('edits a transaction', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByText('Courses', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Modifier la transaction' })).toBeVisible();

    await page.getByLabel('Description').fill('Courses bio');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Transaction modifiée')).toBeVisible();
    await expect(page.getByText('Courses bio')).toBeVisible();
    await expect(page.getByText('Courses', { exact: true })).toHaveCount(0);
  });

  test('deletes a transaction into the trash and restores it', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByText('Cinéma', { exact: true }).click();
    await page.getByRole('dialog').filter({ hasText: 'Modifier la transaction' }).getByRole('button', { name: 'Supprimer', exact: true }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'Supprimer la transaction ?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();

    await expect(page.getByText('Déplacée dans la corbeille')).toBeVisible();
    await expect(page.getByText('Cinéma', { exact: true })).toHaveCount(0);
    await expect(page.getByText('1 066,80 €')).toHaveCount(0);

    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(page.getByText('Cinéma', { exact: true })).toBeVisible();
    await expect(page.getByText('1 066,80 €')).toBeVisible();
  });

  test('navigates between months', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Mois précédent' }).click();
    await expect(page.getByText('Aucune transaction').first()).toBeVisible();
    await page.getByRole('button', { name: 'Mois suivant' }).click();
    await expect(page.getByText('Salaire')).toBeVisible();
  });
});
