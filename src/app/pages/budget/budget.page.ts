import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  balanceLevel, dayOf, filterTransactions, isFilterActive, NO_FILTER, type Transaction, type TransactionFilter, type TransactionKind,
} from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { CalendarSyncService } from '../../calendar-sync.service';
import { DialogService } from '../../dialog.service';
import { SnackbarService } from '../../snackbar.service';
import { UI_ICONS, categoryGlyph } from '../../icons';
import { LayoutService } from '../../layout.service';
import { SettingsService } from '../../settings.service';
import { HeaderComponent } from '../../shared/header.component';
import { MonthBarComponent } from '../../shared/month-bar.component';
import { MonthPickerComponent } from '../../shared/month-picker.component';
import { SwipeRowComponent } from '../../shared/swipe-row.component';
import { TabBarComponent, type TabItem } from '../../shared/tab-bar.component';
import { deleteTransaction } from './delete-transaction';
import { SelectionBarComponent } from '../../shared/selection-bar.component';
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
    HeaderComponent, MonthBarComponent, MonthPickerComponent, SwipeRowComponent, TabBarComponent, SelectionBarComponent,
    EditorModalComponent, FiltersModalComponent,
  ],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './budget.page.html',
})
export class BudgetPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  readonly layout = inject(LayoutService);
  readonly calendar = inject(CalendarSyncService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialogs = inject(DialogService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });
  readonly ui = UI_ICONS;

  constructor() {
    // Home-screen shortcuts open the app on /budget?add=expense or ?add=income.
    const add = this.route?.snapshot.queryParamMap.get('add');
    if (add === 'expense' || add === 'income') {
      this.newKind.set(add);
      this.editing.set('');
      void this.router?.navigate([], { queryParams: { add: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  readonly tab = signal<Tab>('oneoff');
  readonly filter = signal<TransactionFilter>(NO_FILTER);
  readonly hasFilters = computed(() => isFilterActive(this.filter()));
  readonly filtersOpen = signal(false);
  readonly monthPickerOpen = signal(false);
  /** `null` is closed, `''` is a new transaction, otherwise the id of the transaction edited. */
  readonly editing = signal<string | null>(null);
  /** Kind preselected when a new transaction is opened by a shortcut. */
  readonly newKind = signal<TransactionKind>('expense');
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

  readonly selecting = signal(false);
  private readonly selection = signal<ReadonlySet<string>>(new Set());
  readonly selectedIds = computed(() => {
    const chosen = this.selection();
    return this.b.transactions().filter((item) => chosen.has(item.id)).map((item) => item.id);
  });

  isSelected(id: string): boolean {
    return this.selection().has(id);
  }

  toggleSelecting(): void {
    this.openRow.set(null);
    this.selection.set(new Set());
    this.selecting.update((value) => !value);
  }

  toggleItem(id: string): void {
    const next = new Set(this.selection());
    if (!next.delete(id)) next.add(id);
    this.selection.set(next);
  }

  selectAllVisible(): void {
    this.selection.set(new Set(this.panels().flatMap((panel) => panel.items.map((item) => item.id))));
  }

  bulkDelete(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    const t = this.s.t().snackbar;
    this.b.removeMany(ids);
    this.toggleSelecting();
    this.snackbar.show(this.s.t().selection.deleted(ids.length), { action: { label: t.undo, run: () => this.b.restoreMany(ids) } });
  }

  async bulkCategory(): Promise<void> {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    const t = this.s.t();
    const names = this.b.categories().map((category) => category.name);
    const chosen = await this.dialogs.action({ title: t.selection.chooseCategory, actions: names, cancel: t.common.cancel });
    if (chosen === null) return;
    this.b.setCategoryMany(ids, chosen);
    this.toggleSelecting();
    this.snackbar.show(t.selection.recategorised(ids.length));
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
    await deleteTransaction(this.b, this.s, this.dialogs, transaction, this.snackbar);
  }

  setOpenRow(id: string, open: boolean | 'restore'): void {
    if (open !== false) this.openRow.set(id);
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
