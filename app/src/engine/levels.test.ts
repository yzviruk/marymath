import { describe, expect, it } from 'vitest';
import { columnAdd, columnSub, digitCount } from './column';
import { FACTORS } from './facts';
import { isCorrect } from './check';
import { getLevel, LEVELS } from './levels';
import { Rng } from './rng';
import type { Task } from './types';

const RUNS = 1000;

function generate(id: string, runs = RUNS): Task[] {
  const level = getLevel(id);
  const rng = new Rng(12345);
  return Array.from({ length: runs }, () => level.make(rng));
}

const regroup = (t: Task) => {
  const { op, a, b } = t.main;
  return (op === '+' ? columnAdd(a, b) : columnSub(a, b)).regroup;
};
const isFactor = (n: number) => (FACTORS as readonly number[]).includes(n);

describe.each(LEVELS.map((l) => l.id))('level %s', (id) => {
  const tasks = generate(id);

  it('gives correct answers that pass the checker', () => {
    for (const t of tasks) {
      const { op, a, b, result } = t.main;
      const expected = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
      expect(result, t.key).toBe(expected);
      expect(Number.isInteger(result) && result >= 0, t.key).toBe(true);
      expect(isCorrect(t, t.answers), t.key).toBe(true);
    }
  });

  it('has at least 10 different examples', () => {
    expect(new Set(tasks.map((t) => t.key)).size).toBeGreaterThanOrEqual(10);
  });

  it('is deterministic for a seed', () => {
    const level = getLevel(id);
    const a = Array.from({ length: 20 }, ((r) => () => level.make(r).key)(new Rng(7)));
    const b = Array.from({ length: 20 }, ((r) => () => level.make(r).key)(new Rng(7)));
    expect(a).toEqual(b);
  });
});

describe('addition levels follow the plan', () => {
  const check = (id: string, rule: (t: Task) => boolean) => {
    for (const t of generate(id)) expect(rule(t), `${id}: ${t.key}`).toBe(true);
  };
  const d = digitCount;

  it('+1 two-digit + one-digit, no carry', () =>
    check('+1', (t) => d(t.main.a) === 2 && d(t.main.b) === 1 && regroup(t).length === 0));
  it('+2 two-digit, no carry', () =>
    check('+2', (t) => d(t.main.a) === 2 && d(t.main.b) === 2 && regroup(t).length === 0));
  it('+3 two-digit, carry from ones', () =>
    check('+3', (t) => d(t.main.a) === 2 && d(t.main.b) === 2 && regroup(t).join() === '0' && t.main.result < 100));
  it('+4 three-digit, no carry', () =>
    check('+4', (t) => d(t.main.a) === 3 && d(t.main.b) === 3 && regroup(t).length === 0));
  it('+5 three-digit, carry in exactly one place', () =>
    check('+5', (t) => d(t.main.a) === 3 && regroup(t).length === 1 && t.main.result <= 999));
  it('+6 carries in ones and tens', () => check('+6', (t) => regroup(t).join() === '0,1' && t.main.result <= 999));
  it('+7 sums up to 1000, sometimes exactly 1000', () => {
    const tasks = generate('+7');
    for (const t of tasks) expect(t.main.result <= 1000 && t.main.result >= 600 && regroup(t).length > 0, t.key).toBe(true);
    expect(tasks.some((t) => t.main.result === 1000)).toBe(true);
  });
});

describe('subtraction levels follow the plan', () => {
  const check = (id: string, rule: (t: Task) => boolean) => {
    for (const t of generate(id)) expect(rule(t), `${id}: ${t.key}`).toBe(true);
  };
  const tz = (t: Task) => columnSub(t.main.a, t.main.b).throughZero;

  it('−1 no borrowing, two- and three-digit', () => {
    check('−1', (t) => regroup(t).length === 0 && t.main.result > 0);
    const sizes = new Set(generate('−1').map((t) => digitCount(t.main.a)));
    expect([...sizes].sort()).toEqual([2, 3]);
  });
  it('−2 borrow from tens only', () => check('−2', (t) => regroup(t).join() === '0' && !tz(t)));
  it('−3 borrow from hundreds only', () => check('−3', (t) => regroup(t).join() === '1'));
  it('−4 borrow in two places, not through zero', () => check('−4', (t) => regroup(t).join() === '0,1' && !tz(t)));
  it('−5 borrow through zero, includes 1000 − …', () => {
    check('−5', tz);
    expect(generate('−5').some((t) => t.main.a === 1000)).toBe(true);
  });
});

describe('multiplication and division levels follow the worksheets', () => {
  const factorsOk = (t: Task) => {
    const { op, a, b, result } = t.main;
    return op === '×' ? isFactor(a) && isFactor(b) : isFactor(b) && isFactor(result);
  };

  it.each(['×1', '×2', '×3', '×4', '×5', '×6', ':1', ':2', ':3', ':4', ':5', '×♛', ':♛'])('%s uses factors 2–7 and 10', (id) => {
    for (const t of generate(id)) expect(factorsOk(t), t.key).toBe(true);
  });

  it.each([
    ['×1', 20],
    ['×2', 20],
    [':1', 20],
    [':2', 20],
    ['×3', 35],
    ['×4', 35],
    ['×5', 35],
    ['×6', 35],
    [':3', 35],
    [':4', 35],
    [':5', 35],
  ] as const)('%s keeps products ≤ %i', (id, limit) => {
    for (const t of generate(id)) {
      const product = t.main.op === '×' ? t.main.result : t.main.a;
      expect(product, t.key).toBeLessThanOrEqual(limit);
    }
  });

  it('×3–×6 use their own tables', () => {
    const uses = (id: string, set: number[]) =>
      generate(id).every((t) => set.includes(t.main.a) || set.includes(t.main.b));
    expect(uses('×3', [2, 10])).toBe(true);
    expect(uses('×4', [5])).toBe(true);
    expect(uses('×5', [3, 4])).toBe(true);
    expect(uses('×6', [6, 7])).toBe(true);
  });

  it(':5 reaches the big facts (30 : 6, 35 : 7)', () => {
    const keys = new Set(generate(':5').map((t) => t.key));
    expect(keys.has('30:6') || keys.has('30:5')).toBe(true);
    expect(keys.has('35:7') || keys.has('35:5')).toBe(true);
  });

  it(':3 offers the three numbers to place, whole first', () => {
    for (const t of generate(':3', 200)) {
      expect([...t.choices!].sort((x, y) => x - y)).toEqual([...t.answers].sort((x, y) => x - y));
      expect(t.answers[0]).toBe(t.picture!.groups * t.picture!.size);
    }
  });

  it(':4 builds the whole fact family', () => {
    const t = generate(':4', 1)[0];
    const { a, b, result } = t.main;
    expect(t.answers).toEqual([result, result, b, a]);
    expect(t.lines).toHaveLength(4);
  });

  it('bosses mix several levels', () => {
    for (const id of ['+♛', '−♛', '×♛', ':♛']) {
      expect(new Set(generate(id, 200).map((t) => t.level)).size, id).toBeGreaterThan(2);
    }
    expect(new Set(generate(':♛', 200).map((t) => t.main.op))).toEqual(new Set(['×', ':']));
  });
});
