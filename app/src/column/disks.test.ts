import { describe, expect, it } from 'vitest';
import { columnAdd, columnSub } from '../engine/column';
import { canMerge, diskSize, disksAt, initialDisks, merge, split, splitHelps } from './disks';

describe('place-value disks', () => {
  it('addition starts with both numbers and merges 10 ones into a ten', () => {
    const c = columnAdd(47, 38);
    const d = initialDisks(c);
    expect(d).toEqual([15, 7]);
    expect(canMerge(d, 0)).toBe(true);
    expect(merge(d, 0)).toEqual([5, 8]);
    expect(merge([9, 7], 0)).toEqual([9, 7]); // fewer than 10: nothing happens
  });

  it('subtraction splits a ten into 10 ones', () => {
    expect(split([2, 5], 1)).toEqual([12, 4]);
    expect(split([2, 0], 1)).toEqual([2, 0]);
  });

  it('the pictorial mode follows the active place', () => {
    const c = columnAdd(278, 356); // 14 ones, 12 tens, 5 hundreds
    expect(disksAt(c, 0)).toEqual([14, 12, 5]);
    expect(disksAt(c, 1)).toEqual([4, 13, 5]);
    expect(disksAt(c, 2)).toEqual([4, 3, 6]);
  });

  it('borrows through zero step by step (400 − 127)', () => {
    const c = columnSub(400, 127);
    expect(disksAt(c, 0)).toEqual([10, 9, 3]);
    expect(disksAt(c, 1)).toEqual([10, 9, 3]);
  });

  it('ends with the digits of the result for addition', () => {
    const c = columnAdd(999, 1);
    expect(disksAt(c, 4)).toEqual([0, 0, 0, 1]);
  });

  it('a disk is split only while the place to the right lacks disks', () => {
    const c = columnSub(52, 17);
    expect(splitHelps(c, [2, 5], 1)).toBe(true); // 2 ones, 7 to take away
    expect(splitHelps(c, [12, 4], 1)).toBe(false); // already enough
    const z = columnSub(400, 107);
    expect(splitHelps(z, [0, 0, 4], 2)).toBe(true); // tens are empty and pass the borrow on
    expect(splitHelps(z, [0, 10, 3], 1)).toBe(true);
    expect(splitHelps(z, [10, 9, 3], 1)).toBe(false);
    expect(splitHelps(z, [10, 9, 3], 2)).toBe(false);
  });

  it('many disks get smaller so a column holds up to 19 of them', () => {
    expect(diskSize(5, 2, 30)).toBe(30);
    for (const columns of [2, 3, 4]) {
      const s = diskSize(19, columns, 30);
      expect(s).toBeGreaterThanOrEqual(20);
      expect(s).toBeLessThanOrEqual(30);
    }
  });
});
