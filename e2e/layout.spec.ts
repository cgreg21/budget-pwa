import { expect, hasHorizontalOverflow, isWide, open, test } from './fixtures';

const ROUTES = ['/budget', '/categories', '/schedule', '/stats', '/history', '/trash', '/settings', '/settings/profiles'];

test.describe('responsive layout', () => {
  for (const route of ROUTES) {
    test(`${route} has no horizontal scrollbar`, async ({ app, page }) => {
      await open(app, route);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }

  test('shows the sidebar on wide screens and the drawer on phones', async ({ app, page }) => {
    await open(app, '/budget');
    const sidebar = page.locator('aside');
    const drawerRight = () => sidebar.evaluate((element) => element.getBoundingClientRect().right);
    if (isWide(page)) {
      expect(await drawerRight()).toBeGreaterThan(200);
      await expect(page.getByRole('button', { name: 'Ajouter', exact: true })).toBeVisible();
    } else {
      expect(await drawerRight()).toBeLessThanOrEqual(0);
      await page.getByRole('button').first().click();
      await expect.poll(drawerRight).toBeGreaterThan(200);
    }
  });

  test('keeps the transaction list inside the viewport', async ({ app, page }) => {
    await open(app, '/budget');
    const width = page.viewportSize()!.width;
    for (const title of ['Salaire', 'Loyer', 'Abonnement train']) {
      const box = await page.getByText(title, { exact: true }).boundingBox();
      expect(box, title).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  });
});
