import { TestBed } from '@angular/core/testing';

import { DialogService } from './dialog.service';
import { DrawerService } from './drawer.service';
import { LayoutService, SIDEBAR_QUERY, WIDE_QUERY } from './layout.service';

describe('DialogService', () => {
  const service = (): DialogService => TestBed.inject(DialogService);

  it('resolves an action sheet with the chosen action or null', async () => {
    const dialogs = service();
    const first = dialogs.action({ title: 'Pick', actions: ['A', 'B'], cancel: 'Cancel' });
    expect(dialogs.current()).toMatchObject({ title: 'Pick', actions: ['A', 'B'], cancel: 'Cancel' });
    dialogs.close('B');
    expect(await first).toBe('B');
    expect(dialogs.current()).toBeNull();
    const second = dialogs.action({ title: 'Pick', message: 'm', actions: ['A'], cancel: 'Cancel' });
    dialogs.close(null);
    expect(await second).toBeNull();
  });

  it('confirms only when the destructive action is picked', async () => {
    const dialogs = service();
    const first = dialogs.confirm({ title: 'Delete?', message: 'Sure?', ok: 'Delete', cancel: 'Keep' });
    expect(dialogs.current()).toMatchObject({ title: 'Delete?', message: 'Sure?', actions: ['Delete'], destructive: 'Delete', cancel: 'Keep' });
    dialogs.close('Delete');
    expect(await first).toBe(true);
    const second = dialogs.confirm({ title: 'Delete?', message: 'Sure?', ok: 'Delete', cancel: 'Keep' });
    dialogs.close(null);
    expect(await second).toBe(false);
  });

  it('shows an alert until it is closed', async () => {
    const dialogs = service();
    const pending = dialogs.alert({ message: 'Saved', ok: 'OK' });
    expect(dialogs.current()).toMatchObject({ title: '', message: 'Saved', actions: ['OK'] });
    expect(dialogs.current()?.cancel).toBeUndefined();
    dialogs.close('OK');
    await expect(pending).resolves.toBeUndefined();
  });

  it('ignores closing when nothing is shown', () => {
    const dialogs = service();
    expect(() => dialogs.close(null)).not.toThrow();
    expect(dialogs.current()).toBeNull();
  });
});

describe('DrawerService', () => {
  it('opens and closes', () => {
    const drawer = TestBed.inject(DrawerService);
    expect(drawer.opened()).toBe(false);
    drawer.show();
    expect(drawer.opened()).toBe(true);
    drawer.close();
    expect(drawer.opened()).toBe(false);
  });
});

describe('LayoutService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('follows the wide and sidebar media queries', () => {
    const listeners = new Map<string, (event: { matches: boolean }) => void>();
    const matchMedia = vi.fn((query: string) => ({
      matches: true,
      addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => { listeners.set(query, fn); },
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    const layout = TestBed.inject(LayoutService);
    expect(matchMedia).toHaveBeenCalledWith(WIDE_QUERY);
    expect(matchMedia).toHaveBeenCalledWith(SIDEBAR_QUERY);
    expect(layout.wide()).toBe(true);
    expect(layout.sidebar()).toBe(true);
    listeners.get(SIDEBAR_QUERY)?.({ matches: false });
    expect(layout.wide()).toBe(true);
    expect(layout.sidebar()).toBe(false);
    listeners.get(WIDE_QUERY)?.({ matches: false });
    expect(layout.wide()).toBe(false);
  });
});
