import { Injectable, signal } from '@angular/core';

const SEEN_KEY = 'budget-pwa:onboarding-seen';

/** Drives the presentation carousel: shown on the first launch, then again on demand from Settings. */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  readonly visible = signal(!this.seen());

  /** Closes the carousel, for good: it no longer opens by itself. */
  close(): void {
    this.visible.set(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Storage unavailable: the carousel simply shows again next time.
    }
  }

  show(): void {
    this.visible.set(true);
  }

  private seen(): boolean {
    try {
      return localStorage.getItem(SEEN_KEY) !== null;
    } catch {
      return true;
    }
  }
}
