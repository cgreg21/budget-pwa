import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  beforeEach(() => localStorage.clear());

  const service = (): OnboardingService => TestBed.inject(OnboardingService);

  it('shows on the first launch', () => {
    expect(service().visible()).toBe(true);
  });

  it('stays closed once skipped or finished, even after a restart', () => {
    service().close();
    expect(service().visible()).toBe(false);

    TestBed.resetTestingModule();
    expect(service().visible()).toBe(false);
  });

  it('can be shown again on demand', () => {
    const onboarding = service();
    onboarding.close();
    onboarding.show();
    expect(onboarding.visible()).toBe(true);
  });
});
