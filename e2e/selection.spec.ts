import { expect, hasHorizontalOverflow, open, test } from './fixtures';

test.describe('multi-selection', () => {
  test('selecting everything does not widen the page', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Sélectionner', exact: true }).click();
    await expect(page.getByRole('toolbar')).toBeVisible();

    await page.getByRole('button', { name: 'Tout sélectionner' }).click();
    await expect(page.getByRole('status').filter({ hasText: '8 sélectionnée(s)' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    const row = page.getByRole('checkbox').first();
    const { right } = await row.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { right: box.right };
    });
    expect(right).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test('toggles single rows and cancels', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Sélectionner', exact: true }).click();

    await page.getByRole('checkbox', { name: /Loyer/ }).click();
    await expect(page.getByRole('status').filter({ hasText: '1 sélectionnée(s)' })).toBeVisible();
    await page.getByRole('checkbox', { name: /Loyer/ }).click();
    await expect(page.getByRole('status').filter({ hasText: '0 sélectionnée(s)' })).toBeVisible();

    await page.getByRole('toolbar').getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('toolbar')).toBeHidden();
  });

  test('changes the category of the selection', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Sélectionner', exact: true }).click();
    await page.getByRole('checkbox', { name: /Loyer/ }).click();
    await page.getByRole('toolbar').getByRole('button', { name: 'Catégorie' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'Choisir une catégorie' });
    await dialog.getByRole('button', { name: 'Loisirs' }).click();
    await expect(page.getByText('1 modifiée(s)')).toBeVisible();
  });

  test('deletes the selection to the trash and restores it from there', async ({ app, page }) => {
    await open(app, '/budget');
    await page.getByRole('button', { name: 'Sélectionner', exact: true }).click();
    await page.getByRole('checkbox', { name: /Loyer/ }).click();
    await page.getByRole('checkbox', { name: /Pharmacie/ }).click();
    await page.getByRole('toolbar').getByRole('button', { name: 'Supprimer' }).click();

    await expect(page.getByText('2 déplacée(s) dans la corbeille')).toBeVisible();

    await open(app, '/trash');
    await expect(page.getByText('Loyer')).toBeVisible();
    await expect(page.getByText('Pharmacie')).toBeVisible();

    await page.getByRole('button', { name: 'Sélectionner', exact: true }).click();
    await page.getByRole('button', { name: 'Tout sélectionner' }).click();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await page.getByRole('toolbar').getByRole('button', { name: 'Restaurer' }).click();
    await expect(page.getByText('La corbeille est vide.')).toBeVisible();

    await open(app, '/budget');
    await expect(page.getByText('Loyer')).toBeVisible();
  });
});
