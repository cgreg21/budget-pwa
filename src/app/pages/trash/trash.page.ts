import { Component, inject } from '@angular/core';
import type { TrashedTransaction } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { UI_ICONS, categoryGlyph } from '../../icons';
import { SettingsService } from '../../settings.service';
import { HeaderComponent } from '../../shared/header.component';

/** The deleted transactions: restore one, delete it for good, or empty the whole trash. */
@Component({
  selector: 'app-trash-page',
  standalone: true,
  imports: [HeaderComponent],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './trash.page.html',
})
export class TrashPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  private readonly dialogs = inject(DialogService);
  readonly ui = UI_ICONS;

  glyphOfCategory(category: string): string {
    return categoryGlyph(this.b.iconOf(category));
  }

  async deleteForever(item: TrashedTransaction): Promise<boolean> {
    const t = this.s.t();
    const details = `${item.description || t.common.noDescription} (${this.s.formatSigned(item.kind, item.amount)})`;
    const ok = await this.dialogs.confirm({ title: t.trash.deleteForever, message: t.trash.deleteForeverBody(details), ok: t.common.delete, cancel: t.common.cancel });
    if (ok) this.b.deleteForever(item.id);
    return ok;
  }

  async emptyTrash(): Promise<boolean> {
    const t = this.s.t();
    const count = this.b.trash().length;
    const ok = await this.dialogs.confirm({ title: t.trash.emptyAction, message: t.trash.emptyBody(count), ok: t.common.delete, cancel: t.common.cancel });
    if (ok) this.b.emptyTrash();
    return ok;
  }
}
