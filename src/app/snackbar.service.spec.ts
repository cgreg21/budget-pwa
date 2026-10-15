import { TestBed } from '@angular/core/testing';

import { BudgetService } from './budget.service';
import { DialogService } from './dialog.service';
import { SettingsService } from './settings.service';
import { SnackbarService } from './snackbar.service';
import { deleteTransaction } from './pages/budget/delete-transaction';

describe('SnackbarService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a message, replaces it, and hides it after a delay', () => {
    const snackbar = TestBed.inject(SnackbarService);
    snackbar.show('one');
    snackbar.show('two');
    expect(snackbar.current()).toMatchObject({ text: 'two', kind: 'success' });
    vi.advanceTimersByTime(3499);
    expect(snackbar.current()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(snackbar.current()).toBeNull();
  });

  it('keeps errors longer and runs the action once', () => {
    const snackbar = TestBed.inject(SnackbarService);
    snackbar.error('boom');
    vi.advanceTimersByTime(4000);
    expect(snackbar.current()).toMatchObject({ text: 'boom', kind: 'error' });
    const run = vi.fn();
    snackbar.show('done', { action: { label: 'Undo', run } });
    snackbar.runAction();
    snackbar.runAction();
    expect(run).toHaveBeenCalledTimes(1);
    expect(snackbar.current()).toBeNull();
  });

  it('offers to undo a deletion', async () => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    localStorage.setItem('budget-pwa:data:v1', JSON.stringify({
      months: { '2026-10': [{ id: 'one', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50 }] },
      categories: [{ name: 'Alimentation', icon: 'folder-symbolic' }],
      recurrences: [],
      thresholds: { low: 0, medium: 1, high: 2 },
    }));
    const b = TestBed.inject(BudgetService);
    const s = TestBed.inject(SettingsService);
    const dialogs = TestBed.inject(DialogService);
    const snackbar = TestBed.inject(SnackbarService);
    const pending = deleteTransaction(b, s, dialogs, b.transactions()[0], snackbar);
    dialogs.close(s.t().common.delete);
    await pending;
    expect(b.transactions()).toHaveLength(0);
    expect(snackbar.current()?.text).toBe(s.t().snackbar.movedToTrash);
    snackbar.runAction();
    expect(b.transactions()).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
