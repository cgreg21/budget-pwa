import { APP_BASE_HREF, LocationStrategy, PlatformLocation } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { ReplaceLocationStrategy } from './replace-location-strategy';

describe('ReplaceLocationStrategy', () => {
  it('replaces the current history entry instead of pushing a new one', () => {
    const platform = { pushState: vi.fn(), replaceState: vi.fn(), getBaseHrefFromDOM: () => '/', onPopState: vi.fn(), onHashChange: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformLocation, useValue: platform },
        { provide: APP_BASE_HREF, useValue: '/' },
        { provide: LocationStrategy, useClass: ReplaceLocationStrategy },
      ],
    });
    const strategy = TestBed.inject(LocationStrategy);
    strategy.pushState({ id: 1 }, 'Stats', '/stats', 'a=1');
    expect(platform.pushState).not.toHaveBeenCalled();
    expect(platform.replaceState).toHaveBeenCalledWith({ id: 1 }, 'Stats', '/stats?a=1');
  });
});
