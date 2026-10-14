import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { buildPieSlices } from 'budget-lib';

import { DialogService } from '../dialog.service';
import { DrawerService } from '../drawer.service';
import { UI_ICONS } from '../icons';
import { SettingsService } from '../settings.service';
import { AutofocusDirective } from './autofocus.directive';
import { CategoryPieComponent } from './category-pie.component';
import { DialogHostComponent } from './dialog-host.component';
import { HeaderComponent } from './header.component';
import { MonthBarComponent } from './month-bar.component';
import { MonthPickerComponent } from './month-picker.component';
import { MonthlyLinesComponent } from './monthly-lines.component';
import { SheetComponent } from './sheet.component';
import { SwipeRowComponent } from './swipe-row.component';
import { TabBarComponent } from './tab-bar.component';

const DATA_KEY = 'budget-pwa:data:v1';

const text = (fixture: ComponentFixture<unknown>, selector: string): string[] =>
  [...(fixture.nativeElement as HTMLElement).querySelectorAll(selector)].map((el) => el.textContent?.trim() ?? '');
const click = (fixture: ComponentFixture<unknown>, selector: string, index = 0): void => {
  ([...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(selector)][index]).click();
  fixture.detectChanges();
};
const escape = (): void => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); };

function pointer(target: Element, type: string, init: Partial<PointerEventInit> = {}): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100, ...init });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  vi.setSystemTime(new Date('2026-10-13T10:00:00'));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('HeaderComponent', () => {
  it('shows the title, opens the drawer and toggles the filters button', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.componentRef.setInput('title', 'Budget');
    fixture.detectChanges();
    expect(text(fixture, 'h1')).toEqual(['Budget']);
    expect(text(fixture, 'button')).toEqual([UI_ICONS.menu]);
    click(fixture, 'button');
    expect(TestBed.inject(DrawerService).opened()).toBe(true);

    const taps = vi.fn();
    fixture.componentInstance.filtersTap.subscribe(taps);
    fixture.componentRef.setInput('filterActive', false);
    fixture.detectChanges();
    expect(text(fixture, 'button')).toEqual([UI_ICONS.menu, UI_ICONS.filters]);
    expect(fixture.nativeElement.querySelectorAll('button')[1].className).toContain('bg-card');
    fixture.componentRef.setInput('filterActive', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('button')[1].className).toContain('bg-brand');
    click(fixture, 'button', 1);
    expect(taps).toHaveBeenCalledOnce();
  });
});

describe('TabBarComponent', () => {
  it('marks the active tab, shows badges and emits the selection', () => {
    const fixture = TestBed.createComponent(TabBarComponent);
    fixture.componentRef.setInput('tabs', [{ key: 'a', icon: 'A', badge: 3 }, { key: 'b', icon: 'B' }]);
    fixture.componentRef.setInput('active', 'a');
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLElement>;
    expect(buttons[0].className).toContain('border-brand');
    expect(buttons[1].className).toContain('border-transparent');
    expect(buttons[0].textContent?.replace(/\s+/g, '')).toBe('A3');
    expect(buttons[1].textContent?.replace(/\s+/g, '')).toBe('B');
    const picked = vi.fn();
    fixture.componentInstance.select.subscribe(picked);
    click(fixture, 'button', 1);
    expect(picked).toHaveBeenCalledWith('b');
  });
});

describe('SheetComponent', () => {
  it('dismisses on backdrop click or Escape but not on clicks inside', () => {
    const fixture = TestBed.createComponent(SheetComponent);
    fixture.detectChanges();
    const dismissed = vi.fn();
    fixture.componentInstance.dismiss.subscribe(dismissed);
    (fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement).click();
    expect(dismissed).not.toHaveBeenCalled();
    (fixture.nativeElement.querySelector('.fixed') as HTMLElement).click();
    expect(dismissed).toHaveBeenCalledTimes(1);
    escape();
    expect(dismissed).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.h-1')).not.toBeNull();
    fixture.componentRef.setInput('full', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.h-1')).toBeNull();
    expect((fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement).className).toContain('h-full');
  });

  describe('swiping the handle down', () => {
    const pointer = (type: string, init: { y: number; id?: number; time?: number; pointerType?: string; button?: number }): Event => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        clientY: { value: init.y },
        pointerId: { value: init.id ?? 1 },
        timeStamp: { value: init.time ?? 0 },
        pointerType: { value: init.pointerType ?? 'touch' },
        button: { value: init.button ?? 0 },
      });
      return event;
    };

    const setup = () => {
      const fixture = TestBed.createComponent(SheetComponent);
      fixture.detectChanges();
      const dismissed = vi.fn();
      fixture.componentInstance.dismiss.subscribe(dismissed);
      const handle = fixture.nativeElement.querySelector('.touch-none') as HTMLElement;
      const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      return { fixture, dismissed, handle, dialog };
    };

    it('follows the finger, then closes past the distance', () => {
      const { fixture, dismissed, handle, dialog } = setup();
      handle.dispatchEvent(pointer('pointerdown', { y: 100 }));
      handle.dispatchEvent(pointer('pointermove', { y: 40 }));
      fixture.detectChanges();
      expect(dialog.style.transform).toBe('');
      handle.dispatchEvent(pointer('pointermove', { y: 160 }));
      fixture.detectChanges();
      expect(dialog.style.transform).toBe('translateY(60px)');
      handle.dispatchEvent(pointer('pointermove', { y: 230, id: 2 }));
      fixture.detectChanges();
      expect(dialog.style.transform).toBe('translateY(60px)');
      handle.dispatchEvent(pointer('pointerup', { y: 230, time: 2000 }));
      fixture.detectChanges();
      expect(dismissed).toHaveBeenCalledTimes(1);
      expect(dialog.style.transform).toBe('');
    });

    it('closes on a quick flick', () => {
      const { dismissed, handle } = setup();
      handle.dispatchEvent(pointer('pointerdown', { y: 100, time: 0 }));
      handle.dispatchEvent(pointer('pointerup', { y: 150, time: 50 }));
      expect(dismissed).toHaveBeenCalledTimes(1);
    });

    it('springs back after a short or slow drag, a cancel, another pointer or a right click', () => {
      const { fixture, dismissed, handle, dialog } = setup();
      handle.dispatchEvent(pointer('pointerdown', { y: 100, time: 0 }));
      handle.dispatchEvent(pointer('pointermove', { y: 150 }));
      handle.dispatchEvent(pointer('pointerup', { y: 150, time: 2000 }));
      handle.dispatchEvent(pointer('pointerdown', { y: 100 }));
      handle.dispatchEvent(pointer('pointerup', { y: 300, id: 2 }));
      handle.dispatchEvent(pointer('pointercancel', { y: 300, id: 2 }));
      handle.dispatchEvent(pointer('pointermove', { y: 300 }));
      handle.dispatchEvent(pointer('pointercancel', { y: 300 }));
      handle.dispatchEvent(pointer('pointerdown', { y: 100, pointerType: 'mouse', button: 2 }));
      handle.dispatchEvent(pointer('pointerup', { y: 300 }));
      fixture.detectChanges();
      expect(dismissed).not.toHaveBeenCalled();
      expect(dialog.style.transform).toBe('');
    });
  });
});

describe('DialogHostComponent', () => {
  it('renders the pending dialog and closes it with the chosen action, cancel, backdrop or Escape', async () => {
    const dialogs = TestBed.inject(DialogService);
    const fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    escape();

    let pending = dialogs.confirm({ title: 'T', message: 'M', ok: 'Delete', cancel: 'Keep' });
    fixture.detectChanges();
    expect(text(fixture, 'h2')).toEqual(['T']);
    expect(text(fixture, 'p')).toEqual(['M']);
    expect(text(fixture, 'button')).toEqual(['Delete', 'Keep']);
    expect((fixture.nativeElement.querySelectorAll('button')[0] as HTMLElement).className).toContain('bg-danger');
    click(fixture, 'button', 0);
    expect(await pending).toBe(true);

    pending = dialogs.confirm({ title: 'T', message: 'M', ok: 'Delete', cancel: 'Keep' });
    fixture.detectChanges();
    click(fixture, 'button', 1);
    expect(await pending).toBe(false);

    const alert = dialogs.alert({ message: 'Done', ok: 'OK' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2')).toBeNull();
    expect((fixture.nativeElement.querySelector('button') as HTMLElement).className).not.toContain('bg-danger');
    (fixture.nativeElement.querySelector('.card') as HTMLElement).click();
    expect(dialogs.current()).not.toBeNull();
    (fixture.nativeElement.querySelector('.fixed') as HTMLElement).click();
    await alert;

    const action = dialogs.action({ title: 'A', actions: ['x'], cancel: 'c' });
    fixture.detectChanges();
    escape();
    expect(await action).toBeNull();
  });
});

describe('MonthBarComponent', () => {
  it('navigates by month and year within the bounds and opens the picker', () => {
    const fixture = TestBed.createComponent(MonthBarComponent);
    fixture.componentRef.setInput('month', '2026-03');
    fixture.detectChanges();
    const months: string[] = [];
    const taps = vi.fn();
    fixture.componentInstance.monthChange.subscribe((m) => months.push(m));
    fixture.componentInstance.labelTap.subscribe(taps);
    expect(text(fixture, 'button')[2]).toBe('Mars 2026');
    click(fixture, 'button', 0);
    click(fixture, 'button', 1);
    click(fixture, 'button', 2);
    click(fixture, 'button', 3);
    click(fixture, 'button', 4);
    expect(months).toEqual(['2025-03', '2026-02', '2026-04', '2027-03']);
    expect(taps).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('month', '1970-01');
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[3].disabled).toBe(false);
    fixture.componentRef.setInput('month', '2099-12');
    fixture.detectChanges();
    expect(buttons[1].disabled).toBe(false);
    expect(buttons[3].disabled).toBe(true);
  });
});

describe('MonthPickerComponent', () => {
  it('opens on the year of the month, highlights months and emits the pick', () => {
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: { '2025-06': [{ id: 'a', date: '2025-06-01', description: '', category: 'Autres', kind: 'expense', amount: 1 }] },
      categories: [{ name: 'Autres', icon: 'folder-symbolic' }], recurrences: [], thresholds: { low: 0, medium: 1, high: 2 },
    }));
    const fixture = TestBed.createComponent(MonthPickerComponent);
    fixture.componentRef.setInput('month', '2025-03');
    fixture.detectChanges();
    const picked = vi.fn();
    const closed = vi.fn();
    fixture.componentInstance.picked.subscribe(picked);
    fixture.componentInstance.closed.subscribe(closed);
    expect(fixture.componentInstance.year()).toBe(2025);
    const classes = (): string[] => fixture.componentInstance.months().map((m) => m.class);
    expect(classes()[2]).toBe('chip-active');
    expect(classes()[5]).toBe('chip-data');
    expect(classes()[0]).toBe('');
    click(fixture, '.nav-btn', 1);
    expect(fixture.componentInstance.year()).toBe(2026);
    expect(classes()[9]).toBe('chip-editing');
    click(fixture, '.nav-btn', 0);
    click(fixture, '.nav-btn', 0);
    expect(fixture.componentInstance.year()).toBe(2024);
    click(fixture, '.chip', 4);
    expect(picked).toHaveBeenCalledWith('2024-05');
    click(fixture, '.chip', 12);
    expect(picked).toHaveBeenCalledWith('2026-10');
    (fixture.nativeElement.querySelector('.fixed') as HTMLElement).click();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('disables the year buttons at the bounds', () => {
    const fixture = TestBed.createComponent(MonthPickerComponent);
    fixture.componentRef.setInput('month', '1970-05');
    fixture.detectChanges();
    const buttons = (): NodeListOf<HTMLButtonElement> => fixture.nativeElement.querySelectorAll('.nav-btn');
    expect(buttons()[0].disabled).toBe(true);
    expect(buttons()[1].disabled).toBe(false);
    fixture.componentInstance.year.set(2099);
    fixture.detectChanges();
    expect(buttons()[1].disabled).toBe(true);
  });
});

describe('SwipeRowComponent', () => {
  @Component({
    imports: [SwipeRowComponent],
    template: '<app-swipe-row [open]="open()" removeLabel="Del" (openChange)="open.set($event)" (edit)="edits = edits + 1" (remove)="removes = removes + 1"><span>row</span></app-swipe-row>',
  })
  class HostComponent {
    readonly open = signal(false);
    edits = 0;
    removes = 0;
  }

  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    const transform = (): string => { fixture.detectChanges(); return row.style.transform; };
    return { fixture, host: fixture.componentInstance, row, transform };
  };

  it('follows the finger and opens past half the button width', () => {
    const { fixture, host, row, transform } = setup();
    expect(transform()).toBe('translateX(0px)');
    pointer(row, 'pointerdown');
    pointer(row, 'pointermove', { clientX: 95 });
    expect(transform()).toBe('translateX(0px)');
    pointer(row, 'pointermove', { clientX: 70 });
    expect(transform()).toBe('translateX(-30px)');
    expect(row.className).not.toContain('transition-transform');
    pointer(row, 'pointermove', { clientX: -100 });
    expect(transform()).toBe('translateX(-88px)');
    pointer(row, 'pointermove', { clientX: 150 });
    expect(transform()).toBe('translateX(0px)');
    pointer(row, 'pointermove', { clientX: 40 });
    pointer(row, 'pointerup', { clientX: 40 });
    expect(transform()).toBe('translateX(-88px)');
    expect(host.open()).toBe(true);
    expect(row.className).toContain('transition-transform');
    row.click();
    fixture.detectChanges();
    expect(host.edits).toBe(0);
    row.click();
    expect(host.edits).toBe(1);
    expect(fixture.nativeElement.querySelector('button').tabIndex).toBe(0);
    (fixture.nativeElement.querySelector('button') as HTMLElement).click();
    expect(host.removes).toBe(1);
  });

  it('closes a row swiped back and follows the parent state', () => {
    const { fixture, host, row, transform } = setup();
    host.open.set(true);
    expect(transform()).toBe('translateX(-88px)');
    pointer(row, 'pointerdown', { clientX: 0 });
    pointer(row, 'pointermove', { clientX: 70 });
    pointer(row, 'pointerup', { clientX: 70 });
    expect(transform()).toBe('translateX(0px)');
    expect(host.open()).toBe(false);
    host.open.set(true);
    pointer(row, 'pointerdown', { clientX: 0 });
    pointer(row, 'pointermove', { clientX: 20 });
    pointer(row, 'pointercancel', { clientX: 20 });
    expect(transform()).toBe('translateX(-88px)');
    expect(host.open()).toBe(true);
    expect(fixture.nativeElement.querySelector('button').tabIndex).toBe(0);
  });

  it('ignores vertical scrolls, secondary mouse buttons and stray ups', () => {
    const { host, row, transform } = setup();
    pointer(row, 'pointerdown');
    pointer(row, 'pointermove', { clientX: 90, clientY: 160 });
    pointer(row, 'pointermove', { clientX: 0, clientY: 160 });
    expect(transform()).toBe('translateX(0px)');
    pointer(row, 'pointerup', { clientX: 0 });
    expect(host.open()).toBe(false);
    pointer(row, 'pointerdown', { pointerType: 'mouse', button: 2 });
    pointer(row, 'pointermove', { clientX: 0 });
    expect(transform()).toBe('translateX(0px)');
    pointer(row, 'pointerup', { clientX: 0 });
    pointer(row, 'pointermove', { clientX: 0 });
    expect(transform()).toBe('translateX(0px)');
    row.click();
    expect(host.edits).toBe(1);
  });
});

describe('AutofocusDirective', () => {
  it('focuses its element shortly after it is shown', () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    @Component({ imports: [AutofocusDirective], template: '<input appAutofocus />' })
    class HostComponent {}
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    document.body.appendChild(fixture.nativeElement);
    expect(document.activeElement).not.toBe(input);
    vi.advanceTimersByTime(50);
    expect(document.activeElement).toBe(input);
    fixture.nativeElement.remove();
  });
});

describe('CategoryPieComponent', () => {
  it('shows a message without data', () => {
    const fixture = TestBed.createComponent(CategoryPieComponent);
    fixture.componentRef.setInput('slices', []);
    fixture.componentRef.setInput('title', 'Dépenses');
    fixture.detectChanges();
    expect(text(fixture, '.field-label')).toEqual(['Dépenses']);
    expect(text(fixture, 'p')).toEqual([TestBed.inject(SettingsService).t().stats.noData]);
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });

  it('draws slices with labels only on the wide ones, and a legend', () => {
    const fixture = TestBed.createComponent(CategoryPieComponent);
    fixture.componentRef.setInput('slices', buildPieSlices([
      { label: 'Big', amount: 940, icon: 'B' }, { label: 'Small', amount: 55 }, { label: 'Tiny', amount: 5 },
    ]));
    fixture.detectChanges();
    const parts = fixture.componentInstance.parts();
    expect(parts.map((p) => p.full)).toEqual([false, false, false]);
    expect(parts.map((p) => p.percent)).toEqual(['94%', '', '']);
    expect(parts[0].path).toContain('A 100 100 0 1 1');
    expect(parts[0].path).toMatch(/A 57\.9+ 57\.9+ 0 1 0/);
    expect(parts[0].path).toMatch(/^M [\d.]+ [\d.]+ A .* Z$/);
    expect(parts[1].path).toContain('A 100 100 0 0 1');
    expect(Number(parts[0].labelX)).toBeGreaterThan(0);
    const legend = fixture.componentInstance.legend();
    expect(legend.map((l) => l.percent)).toEqual(['94%', '6%', '<1%']);
    expect(legend[0]).toMatchObject({ icon: 'B', amount: '940,00\u00A0\u20AC', width: 94 });
    expect(legend[1].icon).toBe('');
    expect(fixture.nativeElement.querySelectorAll('path')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('svg text')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.row')).toHaveLength(3);
  });

  it('draws a single category as a full ring', () => {
    const fixture = TestBed.createComponent(CategoryPieComponent);
    fixture.componentRef.setInput('slices', buildPieSlices([{ label: 'Only', amount: 10 }]));
    fixture.componentRef.setInput('kind', 'income');
    fixture.detectChanges();
    expect(fixture.componentInstance.parts()[0]).toMatchObject({ full: true, percent: '100%' });
    expect(fixture.nativeElement.querySelector('circle')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('path')).toBeNull();
    expect((fixture.nativeElement.querySelector('.row-amount') as HTMLElement).className).toContain('income');
  });
});

describe('MonthlyLinesComponent', () => {
  let observers: FakeResizeObserver[];
  let clientWidth = 0;

  class FakeResizeObserver {
    readonly observe = vi.fn();
    readonly disconnect = vi.fn();
    constructor(readonly callback: ResizeObserverCallback) {
      observers.push(this);
    }
  }

  beforeEach(() => {
    observers = [];
    clientWidth = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => clientWidth });
  });

  afterEach(() => {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  });

  const rows = [
    { month: '2026-05', income: 2500, expense: 1800 }, { month: '2026-06', income: 0, expense: 0 },
    { month: '2026-07', income: 2400, expense: 3100 },
  ];

  const render = <T>(fixture: ComponentFixture<T>): void => {
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  };

  it('lays the chart out at the measured width and follows resizes', () => {
    clientWidth = 600;
    const fixture = TestBed.createComponent(MonthlyLinesComponent);
    fixture.componentRef.setInput('rows', rows);
    render(fixture);
    const c = fixture.componentInstance;
    expect(c.width()).toBe(600);
    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledWith(fixture.nativeElement);
    const chart = c.chart();
    expect(chart.baseline).toBe(170);
    expect(chart.ticks.map((t) => t.label)).toEqual(['0', '1.3k', '2.5k', '3.8k', '5k']);
    expect(chart.ticks[0].y).toBe(170);
    expect(chart.ticks[4].y).toBe(12);
    expect(chart.labels.map((l) => l.text)).toEqual(['Mai 26', 'Juin 26', 'Juil 26']);
    expect(chart.labels.every((l) => !l.tilt)).toBe(true);
    expect(chart.lines[0].dots).toHaveLength(3);
    expect(chart.lines[0].dots[1].y).toBe(170);
    expect(chart.lines[1].points.split(' ')).toHaveLength(3);
    const common = TestBed.inject(SettingsService).t().common;
    expect(chart.legend.map((l) => l.label)).toEqual([common.income, common.expense]);
    expect(fixture.nativeElement.querySelectorAll('polyline')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('circle')).toHaveLength(6);

    clientWidth = 100;
    observers[0].callback([], observers[0] as unknown as ResizeObserver);
    expect(c.width()).toBe(280);
    fixture.destroy();
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('tilts and thins the labels when months get narrow', () => {
    clientWidth = 300;
    const fixture = TestBed.createComponent(MonthlyLinesComponent);
    const many = Array.from({ length: 24 }, (_, index) => ({ month: `2025-${String(index % 12 + 1).padStart(2, '0')}`, income: 10, expense: 5 }));
    fixture.componentRef.setInput('rows', many);
    render(fixture);
    const chart = fixture.componentInstance.chart();
    expect(chart.labels.length).toBeLessThan(24);
    expect(chart.labels.every((l) => l.tilt)).toBe(true);
    expect(chart.labels.map((l) => l.index)).toEqual(chart.labels.map((_, i) => i * 3));
    expect(chart.ticks.map((t) => t.label)).toEqual(['0', '3', '5', '8', '10']);
    expect(fixture.nativeElement.querySelector('text[transform^="rotate"]')).not.toBeNull();
  });

  it('uses a default axis without data and keeps drawing without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const fixture = TestBed.createComponent(MonthlyLinesComponent);
    fixture.componentRef.setInput('rows', []);
    render(fixture);
    const chart = fixture.componentInstance.chart();
    expect(fixture.componentInstance.width()).toBe(280);
    expect(chart.ticks.map((t) => t.label)).toEqual(['0', '25', '50', '75', '100']);
    expect(chart.labels).toEqual([]);
    expect(chart.lines[0].points).toBe('');
  });
});
