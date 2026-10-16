import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_BALANCE_THRESHOLDS, DEFAULT_CATEGORIES, type Recurrence, type Transaction, type TransactionInput,
} from 'budget-lib';

import { BudgetService, type BudgetData } from './budget.service';

const DATA_KEY = 'budget-pwa:data:v1';

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 't1', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50, ...over,
});

const input = (over: Partial<Transaction> = {}): TransactionInput => {
  const { id: _id, ...rest } = tx(over);
  return rest;
};

const rec = (over: Partial<Recurrence> = {}): Recurrence => ({
  id: 'r1', description: 'Loyer', category: 'Logement', kind: 'expense', amount: 700, day: 3, frequency: 'monthly',
  startMonth: '2026-01', ...over,
});

const data = (over: Partial<BudgetData> = {}): BudgetData => ({
  months: {}, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), recurrences: [],
  thresholds: { ...DEFAULT_BALANCE_THRESHOLDS }, ...over,
});

const stored = (): BudgetData => JSON.parse(localStorage.getItem(DATA_KEY) ?? 'null') as BudgetData;

describe('BudgetService', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    TestBed.configureTestingModule({});
  });

  afterEach(() => vi.useRealTimers());

  const service = (): BudgetService => TestBed.inject(BudgetService);

  describe('loading', () => {
    it('starts from the defaults on the current month', () => {
      const b = service();
      expect(b.loadFailed).toBe(false);
      expect(b.selectedMonth()).toBe('2026-10');
      expect(b.transactions()).toEqual([]);
      expect(b.categories()).toEqual(DEFAULT_CATEGORIES);
      expect(b.thresholds()).toEqual(DEFAULT_BALANCE_THRESHOLDS);
      expect(b.recurrences()).toEqual([]);
      expect(b.totals()).toEqual({ income: 0, expense: 0, balance: 0 });
      expect(b.defaultTransactionDate).toBe('2026-10-13');
    });

    it('restores saved data and drops empty months', () => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({ months: { '2026-10': [tx()], '2026-09': [] } })));
      const b = service();
      expect(b.monthKeys()).toEqual(['2026-10']);
      expect(b.transactions()).toEqual([tx()]);
      expect(b.data().months['2026-09']).toBeUndefined();
    });

    it('sets corrupted data aside and warns', () => {
      localStorage.setItem(DATA_KEY, '{"months":');
      const b = service();
      expect(b.loadFailed).toBe(true);
      expect(localStorage.getItem(`${DATA_KEY}:corrupted`)).toBe('{"months":');
      expect(b.categories()).toEqual(DEFAULT_CATEGORIES);
    });

    it.each([
      [{ categories: 'x' }],
      [{ thresholds: { low: 2, medium: 1, high: 0 } }],
      [{ recurrences: [{ id: 1 }] }],
      [{ months: null }],
      [{ months: { 'nope': [] } }],
      [{ months: { '2026-01': [{ id: 't' }] } }],
      [null],
    ])('rejects malformed data %j', (patch) => {
      localStorage.setItem(DATA_KEY, JSON.stringify(patch === null ? null : { ...data(), ...patch }));
      expect(service().loadFailed).toBe(true);
    });

    it('creates the missing occurrences of the current month at start-up', () => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({ recurrences: [rec()] })));
      const b = service();
      expect(b.transactions()).toHaveLength(1);
      expect(b.transactions()[0]).toMatchObject({ date: '2026-10-03', recurrenceId: 'r1', amount: 700 });
      expect(stored().months['2026-10']).toHaveLength(1);
    });

    it('falls back to a timestamp id when randomUUID is unavailable', () => {
      vi.stubGlobal('crypto', {});
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify(data({ recurrences: [rec()] })));
        expect(service().transactions()[0].id).toMatch(/^\d+-[0-9a-f]+$/);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('derived state', () => {
    beforeEach(() => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({
        months: {
          '2026-10': [tx({ id: 'a', date: '2026-10-01', amount: 10 }), tx({ id: 'b', date: '2026-10-20', kind: 'income', amount: 100 })],
          '2026-08': [tx({ id: 'c', date: '2026-08-15', amount: 5 })],
        },
      })));
    });

    it('sorts, totals and lists the months', () => {
      const b = service();
      expect(b.sorted().map((t) => t.id)).toEqual(['b', 'a']);
      expect(b.totals()).toEqual({ income: 100, expense: 10, balance: 90 });
      expect(b.monthKeys()).toEqual(['2026-08', '2026-10']);
      expect(b.monthsWithData()).toEqual(['2026-08', '2026-10']);
      expect(b.monthlyTotals()).toEqual([
        { month: '2026-08', income: 0, expense: 5 }, { month: '2026-10', income: 100, expense: 10 },
      ]);
      expect(b.allTransactions().map((t) => t.id)).toEqual(['c', 'a', 'b']);
      expect(b.transactionsOf('2025-01')).toEqual([]);
    });

    it('selects months within bounds and ignores invalid keys', () => {
      const b = service();
      b.selectMonth('2026-08');
      expect(b.transactions().map((t) => t.id)).toEqual(['c']);
      b.selectMonth('garbage');
      expect(b.selectedMonth()).toBe('2026-08');
      b.selectMonth('1900-01');
      expect(b.selectedMonth()).toBe('1970-01');
      b.selectMonth('2150-06');
      expect(b.selectedMonth()).toBe('2099-12');
    });

    it('resolves category defaults and icons', () => {
      const b = service();
      expect(b.defaultCategory).toBe('Autres');
      expect(b.iconOf('Logement')).toBe('user-home-symbolic');
      expect(b.iconOf('Unknown')).toBe('folder-symbolic');
      b.removeCategory('Autres');
      expect(b.defaultCategory).toBe('Alimentation');
    });
  });

  describe('transactions', () => {
    it('adds a one-off transaction and selects its month', () => {
      const b = service();
      const changes = vi.fn();
      b.transactionChanges.subscribe(changes);
      b.add({ date: '2026-11-02', description: 'x', category: 'Autres', kind: 'expense', amount: 3 });
      expect(b.selectedMonth()).toBe('2026-11');
      expect(b.transactions()).toHaveLength(1);
      expect(b.transactions()[0].id).toMatch(/[0-9a-f-]{36}/);
      expect(b.recurrences()).toEqual([]);
      expect(stored().months['2026-11']).toHaveLength(1);
      expect(changes).toHaveBeenCalledTimes(1);
    });

    it('adds a recurring transaction with its template', () => {
      const b = service();
      b.add({ date: '2026-10-07', description: 'Gym', category: 'Loisirs', kind: 'expense', amount: 30 }, { frequency: 'monthly', occurrences: 3 });
      const [created] = b.transactions();
      expect(b.recurrences()).toHaveLength(1);
      expect(created.recurrenceId).toBe(b.recurrences()[0].id);
      expect(b.recurrences()[0]).toMatchObject({ day: 7, startMonth: '2026-10', occurrences: 3, amount: 30 });
      expect(b.recurrenceOf(created)).toBe(b.recurrences()[0]);
      expect(b.recurrenceOf(tx())).toBeUndefined();
      expect(b.recurrenceOf(tx({ recurrenceId: 'ghost' }))).toBeUndefined();
      b.selectMonth('2026-11');
      expect(b.transactions()).toHaveLength(1);
      expect(b.transactions()[0].date).toBe('2026-11-07');
      b.selectMonth('2027-01');
      expect(b.transactions()).toEqual([]);
    });

    it('updates a transaction, moving it to another month when the date changes', () => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({ months: { '2026-10': [tx()] } })));
      const b = service();
      b.update('t1', input({ date: '2026-09-30', amount: 70 }));
      expect(b.selectedMonth()).toBe('2026-09');
      expect(b.transactions()).toEqual([{ ...tx(), date: '2026-09-30', amount: 70 }]);
      expect(b.monthKeys()).toEqual(['2026-09']);
      b.update('t1', input({ date: '2026-09-01' }));
      expect(b.transactions()[0].date).toBe('2026-09-01');
    });

    it('removes transactions and deletes months left empty', () => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({ months: { '2026-10': [tx(), tx({ id: 't2' })] } })));
      const b = service();
      b.remove('t1');
      expect(b.transactions().map((t) => t.id)).toEqual(['t2']);
      b.remove('missing');
      b.remove('t2');
      expect(b.monthKeys()).toEqual([]);
      expect(stored().months).toEqual({});
    });

    it('removes a series together with the current occurrence', () => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({
        recurrences: [rec()],
        months: { '2026-09': [tx({ id: 'old', date: '2026-09-03', recurrenceId: 'r1' })] },
      })));
      const b = service();
      const [occurrence] = b.transactions();
      b.removeSeries(occurrence.id, 'r1');
      expect(b.recurrences()).toEqual([]);
      expect(b.transactions()).toEqual([]);
      expect(b.transactionsOf('2026-09')).toHaveLength(1);
    });
  });

  describe('updateSeries', () => {
    const start = (): BudgetService => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({
        recurrences: [rec({ occurrences: 12 })],
        months: { '2026-10': [tx({ id: 'o', date: '2026-10-03', recurrenceId: 'r1', amount: 700, category: 'Logement' })] },
      })));
      return service();
    };

    it('turns an occurrence into a one-off transaction with null settings', () => {
      const b = start();
      b.updateSeries('o', input({ date: '2026-10-03', recurrenceId: 'r1', amount: 710 }), null);
      expect(b.recurrences()).toEqual([]);
      expect(b.transactions()[0]).toMatchObject({ id: 'o', amount: 710 });
      expect(b.transactions()[0].recurrenceId).toBeUndefined();
    });

    it('edits the existing template but keeps its day and start month', () => {
      const b = start();
      b.updateSeries('o', input({ date: '2026-10-20', recurrenceId: 'r1', amount: 750, description: 'Rent' }), { frequency: 'yearly' });
      expect(b.transactions()[0]).toMatchObject({ date: '2026-10-20', amount: 750 });
      expect(b.recurrences()[0]).toEqual({
        id: 'r1', description: 'Rent', category: 'Alimentation', kind: 'expense', amount: 750, day: 3,
        frequency: 'yearly', startMonth: '2026-01', occurrences: undefined,
      });
    });

    it('creates a template when the transaction had none', () => {
      const b = start();
      b.updateSeries('o', input({ date: '2026-10-03', recurrenceId: 'unknown' }), { frequency: 'quarterly', occurrences: 2 });
      expect(b.recurrences()).toHaveLength(2);
      const created = b.recurrences().find((r) => r.id !== 'r1');
      expect(created).toMatchObject({ frequency: 'quarterly', occurrences: 2, day: 3, startMonth: '2026-10' });
      expect(b.transactions()[0].recurrenceId).toBe(created?.id);
    });

    it('removes a template on its own', () => {
      const b = start();
      b.removeRecurrence('r1');
      expect(b.recurrences()).toEqual([]);
      expect(b.transactions()).toHaveLength(1);
    });
  });

  describe('categories and thresholds', () => {
    it('adds, renames and removes categories while keeping at least one', () => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({ categories: [{ name: 'A', icon: 'folder-symbolic' }] })));
      const b = service();
      const changes = vi.fn();
      b.transactionChanges.subscribe(changes);
      const categoryChanges = vi.fn();
      b.categoryChanges.subscribe(categoryChanges);
      b.removeCategory('A');
      expect(b.categories()).toHaveLength(1);
      b.addCategory('B', 'tabler:bus');
      b.updateCategory('A', { name: 'Z', icon: 'tabler:tag' });
      expect(b.categories()).toEqual([{ name: 'Z', icon: 'tabler:tag' }, { name: 'B', icon: 'tabler:bus' }]);
      b.removeCategory('Z');
      expect(b.categories()).toEqual([{ name: 'B', icon: 'tabler:bus' }]);
      expect(stored().categories).toEqual([{ name: 'B', icon: 'tabler:bus' }]);
      expect(changes).not.toHaveBeenCalled();
      expect(categoryChanges).toHaveBeenCalledTimes(3);
    });

    it('stores a category list from the calendar without notifying or touching transactions', () => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({ categories: [{ name: 'A', icon: 'folder-symbolic' }], months: { '2026-10': [tx({ category: 'A' })] } })));
      const b = service();
      const changes = vi.fn();
      b.transactionChanges.subscribe(changes);
      b.categoryChanges.subscribe(changes);
      b.applyCalendarChanges([], [], b.allTransactions(), [{ name: 'B', icon: 'tabler:bus' }]);
      expect(b.categories()).toEqual([{ name: 'B', icon: 'tabler:bus' }, { name: 'A', icon: expect.any(String) }]);
      expect(stored().categories).toEqual(b.categories());
      expect(b.transactionsOf('2026-10')).toHaveLength(1);
      expect(changes).not.toHaveBeenCalled();
    });

    it('stores ordered thresholds and refuses others', () => {
      const b = service();
      b.setThresholds({ low: 1, medium: 2, high: 3 });
      expect(stored().thresholds).toEqual({ low: 1, medium: 2, high: 3 });
      expect(() => b.setThresholds({ low: 3, medium: 2, high: 1 })).toThrow('ascending');
      expect(b.thresholds()).toEqual({ low: 1, medium: 2, high: 3 });
    });

    it('replaces everything and applies recurrences to the selected month', () => {
      const b = service();
      const changes = vi.fn();
      b.transactionChanges.subscribe(changes);
      b.replaceData(data({ recurrences: [rec()], months: { '2026-01': [tx({ date: '2026-01-02' })] } }));
      expect(b.monthKeys()).toEqual(['2026-01', '2026-10']);
      expect(b.transactions()[0]).toMatchObject({ recurrenceId: 'r1' });
      expect(stored().months['2026-10']).toHaveLength(1);
      expect(changes).toHaveBeenCalled();
    });
  });

  describe('applyCalendarChanges', () => {
    const local = (): BudgetService => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({ months: { '2026-10': [tx({ id: 'a' }), tx({ id: 'b' })] } })));
      return service();
    };

    it('rejects invalid transactions', () => {
      const b = local();
      expect(() => b.applyCalendarChanges([{ ...tx(), amount: 'x' as unknown as number }], [], [])).toThrow('Invalid');
      expect(() => b.applyCalendarChanges([tx({ date: 'nope' })], [], [])).toThrow('Invalid');
      expect(() => b.applyCalendarChanges([tx({ category: '' })], [], [])).toThrow('Invalid');
    });

    it('applies upserts and removals, adding unknown categories, without notifying', () => {
      const b = local();
      const changes = vi.fn();
      b.transactionChanges.subscribe(changes);
      const snapshot = b.allTransactions();
      b.applyCalendarChanges(
        [tx({ id: 'a', amount: 99, category: 'Vacances' }), tx({ id: 'new', date: '2026-12-24', category: 'Vacances' })],
        ['b'], snapshot,
      );
      expect(b.transactionsOf('2026-10')).toEqual([tx({ id: 'a', amount: 99, category: 'Vacances' })]);
      expect(b.transactionsOf('2026-12')).toEqual([tx({ id: 'new', date: '2026-12-24', category: 'Vacances' })]);
      expect(b.categories().at(-1)).toEqual({ name: 'Vacances', icon: 'folder-symbolic' });
      expect(b.categories().filter((c) => c.name === 'Vacances')).toHaveLength(1);
      expect(stored().months['2026-12']).toHaveLength(1);
      expect(changes).not.toHaveBeenCalled();
    });

    it('skips items edited or removed while the request was in flight', () => {
      const b = local();
      const snapshot = b.allTransactions().map((t) => ({ ...t }));
      b.update('a', input({ amount: 1 }));
      b.remove('b');
      b.applyCalendarChanges([tx({ id: 'a', amount: 99 })], ['b'], snapshot);
      expect(b.transactionsOf('2026-10')).toEqual([tx({ id: 'a', amount: 1 })]);
    });

    it('drops a month that becomes empty', () => {
      const b = local();
      const snapshot = b.allTransactions();
      b.applyCalendarChanges([], ['a', 'b'], snapshot);
      expect(b.monthKeys()).toEqual([]);
    });
  });

  describe('bulk actions', () => {
    beforeEach(() => {
      localStorage.setItem(DATA_KEY, JSON.stringify(data({ months: { '2026-10': [tx({ id: 'a' }), tx({ id: 'b' }), tx({ id: 'c' })] } })));
    });

    it('moves several transactions to the trash, then restores them', () => {
      const b = service();
      b.removeMany(['a', 'b']);
      expect(b.transactions().map((t) => t.id)).toEqual(['c']);
      expect(b.trash().map((t) => t.id).sort()).toEqual(['a', 'b']);
      b.restoreMany(['a', 'b']);
      expect(b.transactions().map((t) => t.id).sort()).toEqual(['a', 'b', 'c']);
      expect(b.trash()).toEqual([]);
    });

    it('changes the category of several transactions', () => {
      const b = service();
      b.setCategoryMany(['a', 'c'], 'Loisirs');
      expect(b.transactions().filter((t) => t.category === 'Loisirs').map((t) => t.id).sort()).toEqual(['a', 'c']);
    });

    it('deletes several trashed transactions for good', () => {
      const b = service();
      b.removeMany(['a', 'b']);
      b.deleteForeverMany(['a']);
      expect(b.trash().map((t) => t.id)).toEqual(['b']);
    });
  });
});