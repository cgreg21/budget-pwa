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
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './recurrences.page.html',
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
    let range = t.recurrences.from(start);
    if (end !== undefined) {
      range = r.until === undefined && r.occurrences !== undefined
        ? t.recurrences.range(start, this.s.monthLabel(end), r.occurrences)
        : t.recurrences.rangeUntil(start, this.s.monthLabel(end));
    }
    const rhythm = r.interval === undefined ? t.frequency[r.frequency] : t.recurrences.everyUnits(r.interval, r.frequency);
    return `${rhythm} \u00B7 ${t.recurrences.dayOf(r.day)} \u00B7 ${r.category} \u00B7 ${range}`;
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
