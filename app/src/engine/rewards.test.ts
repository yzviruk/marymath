import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels';
import { levelReward, levelWeight, taskCoins } from './rewards';
import { SHOP } from './shop';

describe('rewards', () => {
  it('weighs levels by difficulty, bosses the most', () => {
    expect(levelWeight('+1')).toBe(1);
    expect(levelWeight('×3')).toBe(2);
    expect(levelWeight('−5')).toBe(3);
    expect(levelWeight(':♛')).toBe(4);
    for (const l of LEVELS) expect(levelWeight(l.id)).toBeGreaterThanOrEqual(1);
  });

  it('pays for stars, and on a replay only for new stars', () => {
    expect(levelReward('+1', 3, 0)).toBe(10);
    expect(levelReward('+1', 1, 0)).toBe(4);
    expect(levelReward('−4', 2, 0)).toBe(18);
    expect(levelReward('+♛', 3, 0)).toBe(40);
    expect(levelReward('+3', 3, 1)).toBe((10 - 4) * 2);
    expect(levelReward('+3', 2, 3)).toBe(0);
    expect(levelReward('+3', 0, 0)).toBe(0);
  });

  it('a task pays 1 coin at once, nothing after help or on a full level', () => {
    expect(taskCoins(true, false)).toBe(1);
    expect(taskCoins(false, false)).toBe(0);
    expect(taskCoins(true, true)).toBe(0);
  });

  it('the shop lasts the whole game, but the first thing comes after the first level', () => {
    const shop = SHOP.reduce((s, i) => s + (i.price ?? 0), 0);
    const all3 = LEVELS.reduce((s, l) => s + levelReward(l.id, 3, 0) + 10, 0);
    expect(all3).toBeGreaterThan(shop * 0.8);
    expect(all3).toBeLessThan(shop * 1.6);
    const cheapest = Math.min(...SHOP.flatMap((i) => (i.price ? [i.price] : [])));
    expect(levelReward('+1', 3, 0) + 10).toBeGreaterThanOrEqual(cheapest);
  });
});
