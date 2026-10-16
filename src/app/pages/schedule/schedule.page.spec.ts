import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_CATEGORIES, type Recurrence } from 'budget-lib';

import { BudgetService } from '../../data/budget.service';
import { DialogService } from '../../ui/dialog.service';
import { SettingsService } from '../../preferences/settings.service';
import { SchedulePage } from './schedule.page';

const DATA_KEY = 'budget-pwa:data:v1';

const rec = (over: Partial<Recurrence> = {}): Recurrence => ({
  id: 'r1', description: 'Loyer', category: 'Logement', kind: 'expense', amount: 700, day: 20, frequency: 'monthly',
  startMonth: '2026-10', ...over,
});

describe('SchedulePage', () => {
  let b: BudgetService;
  let s: SettingsService;
  let dialogs: DialogService;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: {}, categories: DEFAULT_CATEGORIES, recurrences: [rec()], thresholds: { low: 100, medium: 500, high: 1000 },
    }));
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    b = TestBed.inject(BudgetService);
    s = TestBed.inject(SettingsService);
    dialogs = TestBed.inject(DialogService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('deletes the series of a swiped row after confirmation', async () => {
    const c = TestBed.createComponent(SchedulePage).componentInstance;
    let pending = c.remove(rec());
    expect(dialogs.current()?.message).toBe(s.t().schedule.deleteBody('Loyer'));
    dialogs.close(null);
    await pending;
    expect(b.recurrences()).toHaveLength(1);

    pending = c.remove(rec());
    dialogs.close(s.t().common.delete);
    await pending;
    expect(b.recurrences()).toHaveLength(0);
  });

  it('keeps a single row open at a time', () => {
    const c = TestBed.createComponent(SchedulePage).componentInstance;
    c.setOpenRow('a', true);
    c.setOpenRow('b', true);
    expect(c.openRow()).toBe('b');
    c.setOpenRow('a', false);
    expect(c.openRow()).toBe('b');
    c.setOpenRow('b', false);
    expect(c.openRow()).toBeNull();
  });
});
