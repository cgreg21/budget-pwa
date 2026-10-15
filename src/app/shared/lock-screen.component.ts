import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { UI_ICONS } from '../icons';
import { LockService } from '../lock.service';
import { SettingsService } from '../settings.service';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lock-screen.component.html',
})
export class LockScreenComponent {
  readonly s = inject(SettingsService);
  readonly lock = inject(LockService);
  readonly icons = UI_ICONS;
  readonly pin = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  private autoBiometric = true;

  constructor() {
    effect(() => {
      if (this.lock.biometricEnabled() && this.autoBiometric) {
        this.autoBiometric = false;
        void this.useBiometric(false);
      }
    });
  }

  onInput(input: HTMLInputElement): void {
    const digits = input.value.replace(/\D/g, '');
    input.value = digits;
    this.pin.set(digits);
  }

  async submit(): Promise<void> {
    if (this.busy() || this.pin() === '') return;
    this.busy.set(true);
    const ok = await this.lock.unlock(this.pin());
    this.busy.set(false);
    if (ok) {
      this.pin.set('');
      this.error.set('');
      return;
    }
    this.pin.set('');
    const wait = Math.ceil((this.lock.blockedUntil() - Date.now()) / 1000);
    this.error.set(wait > 0 ? this.s.t().lock.blocked(wait) : this.s.t().lock.wrongPin);
  }

  async useBiometric(report = true): Promise<void> {
    const ok = await this.lock.unlockWithBiometric();
    if (!ok && report) this.error.set(this.s.t().lock.biometricFailed);
  }
}
