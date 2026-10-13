import { TestBed } from '@angular/core/testing';

import { InstallService } from './install.service';

const DISMISSED_KEY = 'budget-pwa:install-dismissed';

class InstallPromptEvent extends Event {
  readonly prompt = vi.fn(async () => undefined);
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  constructor(outcome: 'accepted' | 'dismissed' = 'accepted') {
    super('beforeinstallprompt', { cancelable: true });
    this.userChoice = Promise.resolve({ outcome });
  }
}

describe('InstallService', () => {
  let standalone = false;

  beforeEach(() => {
    standalone = false;
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(display-mode: standalone)' && standalone, addEventListener: () => undefined,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const service = (): InstallService => TestBed.inject(InstallService);

  it('offers installation once the browser allows it', async () => {
    const install = service();
    expect(install.canInstall()).toBe(false);
    expect(install.banner()).toBe(false);
    const event = new InstallPromptEvent();
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(install.canInstall()).toBe(true);
    expect(install.banner()).toBe(true);
    await install.install();
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(install.canInstall()).toBe(false);
    expect(install.banner()).toBe(false);
    expect(localStorage.getItem(DISMISSED_KEY)).toBe('1');
  });

  it('does not show the banner again once dismissed', () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    const install = service();
    window.dispatchEvent(new InstallPromptEvent());
    expect(install.canInstall()).toBe(true);
    expect(install.banner()).toBe(false);
  });

  it('remembers a dismissal and survives a failing storage', () => {
    const install = service();
    window.dispatchEvent(new InstallPromptEvent());
    install.dismiss();
    expect(install.banner()).toBe(false);
    expect(install.canInstall()).toBe(true);
    expect(localStorage.getItem(DISMISSED_KEY)).toBe('1');
    localStorage.removeItem(DISMISSED_KEY);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => install.dismiss()).not.toThrow();
    expect(localStorage.getItem(DISMISSED_KEY)).toBeNull();
  });

  it('does nothing when installing without a pending prompt', async () => {
    const install = service();
    await install.install();
    expect(install.banner()).toBe(false);
    expect(localStorage.getItem(DISMISSED_KEY)).toBeNull();
  });

  it('forgets everything once the app is installed', () => {
    const install = service();
    window.dispatchEvent(new InstallPromptEvent());
    window.dispatchEvent(new Event('appinstalled'));
    expect(install.canInstall()).toBe(false);
    expect(install.banner()).toBe(false);
  });

  it('ignores the prompt when already running standalone', () => {
    standalone = true;
    const install = service();
    window.dispatchEvent(new InstallPromptEvent());
    expect(install.canInstall()).toBe(false);
  });

  it('recognises the iOS standalone flag', () => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    try {
      const install = service();
      window.dispatchEvent(new InstallPromptEvent());
      expect(install.canInstall()).toBe(false);
    } finally {
      delete (navigator as { standalone?: boolean }).standalone;
    }
  });
});
