import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Transaction } from 'budget-lib';

import { BudgetService } from '../../data/budget.service';
import { LayoutService } from '../../ui/layout.service';
import { StatsPage } from './stats.page';

const DATA_KEY = 'budget-pwa:data:v1';

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 'one', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50, ...over,
});

describe('StatsPage', () => {
  let b: BudgetService;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: {
        '2026-10': [
          tx(), tx({ id: 'pay', kind: 'income', amount: 1500 }),
          tx({ id: 'rent', category: 'Logement', amount: 700, recurrenceId: 'r1' }),
          tx({ id: 'more', amount: 30 }),
        ],
        '2026-09': [tx({ id: 'sep', amount: 10, date: '2026-09-01' })],
      },
      categories: [{ name: 'Alimentation', icon: 'folder-symbolic' }, { name: 'Logement', icon: 'home-symbolic' }],
      recurrences: [],
      thresholds: { low: 0, medium: 100, high: 500 },
    }));
    b = TestBed.inject(BudgetService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const page = (): ComponentFixture<StatsPage> => {
    const fixture = TestBed.createComponent(StatsPage);
    fixture.detectChanges();
    return fixture;
  };

  it('builds the expense and recurring slices for the selected month', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    expect(c.month()).toBe('2026-10');
    expect(c.transactions()).toHaveLength(4);
    expect(c.expenseSlices().map((s) => [s.label, s.amount])).    toEqual([['Alimentation', 80]]);
    expect(c.expenseSlices().every((s) => s.icon !== '')).toBe(true);
    expect(c.recurringSlices().map((s) => s.label)).toEqual(['Logement']);
    expect(fixture.nativeElement.querySelectorAll('app-category-pie')).toHaveLength(2);
  });

  it('browses another month without touching the budget page month', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    c.monthPickerOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-month-picker')).not.toBeNull();
    c.chooseMonth('2026-09');
    expect(c.monthPickerOpen()).toBe(false);
    expect(c.month()).toBe('2026-09');
    expect(b.selectedMonth()).toBe('2026-10');
    expect(c.expenseSlices().map((s) => s.amount)).toEqual([10]);
    expect(c.recurringSlices()).toEqual([]);
  });

  it('switches tabs through the tab bar and renders wide', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    (fixture.nativeElement.querySelectorAll('app-tab-bar button')[1] as HTMLButtonElement).click();
    expect(c.tab()).toBe('recurring');
    TestBed.inject(LayoutService).wide.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-category-pie')).toHaveLength(2);
  });
});
