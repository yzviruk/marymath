import { beforeEach, describe, expect, it } from 'vitest';
import { reviewTasks, listAttempts, saveAttempt } from './attempts';
import { resetDbForTests } from './db';
import { addCoins, createProfile, recordLevelStars } from './profiles';
import type { Attempt } from './types';

beforeEach(async () => {
  await resetDbForTests();
});

const base: Omit<Attempt, 'id'> = {
  profileId: 'p1',
  at: '2026-11-19T10:00:00.000Z',
  level: '+3',
  taskKey: '47+38',
  op: '+',
  a: 47,
  b: 38,
  value: 75,
  correct: false,
  error: 'forgot-carry',
  tryNo: 1,
  hintUsed: false,
  ms: 9000,
};

describe('attempts', () => {
  it('stores attempts per profile', async () => {
    await saveAttempt(base);
    await saveAttempt({ ...base, profileId: 'p2' });
    expect(await listAttempts('p1')).toHaveLength(1);
  });

  it('offers yesterday’s mistakes for review, not today’s and not fixed ones', async () => {
    const now = new Date('2026-11-20T09:00:00.000Z');
    await saveAttempt(base); // missed yesterday
    await saveAttempt({ ...base, taskKey: '27+58', a: 27, b: 58, value: 75, at: '2026-11-20T08:00:00.000Z' }); // today
    await saveAttempt({ ...base, taskKey: '36+48', a: 36, b: 48, value: 74, at: '2026-11-18T08:00:00.000Z' });
    await saveAttempt({ ...base, taskKey: '36+48', a: 36, b: 48, value: 84, correct: true, error: null, at: '2026-11-19T12:00:00.000Z' });
    await saveAttempt({ ...base, level: '−2', taskKey: '52−17', op: '−', a: 52, b: 17, value: 45 }); // other island
    const review = await reviewTasks('p1', ['+1', '+2', '+3'], now);
    expect(review.map((t) => t.key)).toEqual(['47+38']);
    expect(review[0].column!.regroup).toEqual([0]);
  });

  it('rebuilds × and : tasks for review with their pictures', async () => {
    const now = new Date('2026-11-20T09:00:00.000Z');
    await saveAttempt({ ...base, level: ':3', taskKey: '24:6', op: ':', a: 24, b: 6, value: 24, error: 'reversed-division' });
    await saveAttempt({ ...base, level: '×1', taskKey: '4×3', op: '×', a: 4, b: 3, value: 7, error: 'wrong-operation', at: '2026-11-18T08:00:00.000Z' });
    const review = await reviewTasks('p1', [':3', '×1'], now);
    expect(review.map((t) => [t.level, t.kind, t.key])).toEqual([
      [':3', 'div-compose', '24:6'],
      ['×1', 'repeated-add', '4×3'],
    ]);
    expect(review[0].picture).toEqual({ groups: 6, size: 4, mode: 'share' });
  });
});

describe('coins and stars', () => {
  it('adds coins and keeps the best stars per level', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'dog' });
    expect((await addCoins(p.id, 30)).coins).toBe(30);
    await recordLevelStars(p.id, '+3', 2);
    await recordLevelStars(p.id, '+3', 1);
    const after = await recordLevelStars(p.id, '+4', 3);
    expect(after.levelStars).toEqual({ '+3': 2, '+4': 3 });
    expect(after.stars).toBe(5);
  });
});
