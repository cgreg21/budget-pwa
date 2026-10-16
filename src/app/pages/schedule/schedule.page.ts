import { Component, computed, inject, signal } from '@angular/core';
import { todayIsoDate } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { UI_ICONS, categoryGlyph } from '../../icons';
import { groupByMonth, scheduleOccurrences } from '../../schedule';
import { SettingsService } from '../../settings.service';
import { HeaderComponent } from '../../shared/header.component';

export const SCHEDULE_HORIZONS = [1, 3, 6, 12] as const;

/** The upcoming occurrences of the recurring transactions, month by month, with their totals. */
@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [HeaderComponent],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './schedule.page.html',
})
export class SchedulePage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  readonly ui = UI_ICONS;
  readonly horizons = SCHEDULE_HORIZONS;
  readonly horizon = signal<number>(3);

  readonly months = computed(() =>
    groupByMonth(scheduleOccurrences(this.b.recurrences(), todayIsoDate(), this.horizon())));
  readonly total = computed(() => {
    const months = this.months();
    const income = months.reduce((sum, month) => sum + month.income, 0);
    const expense = months.reduce((sum, month) => sum + month.expense, 0);
    return { income, expense, net: income - expense };
  });

  glyphOf(category: string): string {
    return categoryGlyph(this.b.iconOf(category));
  }
}
