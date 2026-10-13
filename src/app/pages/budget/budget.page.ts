import { Component, computed, inject, signal } from '@angular/core';
import {
  balanceLevel, dayOf, filterTransactions, isFilterActive, NO_FILTER, type Transaction, type TransactionFilter,
} from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { UI_ICONS, categoryGlyph } from '../../icons';
import { LayoutService } from '../../layout.service';
import { SettingsService } from '../../settings.service';
import { HeaderComponent } from '../../shared/header.component';
import { MonthBarComponent } from '../../shared/month-bar.component';
import { MonthPickerComponent } from '../../shared/month-picker.component';
import { SwipeRowComponent } from '../../shared/swipe-row.component';
import { TabBarComponent, type TabItem } from '../../shared/tab-bar.component';
import { deleteTransaction } from './delete-transaction';
import { EditorModalComponent } from './editor-modal.component';
import { FiltersModalComponent } from './filters-modal.component';

const TABS = ['oneoff', 'recurring'] as const;
type Tab = (typeof TABS)[number];

const LEVEL_CARD = {
  critical: 'border-[var(--c-lvl-critical-line)] bg-[var(--c-lvl-critical)]',
  low: 'border-[var(--c-lvl-low-line)] bg-[var(--c-lvl-low)]',
  medium: 'border-[var(--c-lvl-medium-line)] bg-[var(--c-lvl-medium)]',
  high: 'border-[var(--c-lvl-high-line)] bg-[var(--c-lvl-high)]',
} as const;
const LEVEL_TEXT = {
  critical: 'text-bad',
  low: 'text-amber',
  medium: 'text-blue',
  high: 'text-green',
} as const;

@Component({
  selector: 'app-budget-page',
  standalone: true,
  imports: [
    HeaderComponent, MonthBarComponent, MonthPickerComponent, SwipeRowComponent, TabBarComponent,
    EditorModalComponent, FiltersModalComponent,
  ],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './budget.page.html',
})
export class BudgetPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  readonly layout = inject(LayoutService);
  private readonly dialogs = inject(DialogService);
  readonly ui = UI_ICONS;

  readonly tab = signal<Tab>('oneoff');
  readonly filter = signal<TransactionFilter>(NO_FILTER);
  readonly hasFilters = computed(() => isFilterActive(this.filter()));
  readonly filtersOpen = signal(false);
  readonly monthPickerOpen = signal(false);
  /** `null` is closed, `''` is a new transaction, otherwise the id of the transaction edited. */
  readonly editing = signal<string | null>(null);
  /** The row currently swiped open. */
  readonly openRow = signal<string | null>(null);

  readonly level = computed(() => balanceLevel(this.b.totals().balance, this.b.thresholds()));
  readonly levelCard = computed(() => LEVEL_CARD[this.level()]);
  readonly levelText = computed(() => LEVEL_TEXT[this.level()]);
  readonly recurringCount = computed(() => this.b.transactions().filter((t) => t.recurrenceId !== undefined).length);
  readonly oneOffCount = computed(() => this.b.transactions().length - this.recurringCount());
  readonly tabs = computed<TabItem[]>(() => [
    { key: 'oneoff', icon: UI_ICONS.transactions, badge: this.oneOffCount() },
    { key: 'recurring', icon: UI_ICONS.repeat, badge: this.recurringCount() },
  ]);
  /** Both tabs are rendered at all times so they can slide against each other. */
  readonly panels = computed(() => {
    const t = this.s.t().budget;
    const filtered = filterTransactions(this.b.sorted(), this.filter());
    return TABS.map((key) => {
      const recurring = key === 'recurring';
      return {
        key,
        items: filtered.filter((transaction) => (transaction.recurrenceId !== undefined) === recurring),
        message: filtered.length > 0 || this.hasFilters() ? t.noMatch : recurring ? t.emptyRecurring : t.emptyOneOff,
        title: recurring ? t.recurring : t.oneOff,
        count: recurring ? this.recurringCount() : this.oneOffCount(),
      };
    });
  });

  selectTab(key: string): void {
    this.openRow.set(null);
    this.tab.set(key as Tab);
  }

  chooseMonth(month: string): void {
    this.monthPickerOpen.set(false);
    this.b.selectMonth(month);
  }

  /** A tap opens the transaction, unless a row is swiped open: then it only closes that row. */
  edit(transaction: Transaction): void {
    if (this.openRow() !== null) this.openRow.set(null);
    else this.editing.set(transaction.id);
  }

  async deleteFromSwipe(transaction: Transaction): Promise<void> {
    this.openRow.set(null);
    await deleteTransaction(this.b, this.s, this.dialogs, transaction);
  }

  setOpenRow(id: string, open: boolean): void {
    if (open) this.openRow.set(id);
    else if (this.openRow() === id) this.openRow.set(null);
  }

  applyFilters(filter: TransactionFilter): void {
    this.filtersOpen.set(false);
    this.filter.set(filter);
  }

  subtitle(transaction: Transaction): string {
    const day = String(dayOf(transaction.date)).padStart(2, '0');
    const recurring = transaction.recurrenceId ? ` \u00B7 \u21BB ${this.s.t().budget.recurringBadge}` : '';
    return `${day} \u00B7 ${transaction.category}${recurring}`;
  }

  glyphOfCategory(category: string): string {
    return categoryGlyph(this.b.iconOf(category));
  }
}
