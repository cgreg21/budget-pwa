import { Component, HostListener, inject } from '@angular/core';

import { DialogService } from '../../ui/dialog.service';

/** Renders the pending dialog of the DialogService above the whole app. */
@Component({
  selector: 'app-dialog-host',
  templateUrl: './dialog-host.component.html',
})
export class DialogHostComponent {
  readonly dialogs = inject(DialogService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogs.current()) this.dialogs.close(null);
  }
}
