import { Component, computed, inject, signal } from '@angular/core';
import { todayIsoDate, type Recurrence } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { UI_ICONS, categoryGlyph } from '../../icons';
import { groupByMonth, scheduleOccurrences } from '../../schedule';
import { SettingsService } from '../../settings.service';
import { EditorModalComponent } from '../budget/editor-modal.component';
import { HeaderComponent } from '../../shared/header.component';
import { SnackbarService } from '../../snackbar.service';
import { SwipeRowComponent } from '../../shared/swipe-row.component';

export const SCHEDULE_HORIZONS = [1, 3, 6, 12] as const;

/** The upcoming occurrences of the recurring transactions, month by month, with their totals. */
@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [HeaderComponent, EditorModalComponent, SwipeRowComponent],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './schedule.page.html',
})
export class SchedulePage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  readonly ui = UI_ICONS;
  readonly horizons = SCHEDULE_HORIZONS;
  readonly horizon = signal<number>(3);
  readonly editing = signal(false);
  readonly openRow = signal<string | null>(null);
  private readonly dialogs = inject(DialogService);
  private readonly snackbar = inject(SnackbarService);

  readonly months = computed(() =>
    groupByMonth(scheduleOccurrences(this.b.recurrences(), todayIsoDate(), this.horizon())));
  readonly total = computed(() => {
    const months = this.months();
    const income = months.reduce((sum, month) => sum + month.income, 0);
    const expense = months.reduce((sum, month) => sum + month.expense, 0);
    return { income, expense, net: income - expense };
  });

  setOpenRow(key: string, open: boolean | 'restore'): void {
    if (open !== false) this.openRow.set(key);
    else if (this.openRow() === key) this.openRow.set(null);
  }

  async remove(recurrence: Recurrence): Promise<void> {
    const t = this.s.t();
    this.openRow.set(null);
    const ok = await this.dialogs.confirm({
      title: t.common.delete,
      message: t.schedule.deleteBody(recurrence.description || t.common.noDescription),
      ok: t.common.delete,
      cancel: t.common.cancel,
    });
    if (!ok) return;
    this.b.removeRecurrence(recurrence.id);
    this.snackbar.show(t.snackbar.seriesDeleted);
  }

  glyphOf(category: string): string {
    return categoryGlyph(this.b.iconOf(category));
  }
}
