import { digitCount, type ColumnInfo } from '../engine/column';

/**
 * A box the child can type into: an answer digit under a place, or (subtraction) the circle
 * above a place where the child writes what the top digit became after borrowing.
 */
export interface Cell {
  kind: 'answer' | 'borrow';
  place: number;
}

export interface ColumnInput {
  width: number;
  /** Answer digits by place (0 = ones); null = empty. */
  answer: (number | null)[];
  /** Carry «1» put above a place by a tap (index = the place that receives it); index 0 is unused. */
  carry: (number | null)[];
  /** Subtraction: the number (0–19) the child wrote above a place after borrowing; null = empty. */
  borrow: (number | null)[];
  /** A lone «1» was just typed into a borrow circle: the next digit makes it 10–19. */
  pending: boolean;
  cursor: Cell | null;
}

export function initialInput(column: ColumnInfo): ColumnInput {
  return {
    width: column.width,
    answer: Array(column.width).fill(null),
    carry: Array(column.width).fill(null),
    borrow: Array(column.width).fill(null),
    pending: false,
    cursor: { kind: 'answer', place: 0 },
  };
}

const set = <T>(list: T[], i: number, v: T) => list.map((x, j) => (j === i ? v : x));

/** The answer box to go back to after a borrow circle: the lowest empty one (else the top one). */
function backToAnswer(s: ColumnInput): Cell {
  const empty = s.answer.findIndex((d) => d === null);
  return { kind: 'answer', place: empty >= 0 ? empty : s.width - 1 };
}

/**
 * Typing a digit fills the focused box (replacing what was there).
 * Answer box: moves on to the left. Borrow circle: «1» waits for a second digit (10–19),
 * any other digit — or the second one — finishes it and goes back to the answer.
 */
export function typeDigit(s: ColumnInput, d: number): ColumnInput {
  const c = s.cursor;
  if (!c) return s;
  if (c.kind === 'borrow') {
    if (s.pending) {
      const borrow = set(s.borrow, c.place, 10 + d);
      return { ...s, borrow, pending: false, cursor: backToAnswer({ ...s, borrow }) };
    }
    const borrow = set(s.borrow, c.place, d);
    if (d === 1) return { ...s, borrow, pending: true };
    return { ...s, borrow, pending: false, cursor: backToAnswer({ ...s, borrow }) };
  }
  const answer = set(s.answer, c.place, d);
  const next = c.place + 1 < s.width ? { kind: 'answer' as const, place: c.place + 1 } : c;
  return { ...s, answer, pending: false, cursor: next };
}

/** ⌫ clears the focused box; on an empty answer box it steps back to the right and clears that one. */
export function erase(s: ColumnInput): ColumnInput {
  const c = s.cursor;
  if (!c) return s;
  if (c.kind === 'borrow') return { ...s, borrow: set(s.borrow, c.place, null), pending: false };
  if (s.answer[c.place] !== null) return { ...s, answer: set(s.answer, c.place, null) };
  if (c.place === 0) return s;
  const place = c.place - 1;
  return { ...s, answer: set(s.answer, place, null), cursor: { kind: 'answer', place } };
}

export function focus(s: ColumnInput, cell: Cell): ColumnInput {
  if (cell.place < 0 || cell.place >= s.width) return s;
  return { ...s, cursor: cell, pending: false };
}

/**
 * Tap on the carry circle above a place (addition): a carry is always 1, so the tap puts «1»
 * there and a second tap takes it away. The cursor stays where it was.
 */
export function toggleCarry(s: ColumnInput, place: number): ColumnInput {
  if (place < 1 || place >= s.width) return s;
  return { ...s, carry: set(s.carry, place, s.carry[place] === 1 ? null : 1) };
}

export function clearAll(s: ColumnInput): ColumnInput {
  return {
    ...s,
    answer: s.answer.map(() => null),
    carry: s.carry.map(() => null),
    borrow: s.borrow.map(() => null),
    pending: false,
    cursor: { kind: 'answer', place: 0 },
  };
}

/**
 * The typed number, or null while incomplete: an empty box below a filled one, or nothing typed.
 * Empty boxes on the left are fine (1000 − 970 = 30 leaves two boxes empty).
 */
export function answerValue(s: ColumnInput): number | null {
  const top = s.answer.reduce<number>((hi, d, i) => (d !== null ? i : hi), -1);
  if (top < 0) return null;
  let value = 0;
  for (let i = top; i >= 0; i--) {
    const d = s.answer[i];
    if (d === null) return null;
    value = value * 10 + d;
  }
  return value;
}

/** Places whose typed digit differs from the right one (leading zero places may stay empty). */
export function wrongPlaces(s: ColumnInput, column: ColumnInfo): number[] {
  const digits = digitCount(column.result);
  return column.places
    .filter((p) => {
      const typed = s.answer[p.place];
      if (p.place >= digits) return typed !== null && typed !== 0;
      return typed !== p.digit;
    })
    .map((p) => p.place);
}

/** Carries the child should have written above the column but did not (addition). */
export function missingCarries(s: ColumnInput, column: ColumnInfo): number[] {
  if (column.op !== '+') return [];
  return column.places.filter((p) => p.in && s.carry[p.place] !== 1).map((p) => p.place);
}

/**
 * Subtraction: what stands above each place once the borrows for places up to `upto` are made
 * (null = the place is untouched so far). 111 − 29 at the ones: [11, 0, null];
 * at the tens: [11, 10, 0]. A zero on the way lends at once (400 − 127 at the ones: [10, 9, 3]).
 */
export function borrowMarksAt(column: ColumnInfo, upto: number): (number | null)[] {
  const marks: (number | null)[] = column.places.map(() => null);
  if (column.op !== '−') return marks;
  for (const p of column.places) {
    if (p.place <= upto && (p.in || p.out)) marks[p.place] = p.a - p.in + 10 * p.out;
  }
  // The place that lends to `upto` (and zeros passing the borrow on) already changed.
  for (let q = upto + 1; q < column.width && column.places[q].in; q++) {
    const a = column.places[q].a;
    marks[q] = a - 1 + (a === 0 ? 10 : 0);
    if (a !== 0) break;
  }
  return marks;
}

/** Borrow circles left empty although the top digit changed (subtraction). */
export function missingBorrows(s: ColumnInput, column: ColumnInfo): number[] {
  const final = borrowMarksAt(column, column.width - 1);
  return final.flatMap((m, p) => (m !== null && s.borrow[p] === null ? [p] : []));
}

/** Borrow circles holding a number other than what the top digit became (subtraction). */
export function wrongBorrows(s: ColumnInput, column: ColumnInfo): number[] {
  if (column.op !== '−') return [];
  const final = borrowMarksAt(column, column.width - 1);
  return s.borrow.flatMap((v, p) => (v !== null && v !== (final[p] ?? column.places[p].a) ? [p] : []));
}

/** What the top of a place is now: the number written above it, else its digit (subtraction). */
export function shownTop(s: ColumnInput, column: ColumnInfo, place: number): number {
  return s.borrow[place] ?? column.places[place].a;
}
