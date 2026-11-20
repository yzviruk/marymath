import { describe, expect, it } from 'vitest';
import { classifyError, isCorrect, subMistakes } from './check';
import { Rng } from './rng';
import { columnTask, commutativeTask, divComposeTask, factFamilyTask, factTask, repeatedAddTask } from './tasks';

describe('answer check', () => {
  it('accepts the right answer', () => {
    expect(isCorrect(columnTask('+3', '+', 47, 38), [85])).toBe(true);
    expect(isCorrect(columnTask('+3', '+', 47, 38), [75])).toBe(false);
  });

  it('accepts both readings of a division picture (:3)', () => {
    const t = divComposeTask(':3', 6, 4, new Rng(1)); // 6 boxes × 4 stones
    expect(isCorrect(t, [24, 6, 4])).toBe(true);
    expect(isCorrect(t, [24, 4, 6])).toBe(true);
    expect(isCorrect(t, [4, 6, 24])).toBe(false);
  });

  it('checks every blank of multi-blank tasks', () => {
    expect(isCorrect(repeatedAddTask('×1', 4, 3), [3, 12])).toBe(true);
    expect(isCorrect(commutativeTask('×2', 2, 5), [2, 10])).toBe(true);
    expect(isCorrect(factFamilyTask(':4', 6, 4), [24, 24, 4, 6])).toBe(true);
  });
});

describe('typical mistakes from the plan', () => {
  it.each([
    ['forgot-carry', columnTask('+3', '+', 47, 38), [75]],
    ['forgot-carry', columnTask('+6', '+', 278, 356), [524]],
    ['no-borrow', columnTask('−2', '−', 52, 17), [45]],
    ['borrow-through-zero', columnTask('−5', '−', 400, 127), [373]],
    ['borrow-through-zero', columnTask('−5', '−', 400, 127), [327]],
    ['reversed-division', divComposeTask(':3', 6, 4, new Rng(1)), [4, 6, 24]],
    ['wrong-operation', factTask(':1', ':', 12, 3), [36]],
    ['wrong-operation', factTask(':1', ':', 12, 3), [15]],
    ['neighbor-fact', factTask('×6', '×', 6, 4), [28]],
    ['neighbor-fact', factTask(':5', ':', 24, 6), [5]],
    ['other', columnTask('+3', '+', 47, 38), [90]],
    ['other', factTask('×6', '×', 6, 4), [31]],
  ] as const)('%s: %s', (kind, task, values) => {
    expect(classifyError(task, values)).toBe(kind);
  });

  it('returns null for a right answer', () => {
    expect(classifyError(factTask('×6', '×', 6, 4), [24])).toBeNull();
  });

  it('classifies the blank that is wrong in a fact family', () => {
    const t = factFamilyTask(':4', 6, 4); // 6×4, 4×6, 24:6, 24:4
    expect(classifyError(t, [24, 24, 5, 6])).toBe('neighbor-fact');
    expect(classifyError(t, [24, 24, 144, 6])).toBe('wrong-operation');
  });

  it('classifies the product blank of repeated addition', () => {
    expect(classifyError(repeatedAddTask('×1', 4, 3), [3, 7])).toBe('wrong-operation');
  });

  it('lists borrowing mistakes without the right result', () => {
    expect(subMistakes(400, 127)).toEqual(expect.arrayContaining([327, 373, 283, 383]));
    expect(subMistakes(400, 127)).not.toContain(273);
  });
});
