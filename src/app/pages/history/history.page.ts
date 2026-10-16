import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { clampMonth, monthsBetween, shiftMonth, type MonthKey } from 'budget-lib';

import { BudgetService, type MonthlyTotals } from '../../data/budget.service';
import { UI_ICONS } from '../../ui/icons';
import { SettingsService } from '../../preferences/settings.service';
import { HeaderComponent } from '../../shared/chrome/header.component';
import { MonthPickerComponent } from '../../shared/chrome/month-picker.component';
import { MonthlyLinesComponent } from '../../shared/charts/monthly-lines.component';

/** Longest interval shown, so the chart stays readable. */
const MAX_MONTHS = 24;
const DEFAULT_MONTHS = 6;

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [HeaderComponent, MonthlyLinesComponent, MonthPickerComponent],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './history.page.html',
})
export class HistoryPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  private readonly router = inject(Router);
  readonly ui = UI_ICONS;

  readonly end = signal<MonthKey>(this.b.selectedMonth());
  readonly start = signal<MonthKey>(shiftMonth(this.end(), 1 - DEFAULT_MONTHS));
  /** The bound of the interval being chosen in the month picker. */
  readonly choosing = signal<'start' | 'end' | null>(null);

  /** One entry per month of the interval, empty months included. */
  readonly rows = computed<MonthlyTotals[]>(() => {
    const totals = new Map(this.b.monthlyTotals().map((row) => [row.month, row]));
    const count = monthsBetween(this.start(), this.end()) + 1;
    return Array.from({ length: count }, (_, index) => {
      const month = shiftMonth(this.start(), index);
      return totals.get(month) ?? { month, income: 0, expense: 0 };
    });
  });
  readonly history = computed(() => [...this.rows()].reverse().map((row) => {
    // Each bar is relative to its own month: income and expenses share the whole track.
    const total = row.income + row.expense;
    return { ...row, incomeShare: total > 0 ? (row.income / total) * 100 : 0, expenseShare: total > 0 ? (row.expense / total) * 100 : 0 };
  }));

  /** Opens the transactions page on the tapped month. */
  open(month: MonthKey): void {
    this.b.selectMonth(month);
    void this.router.navigateByUrl('/budget');
  }

  /** Moves the chosen bound of the interval to the picked month, dragging the other one if needed. */
  choose(month: MonthKey): void {
    const bound = this.choosing();
    this.choosing.set(null);
    const picked = clampMonth(month);

    if (bound === 'start') {
      this.start.set(picked);
      if (this.end() < picked) this.end.set(picked);
      else if (monthsBetween(picked, this.end()) >= MAX_MONTHS) this.end.set(shiftMonth(picked, MAX_MONTHS - 1));
    } else if (bound === 'end') {
      this.end.set(picked);
      if (this.start() > picked) this.start.set(picked);
      else if (monthsBetween(this.start(), picked) >= MAX_MONTHS) this.start.set(shiftMonth(picked, 1 - MAX_MONTHS));
    }
  }
}
