import { beforeEach, describe, expect, it } from 'vitest';
import { saveAttempt } from './attempts';
import { dayTaskState, openDayGift, recordBlitz } from './daily';
import { resetDbForTests } from './db';
import { createProfile, getProfile, recordLevelStars } from './profiles';

beforeEach(resetDbForTests);

const NOW = new Date(2026, 10, 21, 18, 0);

describe('day task, gift and blitz record', () => {
  it('the gift opens once, only when the task is done, and joins the streak', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'dog' });
    const state = await dayTaskState(p, NOW);
    expect(state.done).toBe(false);
    expect((await openDayGift(p.id, NOW)).coins).toBe(0);

    // Do whatever today's task asks.
    if (state.def.kind === 'level') await recordLevelStars(p.id, '+1', 2, NOW);
    else {
      for (let i = 0; i < 10; i++) {
        await saveAttempt({
          profileId: p.id, at: NOW.toISOString(), level: '×1', taskKey: `${i}`, op: '×', a: 2, b: i + 2,
          value: 2 * (i + 2), correct: true, error: null, tryNo: 1, hintUsed: false, ms: 1000,
        });
      }
    }
    const fresh = (await getProfile(p.id))!;
    expect((await dayTaskState(fresh, NOW)).done).toBe(true);
    expect((await openDayGift(p.id, NOW)).coins).toBe(5);
    expect((await openDayGift(p.id, NOW)).coins).toBe(0);
    const after = (await getProfile(p.id))!;
    expect(after.dayGifts).toEqual(['2026-11-21']);
    expect(after.coins).toBe(5);
    expect((await dayTaskState(after, NOW)).opened).toBe(true);
  });

  it('levels passed today count from 0 each day', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'dog' });
    await recordLevelStars(p.id, '+1', 1, new Date(2026, 10, 20, 12));
    await recordLevelStars(p.id, '+2', 0, NOW); // not passed
    await recordLevelStars(p.id, '+1', 3, NOW);
    expect((await getProfile(p.id))!.passedToday).toEqual({ day: '2026-11-21', count: 1 });
  });

  it('a blitz record pays 5 coins only when beaten', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'dog' });
    expect(await recordBlitz(p.id, 0)).toMatchObject({ record: false, coins: 0 });
    expect(await recordBlitz(p.id, 12)).toMatchObject({ record: true, before: 0, coins: 5 });
    expect(await recordBlitz(p.id, 12)).toMatchObject({ record: false, before: 12, coins: 0 });
    expect(await recordBlitz(p.id, 14)).toMatchObject({ record: true, before: 12, coins: 5 });
    expect((await getProfile(p.id))!).toMatchObject({ blitzBest: 14, coins: 10 });
  });
});
