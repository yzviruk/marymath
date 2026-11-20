import { useEffect, useRef, useState } from 'react';
import { Keypad } from '../components/Keypad';
import { NumberLine } from '../components/NumberLine';
import { Pet } from '../components/Pet';
import { classifyError } from '../engine/check';
import type { ErrorKind, Task } from '../engine/types';
import type { PetKind } from '../data/types';
import { ColumnBoard } from './ColumnBoard';
import {
  answerValue,
  clearAll,
  erase,
  focus,
  initialInput,
  missingBorrows,
  missingCarries,
  toggleCross,
  typeDigit,
  wrongPlaces,
  type ColumnInput,
} from './columnInput';
import { DiskPanel } from './DiskPanel';
import { disksAt } from './disks';
import { coachLine, explainIntro, isLeadingZero, PLACE_GEN, placeJumps, placeStep } from './texts';
import './ColumnTask.css';

export type Outcome = 'first' | 'second' | 'explained';

export interface CheckRecord {
  value: number;
  correct: boolean;
  error: ErrorKind | null;
  tryNo: number;
  hintUsed: boolean;
  ms: number;
}

export type DiskMode = 'drag' | 'show' | 'none';

interface Props {
  task: Task;
  pet: PetKind;
  petName: string;
  diskMode: DiskMode;
  /** Called on every press of «Перевірити» with a complete answer. */
  onCheck: (r: CheckRecord) => void;
  /** Called when the child presses «Далі» after finishing the task. */
  onDone: (outcome: Outcome, coins: number) => void;
}

type Phase = 'solve' | 'solved' | 'explain' | 'explained';

/** One column task: free solving, then hint → explanation → done (the agreed 3 steps). */
export function ColumnTask({ task, pet, petName, diskMode, onCheck, onDone }: Props) {
  const column = task.column!;
  const [input, setInput] = useState<ColumnInput>(() => initialInput(column));
  const [phase, setPhase] = useState<Phase>('solve');
  const [tries, setTries] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [wrong, setWrong] = useState<number[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [say, setSay] = useState<string | null>(null);
  const [jumpPlace, setJumpPlace] = useState<number | null>(null);
  const [explainPlace, setExplainPlace] = useState(0);
  const [errorKind, setErrorKind] = useState<ErrorKind>('other');
  const [outcome, setOutcome] = useState<{ outcome: Outcome; coins: number } | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    started.current = Date.now();
  }, [task]);

  const solving = phase === 'solve';
  const explaining = phase === 'explain';
  const cursorPlace = input.cursor?.kind === 'answer' ? input.cursor.place : (input.cursor?.place ?? 0);

  // ── typing ──────────────────────────────────────────────────────────────
  function digit(d: number) {
    if (solving) {
      setInput((s) => typeDigit(s, d));
      setSay(null);
      if (input.cursor?.kind === 'answer') setWrong((w) => w.filter((p) => p !== input.cursor!.place));
      return;
    }
    if (explaining) {
      const p = column.places[explainPlace];
      if (d === p.digit) {
        const next = { ...input, answer: input.answer.map((v, i) => (i === explainPlace ? d : v)) };
        advanceExplain(next, explainPlace + 1);
      } else {
        setWrong([explainPlace]);
        setShakeKey((k) => k + 1);
        setSay(`Ще раз: ${placeStep(column, explainPlace)}`);
      }
    }
  }

  function onErase() {
    if (!solving) return;
    setInput((s) => erase(s));
  }

  function onReset() {
    if (!solving) return;
    setInput((s) => clearAll(s));
    setWrong([]);
    setSay(null);
  }

  // ── checking ────────────────────────────────────────────────────────────
  function check() {
    const value = answerValue(input);
    if (value === null) {
      setSay('Заповни всі розряди, починаючи з одиниць.');
      return;
    }
    const correct = value === column.result;
    const tryNo = tries + 1;
    const error = classifyError(task, [value]);
    onCheck({ value, correct, error, tryNo, hintUsed, ms: Date.now() - started.current });

    if (correct) {
      const coins = tries === 0 && !hintUsed ? 3 : 1;
      setOutcome({ outcome: tries === 0 ? 'first' : 'second', coins });
      setPhase('solved');
      setWrong([]);
      setJumpPlace(null);
      const reminders: string[] = [];
      if (missingCarries(input, column).length) reminders.push('Не забувай писати 1 зверху, коли переносиш.');
      if (missingBorrows(input, column).length) reminders.push('Позначай, звідки позичаєш: торкнись цифри зверху.');
      setSay(`Правильно! ${column.a} ${column.op} ${column.b} = ${column.result}. ${reminders.join(' ')}`.trim());
      return;
    }

    setTries(tryNo);
    if (tryNo === 1) {
      // Step 1: a hint — shake the wrong places and name the first one; the answer is not shown.
      const bad = wrongPlaces(input, column);
      setWrong(bad);
      setShakeKey((k) => k + 1);
      const first = bad[0] ?? 0;
      setInput((s) => focus(s, { kind: 'answer', place: first }));
      setSay(`Майже! Перевір розряд ${PLACE_GEN[first]}.`);
      return;
    }
    // Step 2: the explanation of this very task, place by place.
    setErrorKind(error ?? 'other');
    setPhase('explain');
    const fresh = { ...initialInput(column), cursor: null };
    advanceExplain(fresh, 0, explainIntro(error ?? 'other'));
  }

  /** Moves the explanation to `place`, showing its carry / borrow marks; finishes after the last. */
  function advanceExplain(base: ColumnInput, place: number, intro?: string) {
    let p = place;
    let s = base;
    // Empty leading places (1000 − 970 = 30) need nothing.
    while (p < column.width && isLeadingZero(column, p) && column.op === '−') p++;
    if (p >= column.width) {
      setInput({ ...s, cursor: null });
      setWrong([]);
      setJumpPlace(null);
      setExplainPlace(p);
      setPhase('explained');
      setOutcome({ outcome: 'explained', coins: 1 });
      setSay(`Ось так! ${column.a} ${column.op} ${column.b} = ${column.result}. Тепер схожий приклад.`);
      return;
    }
    s = revealMarks(s, p);
    setInput({ ...s, cursor: { kind: 'answer', place: p } });
    setWrong([]);
    setExplainPlace(p);
    setJumpPlace(p);
    setSay(`${intro ? intro + ' ' : ''}${placeStep(column, p)}`);
  }

  /** In the explanation the carry digits and borrow marks appear by themselves. */
  function revealMarks(s: ColumnInput, place: number): ColumnInput {
    if (column.op === '+') {
      return { ...s, carry: s.carry.map((v, q) => (q <= place && column.places[q].in ? 1 : v)) };
    }
    const crossed = [...s.crossed];
    for (let q = place + 1; q < column.width && column.places[q].in; q++) {
      crossed[q] = true;
      if (column.places[q].a !== 0) break;
    }
    return { ...s, crossed };
  }

  function hint() {
    if (!solving) return;
    setHintUsed(true);
    const p = input.cursor?.place ?? 0;
    setJumpPlace(p);
    setSay(`Підказка на шкалі: ${placeJumpsText(p)}`);
  }

  function placeJumpsText(p: number) {
    const path = placeJumps(column, p);
    return path.length > 2 ? 'спершу до 10, потім далі.' : 'полічи стрибки.';
  }

  // ── view ────────────────────────────────────────────────────────────────
  const finished = phase === 'solved' || phase === 'explained';
  const done =
    phase === 'solved'
      ? column.places.map((p) => p.place)
      : explaining || phase === 'explained'
        ? column.places.filter((p) => p.place < explainPlace).map((p) => p.place)
        : [];
  const activeForDisks = explaining ? explainPlace : finished ? column.width : cursorPlace;
  const linePath = jumpPlace !== null && jumpPlace < column.width ? placeJumps(column, jumpPlace) : [];
  const bubble = say ?? coachLine(input, column);

  return (
    <>
      <NumberLine path={linePath} labels="delta" />
      <div className="ct-body">
        {diskMode !== 'none' || explaining ? (
          <DiskPanel
            key={`${task.key}-${diskMode}-${explaining}`}
            column={column}
            draggable={diskMode === 'drag' && !explaining && !finished}
            shown={disksAt(column, activeForDisks)}
          />
        ) : null}

        <div className="panel ct-main">
          <ColumnBoard
            column={column}
            input={input}
            wrong={wrong}
            done={done}
            shakeKey={shakeKey}
            locked={!solving && !explaining}
            onCell={(cell) => solving && setInput((s) => focus(s, cell))}
            onCross={(p) => solving && setInput((s) => toggleCross(s, p))}
          />
          <div className="ct-pet">
            <Pet kind={pet} size={72} label={petName} />
            <div className={`bubble${explaining ? ' explain' : ''}`} role="status" aria-live="polite">
              {bubble}
            </div>
          </div>
        </div>

        <div className="panel ct-pad">
          <Keypad onDigit={digit} onErase={onErase} onReset={onReset} disabled={finished} />
          {finished ? (
            <button type="button" className="btn-primary" onClick={() => outcome && onDone(outcome.outcome, outcome.coins)}>
              Далі
            </button>
          ) : (
            <button type="button" className="btn-success" onClick={check} disabled={!solving}>
              Перевірити
            </button>
          )}
          <button type="button" className="ct-hint" onClick={hint} disabled={!solving}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
            </svg>
            Підказка
          </button>
        </div>
      </div>
      <span className="sr-only" data-testid="error-kind">
        {errorKind}
      </span>
    </>
  );
}
