import { expect, test as base, type Page } from '@playwright/test';

const DATA_KEY = 'budget-pwa:data:v1';
const SEEN_KEY = 'budget-pwa:onboarding-seen';

export const MONTH = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
})();

interface SeedTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  kind: 'income' | 'expense';
  amount: number;
}

const tx = (n: number, day: number, description: string, category: string, kind: 'income' | 'expense', amount: number): SeedTransaction =>
  ({ id: `seed-${n}`, date: `${MONTH}-${String(day).padStart(2, '0')}`, description, category, kind, amount });

export const SEED_TRANSACTIONS: SeedTransaction[] = [
  tx(1, 1, 'Salaire', 'Alimentation', 'income', 2450),
  tx(2, 2, 'Loyer', 'Logement', 'expense', 820),
  tx(3, 4, 'Courses', 'Alimentation', 'expense', 86.4),
  tx(4, 6, 'Abonnement train', 'Transport', 'expense', 75),
  tx(5, 8, 'Cinéma', 'Loisirs', 'expense', 24),
  tx(6, 9, 'Pharmacie', 'Santé', 'expense', 18.9),
  tx(7, 11, 'Restaurant', 'Alimentation', 'expense', 42.5),
  tx(8, 12, 'Remboursement', 'Santé', 'income', 35),
];

const SEED_DATA = {
  months: { [MONTH]: SEED_TRANSACTIONS },
  categories: [
    { name: 'Alimentation', icon: 'emoji-food-symbolic' },
    { name: 'Logement', icon: 'user-home-symbolic' },
    { name: 'Transport', icon: 'emoji-travel-symbolic' },
    { name: 'Loisirs', icon: 'emoji-activities-symbolic' },
    { name: 'Santé', icon: 'emote-love-symbolic' },
  ],
  recurrences: [],
  thresholds: { low: 0, medium: 500, high: 1000 },
};

export interface Fixtures {
  /** A page whose storage holds the seed budget (income 2 485 €, expenses 1 066,80 €) and where the onboarding is dismissed. */
  app: Page;
}

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    // Seeds once per browser context so that reloads exercise the persisted data.
    await page.addInitScript(([dataKey, seenKey, data]) => {
      if (localStorage.getItem('e2e-seeded')) return;
      localStorage.setItem('e2e-seeded', '1');
      localStorage.setItem(seenKey, '1');
      localStorage.setItem(dataKey, data);
    }, [DATA_KEY, SEEN_KEY, JSON.stringify(SEED_DATA)] as const);
    await use(page);
  },
});

export { expect };

/** True when the page can be scrolled sideways, which the layout must never allow. */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) return true;
    return Array.from(document.querySelectorAll<HTMLElement>('body *')).some((element) => {
      const { right, width } = element.getBoundingClientRect();
      if (width === 0 || right <= root.clientWidth + 1) return false;
      // Elements clipped by an ancestor (carousel panels, drawer, offscreen sheets) do not create a scrollbar.
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX !== 'visible') return false;
      }
      return true;
    });
  });
}

/** Opens a route and waits for the page header to render. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('h1')).toBeVisible();
}

/** Whether the permanent sidebar is shown (tablet and desktop) instead of the drawer. */
export function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 768;
}
