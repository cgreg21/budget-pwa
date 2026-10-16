import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { isFilterActive, NO_FILTER, type TransactionFilter } from 'budget-lib';

import { BudgetService } from '../../data/budget.service';
import { UI_ICONS, categoryGlyph } from '../../ui/icons';
import { SettingsService } from '../../preferences/settings.service';
import { SheetComponent } from '../../shared/overlays/sheet.component';

/** The transaction filters. Emits the filter to apply, or `closed` when dismissed. */
@Component({
  selector: 'app-filters-modal',
  standalone: true,
  imports: [SheetComponent],
  templateUrl: './filters-modal.component.html',
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
