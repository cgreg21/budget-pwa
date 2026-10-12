import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'budget-pwa:install-dismissed';
const DISMISS_DAYS = 30;

/** Captures the browser's install prompt so the app can offer installation at its own pace. */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private deferred: BeforeInstallPromptEvent | null = null;
  readonly available = signal(false);

  constructor() {
    if (this.isStandalone()) return;
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      this.available.set(!this.recentlyDismissed());
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.available.set(false);
    });
  }

  async install(): Promise<void> {
    const event = this.deferred;
    this.available.set(false);
    if (!event) return;
    this.deferred = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'dismissed') this.rememberDismissal();
  }

  dismiss(): void {
    this.available.set(false);
    this.rememberDismissal();
  }

  private isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  private recentlyDismissed(): boolean {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  }

  private rememberDismissal(): void {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Storage unavailable: the banner simply shows again next time.
    }
  }
}
