import { TestBed } from '@angular/core/testing';
import type { Transaction } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { SettingsService } from '../../settings.service';
import { SnackbarService } from '../../snackbar.service';
import { deleteTransaction } from './delete-transaction';

const DATA_KEY = 'budget-pwa:data:v1';

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 'one', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50, ...over,
});

describe('deleteTransaction', () => {
  let b: BudgetService;
  let s: SettingsService;
  let dialogs: DialogService;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: { '2026-10': [tx(), tx({ id: 'occ', description: '', recurrenceId: 'r1' }), tx({ id: 'orphan', recurrenceId: 'gone' })] },
      categories: [{ name: 'Alimentation', icon: 'folder-symbolic' }],
      recurrences: [{ id: 'r1', description: '', category: 'Alimentation', kind: 'expense', amount: 50, day: 5, frequency: 'monthly', startMonth: '2026-10' }],
      thresholds: { low: 0, medium: 1, high: 2 },
    }));
    b = TestBed.inject(BudgetService);
    s = TestBed.inject(SettingsService);
    dialogs = TestBed.inject(DialogService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const ids = (): string[] => b.transactions().map((t) => t.id);

  it('deletes a one-off transaction once confirmed', async () => {
    const pending = deleteTransaction(b, s, dialogs, tx());
    expect(dialogs.current()).toMatchObject({
      title: s.t().budget.deleteTitle, message: s.t().budget.deleteBody('Courses (-50,00\u00A0\u20AC)'), actions: [s.t().common.delete],
    });
    dialogs.close(s.t().common.delete);
    expect(await pending).toBe(true);
    expect(ids()).toEqual(['occ', 'orphan']);
  });

  it('keeps the transaction when the confirmation is cancelled', async () => {
    const pending = deleteTransaction(b, s, dialogs, tx());
    dialogs.close(null);
    expect(await pending).toBe(false);
    expect(ids()).toHaveLength(3);
  });

  it('treats an occurrence of a vanished series as a one-off', async () => {
    const pending = deleteTransaction(b, s, dialogs, tx({ id: 'orphan', recurrenceId: 'gone' }));
    expect(dialogs.current()?.actions).toEqual([s.t().common.delete]);
    dialogs.close(s.t().common.delete);
    expect(await pending).toBe(true);
    expect(ids()).toEqual(['one', 'occ']);
  });

  it('offers to delete only the occurrence of a series', async () => {
    const occurrence = tx({ id: 'occ', description: '', recurrenceId: 'r1' });
    const pending = deleteTransaction(b, s, dialogs, occurrence);
    expect(dialogs.current()).toMatchObject({
      message: s.t().budget.deleteScopeBody, actions: [s.t().budget.thisOccurrence, s.t().budget.wholeSeries],
    });
    dialogs.close(s.t().budget.thisOccurrence);
    expect(await pending).toBe(true);
    expect(ids()).toEqual(['one', 'orphan']);
    expect(b.recurrences()).toHaveLength(1);
  });

  it('deletes the whole series when asked', async () => {
    const pending = deleteTransaction(b, s, dialogs, tx({ id: 'occ', recurrenceId: 'r1' }));
    dialogs.close(s.t().budget.wholeSeries);
    expect(await pending).toBe(true);
    expect(ids()).toEqual(['one', 'orphan']);
    expect(b.recurrences()).toEqual([]);
  });

  it('keeps a series when the choice is cancelled', async () => {
    const pending = deleteTransaction(b, s, dialogs, tx({ id: 'occ', recurrenceId: 'r1' }));
    dialogs.close(null);
    expect(await pending).toBe(false);
    expect(ids()).toHaveLength(3);
    expect(b.recurrences()).toHaveLength(1);
  });
});
