import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import {
  RECURRENCE_FREQUENCIES, MAX_ACTIVE_MONTHS, MAX_INTERVAL, MAX_OCCURRENCES, MIN_ACTIVE_MONTHS, MIN_INTERVAL, MIN_OCCURRENCES, isMonthKey, type RecurrenceFrequency,
  type RecurrenceSettings, type Transaction, type TransactionInput, type TransactionKind,
} from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { SnackbarService } from '../../snackbar.service';
import { categoryGlyph } from '../../icons';
import { parseAmount, SettingsService } from '../../settings.service';
import { SheetComponent } from '../../shared/sheet.component';
import { deleteTransaction } from './delete-transaction';

/** The transaction form, a full-screen modal. It closes itself once the transaction is saved or deleted. */
@Component({
  selector: 'app-editor-modal',
  standalone: true,
  imports: [SheetComponent],
  templateUrl: './editor-modal.component.html',
})
export class EditorModalComponent implements OnInit {
  readonly s = inject(SettingsService);
  readonly b = inject(BudgetService);
  private readonly dialogs = inject(DialogService);
  private readonly snackbar = inject(SnackbarService);
  readonly frequencies = RECURRENCE_FREQUENCIES;

  /** The transaction to edit, or `null` for a new one. */
  readonly id = input<string | null>(null);
  /** Kind preselected for a new transaction (home-screen shortcuts). */
  readonly initialKind = input<TransactionKind>('expense');
  readonly closed = output<void>();

  existing: Transaction | undefined;

  readonly date = signal('');
  readonly kind = signal<TransactionKind>('expense');
  readonly amount = signal('');
  readonly description = signal('');
  readonly category = signal('');
  readonly repeat = signal(false);
  readonly frequency = signal<RecurrenceFrequency>('monthly');
  readonly limited = signal(false);
  readonly occurrences = signal('12');
  readonly custom = signal(false);
  readonly interval = signal('2');
  readonly ended = signal(false);
  readonly until = signal('');
  readonly partial = signal(false);
  readonly activeMonths = signal('10');
  /** Spreading a monthly series over part of the year only makes sense at a plain monthly rhythm. */
  readonly canBePartial = computed(() => this.repeat() && !this.custom() && this.frequency() === 'monthly');
  readonly error = signal('');
  readonly categoryGlyph = computed(() => categoryGlyph(this.b.iconOf(this.category())));

  ngOnInit(): void {
    const existing = this.b.transactions().find((t) => t.id === this.id());
    const series = existing && this.b.recurrenceOf(existing);
    this.existing = existing;
    this.date.set(existing?.date ?? this.b.defaultTransactionDate);
    this.kind.set(existing?.kind ?? this.initialKind());
    this.amount.set(existing ? this.s.formatInput(existing.amount) : '');
    this.description.set(existing?.description ?? '');
    this.category.set(existing?.category ?? this.b.defaultCategory);
    this.repeat.set(series !== undefined);
    this.frequency.set(series?.frequency ?? 'monthly');
    this.limited.set(series?.occurrences !== undefined);
    this.occurrences.set(String(series?.occurrences ?? 12));
    this.custom.set(series?.interval !== undefined);
    this.interval.set(String(series?.interval ?? 2));
    this.ended.set(series?.until !== undefined);
    this.until.set(series?.until ?? '');
    this.partial.set(series?.activeMonths !== undefined);
    this.activeMonths.set(String(series?.activeMonths ?? 10));
  }

  async pickCategory(): Promise<void> {
    const t = this.s.t();
    const picked = await this.dialogs.action({
      title: t.editor.category,
      cancel: t.common.cancel,
      actions: this.b.categories().map((c) => c.name),
    });
    if (picked !== null) this.category.set(picked);
  }

  async pickFrequency(): Promise<void> {
    const t = this.s.t();
    const labels = [...RECURRENCE_FREQUENCIES.map((f) => t.frequency[f]), t.editor.customFrequency];
    const picked = await this.dialogs.action({ title: t.editor.frequency, cancel: t.common.cancel, actions: labels });
    const index = picked === null ? -1 : labels.indexOf(picked);
    if (index < 0) return;
    this.custom.set(index === RECURRENCE_FREQUENCIES.length);
    if (!this.custom()) this.frequency.set(RECURRENCE_FREQUENCIES[index]);
  }

  async pickUnit(): Promise<void> {
    const t = this.s.t();
    const labels = RECURRENCE_FREQUENCIES.map((unit) => t.editor.units[unit]);
    const picked = await this.dialogs.action({ title: t.editor.unit, cancel: t.common.cancel, actions: labels });
    const index = picked === null ? -1 : labels.indexOf(picked);
    if (index >= 0) this.frequency.set(RECURRENCE_FREQUENCIES[index]);
  }

  async save(): Promise<void> {
    const t = this.s.t();
    const amount = parseAmount(this.amount());
    if (!Number.isFinite(amount) || amount <= 0) {
      this.error.set(t.editor.invalidAmount);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.date())) {
      this.error.set(t.editor.invalidDate);
      return;
    }
    this.error.set('');

    const rhythmError = this.rhythmError();
    if (rhythmError) {
      this.error.set(rhythmError);
      return;
    }
    const existing = this.existing;
    const input: TransactionInput = {
      date: this.date(),
      description: this.description().trim(),
      category: this.category(),
      kind: this.kind(),
      amount,
      recurrenceId: existing?.recurrenceId,
    };
    const settings = this.recurrenceSettings();

    if (!existing) {
      this.b.add(input, settings ?? undefined);
    } else if (this.b.recurrenceOf(existing)) {
      const choice = await this.dialogs.action({
        title: t.editor.scopeTitle,
        message: t.editor.scopeBody,
        cancel: t.common.cancel,
        actions: [t.editor.occurrenceOnly, t.editor.seriesToo],
      });
      if (choice === t.editor.occurrenceOnly) this.b.update(existing.id, input);
      else if (choice === t.editor.seriesToo) this.b.updateSeries(existing.id, input, settings);
      else return;
    } else if (settings) {
      this.b.updateSeries(existing.id, input, settings);
    } else {
      this.b.update(existing.id, input);
    }
    this.snackbar.show(existing ? t.snackbar.updated : t.snackbar.added);
    this.closed.emit();
  }

  async remove(): Promise<void> {
    if (this.existing && await deleteTransaction(this.b, this.s, this.dialogs, this.existing, this.snackbar)) this.closed.emit();
  }

  toggleEnded(): void {
    const next = !this.ended();
    this.ended.set(next);
    if (next && !this.until()) this.until.set(this.date().slice(0, 7));
  }

  normalizeAmount(): void {
    this.amount.set(this.s.normalizeInput(this.amount()));
  }

  private rhythmError(): string {
    if (!this.repeat()) return '';
    const t = this.s.t();
    if (this.custom()) {
      const interval = Number(this.interval());
      if (!Number.isInteger(interval) || interval < MIN_INTERVAL || interval > MAX_INTERVAL) return t.editor.invalidInterval;
    }
    if (this.canBePartial() && this.partial()) {
      const months = Number(this.activeMonths());
      if (!Number.isInteger(months) || months < MIN_ACTIVE_MONTHS || months > MAX_ACTIVE_MONTHS) return t.editor.invalidActiveMonths;
    }
    if (this.ended()) {
      const series = this.existing && this.b.recurrenceOf(this.existing);
      const start = series?.startMonth ?? this.date().slice(0, 7);
      if (!isMonthKey(this.until()) || this.until() < start) return t.editor.invalidUntil;
    }
    return '';
  }

  private recurrenceSettings(): RecurrenceSettings | null {
    if (!this.repeat()) return null;
    const settings: RecurrenceSettings = { frequency: this.frequency() };
    if (this.custom()) settings.interval = Number(this.interval());
    if (this.ended()) settings.until = this.until();
    if (this.canBePartial() && this.partial()) settings.activeMonths = Number(this.activeMonths());
    if (!this.limited()) return settings;
    const count = Math.round(Number(this.occurrences()));
    settings.occurrences = Number.isFinite(count)
      ? Math.min(Math.max(count, MIN_OCCURRENCES), MAX_OCCURRENCES)
      : MIN_OCCURRENCES;
    return settings;
  }
}
