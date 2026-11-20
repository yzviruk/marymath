/**
 * Typing into the boxes of a × / : task. Numbers here are at most two digits (≤ 35).
 * `fresh` marks a box whose next digit replaces the value (after a failed check).
 */
export interface FactInput {
  values: (number | null)[];
  cursor: number | null;
  fresh: boolean[];
}

export function initialFactInput(blanks: number): FactInput {
  return {
    values: Array(blanks).fill(null),
    cursor: 0,
    fresh: Array(blanks).fill(false),
  };
}

export const isComplete = (s: FactInput) => s.values.every((v) => v !== null);

function nextEmpty(values: (number | null)[], after: number): number | null {
  for (let k = 1; k <= values.length; k++) {
    const i = (after + k) % values.length;
    if (values[i] === null) return i;
  }
  return null;
}

export function focusBlank(s: FactInput, i: number): FactInput {
  return { ...s, cursor: i };
}

/** A digit goes into the box under the cursor; after two digits the cursor moves to the next empty box. */
export function typeDigit(s: FactInput, d: number): FactInput {
  const c = s.cursor;
  if (c === null) return s;
  const v = s.values[c];
  const next = v === null || s.fresh[c] || v === 0 || v >= 10 ? d : v * 10 + d;
  const values = s.values.map((x, i) => (i === c ? next : x));
  const fresh = s.fresh.map((f, i) => (i === c ? false : f));
  const cursor = next >= 10 ? (nextEmpty(values, c) ?? c) : c;
  return { values, fresh, cursor };
}

export function eraseDigit(s: FactInput): FactInput {
  const c = s.cursor;
  if (c === null) return s;
  const v = s.values[c];
  if (v === null) return c > 0 ? { ...s, cursor: c - 1 } : s;
  const values = s.values.map((x, i) => (i === c ? (v >= 10 && !s.fresh[c] ? Math.floor(v / 10) : null) : x));
  return { ...s, values, fresh: s.fresh.map((f, i) => (i === c ? false : f)) };
}

export function clearAll(s: FactInput): FactInput {
  return initialFactInput(s.values.length);
}

/** After a failed check: the wrong boxes shake, the first gets the cursor, a new digit replaces. */
export function markWrong(s: FactInput, wrong: number[]): FactInput {
  return {
    ...s,
    cursor: wrong[0] ?? s.cursor,
    fresh: s.fresh.map((_, i) => wrong.includes(i)),
  };
}

// ── :3 — the numbers are tapped into the boxes ───────────────────────────

/** Which chips are already placed (a chip per value, duplicates matched one by one). */
export function usedChoices(values: (number | null)[], choices: number[]): boolean[] {
  const used = choices.map(() => false);
  for (const v of values) {
    if (v === null) continue;
    const i = choices.findIndex((c, k) => c === v && !used[k]);
    if (i >= 0) used[i] = true;
  }
  return used;
}

/**
 * A tapped number goes into a box marked wrong (its old number goes back), else into the
 * empty box under the cursor, else into the first empty box.
 */
export function placeChoice(s: FactInput, value: number): FactInput {
  const c = s.cursor;
  const wrong = s.fresh.findIndex((f) => f);
  const target = wrong >= 0 ? wrong : c !== null && s.values[c] === null ? c : s.values.indexOf(null);
  if (target < 0) return s;
  const values = s.values.map((x, i) => (i === target ? value : x));
  const fresh = s.fresh.map((f, i) => (i === target ? false : f));
  const nextFresh = fresh.findIndex((f) => f);
  const cursor = nextEmpty(values, target) ?? (nextFresh >= 0 ? nextFresh : target);
  return { values, fresh, cursor };
}

/** Tapping a filled box gives its number back. */
export function takeBack(s: FactInput, i: number): FactInput {
  return {
    values: s.values.map((x, k) => (k === i ? null : x)),
    fresh: s.fresh.map((f, k) => (k === i ? false : f)),
    cursor: i,
  };
}

// ── The explanation's last step: the child writes the right answer ───────

export type StepResult = 'ok' | 'wait' | 'wrong';

/** Typing `d` after `current` towards `expected`: done, on the way (1 of 12), or wrong. */
export function typeTowards(
  current: number | null,
  d: number,
  expected: number,
): { value: number; result: StepResult } {
  const value = current === null ? d : current * 10 + d;
  if (value === expected) return { value, result: 'ok' };
  if (String(expected).startsWith(String(value)) && String(value).length < String(expected).length) {
    return { value, result: 'wait' };
  }
  return { value, result: 'wrong' };
}
