import { Component, inject, signal } from '@angular/core';
import type { TrashedTransaction } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { SnackbarService } from '../../snackbar.service';
import { UI_ICONS, categoryGlyph } from '../../icons';
import { SettingsService } from '../../settings.service';
import { HeaderComponent } from '../../shared/header.component';
import { SwipeRowComponent, type SwipeState } from '../../shared/swipe-row.component';

/** The deleted transactions: restore one, delete it for good, or empty the whole trash. */
@Component({
  selector: 'app-trash-page',
  standalone: true,
  imports: [HeaderComponent, SwipeRowComponent],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './trash.page.html',
})
export class TrashPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  private readonly dialogs = inject(DialogService);
  private readonly snackbar = inject(SnackbarService);
  readonly ui = UI_ICONS;
  protected readonly openRow = signal<string | null>(null);
  protected readonly openSide = signal<SwipeState>(false);

  protected setOpenRow(id: string, state: SwipeState): void {
    this.openRow.set(state === false ? null : id);
    this.openSide.set(state);
  }

  glyphOfCategory(category: string): string {
    return categoryGlyph(this.b.iconOf(category));
  }

  async deleteForever(item: TrashedTransaction): Promise<boolean> {
    const t = this.s.t();
    const details = `${item.description || t.common.noDescription} (${this.s.formatSigned(item.kind, item.amount)})`;
    const ok = await this.dialogs.confirm({ title: t.trash.deleteForever, message: t.trash.deleteForeverBody(details), ok: t.common.delete, cancel: t.common.cancel });
    if (ok) {
      this.b.deleteForever(item.id);
      this.snackbar.show(t.snackbar.deletedForever);
    }
    return ok;
  }

  restore(item: TrashedTransaction): void {
    this.b.restore(item.id);
    this.snackbar.show(this.s.t().snackbar.restored);
  }

  async emptyTrash(): Promise<boolean> {
    const t = this.s.t();
    const count = this.b.trash().length;
    const ok = await this.dialogs.confirm({ title: t.trash.emptyAction, message: t.trash.emptyBody(count), ok: t.common.delete, cancel: t.common.cancel });
    if (ok) {
      this.b.emptyTrash();
      this.snackbar.show(t.snackbar.trashEmptied);
    }
    return ok;
  }
}
