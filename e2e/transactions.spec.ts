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

  test('adds a series with a custom interval and an end month', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByLabel('Montant').fill('30');
    await page.getByLabel('Description').fill('Assurance test');

    await page.getByRole('switch').first().click();
    await page.getByRole('button', { name: 'Mensuelle', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Personnalisée', exact: true }).click();
    await page.getByLabel('Répéter tous les').fill('5');
    await page.locator('#editor-ended').click();
    await page.getByLabel('Dernier mois').fill('2030-12');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Transaction ajoutée')).toBeVisible();
    await page.goto('/settings/recurrences');
    await expect(page.getByText(/tous les 5 mois/)).toBeVisible();
    await expect(page.getByText(/Décembre 2030/)).toBeVisible();
  });

  test('adds a series repeating every few weeks', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByLabel('Montant').fill('9');
    await page.getByLabel('Description').fill('Sport test');
    await page.getByRole('switch').first().click();
    await page.getByRole('button', { name: 'Mensuelle', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Personnalisée', exact: true }).click();
    await page.getByRole('button', { name: 'Mois', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Semaines', exact: true }).click();
    await page.getByLabel('Répéter tous les').fill('2');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Transaction ajoutée')).toBeVisible();
    await page.goto('/settings/recurrences');
    await expect(page.getByText(/tous les 2 semaines/)).toBeVisible();
  });

  test('adds a monthly series spread over ten months a year', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByLabel('Montant').fill('180');
    await page.getByLabel('Description').fill('EDF test');
    await page.getByRole('switch').first().click();
    await page.locator('#editor-partial').click();
    await page.getByLabel('Mois par an').fill('10');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Transaction ajoutée')).toBeVisible();
    await page.goto('/settings/recurrences');
    await expect(page.getByText(/10 mois par an/)).toBeVisible();
  });

  test('rejects a number of months per year out of range', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByLabel('Montant').fill('180');
    await page.getByRole('switch').first().click();
    await page.locator('#editor-partial').click();
    await page.getByLabel('Mois par an').fill('12');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Saisissez un nombre entre 1 et 11.')).toBeVisible();
  });

  test('rejects an invalid custom interval', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByLabel('Montant').fill('30');
    await page.getByRole('switch').first().click();
    await page.getByRole('button', { name: 'Mensuelle', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Personnalisée', exact: true }).click();
    await page.getByLabel('Répéter tous les').fill('0');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Saisissez un nombre entre 1 et 60.')).toBeVisible();
  });

  test('adds a weekly series that repeats within the month', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByLabel('Montant').fill('15');
    await page.getByLabel('Description').fill('Marché test');
    await page.getByRole('switch').first().click();
    await page.getByRole('button', { name: 'Mensuelle', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hebdomadaire', exact: true }).click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Transaction ajoutée')).toBeVisible();
    await expect(page.getByText('Marché test').nth(1)).toBeVisible();
  });

  test('navigates between months', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Mois précédent' }).click();
    await expect(page.getByText('Aucune transaction').first()).toBeVisible();
    await page.getByRole('button', { name: 'Mois suivant' }).click();
    await expect(page.getByText('Salaire')).toBeVisible();
  });
});
