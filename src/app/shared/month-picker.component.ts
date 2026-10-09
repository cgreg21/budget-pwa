import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { currentMonthKey, FIRST_MONTH, LAST_MONTH, monthKeyFrom, yearOf, type MonthKey } from 'budget-lib';

import { BudgetService } from '../budget.service';
import { UI_ICONS } from '../icons';
import { SettingsService } from '../settings.service';
import { SheetComponent } from './sheet.component';

/**
 * Month picker: a year selector over a grid of the twelve months. Opened on the selected month,
 * it emits the chosen one, or `closed` when dismissed.
 */
@Component({
  selector: 'app-month-picker',
  imports: [SheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-sheet (dismiss)="closed.emit()">
      <div class="flex items-center">
        <button type="button" class="nav-btn" [disabled]="year() <= firstYear" (click)="year.set(year() - 1)">{{ ui.previous }}</button>
        <span class="flex-1 text-center text-lg font-bold">{{ year() }}</span>
        <button type="button" class="nav-btn" [disabled]="year() >= lastYear" (click)="year.set(year() + 1)">{{ ui.next }}</button>
      </div>
      <div class="my-2 grid grid-cols-3">
        @for (m of months(); track m.key) {
          <button type="button" class="chip m-1.5" [class]="m.class" (click)="picked.emit(m.key)">{{ m.label }}</button>
        }
      </div>
      <button type="button" class="chip" (click)="picked.emit(currentMonth)">{{ s.t().budget.currentMonth }}</button>
    </app-sheet>
  `,
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
