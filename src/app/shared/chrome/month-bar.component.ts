import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import {
  FIRST_MONTH, LAST_MONTH, monthKeyFrom, monthNumberOf, shiftMonth, yearOf, type MonthKey,
} from 'budget-lib';

import { UI_ICONS } from '../../ui/icons';
import { SettingsService } from '../../preferences/settings.service';

/** Previous/next month and year buttons around the month label, which opens the month picker. */
@Component({
  selector: 'app-month-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month-bar.component.html',
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
