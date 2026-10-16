import { LockService } from './lock.service';

describe('LockService', () => {
  beforeEach(() => localStorage.clear());

  it('is unlocked without a PIN', () => {
    expect(new LockService().locked()).toBe(false);
  });

  it('accepts only 4 to 8 digits', () => {
    expect(LockService.isValidPin('1234')).toBe(true);
    expect(LockService.isValidPin('123')).toBe(false);
    expect(LockService.isValidPin('12a4')).toBe(false);
    expect(LockService.isValidPin('123456789')).toBe(false);
  });

  it('locks at start-up once a PIN is set and unlocks with the right PIN only', async () => {
    const first = new LockService();
    await first.setPin('2468');
    const lock = new LockService();
    expect(lock.locked()).toBe(true);
    expect(await lock.unlock('0000')).toBe(false);
    expect(lock.locked()).toBe(true);
    expect(await lock.unlock('2468')).toBe(true);
    expect(lock.locked()).toBe(false);
    lock.lock();
    expect(lock.locked()).toBe(true);
  });

  it('refuses attempts after too many wrong PINs', async () => {
    const lock = new LockService();
    await lock.setPin('2468');
    for (let i = 0; i < 5; i++) await lock.unlock('0000');
    expect(lock.blockedUntil()).toBeGreaterThan(Date.now());
    expect(await lock.unlock('2468')).toBe(false);
  });

  it('removes the lock', async () => {
    const lock = new LockService();
    await lock.setPin('2468');
    lock.disable();
    expect(lock.enabled()).toBe(false);
    expect(new LockService().locked()).toBe(false);
  });
});
