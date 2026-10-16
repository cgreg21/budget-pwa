import { Injectable, computed, signal } from '@angular/core';

import {
  DEFAULT_PROFILE_ID, MAX_PROFILE_NAME_LENGTH, PROFILE_KEYS, newProfileId, profileKeyOf, readRegistry, secretNameOf,
  writeRegistry, type Profile, type ProfileRegistry,
} from './profiles';
import { CALENDAR_PASSWORD_BASE_NAME, writeSecret } from '../security/secrets';

/** The profiles of this device and the active one. Switching reloads the app on the other profile's data. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly registry = signal<ProfileRegistry>(readRegistry());
  readonly profiles = computed(() => this.registry().profiles);
  readonly activeId = computed(() => this.registry().active);
  readonly active = computed(() => this.profiles().find((profile) => profile.id === this.activeId()) ?? this.profiles()[0]);

  /** Adds an empty profile and returns it; the active profile does not change. */
  add(name: string): Profile | null {
    const clean = ProfileService.cleanName(name);
    if (clean === '') return null;
    const profile: Profile = { id: newProfileId(), name: clean };
    this.save({ ...this.registry(), profiles: [...this.profiles(), profile] });
    return profile;
  }

  rename(id: string, name: string): void {
    const clean = ProfileService.cleanName(name);
    if (clean === '' && id !== DEFAULT_PROFILE_ID) return;
    this.save({
      ...this.registry(),
      profiles: this.profiles().map((profile) => profile.id === id ? { ...profile, name: clean } : profile),
    });
  }

  switchTo(id: string): void {
    if (id === this.activeId() || !this.profiles().some((profile) => profile.id === id)) return;
    this.save({ ...this.registry(), active: id });
    this.reload();
  }

  /** Deletes a profile with all its data; the active profile cannot be deleted. */
  async remove(id: string): Promise<void> {
    if (id === this.activeId() || !this.profiles().some((profile) => profile.id === id)) return;
    for (const key of PROFILE_KEYS) {
      const scoped = profileKeyOf(id, key);
      localStorage.removeItem(scoped);
      localStorage.removeItem(`${scoped}:corrupted`);
    }
    await writeSecret(secretNameOf(id, CALENDAR_PASSWORD_BASE_NAME), '');
    this.save({ ...this.registry(), profiles: this.profiles().filter((profile) => profile.id !== id) });
  }

  /** Overridable so tests need not reload the page. */
  reload(): void {
    window.location.reload();
  }

  private save(registry: ProfileRegistry): void {
    writeRegistry(registry);
    this.registry.set(registry);
  }

  private static cleanName(name: string): string {
    return name.trim().slice(0, MAX_PROFILE_NAME_LENGTH);
  }
}
