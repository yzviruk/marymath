import { getItem, takeOff, wear } from '../engine/shop';
import { getDb } from './db';
import { ProfileError } from './profiles';
import type { Profile } from './types';

/** Reads the profile, changes it and writes it back in one transaction (no double spending). */
async function change(id: string, edit: (p: Profile) => void): Promise<Profile> {
  const db = await getDb();
  const tx = db.transaction('profiles', 'readwrite');
  const p = await tx.store.get(id);
  if (!p) throw new ProfileError('Профіль не знайдено');
  edit(p);
  await tx.store.put(p);
  await tx.done;
  return p;
}

/** Buys a thing: takes its price in coins; clothes are put on at once. */
export function buyItem(profileId: string, itemId: string): Promise<Profile> {
  return change(profileId, (p) => {
    const item = getItem(itemId);
    if (!item || item.price === null) throw new ProfileError('Цю річ не продають');
    if (p.owned?.includes(itemId)) throw new ProfileError('Ця річ уже є');
    if (p.coins < item.price) throw new ProfileError(`Не вистачає ${item.price - p.coins} монеток`);
    p.coins -= item.price;
    p.owned = [...(p.owned ?? []), itemId];
    if (item.slot) p.worn = wear(p.worn ?? {}, itemId);
  });
}

/** A rare thing from a boss. Returns null when the child already has it. */
export async function grantItem(profileId: string, itemId: string): Promise<Profile | null> {
  let granted = false;
  const p = await change(profileId, (q) => {
    if (q.owned?.includes(itemId)) return;
    q.owned = [...(q.owned ?? []), itemId];
    granted = true;
  });
  return granted ? p : null;
}

/** Puts clothes on (taking off what was in the slot) or takes them off. */
export function setWorn(profileId: string, itemId: string, on: boolean): Promise<Profile> {
  return change(profileId, (p) => {
    if (!p.owned?.includes(itemId)) throw new ProfileError('Цієї речі ще немає');
    p.worn = on ? wear(p.worn ?? {}, itemId) : takeOff(p.worn ?? {}, itemId);
  });
}

/** Puts a toy or a room thing away, or back into the room. */
export function setHidden(profileId: string, itemId: string, hidden: boolean): Promise<Profile> {
  return change(profileId, (p) => {
    const rest = (p.hidden ?? []).filter((id) => id !== itemId);
    p.hidden = hidden ? [...rest, itemId] : rest;
  });
}
