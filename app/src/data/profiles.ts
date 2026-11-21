import { getDb } from './db';
import { DEFAULT_PET_NAME, PET_KINDS, type PetKind, type Profile } from './types';

export const MAX_PROFILES = 6;
export const MAX_NAME_LENGTH = 20;

/** Validation error with a child-friendly Ukrainian message. */
export class ProfileError extends Error {}

export interface NewProfile {
  name: string;
  pet: PetKind;
  petName?: string;
}

export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export async function listProfiles(): Promise<Profile[]> {
  return (await getDb()).getAllFromIndex('profiles', 'byCreated');
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  return (await getDb()).get('profiles', id);
}

export async function createProfile(input: NewProfile): Promise<Profile> {
  const name = normalizeName(input.name);
  if (!name) throw new ProfileError('Напиши імʼя');
  if (name.length > MAX_NAME_LENGTH) throw new ProfileError(`Імʼя — до ${MAX_NAME_LENGTH} літер`);
  if (!PET_KINDS.includes(input.pet)) throw new ProfileError('Обери улюбленця');

  const db = await getDb();
  const tx = db.transaction('profiles', 'readwrite');
  const existing = await tx.store.getAll();
  if (existing.length >= MAX_PROFILES) throw new ProfileError(`Можна мати до ${MAX_PROFILES} профілів`);
  const key = name.toLocaleLowerCase('uk');
  if (existing.some((p) => p.name.toLocaleLowerCase('uk') === key)) {
    throw new ProfileError('Профіль з таким імʼям уже є');
  }

  const profile: Profile = {
    id: crypto.randomUUID(),
    name,
    pet: input.pet,
    petName: normalizeName(input.petName ?? '') || DEFAULT_PET_NAME,
    createdAt: new Date().toISOString(),
    stars: 0,
    coins: 0,
  };
  await tx.store.add(profile);
  await tx.done;
  return profile;
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, 'name' | 'pet' | 'petName'>>,
): Promise<Profile> {
  const db = await getDb();
  const current = await db.get('profiles', id);
  if (!current) throw new ProfileError('Профіль не знайдено');
  const next: Profile = { ...current, ...patch };
  next.name = normalizeName(next.name);
  if (!next.name) throw new ProfileError('Напиши імʼя');
  await db.put('profiles', next);
  return next;
}

export async function addCoins(id: string, coins: number): Promise<Profile> {
  const db = await getDb();
  const tx = db.transaction('profiles', 'readwrite');
  const p = await tx.store.get(id);
  if (!p) throw new ProfileError('Профіль не знайдено');
  p.coins += coins;
  await tx.store.put(p);
  await tx.done;
  return p;
}

/** Keeps the best stars of a level, recomputes the total and remembers the level as the last one. */
export async function recordLevelStars(id: string, level: string, stars: number): Promise<Profile> {
  const db = await getDb();
  const tx = db.transaction('profiles', 'readwrite');
  const p = await tx.store.get(id);
  if (!p) throw new ProfileError('Профіль не знайдено');
  const levelStars = { ...(p.levelStars ?? {}) };
  levelStars[level] = Math.max(levelStars[level] ?? 0, stars);
  p.levelStars = levelStars;
  p.stars = Object.values(levelStars).reduce((s, n) => s + n, 0);
  p.lastLevel = level;
  await tx.store.put(p);
  await tx.done;
  return p;
}

export async function deleteProfile(id: string): Promise<void> {
  await (await getDb()).delete('profiles', id);
}
