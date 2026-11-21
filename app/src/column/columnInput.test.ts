import { describe, expect, it } from 'vitest';
import { columnAdd, columnSub } from '../engine/column';
import {
  answerValue,
  borrowMarksAt,
  clearAll,
  erase,
  focus,
  initialInput,
  missingBorrows,
  missingCarries,
  shownTop,
  toggleCarry,
  typeDigit,
  wrongBorrows,
  wrongPlaces,
} from './columnInput';
import { coachLine, placeJumps, placeStep } from './texts';

const typeAll = (s: ReturnType<typeof initialInput>, digits: number[]) => digits.reduce(typeDigit, s);

describe('column input', () => {
  const c = columnAdd(47, 38);

  it('types right to left and moves the cursor', () => {
    let s = initialInput(c);
    expect(s.cursor).toEqual({ kind: 'answer', place: 0 });
    s = typeAll(s, [5, 8]);
    expect(s.answer).toEqual([5, 8]);
    expect(answerValue(s)).toBe(85);
    expect(wrongPlaces(s, c)).toEqual([]);
  });

  it('a tap on the carry circle puts 1 there (a second tap takes it away), the cursor stays', () => {
    let s = typeDigit(initialInput(c), 5);
    s = toggleCarry(s, 1);
    expect(s.carry[1]).toBe(1);
    expect(s.cursor).toEqual({ kind: 'answer', place: 1 });
    expect(toggleCarry(s, 1).carry[1]).toBeNull();
    expect(toggleCarry(s, 0)).toBe(s); // nothing is carried into the ones
    s = typeDigit(s, 8);
    expect(missingCarries(s, c)).toEqual([]);
  });

  it('reports a missing carry without calling it a mistake', () => {
    const s = typeAll(initialInput(c), [5, 8]);
    expect(wrongPlaces(s, c)).toEqual([]);
    expect(missingCarries(s, c)).toEqual([1]);
  });

  it('finds the wrong place (forgot carry: 75)', () => {
    const s = typeAll(initialInput(c), [5, 7]);
    expect(wrongPlaces(s, c)).toEqual([1]);
  });

  it('a digit typed into a filled box replaces it', () => {
    let s = typeAll(initialInput(c), [5, 7]);
    s = focus(s, { kind: 'answer', place: 1 });
    s = typeDigit(s, 8);
    expect(answerValue(s)).toBe(85);
  });

  it('erases and steps back', () => {
    let s = typeAll(initialInput(c), [5, 8]); // cursor stays on tens
    s = erase(s);
    expect(s.answer).toEqual([5, null]);
    s = erase(s);
    expect(s.answer).toEqual([null, null]);
    expect(s.cursor).toEqual({ kind: 'answer', place: 0 });
  });

  it('is incomplete with a gap', () => {
    const s = focus(initialInput(c), { kind: 'answer', place: 1 });
    expect(answerValue(typeDigit(s, 8))).toBeNull();
    expect(answerValue(initialInput(c))).toBeNull();
  });

  it('allows empty leading places (1000 − 970 = 30)', () => {
    const sub = columnSub(1000, 970);
    const s = typeAll(initialInput(sub), [0, 3]);
    expect(answerValue(s)).toBe(30);
    expect(wrongPlaces(s, sub)).toEqual([]);
  });

  it('111 − 29: the child writes 11 and 0 above, then 10 and 0', () => {
    const sub = columnSub(111, 29);
    let s = initialInput(sub);
    expect(missingBorrows(s, sub)).toEqual([0, 1, 2]);
    // 0 above the tens: a digit other than 1 finishes the circle and goes back to the ones.
    s = typeDigit(focus(s, { kind: 'borrow', place: 1 }), 0);
    expect(s.borrow[1]).toBe(0);
    expect(s.cursor).toEqual({ kind: 'answer', place: 0 });
    // 11 above the ones: «1» waits for the second digit.
    s = typeDigit(focus(s, { kind: 'borrow', place: 0 }), 1);
    expect(s.pending).toBe(true);
    expect(s.cursor).toEqual({ kind: 'borrow', place: 0 });
    s = typeDigit(s, 1);
    expect(s.borrow[0]).toBe(11);
    expect(s.cursor).toEqual({ kind: 'answer', place: 0 });
    expect(shownTop(s, sub, 0)).toBe(11);
    s = typeDigit(s, 2); // 11 − 9
    // 10 above the tens (the first digit replaces the old 0), 0 above the hundreds.
    s = typeAll(focus(s, { kind: 'borrow', place: 1 }), [1, 0]);
    s = typeDigit(focus(s, { kind: 'borrow', place: 2 }), 0);
    expect(s.borrow).toEqual([11, 10, 0]);
    expect(s.cursor).toEqual({ kind: 'answer', place: 1 });
    s = typeAll(s, [8]);
    expect(answerValue(s)).toBe(82);
    expect(missingBorrows(s, sub)).toEqual([]);
    expect(wrongBorrows(s, sub)).toEqual([]);
    expect(clearAll(s).borrow).toEqual([null, null, null]);
  });

  it('a lone 1 stays 1 when the child taps elsewhere; ⌫ clears the circle', () => {
    const sub = columnSub(52, 17);
    let s = typeDigit(focus(initialInput(sub), { kind: 'borrow', place: 1 }), 1);
    s = focus(s, { kind: 'answer', place: 0 });
    expect(s.borrow[1]).toBe(1);
    expect(s.pending).toBe(false);
    s = typeDigit(s, 5); // an answer digit, not a second digit of the circle
    expect(s.borrow[1]).toBe(1);
    s = erase(focus(s, { kind: 'borrow', place: 1 }));
    expect(s.borrow[1]).toBeNull();
  });

  it('borrow marks step by step and at the end (explanation and checking)', () => {
    expect(borrowMarksAt(columnSub(111, 29), 0)).toEqual([11, 0, null]);
    expect(borrowMarksAt(columnSub(111, 29), 1)).toEqual([11, 10, 0]);
    expect(borrowMarksAt(columnSub(400, 127), 0)).toEqual([10, 9, 3]); // through zero at once
    expect(borrowMarksAt(columnSub(87, 34), 1)).toEqual([null, null]);
    const sub = columnSub(111, 29);
    const s = { ...initialInput(sub), borrow: [11, 0, 0] };
    expect(wrongBorrows(s, sub)).toEqual([1]); // the tens became 10 in the end
  });
});

describe('column texts', () => {
  it('coach names the place and numbers only', () => {
    const c = columnAdd(356, 127);
    let s = typeDigit(initialInput(c), 3);
    expect(coachLine(s, c)).toBe('Десятки: 5 + 2.');
    s = toggleCarry(s, 1);
    expect(coachLine(s, c)).toBe('Десятки: 5 + 2 і ще 1 зверху.');
  });

  it('explains each place', () => {
    const c = columnAdd(47, 38);
    expect(placeStep(c, 0)).toBe('Одиниці: 7 + 8 = 15. Пишемо 5, а 1 десяток — зверху.');
    expect(placeStep(c, 1)).toBe('Десятки: 4 + 3 і ще 1 зверху = 8. Пишемо 8.');
    const s = columnSub(52, 17);
    expect(placeStep(s, 0)).toBe('Одиниці: з 2 не відняти 7 — позичаємо десяток. 12 − 7 = 5.');
    expect(placeStep(s, 1)).toBe('Десятки: було 5, 1 позичили — лишилось 4. 4 − 1 = 3.');
    expect(placeStep(columnSub(400, 127), 0)).toContain('У сусіда 0');
  });

  it('jumps help with one place', () => {
    expect(placeJumps(columnAdd(47, 38), 0)).toEqual([7, 10, 15]);
    expect(placeJumps(columnSub(52, 17), 0)).toEqual([12, 10, 5]);
  });
});
