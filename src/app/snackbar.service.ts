import { Injectable, signal } from '@angular/core';

export type SnackbarKind = 'success' | 'error' | 'info';

export interface SnackbarMessage {
  id: number;
  text: string;
  kind: SnackbarKind;
  action?: { label: string; run(): void };
}

const DEFAULT_DURATION = 3500;
const LONG_DURATION = 6000;

/** Short feedback message shown at the bottom of the screen; a new message replaces the previous one. */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  readonly current = signal<SnackbarMessage | null>(null);
  private counter = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(text: string, options: { kind?: SnackbarKind; action?: SnackbarMessage['action']; duration?: number } = {}): void {
    const kind = options.kind ?? 'success';
    this.clearTimer();
    this.counter += 1;
    this.current.set({ id: this.counter, text, kind, action: options.action });
    const duration = options.duration ?? (kind === 'error' || options.action ? LONG_DURATION : DEFAULT_DURATION);
    this.timer = setTimeout(() => this.dismiss(), duration);
  }

  error(text: string): void {
    this.show(text, { kind: 'error' });
  }

  dismiss(): void {
    this.clearTimer();
    this.current.set(null);
  }

  runAction(): void {
    const action = this.current()?.action;
    this.dismiss();
    action?.run();
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
