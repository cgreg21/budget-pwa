import { TestBed } from '@angular/core/testing';

import { ProfileService } from './profile.service';
import { profileKey, profileKeyOf, readRegistry, secretNameOf } from './profiles';

describe('profile keys', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the original keys for the default profile', () => {
    expect(profileKeyOf('default', 'budget-pwa:data:v1')).toBe('budget-pwa:data:v1');
    expect(profileKey('budget-pwa:data:v1')).toBe('budget-pwa:data:v1');
    expect(secretNameOf('default', 'calendar-password')).toBe('calendar-password');
  });

  it('prefixes the keys and secrets of the other profiles', () => {
    expect(profileKeyOf('abc', 'budget-pwa:data:v1')).toBe('budget-pwa:profile:abc:data:v1');
    expect(secretNameOf('abc', 'calendar-password')).toBe('calendar-password:abc');
  });

  it('falls back to the default profile when the registry is unreadable', () => {
    localStorage.setItem('budget-pwa:profiles:v1', '{"active":"ghost","profiles":[{"id":"default","name":""}]}');
    expect(readRegistry().active).toBe('default');
  });
});

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    service = TestBed.inject(ProfileService);
    vi.spyOn(service, 'reload').mockImplementation(() => undefined);
  });

  it('starts with the default profile', () => {
    expect(service.profiles()).toEqual([{ id: 'default', name: '' }]);
    expect(service.activeId()).toBe('default');
  });

  it('adds, renames and persists profiles', () => {
    const added = service.add('  Pro  ');
    expect(added?.name).toBe('Pro');
    expect(service.add('   ')).toBeNull();
    service.rename(added!.id, 'Société');
    expect(readRegistry().profiles.map((p) => p.name)).toEqual(['', 'Société']);
    service.rename(added!.id, '');
    expect(service.profiles()[1].name).toBe('Société');
  });

  it('switches to another profile and reloads', () => {
    const added = service.add('Pro')!;
    service.switchTo(added.id);
    expect(readRegistry().active).toBe(added.id);
    expect(service.reload).toHaveBeenCalledTimes(1);
    service.switchTo('unknown');
    expect(service.reload).toHaveBeenCalledTimes(1);
  });

  it('deletes the data of another profile but never the active one', async () => {
    const added = service.add('Pro')!;
    const key = profileKeyOf(added.id, 'budget-pwa:data:v1');
    localStorage.setItem(key, '{}');
    localStorage.setItem('budget-pwa:data:v1', '{}');
    await service.remove('default');
    expect(service.profiles()).toHaveLength(2);
    await service.remove(added.id);
    expect(service.profiles()).toHaveLength(1);
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem('budget-pwa:data:v1')).toBe('{}');
  });
});
