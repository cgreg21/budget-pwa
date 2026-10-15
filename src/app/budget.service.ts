import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  DEFAULT_BALANCE_THRESHOLDS,
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_ICON,
  FALLBACK_CATEGORY,
  categoryIcon,
  ensureCategories,
  clampMonth,
  computeTotals,
  currentMonthKey,
  defaultDateInMonth,
  isBalanceThresholds,
  isCategoryList,
  isMonthKey,
  isRecurrenceList,
  isTransactionArray,
  isTrashedTransactionArray,
  missingOccurrences,
  monthKeyOf,
  recurrenceFromTransaction,
  sortByDateDesc,
  sortRecurrences,
  transactionHash,
  type BalanceThresholds,
  type Category,
  type MonthKey,
  type Recurrence,
  type RecurrenceSettings,
  type Transaction,
  type TransactionInput,
  type TrashedTransaction,
} from 'budget-lib';

import { readValidJson } from './storage';

/** Income and expenses of one month. */
export interface MonthlyTotals {
  month: MonthKey;
  income: number;
  expense: number;
}

export interface BudgetData {
  months: Record<string, Transaction[]>;
  categories: Category[];
  recurrences: Recurrence[];
  thresholds: BalanceThresholds;
}

const DATA_KEY = 'budget-pwa:data:v1';
const TRASH_KEY = 'budget-pwa:trash:v1';

function newId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultData(): BudgetData {
  return {
    months: {},
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    recurrences: [],
    thresholds: { ...DEFAULT_BALANCE_THRESHOLDS },
  };
}

function isBudgetData(value: unknown): value is BudgetData {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<BudgetData>;
  const months = candidate.months;
  return isCategoryList(candidate.categories) && isBalanceThresholds(candidate.thresholds)
    && isRecurrenceList(candidate.recurrences) && typeof months === 'object' && months !== null
    && Object.entries(months).every(([month, transactions]) => isMonthKey(month) && isTransactionArray(transactions));
}

/**
 * The saved budget, or the defaults. Unreadable data is set aside under `${DATA_KEY}:corrupted`
 * rather than lost, and `corrupted` tells the UI to warn the user.
 */
function readData(): { value: BudgetData; corrupted: boolean } {
  const { value, corrupted } = readValidJson(DATA_KEY, isBudgetData, defaultData, true);
  const validMonths: Record<string, Transaction[]> = {};
  for (const [month, transactions] of Object.entries(value.months)) {
    if (transactions.length > 0) validMonths[month] = transactions;
  }
  return { value: { ...value, months: validMonths }, corrupted };
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly transactionChangesSubject = new Subject<void>();
  readonly transactionChanges = this.transactionChangesSubject.asObservable();
  private readonly categoryChangesSubject = new Subject<void>();
  /** Local edits of the category list (add, rename, delete, icon, order); calendar writes do not emit. */
  readonly categoryChanges = this.categoryChangesSubject.asObservable();
  private readonly loaded = readData();
  /** Whether the saved data could not be read and was replaced with the defaults. */
  readonly loadFailed = this.loaded.corrupted;
  private readonly dataState = signal<BudgetData>(this.loaded.value);
  readonly data = this.dataState.asReadonly();
  readonly selectedMonth = signal<MonthKey>(currentMonthKey());
  readonly transactions = computed(() => this.dataState().months[this.selectedMonth()] ?? []);
  readonly sorted = computed(() => sortByDateDesc(this.transactions()));
  readonly totals = computed(() => computeTotals(this.transactions()));
  readonly categories = computed(() => this.dataState().categories);
  readonly recurrences = computed(() => sortRecurrences(this.dataState().recurrences));
  readonly thresholds = computed(() => this.dataState().thresholds);
  private readonly trashState = signal<TrashedTransaction[]>(readValidJson(TRASH_KEY, isTrashedTransactionArray, () => [], true).value);
  /** Deleted transactions, the most recently deleted first. */
  readonly trash = computed(() => [...this.trashState()].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)));

  constructor() {
    this.applyRecurrences(this.selectedMonth());
  }

  get defaultTransactionDate(): string {
    return defaultDateInMonth(this.selectedMonth());
  }

  monthKeys(): MonthKey[] {
    return Object.keys(this.dataState().months).filter(isMonthKey).sort();
  }

  transactionsOf(month: MonthKey): Transaction[] {
    return this.dataState().months[month] ?? [];
  }

  allTransactions(): Transaction[] {
    return this.monthKeys().flatMap((month) => this.transactionsOf(month));
  }

  /** Calendar writes stay local: they must not schedule another synchronisation. */
  applyCalendarChanges(upserts: Transaction[], removals: string[], snapshot: Transaction[], categoryList: Category[] | null = null): void {
    if (!isTransactionArray(upserts) || upserts.some((item) => !isMonthKey(monthKeyOf(item.date)) || item.category === '')) {
      throw new Error('Invalid calendar transactions.');
    }
    const before = new Map(snapshot.map((item) => [item.id, transactionHash(item)]));
    const current = new Map(this.allTransactions().map((item) => [item.id, item]));
    // An edit made while the request was in flight belongs to the next run, not this response.
    const unchanged = (id: string): boolean => {
      const item = current.get(id);
      return (item === undefined ? undefined : transactionHash(item)) === before.get(id);
    };
    const accepted = upserts.filter((item) => unchanged(item.id));
    const removed = removals.filter(unchanged);
    if (accepted.length === 0 && removed.length === 0 && categoryList === null) return;
    const replaced = new Set([...accepted.map((item) => item.id), ...removed]);
    const data = this.dataState();
    const months: Record<string, Transaction[]> = {};
    for (const [month, items] of Object.entries(data.months)) {
      const remaining = items.filter((item) => !replaced.has(item.id));
      if (remaining.length > 0) months[month] = remaining;
    }
    const categories = [...data.categories];
    const names = new Set(categories.map((category) => category.name));
    for (const item of accepted) {
      const month = monthKeyOf(item.date);
      // Keep recurrenceId as the idempotent stamp; no recurrence template is imported.
      (months[month] ??= []).push({ ...item });
      if (!names.has(item.category)) {
        categories.push({ name: item.category, icon: DEFAULT_CATEGORY_ICON });
        names.add(item.category);
      }
    }
    const next = { ...data, months, categories: categoryList === null ? categories : ensureCategories(categoryList, categories.map((category) => category.name)) };
    localStorage.setItem(DATA_KEY, JSON.stringify(next));
    this.dataState.set(next);
  }

  selectMonth(month: MonthKey): void {
    if (!isMonthKey(month)) return;
    this.selectedMonth.set(clampMonth(month));
    this.applyRecurrences(this.selectedMonth());
  }

  add(input: TransactionInput, recurrence?: RecurrenceSettings): void {
    const month = monthKeyOf(input.date);
    const id = newId();
    let transaction = input;
    let recurrences = this.recurrences();
    if (recurrence) {
      const recurrenceId = newId();
      const template = recurrenceFromTransaction(input, recurrence);
      recurrences = [...recurrences, { id: recurrenceId, ...template }];
      transaction = { ...input, recurrenceId };
    }
    this.updateData((data) => ({
      ...data,
      recurrences,
      months: { ...data.months, [month]: [...(data.months[month] ?? []), { id, ...transaction }] },
    }));
    this.selectMonth(month);
  }

  update(id: string, input: TransactionInput): void {
    const oldMonth = this.selectedMonth();
    const nextMonth = monthKeyOf(input.date);
    this.updateData((data) => {
      const months = { ...data.months };
      months[oldMonth] = (months[oldMonth] ?? []).filter((item) => item.id !== id);
      if (months[oldMonth].length === 0) delete months[oldMonth];
      months[nextMonth] = [...(months[nextMonth] ?? []), { id, ...input }];
      return { ...data, months };
    });
    this.selectMonth(nextMonth);
  }

  recurrenceOf(transaction: Transaction): Recurrence | undefined {
    const id = transaction.recurrenceId;
    return id === undefined ? undefined : this.recurrences().find((item) => item.id === id);
  }

  /** Name used when a new transaction has no category picked yet. */
  get defaultCategory(): string {
    const list = this.categories();
    return list.find((category) => category.name === FALLBACK_CATEGORY)?.name ?? list[0].name;
  }

  /** The symbolic icon name of a category (the default icon for an unknown one). */
  iconOf(category: string): string {
    return categoryIcon(this.categories(), category);
  }

  /** Months holding at least one transaction, oldest first. */
  monthsWithData(): MonthKey[] {
    return this.monthKeys().filter((month) => this.transactionsOf(month).length > 0);
  }

  /** Totals for every month holding transactions, oldest first. */
  monthlyTotals(): MonthlyTotals[] {
    return this.monthsWithData().map((month) => {
      const { income, expense } = computeTotals(this.transactionsOf(month));
      return { month, income, expense };
    });
  }

  /** Applies an edit to the whole series; `null` settings turns it into a one-off transaction. */
  updateSeries(id: string, input: TransactionInput, settings: RecurrenceSettings | null): void {
    const current = this.recurrences().find((item) => item.id === input.recurrenceId);
    if (settings === null) {
      if (current) this.updateData((data) => ({ ...data, recurrences: data.recurrences.filter((item) => item.id !== current.id) }));
      this.update(id, { ...input, recurrenceId: undefined });
      return;
    }
    const next = recurrenceFromTransaction(input, settings);
    if (current) {
      this.update(id, input);
      // Day and start month belong to the series, not to the occurrence edited.
      this.updateData((data) => ({
        ...data,
        recurrences: data.recurrences.map((item) =>
          item.id === current.id ? { id: current.id, ...next, day: current.day, startMonth: current.startMonth } : item),
      }));
      return;
    }
    const recurrence: Recurrence = { id: newId(), ...next };
    this.update(id, { ...input, recurrenceId: recurrence.id });
    this.updateData((data) => ({ ...data, recurrences: [...data.recurrences, recurrence] }));
  }

  remove(id: string): void {
    const month = this.selectedMonth();
    const trashed = (this.dataState().months[month] ?? []).find((item) => item.id === id);
    if (trashed !== undefined) {
      this.setTrash([{ ...trashed, deletedAt: new Date().toISOString() }, ...this.trashState().filter((item) => item.id !== id)]);
    }
    this.updateData((data) => {
      const months = { ...data.months };
      months[month] = (months[month] ?? []).filter((item) => item.id !== id);
      if (months[month].length === 0) delete months[month];
      return { ...data, months };
    });
  }

  /** Moves several transactions of the selected month to the trash in a single change. */
  removeMany(ids: readonly string[]): void {
    const month = this.selectedMonth();
    const wanted = new Set(ids);
    const moved = (this.dataState().months[month] ?? []).filter((item) => wanted.has(item.id));
    if (moved.length === 0) return;
    const deletedAt = new Date().toISOString();
    this.setTrash([...moved.map((item) => ({ ...item, deletedAt })), ...this.trashState().filter((item) => !wanted.has(item.id))]);
    this.updateData((data) => {
      const months = { ...data.months };
      months[month] = (months[month] ?? []).filter((item) => !wanted.has(item.id));
      if (months[month].length === 0) delete months[month];
      return { ...data, months };
    });
  }

  /** Changes the category of several transactions of the selected month. */
  setCategoryMany(ids: readonly string[], category: string): void {
    const month = this.selectedMonth();
    const wanted = new Set(ids);
    this.updateData((data) => ({
      ...data,
      months: { ...data.months, [month]: (data.months[month] ?? []).map((item) => (wanted.has(item.id) ? { ...item, category } : item)) },
    }));
  }

  /** Puts several trashed transactions back in their months in a single change. */
  restoreMany(ids: readonly string[]): void {
    const wanted = new Set(ids);
    const items = this.trashState().filter((item) => wanted.has(item.id));
    if (items.length === 0) return;
    this.setTrash(this.trashState().filter((item) => !wanted.has(item.id)));
    this.updateData((data) => {
      const months = { ...data.months };
      for (const { deletedAt: _deletedAt, ...transaction } of items) {
        const month = monthKeyOf(transaction.date);
        months[month] = [...(months[month] ?? []).filter((candidate) => candidate.id !== transaction.id), transaction];
      }
      return { ...data, months };
    });
  }

  deleteForeverMany(ids: readonly string[]): void {
    const wanted = new Set(ids);
    if (!this.trashState().some((item) => wanted.has(item.id))) return;
    this.setTrash(this.trashState().filter((item) => !wanted.has(item.id)));
    this.transactionChangesSubject.next();
  }

  /** Puts a trashed transaction back in its month. */
  restore(id: string): void {
    const item = this.trashState().find((candidate) => candidate.id === id);
    if (item === undefined) return;
    const { deletedAt: _deletedAt, ...transaction } = item;
    const month = monthKeyOf(transaction.date);
    this.setTrash(this.trashState().filter((candidate) => candidate.id !== id));
    this.updateData((data) => ({
      ...data,
      months: { ...data.months, [month]: [...(data.months[month] ?? []).filter((candidate) => candidate.id !== id), transaction] },
    }));
  }

  /** Deletes one trashed transaction for good (the calendar event goes at the next synchronisation). */
  deleteForever(id: string): void {
    this.setTrash(this.trashState().filter((item) => item.id !== id));
    this.transactionChangesSubject.next();
  }

  emptyTrash(): void {
    if (this.trashState().length === 0) return;
    this.setTrash([]);
    this.transactionChangesSubject.next();
  }

  /** Calendar writes stay local: they must not schedule another synchronisation. */
  applyCalendarTrash(added: TrashedTransaction[], removed: string[]): void {
    if (added.length === 0 && removed.length === 0) return;
    const gone = new Set([...removed, ...added.map((item) => item.id)]);
    this.setTrash([...added, ...this.trashState().filter((item) => !gone.has(item.id))]);
  }

  private setTrash(items: TrashedTransaction[]): void {
    this.trashState.set(items);
    localStorage.setItem(TRASH_KEY, JSON.stringify(items));
  }

  /** Drops the template and this occurrence; occurrences in other months stay. */
  removeSeries(id: string, recurrenceId: string): void {
    this.removeRecurrence(recurrenceId);
    this.remove(id);
  }

  removeRecurrence(id: string): void {
    this.updateData((data) => ({ ...data, recurrences: data.recurrences.filter((item) => item.id !== id) }));
  }

  addCategory(name: string, icon: string): void {
    this.updateData((data) => ({ ...data, categories: [...data.categories, { name, icon }] }));
  }

  updateCategory(name: string, patch: Partial<Category>): void {
    this.updateData((data) => ({
      ...data,
      categories: data.categories.map((category) => (category.name === name ? { ...category, ...patch } : category)),
    }));
  }

  removeCategory(name: string): void {
    if (this.categories().length <= 1) return;
    this.updateData((data) => ({
      ...data,
      categories: data.categories.filter((category) => category.name !== name),
    }));
  }

  setThresholds(thresholds: BalanceThresholds): void {
    if (!isBalanceThresholds(thresholds)) throw new Error('Thresholds must be in ascending order.');
    this.updateData((data) => ({ ...data, thresholds }));
  }

  replaceData(data: BudgetData): void {
    this.dataState.set(data);
    this.persist();
    this.applyRecurrences(this.selectedMonth());
    this.transactionChangesSubject.next();
  }

  private applyRecurrences(month: MonthKey): void {
    const transactions = this.transactionsOf(month);
    const missing = missingOccurrences(this.recurrences(), month, transactions);
    if (missing.length === 0) return;
    this.updateData((data) => ({
      ...data,
      months: {
        ...data.months,
        [month]: [...transactions, ...missing.map((input) => ({ id: newId(), ...input }))],
      },
    }));
  }

  private updateData(transform: (data: BudgetData) => BudgetData): void {
    const before = this.dataState();
    this.dataState.update(transform);
    this.persist();
    const after = this.dataState();
    if (after.months !== before.months || after.recurrences !== before.recurrences) {
      this.transactionChangesSubject.next();
    }
    if (after.categories !== before.categories) this.categoryChangesSubject.next();
  }

  private persist(): void {
    localStorage.setItem(DATA_KEY, JSON.stringify(this.dataState()));
  }
}
