import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import {
  FIRST_MONTH, LAST_MONTH, monthKeyFrom, monthNumberOf, shiftMonth, yearOf, type MonthKey,
} from 'budget-lib';

import { UI_ICONS } from '../icons';
import { SettingsService } from '../settings.service';

/** Previous/next month and year buttons around the month label, which opens the month picker. */
@Component({
  selector: 'app-month-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center px-3 py-0.5">
      <button type="button" class="nav-btn" (click)="shiftYear(-1)">{{ ui.previousYear }}</button>
      <button type="button" class="nav-btn" [disabled]="!hasOlder()" (click)="shift(-1)">{{ ui.previous }}</button>
      <button type="button" class="h-12 flex-1 text-center text-lg font-bold" (click)="labelTap.emit()">{{ s.monthLabel(month()) }}</button>
      <button type="button" class="nav-btn" [disabled]="!hasNewer()" (click)="shift(1)">{{ ui.next }}</button>
      <button type="button" class="nav-btn" (click)="shiftYear(1)">{{ ui.nextYear }}</button>
    </div>
  `,
})
export class MonthBarComponent {
  readonly s = inject(SettingsService);
  readonly ui = UI_ICONS;

  readonly month = input.required<MonthKey>();
  readonly monthChange = output<MonthKey>();
  readonly labelTap = output<void>();

  hasOlder(): boolean {
    return this.month() > FIRST_MONTH;
  }

  hasNewer(): boolean {
    return this.month() < LAST_MONTH;
  }

  shift(delta: number): void {
    this.monthChange.emit(shiftMonth(this.month(), delta));
  }

  shiftYear(delta: number): void {
    const month = this.month();
    this.monthChange.emit(monthKeyFrom(yearOf(month) + delta, monthNumberOf(month)));
  }
}
