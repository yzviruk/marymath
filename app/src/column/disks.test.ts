import { describe, expect, it } from 'vitest';
import { columnAdd, columnSub } from '../engine/column';
import { canMerge, disksAt, initialDisks, merge, split } from './disks';

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
});
