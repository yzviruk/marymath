import type { ColumnInfo } from './column';

export type Op = '+' | '−' | '×' | ':';

/** One token of a written example. A blank is a box the child fills; `i` indexes `Task.answers`. */
export type Part = { t: 'num'; v: number } | { t: 'op'; v: Op | '=' } | { t: 'blank'; i: number };

export type Line = Part[];

export type TaskKind =
  | 'column' // 47 + 38 = ?  (column addition / subtraction)
  | 'fact' // 6 × 4 = ?, 24 : 6 = ?
  | 'repeated-add' // 4 + 4 + 4 = 4 × ? = ?
  | 'commutative' // 2 × 5 = 5 × ? = ?
  | 'div-compose' // picture → place 24, 6, 4 into ? : ? = ?
  | 'fact-family'; // 6 × 4 = ?, 4 × 6 = ?, 24 : 6 = ?, 24 : 4 = ?

export type IslandId = 'add' | 'sub' | 'mul' | 'div';

/** Level ids as shown on the map: +1…+7, −1…−5, ×1…×6, :1…:5, and bosses +♛ −♛ ×♛ :♛. */
export type LevelId = string;

/** Objects in a picture: `groups` boxes with `size` items each. */
export interface Picture {
  groups: number;
  size: number;
  /** share: total split equally into `groups` (find size); group: groups of `size` (find how many). */
  mode: 'equal-groups' | 'share' | 'group' | 'array';
}

export interface Task {
  /** Canonical example text, unique within a level: "47+38", "24:6". */
  key: string;
  /** Level whose generator produced the task (a boss mixes tasks of other levels). */
  level: LevelId;
  kind: TaskKind;
  lines: Line[];
  /** Expected value of each blank, in reading order. */
  answers: number[];
  /** The main operation the task is about; explanations and error detection use it. */
  main: { op: Op; a: number; b: number; result: number };
  column?: ColumnInfo;
  picture?: Picture;
  /** div-compose: the numbers the child places into the boxes, in shuffled order. */
  choices?: number[];
}

export type ErrorKind =
  | 'forgot-carry' // 47 + 38 = 75
  | 'no-borrow' // 52 − 17 = 45
  | 'borrow-through-zero' // 400 − 127 = 373 / 327
  | 'reversed-division' // 4 : 6 = 24
  | 'wrong-operation' // 12 : 3 = 36 or 15; 6 × 4 = 10
  | 'neighbor-fact' // 6 × 4 = 28
  | 'other';
