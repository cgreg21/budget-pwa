import { Injectable, signal } from '@angular/core';

export interface DialogRequest {
  title: string;
  message?: string;
  actions: string[];
  cancel?: string;
  destructive?: string;
  resolve(value: string | null): void;
}

/** Replacement of the native dialogs of the mobile app (confirm, action sheet, alert). */
@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly current = signal<DialogRequest | null>(null);

  /** Resolves to the chosen action, or `null` when cancelled. */
  action(options: { title: string; message?: string; actions: string[]; cancel: string }): Promise<string | null> {
    return new Promise((resolve) => {
      this.current.set({ ...options, resolve });
    });
  }

  async confirm(options: { title: string; message: string; ok: string; cancel: string }): Promise<boolean> {
    const picked = await new Promise<string | null>((resolve) => {
      this.current.set({
        title: options.title, message: options.message, actions: [options.ok],
        destructive: options.ok, cancel: options.cancel, resolve,
      });
    });
    return picked === options.ok;
  }

  async alert(options: { message: string; ok: string }): Promise<void> {
    await new Promise<string | null>((resolve) => {
      this.current.set({ title: '', message: options.message, actions: [options.ok], resolve });
    });
  }

  close(value: string | null): void {
    const request = this.current();
    this.current.set(null);
    request?.resolve(value);
  }
}
