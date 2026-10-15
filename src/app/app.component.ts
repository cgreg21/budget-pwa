import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { DialogHostComponent } from './shared/dialog-host.component';
import { APP_VERSION } from './app-info';
import { BudgetService } from './budget.service';
import { DialogService } from './dialog.service';
import { DrawerService } from './drawer.service';
import { InstallService } from './install.service';
import { LayoutService } from './layout.service';
import { UpdateService } from './update.service';
import { CalendarSyncService } from './calendar-sync.service';
import { UI_ICONS } from './icons';
import { SettingsService } from './settings.service';

const DRAWER_WIDTH = 280;
const SWIPE_SLOP = 10;
/** Width of the screen-edge bands where the browser starts its back/forward swipe. */
const EDGE_WIDTH = 24;

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
  readonly install = inject(InstallService);
  private readonly updates = inject(UpdateService);
  readonly layout = inject(LayoutService);
  private readonly budget = inject(BudgetService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  readonly logo = UI_ICONS.logo;
  readonly settingsIcon = UI_ICONS.settings;
  readonly version = APP_VERSION;

  private readonly shell = viewChild.required<ElementRef<HTMLElement>>('shell');
  private readonly edge = viewChild<ElementRef<HTMLElement>>('edge');
  /** Horizontal offset of the drawer while a swipe is in progress, in [-DRAWER_WIDTH, 0]. */
  private readonly dragX = signal<number | null>(null);
  private drag: { x: number; y: number; origin: number; id: number; direction: 'horizontal' | 'vertical' | null } | null = null;
  private swiped = false;

  readonly dragging = computed(() => this.dragX() !== null);
  readonly drawerX = computed(() => this.layout.wide() ? 0 : this.dragX() ?? (this.drawer.opened() ? 0 : -DRAWER_WIDTH));
  readonly backdropOpacity = computed(() => this.layout.wide() ? 0 : 1 + this.drawerX() / DRAWER_WIDTH);
  /** The drawer is reachable: open on a phone, or always as the sidebar of the wide layout. */
  readonly drawerActive = computed(() => this.layout.wide() || this.drawer.opened());

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
    // Non-passive so the browser's back/forward swipe is cancelled: while the drawer is dragged, and
    // for horizontal moves of a touch that started on a screen edge (where that gesture begins).
    let edgeTouch: { x: number; y: number } | null = null;
    document.addEventListener('touchstart', (event) => {
      const touch = event.touches?.[0];
      const onEdge = touch !== undefined && (touch.clientX < EDGE_WIDTH || touch.clientX > window.innerWidth - EDGE_WIDTH);
      edgeTouch = onEdge ? { x: touch.clientX, y: touch.clientY } : null;
    }, { passive: true });
    document.addEventListener('touchmove', (event) => {
      if (this.drag?.direction === 'horizontal') {
        event.preventDefault();
        return;
      }
      const touch = event.touches?.[0];
      if (!edgeTouch || !touch) return;
      if (Math.abs(touch.clientX - edgeTouch.x) >= Math.abs(touch.clientY - edgeTouch.y)) event.preventDefault();
      else edgeTouch = null;
    }, { passive: false });
    // iOS leaves the page scrolled/shrunk once the keyboard of a field closes: bring the view back.
    document.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) window.scrollTo(0, 0);
      }, 100);
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

  onBackdropClick(): void {
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    this.drawer.close();
  }

  onDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.layout.wide()) return;
    if (!this.drawer.opened() && event.target !== this.edge()?.nativeElement) return;
    this.drag = { x: event.clientX, y: event.clientY, origin: this.drawerX(), id: event.pointerId, direction: null };
    this.swiped = false;
  }

  onMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (drag.direction === null && Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_SLOP) {
      drag.direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (drag.direction === 'horizontal') {
        this.shell().nativeElement.setPointerCapture(event.pointerId);
      } else {
        this.drag = null;
        return;
      }
    }
    if (drag.direction === 'horizontal') {
      this.swiped = true;
      this.dragX.set(Math.min(0, Math.max(-DRAWER_WIDTH, drag.origin + dx)));
    }
  }

  onUp(event: PointerEvent): void {
    const drag = this.drag;
    this.drag = null;
    if (!drag || event.pointerId !== drag.id || drag.direction !== 'horizontal') return;
    const open = this.drawerX() > -DRAWER_WIDTH / 2;
    this.shell().nativeElement.releasePointerCapture?.(event.pointerId);
    this.dragX.set(null);
    if (open) this.drawer.show(); else this.drawer.close();
  }
}
