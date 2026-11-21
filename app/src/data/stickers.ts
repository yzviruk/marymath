import { earnedStickers, STICKERS, type StickerFacts } from '../engine/stickers';
import { listAttempts } from './attempts';
import { getDb } from './db';
import { ProfileError } from './profiles';
import type { Profile } from './types';

export async function stickerFacts(profile: Profile): Promise<StickerFacts> {
  return {
    levelStars: profile.levelStars ?? {},
    coins: profile.coins,
    owned: profile.owned ?? [],
    attempts: await listAttempts(profile.id),
  };
}

/**
 * Glues in every sticker the child has earned and has not got yet (dated today).
 * Returns the new ones in album order.
 */
export async function syncStickers(profileId: string, now = new Date()): Promise<{ profile: Profile; added: string[] }> {
  const attempts = await listAttempts(profileId);
  const db = await getDb();
  const tx = db.transaction('profiles', 'readwrite');
  const p = await tx.store.get(profileId);
  if (!p) throw new ProfileError('Профіль не знайдено');
  const earned = earnedStickers({ levelStars: p.levelStars ?? {}, coins: p.coins, owned: p.owned ?? [], attempts });
  const have = p.stickers ?? {};
  const added = earned.filter((id) => !have[id]);
  if (added.length) {
    const day = now.toISOString().slice(0, 10);
    p.stickers = { ...have, ...Object.fromEntries(added.map((id) => [id, day])) };
    await tx.store.put(p);
  }
  await tx.done;
  return { profile: p, added: STICKERS.filter((s) => added.includes(s.id)).map((s) => s.id) };
}
