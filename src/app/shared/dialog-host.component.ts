import { Component, HostListener, inject } from '@angular/core';

import { DialogService } from '../dialog.service';

/** Renders the pending dialog of the DialogService above the whole app. */
@Component({
  selector: 'app-dialog-host',
  template: `
    @if (dialogs.current(); as request) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-backdrop p-6 animate-fade" (click)="dialogs.close(null)">
        <div class="card m-0! w-full max-w-sm animate-appear p-5 shadow-pop" role="dialog" aria-modal="true"
             (click)="$event.stopPropagation()">
          @if (request.title) {
            <h2 class="modal-title">{{ request.title }}</h2>
          }
          @if (request.message) {
            <p class="text-sm text-muted">{{ request.message }}</p>
          }
          <div class="mt-3 flex flex-col">
            @for (action of request.actions; track action) {
              <button type="button" class="mt-2 h-12 rounded-md px-4 text-base font-bold transition-transform active:scale-95"
                      [class]="action === request.destructive ? 'bg-danger text-on-brand' : 'border border-tint-line bg-tint text-green'"
                      (click)="dialogs.close(action)">{{ action }}</button>
            }
            @if (request.cancel) {
              <button type="button" class="mt-2 h-12 rounded-md px-4 text-base text-muted" (click)="dialogs.close(null)">{{ request.cancel }}</button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class DialogHostComponent {
  readonly dialogs = inject(DialogService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogs.current()) this.dialogs.close(null);
  }
}
