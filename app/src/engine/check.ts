import { columnAdd, columnSub, digitsOf } from './column';
import { apply } from './tasks';
import type { ErrorKind, Line, Op, Task } from './types';

type Values = readonly (number | undefined)[];

/** True when every blank is filled correctly. */
export function isCorrect(task: Task, values: Values): boolean {
  if (task.kind === 'div-compose') {
    // Both readings of the picture are right: 24 : 6 = 4 and 24 : 4 = 6.
    const [total, x, y] = values;
    const { groups, size } = task.picture!;
    return (
      total === groups * size &&
      ((x === groups && y === size) || (x === size && y === groups))
    );
  }
  return task.answers.every((a, i) => values[i] === a);
}

/** Index of the first wrong blank, or -1. */
export function firstWrongBlank(task: Task, values: Values): number {
  if (isCorrect(task, values)) return -1;
  if (task.kind === 'div-compose') return values[0] !== task.main.a ? 0 : 1;
  return task.answers.findIndex((a, i) => values[i] !== a);
}

/** Recognises a typical mistake from the plan's table; null when the answer is right. */
export function classifyError(task: Task, values: Values): ErrorKind | null {
  if (isCorrect(task, values)) return null;

  if (task.kind === 'div-compose') {
    const total = task.main.a;
    // 4 : 6 = 24 — the whole written last instead of first.
    if (values[0] !== total && values.includes(total)) return 'reversed-division';
    return 'other';
  }

  const i = firstWrongBlank(task, values);
  const given = values[i];
  if (given === undefined) return 'other';
  const eq = equationOf(task, i);
  if (!eq) return 'other';
  return classifyValue(eq.op, eq.a, eq.b, given);
}

/**
 * The fact a blank is about, with its result: the line's «x op y = blank», or the task's main fact
 * (the product blank of ×1/×2, the boxes of :3, the «4 × ?» blank of ×1).
 */
export function blankFact(task: Task, blankIndex: number): { op: Op; a: number; b: number; result: number } {
  const eq = task.kind === 'div-compose' ? null : equationOf(task, blankIndex);
  const f = eq ?? task.main;
  return { op: f.op, a: f.a, b: f.b, result: apply(f.op, f.a, f.b) };
}

/** The «x op y = blank» equation a blank answers; for the product blank of ×1/×2 it is the main fact. */
function equationOf(task: Task, blankIndex: number): { op: Op; a: number; b: number } | null {
  const line = task.lines.find((l) => l.some((p) => p.t === 'blank' && p.i === blankIndex));
  if (!line) return null;
  const simple = simpleEquation(line);
  if (simple) return simple;
  const isLastBlank = line[line.length - 1].t === 'blank' && (line[line.length - 1] as { i: number }).i === blankIndex;
  return isLastBlank ? task.main : null;
}

function simpleEquation(line: Line): { op: Op; a: number; b: number } | null {
  if (line.length !== 5) return null;
  const [a, o, b, eq, x] = line;
  if (a.t !== 'num' || o.t !== 'op' || o.v === '=' || b.t !== 'num' || eq.t !== 'op' || eq.v !== '=' || x.t !== 'blank') {
    return null;
  }
  return { op: o.v, a: a.v, b: b.v };
}

function classifyValue(o: Op, a: number, b: number, given: number): ErrorKind {
  if (o === '+') {
    if (addMistakes(a, b).includes(given)) return 'forgot-carry';
    return 'other';
  }
  if (o === '−') {
    const c = columnSub(a, b);
    if (c.regroup.length && subMistakes(a, b).includes(given)) {
      return c.throughZero ? 'borrow-through-zero' : 'no-borrow';
    }
    return 'other';
  }
  if (o === '×') {
    if (given === a + b) return 'wrong-operation';
    const neighbours = [(a - 1) * b, (a + 1) * b, a * (b - 1), a * (b + 1)];
    if (neighbours.includes(given)) return 'neighbor-fact';
    return 'other';
  }
  // division
  const q = apply(':', a, b);
  if (given === a * b || given === a + b || given === a - b) return 'wrong-operation';
  if (given === q - 1 || given === q + 1) return 'neighbor-fact';
  return 'other';
}

/** Every non-empty subset of `items`. */
function subsets<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let mask = 1; mask < 1 << items.length; mask++) {
    out.push(items.filter((_, i) => mask & (1 << i)));
  }
  return out;
}

/** Results with one or more carries dropped: 47 + 38 → 75. */
export function addMistakes(a: number, b: number): number[] {
  const c = columnAdd(a, b);
  return subsets(c.regroup).map((places) => c.result - places.reduce((s, p) => s + 10 ** (p + 1), 0));
}

/**
 * Wrong results a child gets by mishandling borrowing:
 * the smaller digit taken from the bigger one (52 − 17 → 45, 400 − 127 → 327), or a borrow
 * made but a place not reduced (52 − 17 → 45, 400 − 127 → 373 or 383).
 */
export function subMistakes(a: number, b: number): number[] {
  const c = columnSub(a, b);
  const bd = digitsOf(b, c.width);
  const ad = digitsOf(a, c.width);
  const smallerFromBigger = ad.reduce((sum, d, i) => sum + Math.abs(d - bd[i]) * 10 ** i, 0);
  const lentPlaces = c.places.filter((p) => p.in).map((p) => p.place);
  const notReduced = subsets(lentPlaces).map((places) => c.result + places.reduce((s, p) => s + 10 ** p, 0));
  return [smallerFromBigger, ...notReduced].filter((v) => v !== c.result);
}
