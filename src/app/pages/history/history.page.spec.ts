import { provideRouter, Router } from '@angular/router';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Transaction } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { HistoryPage } from './history.page';

const DATA_KEY = 'budget-pwa:data:v1';

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 'one', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50, ...over,
});

describe('HistoryPage', () => {
  let b: BudgetService;
  let router: Router;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    vi.stubGlobal('ResizeObserver', undefined);
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: {
        '2026-10': [tx(), tx({ id: 'pay', kind: 'income', amount: 150 })],
        '2026-08': [tx({ id: 'aug', amount: 20, date: '2026-08-01' })],
      },
      categories: [{ name: 'Alimentation', icon: 'folder-symbolic' }],
      recurrences: [],
      thresholds: { low: 0, medium: 100, high: 500 },
    }));
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    b = TestBed.inject(BudgetService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const page = (): ComponentFixture<HistoryPage> => {
    const fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    return fixture;
  };

  it('shows the last six months, empty ones included, newest first', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    expect(c.start()).toBe('2026-05');
    expect(c.end()).toBe('2026-10');
    expect(c.rows().map((r) => r.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(c.rows()[3]).toEqual({ month: '2026-08', income: 0, expense: 20 });
    const history = c.history();
    expect(history[0]).toEqual({ month: '2026-10', income: 150, expense: 50, incomeShare: 75, expenseShare: 25 });
    expect(history[1]).toMatchObject({ month: '2026-09', incomeShare: 0, expenseShare: 0 });
    expect(history[2]).toMatchObject({ month: '2026-08', incomeShare: 0, expenseShare: 100 });
    expect(fixture.nativeElement.querySelector('app-monthly-lines')).not.toBeNull();
  });

  it('opens a month on the budget page', async () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    page().componentInstance.open('2026-08');
    expect(b.selectedMonth()).toBe('2026-08');
    expect(navigate).toHaveBeenCalledWith('/budget');
  });

  it('moves the start bound and drags the end when needed', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    c.choosing.set('start');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-month-picker')).not.toBeNull();
    c.choose('2026-07');
    expect(c.choosing()).toBeNull();
    expect([c.start(), c.end()]).toEqual(['2026-07', '2026-10']);

    c.choosing.set('start');
    c.choose('2026-12');
    expect([c.start(), c.end()]).toEqual(['2026-12', '2026-12']);

    c.choosing.set('start');
    c.choose('2020-01');
    expect([c.start(), c.end()]).toEqual(['2020-01', '2021-12']);
  });

  it('moves the end bound and drags the start when needed', () => {
    const c = page().componentInstance;
    c.choosing.set('end');
    c.choose('2026-09');
    expect([c.start(), c.end()]).toEqual(['2026-05', '2026-09']);

    c.choosing.set('end');
    c.choose('2026-01');
    expect([c.start(), c.end()]).toEqual(['2026-01', '2026-01']);

    c.choosing.set('end');
    c.choose('2030-06');
    expect([c.start(), c.end()]).toEqual(['2028-07', '2030-06']);
  });

  it('ignores a pick without a bound being chosen', () => {
    const c = page().componentInstance;
    c.choose('2026-01');
    expect([c.start(), c.end()]).toEqual(['2026-05', '2026-10']);
  });
});
