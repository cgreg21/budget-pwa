/*
 * Profiles: each one keeps its own data, settings and calendar sync in the browser. The default profile
 * keeps the original storage keys, so nothing has to be migrated; the others get a prefixed copy of them.
 * The active profile is fixed for a page's lifetime (switching reloads the app), which is why keys are
 * computed once, at module load.
 */
const REGISTRY_KEY = 'budget-pwa:profiles:v1';
const KEY_PREFIX = 'budget-pwa:';

export const DEFAULT_PROFILE_ID = 'default';
export const MAX_PROFILE_NAME_LENGTH = 40;

/** Storage keys that belong to a profile, without profile prefix. */
export const PROFILE_KEYS = [
  'budget-pwa:data:v1',
  'budget-pwa:trash:v1',
  'budget-pwa:settings:v1',
  'budget-pwa:calendar:v1',
  'budget-pwa:calendar-baseline:v1',
  'budget-pwa:calendar-proxy:v1',
] as const;

export interface Profile {
  id: string;
  /** Empty for the default profile until it is renamed: the interface shows its own label. */
  name: string;
}

export interface ProfileRegistry {
  active: string;
  profiles: Profile[];
}

function defaultRegistry(): ProfileRegistry {
  return { active: DEFAULT_PROFILE_ID, profiles: [{ id: DEFAULT_PROFILE_ID, name: '' }] };
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const { id, name } = value as Partial<Profile>;
  return typeof id === 'string' && /^[\w-]{1,40}$/.test(id) && typeof name === 'string';
}

function isRegistry(value: unknown): value is ProfileRegistry {
  if (typeof value !== 'object' || value === null) return false;
  const { active, profiles } = value as Partial<ProfileRegistry>;
  return typeof active === 'string' && Array.isArray(profiles) && profiles.length > 0 && profiles.every(isProfile)
    && profiles.some((profile) => profile.id === active)
    && new Set(profiles.map((profile) => profile.id)).size === profiles.length;
}

export function readRegistry(): ProfileRegistry {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? 'null');
    return isRegistry(value) ? value : defaultRegistry();
  } catch {
    return defaultRegistry();
  }
}

export function writeRegistry(registry: ProfileRegistry): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

/** The storage key `key` of a given profile. */
export function profileKeyOf(profileId: string, key: string): string {
  return profileId === DEFAULT_PROFILE_ID ? key : key.replace(KEY_PREFIX, `${KEY_PREFIX}profile:${profileId}:`);
}

/** The storage key `key` of the active profile. */
export function profileKey(key: string): string {
  return profileKeyOf(readRegistry().active, key);
}

/** The name under which a profile's secret is kept. */
export function secretNameOf(profileId: string, name: string): string {
  return profileId === DEFAULT_PROFILE_ID ? name : `${name}:${profileId}`;
}

export function activeSecretName(name: string): string {
  return secretNameOf(readRegistry().active, name);
}

export function newProfileId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}
