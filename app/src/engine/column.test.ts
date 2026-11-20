import { describe, expect, it } from 'vitest';
import { columnAdd, columnSub, digitsOf } from './column';

describe('column arithmetic', () => {
  it('splits digits from ones up', () => {
    expect(digitsOf(356)).toEqual([6, 5, 3]);
    expect(digitsOf(7, 3)).toEqual([7, 0, 0]);
  });

  it('adds with a carry from ones (47 + 38)', () => {
    const c = columnAdd(47, 38);
    expect(c.result).toBe(85);
    expect(c.regroup).toEqual([0]);
    expect(c.places.map((p) => p.digit)).toEqual([5, 8]);
    expect(c.places[1].in).toBe(1);
  });

  it('adds with carries in two places (278 + 356)', () => {
    const c = columnAdd(278, 356);
    expect(c.result).toBe(634);
    expect(c.regroup).toEqual([0, 1]);
  });

  it('reaches 1000 (999 + 1)', () => {
    const c = columnAdd(999, 1);
    expect(c.width).toBe(4);
    expect(c.places.map((p) => p.digit)).toEqual([0, 0, 0, 1]);
    expect(c.regroup).toEqual([0, 1, 2]);
  });

  it('borrows from tens (52 − 17)', () => {
    const c = columnSub(52, 17);
    expect(c.result).toBe(35);
    expect(c.regroup).toEqual([0]);
    expect(c.throughZero).toBe(false);
  });

  it('borrows from hundreds only (527 − 254)', () => {
    expect(columnSub(527, 254).regroup).toEqual([1]);
  });

  it('borrows through zero (400 − 127, 1000 − 365)', () => {
    const c = columnSub(400, 127);
    expect(c.result).toBe(273);
    expect(c.throughZero).toBe(true);
    expect(c.places.map((p) => p.digit)).toEqual([3, 7, 2]);
    expect(columnSub(1000, 365).throughZero).toBe(true);
    expect(columnSub(1000, 365).result).toBe(635);
  });

  it('refuses a negative result', () => {
    expect(() => columnSub(12, 30)).toThrow();
  });
});
