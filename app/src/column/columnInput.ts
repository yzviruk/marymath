import { digitCount, type ColumnInfo } from '../engine/column';

/** A box the child can type into: an answer digit under a place. */
export interface Cell {
  kind: 'answer';
  place: number;
}

export interface ColumnInput {
  width: number;
  /** Answer digits by place (0 = ones); null = empty. */
  answer: (number | null)[];
  /** Carry «1» put above a place by a tap (index = the place that receives it); index 0 is unused. */
  carry: (number | null)[];
  /** Subtraction: top digit of a place crossed out because it lent to the place below. */
  crossed: boolean[];
  cursor: Cell | null;
}

export function initialInput(column: ColumnInfo): ColumnInput {
  return {
    width: column.width,
    answer: Array(column.width).fill(null),
    carry: Array(column.width).fill(null),
    crossed: Array(column.width).fill(false),
    cursor: { kind: 'answer', place: 0 },
  };
}

const set = <T>(list: T[], i: number, v: T) => list.map((x, j) => (j === i ? v : x));

/** Typing a digit fills the focused box (replacing what was there) and moves on to the left. */
export function typeDigit(s: ColumnInput, d: number): ColumnInput {
  const c = s.cursor;
  if (!c) return s;
  const answer = set(s.answer, c.place, d);
  const next = c.place + 1 < s.width ? { kind: 'answer' as const, place: c.place + 1 } : c;
  return { ...s, answer, cursor: next };
}

/** ⌫ clears the focused box; on an empty box it steps back to the right and clears that one. */
export function erase(s: ColumnInput): ColumnInput {
  const c = s.cursor;
  if (!c) return s;
  if (s.answer[c.place] !== null) return { ...s, answer: set(s.answer, c.place, null) };
  if (c.place === 0) return s;
  const place = c.place - 1;
  return { ...s, answer: set(s.answer, place, null), cursor: { kind: 'answer', place } };
}

export function focus(s: ColumnInput, cell: Cell): ColumnInput {
  if (cell.place < 0 || cell.place >= s.width) return s;
  return { ...s, cursor: cell };
}

/**
 * Tap on the carry circle above a place (addition): a carry is always 1, so the tap puts «1»
 * there and a second tap takes it away. The cursor stays where it was.
 */
export function toggleCarry(s: ColumnInput, place: number): ColumnInput {
  if (place < 1 || place >= s.width) return s;
  return { ...s, carry: set(s.carry, place, s.carry[place] === 1 ? null : 1) };
}

/** Tap on a top digit (subtraction): cross it out to lend a ten to the place below, or undo. */
export function toggleCross(s: ColumnInput, place: number): ColumnInput {
  if (place < 1 || place >= s.width) return s;
  return { ...s, crossed: set(s.crossed, place, !s.crossed[place]) };
}

export function clearAll(s: ColumnInput): ColumnInput {
  return {
    ...s,
    answer: s.answer.map(() => null),
    carry: s.carry.map(() => null),
    crossed: s.crossed.map(() => false),
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

/** Borrow marks the child did not make (subtraction). */
export function missingBorrows(s: ColumnInput, column: ColumnInfo): number[] {
  if (column.op !== '−') return [];
  return column.places.filter((p) => p.in && !s.crossed[p.place]).map((p) => p.place);
}

/** What the top digit of a place shows after the child's borrow marks (subtraction). */
export function shownTop(s: ColumnInput, column: ColumnInfo, place: number): number {
  const p = column.places[place];
  return p.a - (s.crossed[place] ? 1 : 0) + (s.crossed[place + 1] ? 10 : 0);
}
