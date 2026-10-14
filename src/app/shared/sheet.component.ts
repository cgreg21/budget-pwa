import { Component, HostListener, input, output } from '@angular/core';

/**
 * A modal panel over a dimmed backdrop: a bottom sheet with a handle, or, with `full`,
 * a full-screen form. Clicking the backdrop or pressing Escape dismisses it.
 */
@Component({
  selector: 'app-sheet',
  template: `
    <div class="fixed inset-0 z-40 flex items-end justify-center bg-backdrop animate-fade md:items-center md:p-6" (click)="dismiss.emit()">
      <div class="box-border flex w-full animate-sheet flex-col bg-surface md:max-h-[88vh] md:max-w-[560px] md:rounded-3xl md:shadow-pop"
           [class]="full() ? 'h-full px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] md:h-auto md:px-6 md:py-5' : 'max-h-full rounded-t-3xl px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-6 md:pt-5'"
           role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        @if (!full()) {
          <div class="mx-auto mb-3 h-1 w-10 shrink-0 rounded-sm bg-line"></div>
        }
        <ng-content />
      </div>
    </div>
  `,
})
export class SheetComponent {
  readonly full = input(false);
  readonly dismiss = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss.emit();
  }
}
