import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import {
  MAX_OCCURRENCES, MIN_OCCURRENCES, RECURRENCE_FREQUENCIES, type RecurrenceFrequency,
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
    const labels = RECURRENCE_FREQUENCIES.map((f) => t.frequency[f]);
    const picked = await this.dialogs.action({ title: t.editor.frequency, cancel: t.common.cancel, actions: labels });
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

  normalizeAmount(): void {
    this.amount.set(this.s.normalizeInput(this.amount()));
  }

  private recurrenceSettings(): RecurrenceSettings | null {
    if (!this.repeat()) return null;
    if (!this.limited()) return { frequency: this.frequency() };
    const count = Math.round(Number(this.occurrences()));
    const bounded = Number.isFinite(count)
      ? Math.min(Math.max(count, MIN_OCCURRENCES), MAX_OCCURRENCES)
      : MIN_OCCURRENCES;
    return { frequency: this.frequency(), occurrences: bounded };
  }
}
