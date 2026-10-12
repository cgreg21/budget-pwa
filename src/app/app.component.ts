import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { DialogHostComponent } from './shared/dialog-host.component';
import { BudgetService } from './budget.service';
import { DialogService } from './dialog.service';
import { DrawerService } from './drawer.service';
import { CalendarSyncService } from './calendar-sync.service';
import { UI_ICONS } from './icons';
import { SettingsService } from './settings.service';

@Component({
  selector: 'budget-shell',
  standalone: true,
  imports: [RouterOutlet, DialogHostComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly s = inject(SettingsService);
  readonly calendar = inject(CalendarSyncService);
  readonly drawer = inject(DrawerService);
  private readonly budget = inject(BudgetService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  readonly logo = UI_ICONS.logo;
  readonly settingsIcon = UI_ICONS.settings;

  readonly items = computed(() => {
    const t = this.s.t();
    return [
      { url: '/budget', icon: UI_ICONS.transactions, label: t.nav.transactions },
      { url: '/categories', icon: UI_ICONS.categories, label: t.categories.title },
      { url: '/stats', icon: UI_ICONS.stats, label: t.stats.title },
      { url: '/history', icon: UI_ICONS.history, label: t.stats.history },
    ];
  });

  readonly calendarIcon = computed(() => {
    switch (this.calendar.status().state) {
      case 'syncing': return UI_ICONS.syncing;
      case 'offline': return UI_ICONS.cloudOffline;
      case 'error': return UI_ICONS.cloudError;
      default: return UI_ICONS.cloudOk;
    }
  });

  onCalendarTap(): void {
    this.drawer.close();
    if (this.calendar.status().state === 'error' || !this.calendar.hasPassword()) {
      void this.router.navigateByUrl('/settings');
    } else {
      void this.calendar.syncNow();
    }
  }

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === 'budget-pwa:data:v1') window.location.reload();
    });
    if (this.budget.loadFailed) {
      void this.dialog.alert({ message: this.s.t().backup.corrupted, ok: this.s.t().common.ok });
    }
  }

  isActive(url: string): boolean {
    return this.router.url === url || this.router.url.startsWith(`${url}/`);
  }

  go(url: string): void {
    this.drawer.close();
    void this.router.navigateByUrl(url);
  }
}
