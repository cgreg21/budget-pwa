import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { currentMonthKey, FIRST_MONTH, LAST_MONTH, monthKeyFrom, yearOf, type MonthKey } from 'budget-lib';

import { BudgetService } from '../../data/budget.service';
import { UI_ICONS } from '../../ui/icons';
import { SettingsService } from '../../preferences/settings.service';
import { SheetComponent } from '../overlays/sheet.component';

/**
 * Month picker: a year selector over a grid of the twelve months. Opened on the selected month,
 * it emits the chosen one, or `closed` when dismissed.
 */
@Component({
  selector: 'app-month-picker',
  imports: [SheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month-picker.component.html',
})
export class MonthPickerComponent implements OnInit {
  readonly s = inject(SettingsService);
  private readonly b = inject(BudgetService);
  readonly ui = UI_ICONS;
  readonly currentMonth = currentMonthKey();

  readonly month = input.required<MonthKey>();
  readonly picked = output<MonthKey>();
  readonly closed = output<void>();

  /** Months holding transactions, and the month being edited, as of when the picker opens. */
  private readonly withData = new Set(this.b.monthsWithData());
  private readonly editing = this.b.selectedMonth();

  readonly firstYear = yearOf(FIRST_MONTH);
  readonly lastYear = yearOf(LAST_MONTH);
  readonly year = signal(this.firstYear);
  readonly months = computed(() =>
    this.s.t().months.map((label, index) => {
      const key = monthKeyFrom(this.year(), index + 1);
      return { key, label, class: this.chipClass(key) };
    }));

  ngOnInit(): void {
    this.year.set(yearOf(this.month()));
  }

  /** Selected month first, then the month being edited, then months with data. */
  private chipClass(key: MonthKey): string {
    if (key === this.month()) return 'chip-active';
    if (key === this.editing) return 'chip-editing';
    return this.withData.has(key) ? 'chip-data' : '';
  }
}
