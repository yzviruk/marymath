import { getDb } from './db';
import { ProfileError } from './profiles';
import type { Attempt, Profile } from './types';

/** Settings of the parent panel (stored in `meta`). */
export interface Settings {
  sound: boolean;
  music: boolean;
  /** 0–100 */
  musicVolume: number;
  /** The «read aloud» button next to a task. */
  speech: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, musicVolume: 40, speech: true };

export async function getSettings(): Promise<Settings> {
  const stored = (await (await getDb()).get('meta', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await (await getDb()).put('meta', next, 'settings');
  return next;
}

// ── PIN ────────────────────────────────────────────────────────────────────

export const PIN_LENGTH = 4;

async function hash(pin: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`marymath:${pin}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hasPin(): Promise<boolean> {
  return (await (await getDb()).get('meta', 'pin')) !== undefined;
}

export async function setPin(pin: string): Promise<void> {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) throw new ProfileError(`PIN — ${PIN_LENGTH} цифри`);
  await (await getDb()).put('meta', await hash(pin), 'pin');
}

export async function checkPin(pin: string): Promise<boolean> {
  const stored = await (await getDb()).get('meta', 'pin');
  return stored !== undefined && stored === (await hash(pin));
}

// ── Profiles ───────────────────────────────────────────────────────────────

async function deleteAttempts(profileId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('attempts', 'readwrite');
  let cursor = await tx.store.index('byProfile').openCursor(profileId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

/** Starts the child over: stars, coins, things, stickers and every attempt go; name, pet and opened islands stay. */
export async function resetProgress(profileId: string): Promise<Profile> {
  await deleteAttempts(profileId);
  const db = await getDb();
  const p = await db.get('profiles', profileId);
  if (!p) throw new ProfileError('Профіль не знайдено');
  const fresh: Profile = { id: p.id, name: p.name, pet: p.pet, petName: p.petName, createdAt: p.createdAt, stars: 0, coins: 0 };
  // Islands opened by hand are a parent's setting, not progress.
  if (p.openIslands?.length) fresh.openIslands = p.openIslands;
  await db.put('profiles', fresh);
  return fresh;
}

/** Deletes the profile with all its attempts. */
export async function removeProfile(profileId: string): Promise<void> {
  await deleteAttempts(profileId);
  await (await getDb()).delete('profiles', profileId);
}

/** Opens (or closes) an island by hand: all its levels become playable. */
export async function setIslandOpen(profileId: string, island: string, open: boolean): Promise<Profile> {
  const db = await getDb();
  const tx = db.transaction('profiles', 'readwrite');
  const p = await tx.store.get(profileId);
  if (!p) throw new ProfileError('Профіль не знайдено');
  const rest = (p.openIslands ?? []).filter((i) => i !== island);
  p.openIslands = open ? [...rest, island] : rest;
  await tx.store.put(p);
  await tx.done;
  return p;
}

// ── Backup ─────────────────────────────────────────────────────────────────

export interface Backup {
  app: 'marymath';
  version: 1;
  exportedAt: string;
  profiles: Profile[];
  attempts: Attempt[];
  settings: Settings;
}

/** Everything on the tablet except the PIN. */
export async function exportBackup(now = new Date()): Promise<Backup> {
  const db = await getDb();
  return {
    app: 'marymath',
    version: 1,
    exportedAt: now.toISOString(),
    profiles: await db.getAll('profiles'),
    attempts: await db.getAll('attempts'),
    settings: await getSettings(),
  };
}

export function backupFileName(b: Backup): string {
  return `marymath-${b.exportedAt.slice(0, 10)}.json`;
}

/** Reads a backup file; throws a ProfileError with a message for a parent. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProfileError('Це не файл копії MaryMath');
  }
  const b = data as Partial<Backup>;
  if (!b || b.app !== 'marymath' || !Array.isArray(b.profiles) || !Array.isArray(b.attempts)) {
    throw new ProfileError('Це не файл копії MaryMath');
  }
  if (b.version !== 1) throw new ProfileError('Копія з новішої версії застосунку');
  for (const p of b.profiles) {
    if (typeof p?.id !== 'string' || typeof p.name !== 'string' || typeof p.coins !== 'number') {
      throw new ProfileError('Файл копії пошкоджений');
    }
  }
  return { ...b, settings: { ...DEFAULT_SETTINGS, ...(b.settings ?? {}) } } as Backup;
}

/** Replaces all profiles, attempts and settings with the backup (the PIN stays). */
export async function restoreBackup(b: Backup): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['profiles', 'attempts', 'meta'], 'readwrite');
  await tx.objectStore('profiles').clear();
  await tx.objectStore('attempts').clear();
  for (const p of b.profiles) await tx.objectStore('profiles').put(p);
  for (const a of b.attempts) await tx.objectStore('attempts').put(a);
  await tx.objectStore('meta').put(b.settings, 'settings');
  await tx.done;
}
