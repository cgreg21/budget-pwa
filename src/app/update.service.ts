import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/**
 * Brings a new deployment in without asking the user to reload twice: the worker downloads it in the
 * background, and the page reloads the next time it comes back to the foreground.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly updates = inject(SwUpdate, { optional: true });
  private ready = false;

  constructor() {
    const updates = this.updates;
    if (!updates?.isEnabled) return;
    updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.ready = true;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (this.ready) location.reload();
      else void updates.checkForUpdate().catch(() => undefined);
    });
  }
}
