import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import pkg from '../../../../package.json';
import dependencies from '../../pwa/dependencies.json';
import { APP_VERSION } from '../../pwa/app-info';
import { SettingsService } from '../../preferences/settings.service';
import { AboutPage } from './about.page';

describe('AboutPage', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const rows = (selector: string): string[] => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll(selector)].map((row) => [...row.children]
      .map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()).join(' '));
  };

  it('shows the version of the app', () => {
    const t = TestBed.inject(SettingsService).t();
    expect(rows('[data-testid="app-version"]')).toEqual([`${t.appName} ${t.about.version} ${APP_VERSION}`]);
  });

  it('lists every library with its version and license, and the bundled assets', () => {
    const t = TestBed.inject(SettingsService).t();
    expect(rows('[data-testid="library"]')).toEqual(dependencies.dependencies.map(
      (library) => `${library.name} ${t.about.version} ${library.version} · ${t.about.license} ${library.license}`,
    ));
    expect(rows('[data-testid="asset"]')).toEqual(dependencies.assets.map((asset) => `${asset.name} ${t.about.license} ${asset.license}`));
  });

  it('follows the dependencies of package.json (regenerate with npm run dependencies:generate)', () => {
    const listed = dependencies.dependencies.map((library) => library.name);
    for (const name of Object.keys(pkg.dependencies)) expect(listed).toContain(name);
    for (const library of dependencies.dependencies) {
      expect(library.version).not.toBe('');
      expect(library.license).not.toBe('');
    }
  });
});
