import { Component, computed, inject, signal } from '@angular/core';
import type { TrashedTransaction } from 'budget-lib';

import { BudgetService, type TrashedCategory } from '../../data/budget.service';
import { DialogService } from '../../ui/dialog.service';
import { SnackbarService } from '../../ui/snackbar.service';
import { UI_ICONS, categoryGlyph } from '../../ui/icons';
import { SettingsService } from '../../preferences/settings.service';
import { HeaderComponent } from '../../shared/chrome/header.component';
import { SelectionBarComponent } from '../../shared/chrome/selection-bar.component';
import { SwipeRowComponent, type SwipeState } from '../../shared/controls/swipe-row.component';

/** The deleted transactions: restore one, delete it for good, or empty the whole trash. */
@Component({
  selector: 'app-trash-page',
  standalone: true,
  imports: [HeaderComponent, SwipeRowComponent, SelectionBarComponent],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './trash.page.html',
})
export class TrashPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  private readonly dialogs = inject(DialogService);
  private readonly snackbar = inject(SnackbarService);
  readonly ui = UI_ICONS;
  readonly glyphOf = categoryGlyph;
  protected readonly openRow = signal<string | null>(null);
  protected readonly openSide = signal<SwipeState>(false);

  readonly selecting = signal(false);
  private readonly selection = signal<ReadonlySet<string>>(new Set());
  readonly selectedIds = computed(() => {
    const chosen = this.selection();
    return this.b.trash().filter((item) => chosen.has(item.id)).map((item) => item.id);
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

  selectAll(): void {
    this.selection.set(new Set(this.b.trash().map((item) => item.id)));
  }

  bulkRestore(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    this.b.restoreMany(ids);
    this.toggleSelecting();
    this.snackbar.show(this.s.t().selection.restored(ids.length));
  }

  async bulkDeleteForever(): Promise<void> {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    const t = this.s.t();
    const ok = await this.dialogs.confirm({ title: t.selection.deleteForever, message: t.selection.deleteForeverBody(ids.length), ok: t.common.delete, cancel: t.common.cancel });
    if (!ok) return;
    this.b.deleteForeverMany(ids);
    this.toggleSelecting();
    this.snackbar.show(t.selection.deletedForever(ids.length));
  }

  protected setOpenRow(id: string, state: SwipeState): void {
    this.openRow.set(state === false ? null : id);
    this.openSide.set(state);
  }

  glyphOfCategory(category: string): string {
    return categoryGlyph(this.b.iconOf(category));
  }

  readonly itemCount = computed(() => this.b.trash().length + this.b.trashedCategories().length);

  restoreCategory(item: TrashedCategory): void {
    this.openRow.set(null);
    this.b.restoreCategory(item.name);
    this.snackbar.show(this.s.t().snackbar.restored);
  }

  async deleteCategoryForever(item: TrashedCategory): Promise<void> {
    const t = this.s.t();
    const ok = await this.dialogs.confirm({
      title: t.trash.deleteForever, message: t.trash.categoryForeverBody(item.name), ok: t.common.delete, cancel: t.common.cancel,
    });
    if (!ok) return;
    this.b.deleteCategoryForever(item.name);
    this.snackbar.show(t.snackbar.deletedForever);
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
    const count = this.itemCount();
    const ok = await this.dialogs.confirm({ title: t.trash.emptyAction, message: t.trash.emptyBody(count), ok: t.common.delete, cancel: t.common.cancel });
    if (ok) {
      this.b.emptyTrash();
      this.snackbar.show(t.snackbar.trashEmptied);
    }
    return ok;
  }
}
