import { Component, computed, inject, signal } from '@angular/core';
import {
  buildPieSlices, clampMonth, sumByCategory, type MonthKey, type PieSlice, type Transaction,
} from 'budget-lib';

import { BudgetService } from '../../data/budget.service';
import { UI_ICONS, categoryGlyph } from '../../ui/icons';
import { LayoutService } from '../../ui/layout.service';
import { SettingsService } from '../../preferences/settings.service';
import { CategoryPieComponent } from '../../shared/charts/category-pie.component';
import { HeaderComponent } from '../../shared/chrome/header.component';
import { MonthBarComponent } from '../../shared/chrome/month-bar.component';
import { MonthPickerComponent } from '../../shared/chrome/month-picker.component';
import { TabBarComponent, type TabItem } from '../../shared/chrome/tab-bar.component';

@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [CategoryPieComponent, HeaderComponent, MonthBarComponent, MonthPickerComponent, TabBarComponent],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './stats.page.html',
})
export class StatsPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  readonly layout = inject(LayoutService);

  readonly tab = signal<'all' | 'recurring'>('all');
  readonly tabs: TabItem[] = [
    { key: 'all', icon: UI_ICONS.transactions },
    { key: 'recurring', icon: UI_ICONS.repeat },
  ];
  readonly monthPickerOpen = signal(false);

  /** Starts on the month being edited; browsing here leaves the budget page's month alone. */
  readonly month = signal<MonthKey>(this.b.selectedMonth());
  readonly transactions = computed(() => this.b.transactionsOf(this.month()));
  readonly expenseSlices = computed(() => this.slices(this.transactions().filter((t) => t.recurrenceId === undefined)));
  readonly recurringSlices = computed(() => this.slices(this.transactions().filter((t) => t.recurrenceId !== undefined)));

  chooseMonth(month: MonthKey): void {
    this.monthPickerOpen.set(false);
    this.month.set(clampMonth(month));
  }

  /** The expenses per category, as pie slices. */
  private slices(transactions: Transaction[]): PieSlice[] {
    return buildPieSlices(sumByCategory(transactions, 'expense').map(({ category, amount }) => ({
      label: category,
      icon: categoryGlyph(this.b.iconOf(category)),
      amount,
    })));
  }
}
