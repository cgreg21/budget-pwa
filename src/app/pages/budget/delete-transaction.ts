import type { Transaction } from 'budget-lib';

import type { BudgetService } from '../../data/budget.service';
import type { DialogService } from '../../ui/dialog.service';
import type { SettingsService } from '../../preferences/settings.service';
import type { SnackbarService } from '../../ui/snackbar.service';

/**
 * Deletes a transaction once confirmed; an occurrence of a recurring series can go alone or
 * with its series. Resolves to whether something was deleted.
 */
export async function deleteTransaction(
  b: BudgetService, s: SettingsService, dialogs: DialogService, transaction: Transaction, snackbar?: SnackbarService,
): Promise<boolean> {
  const t = s.t();
  const { id, recurrenceId } = transaction;

  if (recurrenceId && b.recurrenceOf(transaction)) {
    const choice = await dialogs.action({
      title: t.budget.deleteTitle,
      message: t.budget.deleteScopeBody,
      cancel: t.common.cancel,
      actions: [t.budget.thisOccurrence, t.budget.wholeSeries],
    });
    if (choice === t.budget.thisOccurrence) {
      b.remove(id);
      notifyTrashed(b, t, snackbar, id);
    } else if (choice === t.budget.wholeSeries) {
      b.removeSeries(id, recurrenceId);
      snackbar?.show(t.snackbar.seriesDeleted);
    } else return false;
    return true;
  }

  const details = `${transaction.description || t.common.noDescription} (${s.formatSigned(transaction.kind, transaction.amount)})`;
  const ok = await dialogs.confirm({
    title: t.budget.deleteTitle,
    message: t.budget.deleteBody(details),
    ok: t.common.delete,
    cancel: t.common.cancel,
  });
  if (ok) {
    b.remove(id);
    notifyTrashed(b, t, snackbar, id);
  }
  return ok;
}

function notifyTrashed(b: BudgetService, t: ReturnType<SettingsService['t']>, snackbar: SnackbarService | undefined, id: string): void {
  snackbar?.show(t.snackbar.movedToTrash, { action: { label: t.snackbar.undo, run: () => b.restore(id) } });
}
