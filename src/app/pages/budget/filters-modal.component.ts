import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { isFilterActive, NO_FILTER, type TransactionFilter } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { UI_ICONS, categoryGlyph } from '../../icons';
import { SettingsService } from '../../settings.service';
import { SheetComponent } from '../../shared/sheet.component';

/** The transaction filters. Emits the filter to apply, or `closed` when dismissed. */
@Component({
  selector: 'app-filters-modal',
  standalone: true,
  imports: [SheetComponent],
  template: `
    <app-sheet (dismiss)="closed.emit()">
      <h2 class="modal-title">{{ s.t().budget.filters }}</h2>
      <input class="search" type="search" [placeholder]="s.t().budget.searchPlaceholder"
             [value]="filter().search" (input)="patch({ search: $any($event.target).value })" />
      <div class="grid grid-cols-3">
        <button type="button" class="chip" [class.chip-active]="filter().kind === null" (click)="patch({ kind: null })">{{ s.t().common.all }}</button>
        <button type="button" class="chip" [class.chip-active]="filter().kind === 'income'" (click)="patch({ kind: 'income' })">{{ s.t().common.income }}</button>
        <button type="button" class="chip" [class.chip-active]="filter().kind === 'expense'" (click)="patch({ kind: 'expense' })">{{ s.t().common.expense }}</button>
      </div>
      <span class="field-label">{{ categoriesTitle() }}</span>
      <div class="my-1 h-[220px] overflow-y-auto">
        @for (c of rows(); track c.name) {
          <button type="button" class="pick-row" [class.pick-row-selected]="c.selected" (click)="toggle(c.name)">
            <span class="w-8 text-xl font-mdi" [class]="c.selected ? 'text-green' : 'text-muted'">{{ c.icon }}</span>
            <span class="flex-1 text-[15px]">{{ c.name }}</span>
            <span class="text-[22px] font-mdi" [class]="c.selected ? 'text-green' : 'text-muted'">{{ c.selected ? ui.checked : ui.unchecked }}</span>
          </button>
        }
      </div>
      <div class="grid grid-cols-2">
        <button type="button" class="secondary" [disabled]="!hasFilters()" (click)="reset()">{{ s.t().budget.resetFilters }}</button>
        <button type="button" class="primary ml-2" (click)="done.emit(filter())">{{ s.t().common.ok }}</button>
      </div>
    </app-sheet>
  `,
})
export class FiltersModalComponent implements OnInit {
  readonly s = inject(SettingsService);
  private readonly b = inject(BudgetService);
  readonly ui = UI_ICONS;

  readonly initial = input.required<TransactionFilter>({ alias: 'filter' });
  readonly done = output<TransactionFilter>();
  readonly closed = output<void>();

  readonly filter = signal<TransactionFilter>(NO_FILTER);
  readonly hasFilters = computed(() => isFilterActive(this.filter()));
  readonly rows = computed(() => {
    const { categories } = this.filter();
    return this.b.categories().map((c) => ({ name: c.name, icon: categoryGlyph(c.icon), selected: categories.includes(c.name) }));
  });
  readonly categoriesTitle = computed(() => {
    const { categoryFilter } = this.s.t().budget;
    const count = this.filter().categories.length;
    return count === 0 ? categoryFilter : `${categoryFilter} (${count})`;
  });

  ngOnInit(): void {
    this.filter.set(this.initial());
  }

  patch(change: Partial<TransactionFilter>): void {
    this.filter.update((filter) => ({ ...filter, ...change }));
  }

  toggle(name: string): void {
    const { categories } = this.filter();
    this.patch({ categories: categories.includes(name) ? categories.filter((n) => n !== name) : [...categories, name] });
  }

  reset(): void {
    this.filter.set(NO_FILTER);
  }
}
