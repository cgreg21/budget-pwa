import { provideRouter, Router } from '@angular/router';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { CalendarSyncService } from './calendar-sync.service';
import { DialogService } from './dialog.service';
import { DrawerService } from './drawer.service';
import { UI_ICONS } from './icons';
import { InstallService } from './install.service';
import { LayoutService } from './layout.service';
import { RootComponent } from './root.component';
import { SettingsService } from './settings.service';

const DATA_KEY = 'budget-pwa:data:v1';

type Status = ReturnType<CalendarSyncService['status']>;

describe('AppComponent', () => {
  let drawer: DrawerService;
  let layout: LayoutService;
  let router: Router;
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    drawer = TestBed.inject(DrawerService);
    layout = TestBed.inject(LayoutService);
    router = TestBed.inject(Router);
  });

  afterEach(() => vi.unstubAllGlobals());

  const shell = (): ComponentFixture<AppComponent> => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture;
  };

  const pointer = (type: string, init: PointerEventInit & { clientX?: number; clientY?: number }): PointerEvent =>
    new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: 'touch', button: 0, ...init });

  const shellEl = (fixture: ComponentFixture<AppComponent>): HTMLElement => fixture.nativeElement.querySelector('div') as HTMLElement;
  const edgeEl = (fixture: ComponentFixture<AppComponent>): HTMLElement | null => fixture.nativeElement.querySelector('[aria-hidden="true"].w-6');

  const setStatus = (status: Partial<Status>): void => {
    const calendar = TestBed.inject(CalendarSyncService);
    (calendar as unknown as { statusState: { update(fn: (s: Status) => Status): void } }).statusState.update((s) => ({ ...s, ...status }));
  };

  it('derives the drawer geometry from its state', () => {
    const c = shell().componentInstance;
    expect(c.dragging()).toBe(false);
    expect(c.drawerX()).toBe(-280);
    expect(c.backdropOpacity()).toBe(0);
    expect(c.drawerActive()).toBe(false);
    drawer.show();
    expect(c.drawerX()).toBe(0);
    expect(c.backdropOpacity()).toBe(1);
    expect(c.drawerActive()).toBe(true);
    drawer.close();
    layout.wide.set(true);
    expect(c.drawerX()).toBe(0);
    expect(c.backdropOpacity()).toBe(0);
    expect(c.drawerActive()).toBe(true);
  });

  it('lists the navigation items and highlights the active one', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/settings/recurrences');
    const fixture = shell();
    const c = fixture.componentInstance;
    const t = TestBed.inject(SettingsService).t();
    expect(c.items().map((i) => i.label)).toEqual([t.nav.transactions, t.categories.title, t.stats.title, t.stats.history]);
    expect(c.isActive('/budget')).toBe(false);
    expect(c.isActive('/settings')).toBe(true);
    expect(c.isActive('/settings/recurrences')).toBe(true);
    expect(c.isActive('/stats')).toBe(false);
    expect(fixture.nativeElement.querySelector('aside button.bg-tint')).not.toBeNull();
  });

  it('navigates and closes the drawer', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = shell();
    drawer.show();
    (fixture.nativeElement.querySelectorAll('nav button')[2] as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith('/stats');
    expect(drawer.opened()).toBe(false);
  });

  it('maps the calendar status to an icon', () => {
    const c = shell().componentInstance;
    expect(c.calendarIcon()).toBe(UI_ICONS.cloudOk);
    setStatus({ state: 'syncing' });
    expect(c.calendarIcon()).toBe(UI_ICONS.syncing);
    setStatus({ state: 'offline' });
    expect(c.calendarIcon()).toBe(UI_ICONS.cloudOffline);
    setStatus({ state: 'error' });
    expect(c.calendarIcon()).toBe(UI_ICONS.cloudError);
  });

  it('sends a calendar tap to the settings or to a sync', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const calendar = TestBed.inject(CalendarSyncService);
    const sync = vi.spyOn(calendar, 'syncNow').mockResolvedValue();
    const fixture = shell();
    const c = fixture.componentInstance;
    drawer.show();
    c.onCalendarTap();
    expect(drawer.opened()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/settings');

    calendar.configure({ enabled: true, calendarUrl: 'https://cal.example.org/cal/', username: 'me' }, 'pw');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('aside [role="status"]')).not.toBeNull();
    c.onCalendarTap();
    expect(sync).toHaveBeenCalledTimes(1);

    setStatus({ state: 'error' });
    c.onCalendarTap();
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('opens the drawer by dragging from the edge and closes it by dragging back', () => {
    const fixture = shell();
    const c = fixture.componentInstance;
    const edge = edgeEl(fixture)!;
    expect(edge).not.toBeNull();

    edge.dispatchEvent(pointer('pointerdown', { clientX: 5, clientY: 100 }));
    shellEl(fixture).dispatchEvent(pointer('pointermove', { clientX: 8, clientY: 102 }));
    expect(c.dragging()).toBe(false);
    shellEl(fixture).dispatchEvent(pointer('pointermove', { clientX: 60, clientY: 104 }));
    expect(c.dragging()).toBe(true);
    expect(c.drawerX()).toBe(-225);
    expect(c.backdropOpacity()).toBeCloseTo(55 / 280);
    expect(HTMLElement.prototype.setPointerCapture).toHaveBeenCalledWith(1);
    shellEl(fixture).dispatchEvent(pointer('pointermove', { clientX: 400, clientY: 104 }));
    expect(c.drawerX()).toBe(0);
    shellEl(fixture).dispatchEvent(pointer('pointerup', { clientX: 400, clientY: 104 }));
    expect(c.dragging()).toBe(false);
    expect(drawer.opened()).toBe(true);
    fixture.detectChanges();
    expect(edgeEl(fixture)).toBeNull();

    // A swipe that ends on the backdrop must not count as a click on it.
    shellEl(fixture).dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 100 }));
    shellEl(fixture).dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 100 }));
    expect(c.drawerX()).toBe(-100);
    shellEl(fixture).dispatchEvent(pointer('pointermove', { clientX: -500, clientY: 100 }));
    expect(c.drawerX()).toBe(-280);
    shellEl(fixture).dispatchEvent(pointer('pointercancel', { clientX: -500, clientY: 100 }));
    expect(drawer.opened()).toBe(false);
    c.onBackdropClick();
    expect(drawer.opened()).toBe(false);
  });

  it('ignores vertical swipes, other pointers, right clicks and the wide layout', () => {
    const fixture = shell();
    const c = fixture.componentInstance;
    const el = shellEl(fixture);

    edgeEl(fixture)!.dispatchEvent(pointer('pointerdown', { clientX: 5, clientY: 100 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 7, clientY: 150 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 150 }));
    expect(c.dragging()).toBe(false);
    el.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 150 }));
    expect(drawer.opened()).toBe(false);

    edgeEl(fixture)!.dispatchEvent(pointer('pointerdown', { clientX: 5, clientY: 100 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 100, pointerId: 2 }));
    expect(c.dragging()).toBe(false);
    el.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 100, pointerId: 2 }));
    el.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 100 }));

    edgeEl(fixture)!.dispatchEvent(pointer('pointerdown', { clientX: 5, clientY: 100, pointerType: 'mouse', button: 2 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 100 }));
    expect(c.dragging()).toBe(false);

    el.dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 100 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 300, clientY: 100 }));
    expect(c.dragging()).toBe(false);

    layout.wide.set(true);
    fixture.detectChanges();
    el.dispatchEvent(pointer('pointerdown', { clientX: 5, clientY: 100 }));
    el.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 100 }));
    expect(c.dragging()).toBe(false);
  });

  it('closes the drawer from the backdrop', () => {
    const fixture = shell();
    drawer.show();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.bg-backdrop') as HTMLElement).click();
    expect(drawer.opened()).toBe(false);
  });

  it('cancels the browser swipe while the drawer is dragged horizontally', () => {
    const fixture = shell();
    const touchmove = (): boolean => !document.dispatchEvent(new Event('touchmove', { cancelable: true }));
    expect(touchmove()).toBe(false);
    edgeEl(fixture)!.dispatchEvent(pointer('pointerdown', { clientX: 5, clientY: 100 }));
    shellEl(fixture).dispatchEvent(pointer('pointermove', { clientX: 60, clientY: 100 }));
    expect(touchmove()).toBe(true);
    shellEl(fixture).dispatchEvent(pointer('pointerup', { clientX: 60, clientY: 100 }));
    expect(touchmove()).toBe(false);
  });

  it('reloads when another tab changes the data', () => {
    shell();
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    expect(reload).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key: DATA_KEY }));
    expect(reload).toHaveBeenCalled();
  });

  it('warns when the stored data could not be read', () => {
    localStorage.setItem(DATA_KEY, '{oops');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    shell();
    const dialogs = TestBed.inject(DialogService);
    expect(dialogs.current()?.message).toBe(TestBed.inject(SettingsService).t().backup.corrupted);
    dialogs.close(null);
  });

  it('shows the install banner', () => {
    const fixture = shell();
    const install = TestBed.inject(InstallService);
    install.banner.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    (fixture.nativeElement.querySelectorAll('[role="dialog"] button')[1] as HTMLButtonElement).click();
    expect(install.banner()).toBe(false);
  });
});

describe('RootComponent', () => {
  it('renders a router outlet', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(RootComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
