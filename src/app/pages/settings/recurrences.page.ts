import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { endMonth, type Recurrence } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { UI_ICONS } from '../../icons';
import { SettingsService } from '../../settings.service';

@Component({
  selector: 'app-recurrences-page',
  standalone: true,
  imports: [RouterLink],
  host: { class: 'flex min-h-0 flex-1 flex-col animate-page' },
  template: `
    <header class="flex items-center bg-surface px-3 py-2">
      <a routerLink="/settings" class="flex size-11 items-center justify-center rounded-full text-[26px] font-mdi transition-transform active:scale-90"
         [attr.aria-label]="s.t().common.back">{{ ui.previous }}</a>
      <h1 class="ml-2 flex-1 truncate text-xl font-bold">{{ s.t().recurrences.title }}</h1>
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      @for (r of b.recurrences(); track r.id; let index = $index) {
        <div class="animate-appear" [style.animation-delay.ms]="index < 12 ? index * 30 : 0">
          <div class="setting">
            <div class="min-w-0 flex-1">
              <div class="row-title">{{ r.description || s.t().common.noDescription }}</div>
              <div class="row-sub">{{ details(r) }}</div>
            </div>
            <span class="row-amount ml-2 whitespace-nowrap" [class]="r.kind">{{ s.formatSigned(r.kind, r.amount) }}</span>
          </div>
          <button type="button" class="danger compact w-auto" (click)="remove(r)">{{ s.t().common.delete }}</button>
        </div>
      } @empty {
        <p class="empty-text animate-appear">{{ s.t().recurrences.empty }}</p>
      }
    </div>
  `,
})
export class RecurrencesPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  private readonly dialogs = inject(DialogService);
  readonly ui = UI_ICONS;

  details(r: Recurrence): string {
    const t = this.s.t();
    const start = this.s.monthLabel(r.startMonth);
    const end = endMonth(r);
    const range = end !== undefined && r.occurrences !== undefined
      ? t.recurrences.range(start, this.s.monthLabel(end), r.occurrences)
      : t.recurrences.from(start);
    return `${t.frequency[r.frequency]} \u00B7 ${t.recurrences.dayOf(r.day)} \u00B7 ${r.category} \u00B7 ${range}`;
  }

  async remove(r: Recurrence): Promise<void> {
    const t = this.s.t();
    const ok = await this.dialogs.confirm({
      title: t.common.delete,
      message: t.recurrences.deleteBody(r.description || t.common.noDescription),
      ok: t.common.delete,
      cancel: t.common.cancel,
    });
    if (ok) this.b.removeRecurrence(r.id);
  }
}
