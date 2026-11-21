import { beforeEach, describe, expect, it } from 'vitest';
import { saveAttempt } from './attempts';
import { resetDbForTests } from './db';
import { addCoins, createProfile, recordLevelStars } from './profiles';
import { syncStickers } from './stickers';

beforeEach(async () => {
  await resetDbForTests();
});

describe('syncStickers', () => {
  it('glues in earned stickers once, with the day', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'dog' });
    expect((await syncStickers(p.id)).added).toEqual([]);
    await recordLevelStars(p.id, '+1', 3);
    await addCoins(p.id, 120);
    await saveAttempt({
      profileId: p.id, at: '2026-11-21T10:00:00.000Z', level: '+1', taskKey: '34+5', op: '+', a: 34, b: 5,
      value: 39, correct: true, error: null, tryNo: 1, hintUsed: false, ms: 1000,
    });
    const first = await syncStickers(p.id, new Date('2026-11-21T12:00:00Z'));
    expect(first.added).toEqual(['first-level', 'three-stars', 'coins-100']);
    expect(first.profile.stickers).toEqual({ 'first-level': '2026-11-21', 'three-stars': '2026-11-21', 'coins-100': '2026-11-21' });
    expect((await syncStickers(p.id)).added).toEqual([]);
  });
});
