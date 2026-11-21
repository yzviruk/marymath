import { BLITZ_RECORD_COINS } from '../engine/blitz';
import { DAY_GIFT_COINS, dayTaskFor, dayTaskProgress } from '../engine/daily';
import { localDay } from '../engine/stats';
import { listAttempts } from './attempts';
import { getDb } from './db';
import { ProfileError } from './profiles';
import type { Profile } from './types';

/** Levels passed today, from the profile. */
export const passedToday = (p: Profile, now = new Date()) => (p.passedToday?.day === localDay(now) ? p.passedToday.count : 0);

/** Today's task and how far it is. */
export async function dayTaskState(p: Profile, now = new Date()) {
  const def = dayTaskFor(localDay(now));
  const have = dayTaskProgress(def, await listAttempts(p.id), passedToday(p, now), now);
  const opened = (p.dayGifts ?? []).includes(localDay(now));
  return { def, have, done: have >= def.need, opened };
}

/**
 * Opens today's gift: 5 coins, and the day joins the streak. Checks again that the task is done;
 * a second tap the same day gives nothing.
 */
export async function openDayGift(profileId: string, now = new Date()): Promise<{ profile: Profile; coins: number }> {
  const attempts = await listAttempts(profileId);
  const db = await getDb();
  const tx = db.transaction('profiles', 'readwrite');
  const p = await tx.store.get(profileId);
  if (!p) throw new ProfileError('Профіль не знайдено');
  const day = localDay(now);
  const def = dayTaskFor(day);
  const done = dayTaskProgress(def, attempts, passedToday(p, now), now) >= def.need;
  let coins = 0;
  if (done && !(p.dayGifts ?? []).includes(day)) {
    p.dayGifts = [...(p.dayGifts ?? []), day];
    p.coins += DAY_GIFT_COINS;
    coins = DAY_GIFT_COINS;
    await tx.store.put(p);
  }
  await tx.done;
  return { profile: p, coins };
}

/** Keeps the best blitz; a new record (over a record already there or the first one) pays a few coins. */
export async function recordBlitz(profileId: string, right: number): Promise<{ profile: Profile; before: number; record: boolean; coins: number }> {
  const db = await getDb();
  const tx = db.transaction('profiles', 'readwrite');
  const p = await tx.store.get(profileId);
  if (!p) throw new ProfileError('Профіль не знайдено');
  const before = p.blitzBest ?? 0;
  const record = right > before;
  const coins = record ? BLITZ_RECORD_COINS : 0;
  if (record) {
    p.blitzBest = right;
    p.coins += coins;
    await tx.store.put(p);
  }
  await tx.done;
  return { profile: p, before, record, coins };
}
