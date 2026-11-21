import { useEffect, useRef, useState } from 'react';
import { ColumnTask, type CheckRecord, type Outcome } from '../column/ColumnTask';
import { Keypad } from '../components/Keypad';
import { NumberLine } from '../components/NumberLine';
import type { ArcLabelMode } from '../components/lineGeometry';
import { Pet } from '../components/Pet';
import type { PetKind } from '../data/types';
import { classifyError } from '../engine/check';
import { answerSentence, problemText, setupError } from '../engine/problems';
import { taskCoins } from '../engine/rewards';
import { columnTask, factTask } from '../engine/tasks';
import type { ErrorKind, Op, Task } from '../engine/types';
import { typeTowards } from '../facts/factInput';
import { SpeakButton } from '../facts/FactTask';
import { factPath, firstHint, hintLine } from '../facts/texts';
import { ProblemBar } from './ProblemBar';
import '../column/ColumnTask.css';
import '../facts/FactTask.css';
import './ProblemTask.css';

export type ProblemMode = 'pictorial' | 'abstract';

interface Props {
  task: Task;
  pet: PetKind;
  petName: string;
  petWear?: string[];
  /** pictorial: the bar model is drawn at once; abstract: it comes with «Підказка». */
  mode: ProblemMode;
  onCheck: (r: CheckRecord) => void;
  onDone: (outcome: Outcome, coins: number) => void;
}

/**
 * setup — choose the action and tap the numbers into the boxes;
 * guided — the same after the explanation (each tap is checked at once);
 * solve — ?2: type the result; guidedSolve — the same after the explanation;
 * column — ?1: the column screen; done — the answer sentence.
 */
type Stage = 'setup' | 'guided' | 'solve' | 'guidedSolve' | 'column' | 'done';

const SIGNS: { op: Op; aria: string }[] = [
  { op: '+', aria: 'Додати' },
  { op: '−', aria: 'Відняти' },
  { op: '×', aria: 'Помножити' },
  { op: ':', aria: 'Поділити' },
];

const STEPS = ['Читаю', 'Малюю', 'Обираю дію', 'Рахую і відповідаю'];

/** A word problem (?1, ?2, the castle boss), design/project/Task.dc.html. */
export function ProblemTask({ task, pet, petName, petWear, mode, onCheck, onDone }: Props) {
  const problem = task.problem!;
  const { op, a, b, result } = task.main;
  const commutative = op === '+' || op === '×';
  const [stage, setStage] = useState<Stage>('setup');
  const [sign, setSign] = useState<Op | null>(null);
  /** Which number of the text (0 or 1) sits in each of the two boxes. */
  const [boxes, setBoxes] = useState<(0 | 1 | null)[]>([null, null]);
  const [value, setValue] = useState<number | null>(null);
  const [fresh, setFresh] = useState(false);
  const [setupTries, setSetupTries] = useState(0);
  const [solveTries, setSolveTries] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [explained, setExplained] = useState(false);
  const [column, setColumn] = useState<{ outcome: Outcome; coins: number } | null>(null);
  const [showBar, setShowBar] = useState(mode === 'pictorial');
  const [wrong, setWrong] = useState<('sign' | 0 | 1 | 2)[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [say, setSay] = useState<string | null>(null);
  const [line, setLine] = useState<{ path: number[]; labels: ArcLabelMode }>({ path: [], labels: 'delta' });
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    started.current = Date.now();
  }, [task]);

  const placing = stage === 'setup' || stage === 'guided';
  const typing = stage === 'solve' || stage === 'guidedSolve';
  const nums = boxes.map((i) => (i === null ? null : problem.given[i]));
  /** ?2: the × or : fact for hints and jumps on the line (?1 goes to the column screen instead). */
  const fact = op === '×' || op === ':' ? factTask(task.level, op, a, b) : null;

  function shake(which: ('sign' | 0 | 1 | 2)[]) {
    setWrong(which);
    setShakeKey((k) => k + 1);
  }

  // ── choosing the action and the numbers ───────────────────────────────
  function tapSign(o: Op) {
    if (!placing) return;
    if (stage === 'guided' && o !== op) {
      shake(['sign']);
      setSay(`Ще раз! ${problem.why}`);
      return;
    }
    setSign(o);
    setWrong((w) => w.filter((x) => x !== 'sign'));
    setSay(null);
    if (stage === 'guided') maybeGuidedDone(o, boxes);
  }

  function tapNumber(i: 0 | 1) {
    if (!placing || boxes.includes(i)) return;
    const slot = boxes.indexOf(null);
    if (slot < 0) return;
    if (stage === 'guided') {
      const v = problem.given[i];
      const ok = commutative ? (slot === 0 ? v === a || v === b : v === (nums[0] === a ? b : a)) : v === (slot === 0 ? a : b);
      if (!ok) {
        shake([slot as 0 | 1]);
        setSay(op === ':' || op === '−' ? 'Ще раз! Спочатку пишемо ціле — скільки всього.' : 'Ще раз! Подивись на смужку.');
        return;
      }
    }
    const next = boxes.map((x, k) => (k === slot ? i : x));
    setBoxes(next);
    setWrong((w) => w.filter((x) => x !== slot));
    setSay(null);
    if (stage === 'guided') maybeGuidedDone(sign, next);
  }

  function tapBox(k: 0 | 1) {
    if (stage !== 'setup' || boxes[k] === null) return;
    setBoxes(boxes.map((x, j) => (j === k ? null : x)));
    setWrong((w) => w.filter((x) => x !== k));
  }

  function maybeGuidedDone(s: Op | null, bx: (0 | 1 | null)[]) {
    if (s === op && bx[0] !== null && bx[1] !== null) {
      setSay('Ось так! Тепер рахуємо.');
      toSolve();
    }
  }

  function checkSetup() {
    if (!sign) {
      setSay('Обери дію: +, −, × чи :.');
      shake(['sign']);
      return;
    }
    if (nums[0] === null || nums[1] === null) {
      setSay('Торкнись чисел у задачі, щоб поставити їх у віконця.');
      return;
    }
    const [x, y] = nums as number[];
    const error = setupError(task, sign, x, y);
    const tryNo = setupTries + 1;
    onCheck({ stage: 'setup', value: x, values: [x, y], correct: !error, error, tryNo, hintUsed, ms: Date.now() - started.current });
    if (!error) {
      setSay('Правильно! Тепер рахуємо.');
      toSolve();
      return;
    }
    setSetupTries(tryNo);
    setErrorKind(error);
    if (tryNo === 1) {
      if (error === 'wrong-operation') {
        shake(['sign']);
        setShowBar(true);
        setSay(problem.look);
      } else {
        shake([0, 1]);
        setSay(
          error === 'reversed-division' || error === 'reversed-order'
            ? 'Майже! Спочатку пишемо ціле — скільки всього.'
            : 'Перевір числа у віконцях.',
        );
      }
      return;
    }
    // Second mistake: the explanation, then the child sets it up again — every tap is checked.
    setExplained(true);
    setShowBar(true);
    setSign(null);
    setBoxes([null, null]);
    setWrong([]);
    setStage('guided');
    setSay(`${problem.why} Обери дію і постав числа.`);
  }

  function toSolve() {
    setWrong([]);
    if (op === '+' || op === '−') {
      setStage('column');
      return;
    }
    setStage('solve');
  }

  // ── the result of ?2 ──────────────────────────────────────────────────
  function digit(d: number) {
    if (stage === 'solve') {
      setValue((v) => (v === null || fresh ? d : Math.min(v * 10 + d, 999)));
      setFresh(false);
      setWrong([]);
      return;
    }
    if (stage === 'guidedSolve') {
      const step = typeTowards(value, d, result);
      if (step.result === 'wrong') {
        setValue(null);
        shake([2]);
        setSay(`Ще раз! ${hintLine(fact!, 0)}`);
        return;
      }
      setValue(step.value);
      if (step.result === 'ok') finish();
    }
  }

  function erase() {
    if (stage === 'solve') setValue((v) => (v === null || v < 10 ? null : Math.floor(v / 10)));
  }

  function checkSolve() {
    if (value === null) {
      setSay('Спершу впиши відповідь.');
      return;
    }
    const correct = value === result;
    const tryNo = solveTries + 1;
    const error = correct ? null : classifyError(fact!, [value]);
    onCheck({ value, values: [nums[0]!, nums[1]!, value], correct, error, tryNo, hintUsed, ms: Date.now() - started.current });
    if (correct) {
      finish();
      return;
    }
    setSolveTries(tryNo);
    setErrorKind(error);
    if (tryNo === 1) {
      shake([2]);
      setFresh(true);
      setSay(firstHint(fact!, error ?? 'other', 0));
      return;
    }
    setExplained(true);
    setShowBar(true);
    setValue(null);
    setWrong([]);
    setStage('guidedSolve');
    const path = factPath(fact!.main);
    if (path) setLine({ path, labels: 'count' });
    setSay(`${hintLine(fact!, 0)} Впиши відповідь.`);
  }

  function finish() {
    setValue(result);
    setStage('done');
    setWrong([]);
    setSay(answerSentence(problem, result));
    const path = fact ? factPath(fact.main) : null;
    setLine({ path: path ?? [], labels: 'count' });
  }

  function hint() {
    if (!placing && stage !== 'solve') return;
    setHintUsed(true);
    if (placing) {
      setShowBar(true);
      setSay(problem.look);
      return;
    }
    const path = factPath(fact!.main);
    if (path) setLine({ path, labels: 'delta' });
    else setShowBar(true);
    setSay(hintLine(fact!, 0));
  }

  function next() {
    const outcome: Outcome =
      explained || column?.outcome === 'explained'
        ? 'explained'
        : setupTries || solveTries || column?.outcome === 'second'
          ? 'second'
          : 'first';
    const clean = outcome === 'first' && !hintUsed && (column ? column.coins > 0 : true);
    onDone(outcome, taskCoins(clean, false));
  }

  // ── view ──────────────────────────────────────────────────────────────
  if (stage === 'column') {
    return (
      <ColumnTask
        task={columnTask(task.level, op as '+' | '−', a, b)}
        pet={pet}
        petName={petName}
        petWear={petWear}
        diskMode="show"
        onCheck={onCheck}
        onDone={(o, coins) => {
          setColumn({ outcome: o, coins });
          finish();
        }}
      />
    );
  }

  const done = stage === 'done';
  const now = placing ? 2 : done ? 4 : 3;
  const labels = placing ? null : problem.labels;
  const bubble = say ?? (showBar ? 'Прочитай задачу і подивись на смужку. Яка дія?' : 'Прочитай задачу. Яка дія?');
  const reveal = done ? (op === '+' || op === '×' ? { whole: result } : problem.kind === 'share' || problem.kind === 'take-away' || problem.kind === 'part' ? { part: result } : undefined) : undefined;
  const isWrong = (k: 'sign' | 0 | 1 | 2) => wrong.includes(k);

  function box(k: 0 | 1 | 2) {
    const v = k === 2 ? value : nums[k];
    const cursor = (k === 2 && typing) || (k < 2 && placing && boxes.indexOf(null) === k);
    const whole = k === 0 && !commutative;
    const cls = ['eq-box', 'blank', cursor ? 'cursor' : '', isWrong(k) ? 'wrong' : '', done ? 'done' : '', whole && v !== null ? 'whole' : '']
      .filter(Boolean)
      .join(' ');
    const label = labels?.[k];
    return (
      <span className="eq-cell" key={k}>
        <button
          key={isWrong(k) ? `w${shakeKey}` : 'b'}
          type="button"
          className={cls}
          aria-label={`Віконце ${k + 1}: ${v ?? 'порожнє'}`}
          disabled={k === 2 || stage !== 'setup' || v === null}
          onClick={() => k < 2 && tapBox(k as 0 | 1)}
        >
          {v ?? (cursor ? <span className="eq-caret" /> : '')}
        </button>
        {label ? <span className="eq-label">{label}</span> : null}
      </span>
    );
  }

  return (
    <>
      <NumberLine path={line.path} labels={line.labels} />
      <div className="ct-body">
        <div className="panel ct-main pt-main" data-answer={`${a}${op}${b}=${result}`}>
          <div className="pt-steps" aria-label={`Крок ${now + 1} з 4: ${STEPS[now]}`}>
            {STEPS.map((s, i) => (
              <span key={s} className={i < now || done ? 'ok' : i === now ? 'now' : ''}>
                <i>{i + 1}</i>
                {s}
              </span>
            ))}
          </div>

          <div className="ft-cond pt-cond">
            <SpeakButton text={problemText(problem)} />
            <p>
              {problem.pieces.map((p, k) =>
                typeof p === 'string' ? (
                  <span key={k}>{p}</span>
                ) : (
                  <button
                    key={k}
                    type="button"
                    className={`pt-num${boxes.includes(p.i) ? ' used' : ''}`}
                    aria-label={`Число ${p.n}`}
                    disabled={!placing || boxes.includes(p.i)}
                    onClick={() => tapNumber(p.i)}
                  >
                    {p.n}
                  </button>
                ),
              )}
            </p>
          </div>

          <div className="pt-mid">
            <div className="pt-bar">
              {showBar ? (
                <>
                  <span className="pt-cap">Малюнок до задачі</span>
                  <ProblemBar bar={problem.bar} reveal={reveal} />
                </>
              ) : (
                <span className="pt-nobar">Малюнок до задачі — за «Підказкою»</span>
              )}
            </div>
            <div className="pt-signs">
              <span className="pt-cap">Яка дія?</span>
              <div>
                {SIGNS.map((s) => (
                  <button
                    key={s.op}
                    type="button"
                    className={`pt-sign${sign === s.op ? ' on' : ''}${isWrong('sign') && sign === s.op ? ' wrong' : ''}`}
                    aria-label={s.aria}
                    aria-pressed={sign === s.op}
                    disabled={!placing}
                    onClick={() => tapSign(s.op)}
                  >
                    {s.op}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="eq eq-big pt-eq" role="group" aria-label={`Запис: ${nums[0] ?? '?'} ${sign ?? '?'} ${nums[1] ?? '?'} = ${value ?? '?'}`}>
            <div className="eq-line">
              {box(0)}
              <span key={isWrong('sign') ? `s${shakeKey}` : 's'} className={`eq-op pt-op${sign ? '' : ' empty'}${isWrong('sign') ? ' wrong' : ''}`}>
                {sign ?? '?'}
              </span>
              {box(1)}
              <span className="eq-op">=</span>
              {box(2)}
            </div>
          </div>

          <div className={`pt-answer${done ? ' done' : ''}`}>
            {done ? (
              <>
                Відповідь: <b>{answerSentence(problem, result)}</b>
              </>
            ) : (
              <>
                Відповідь: {problem.answerLead} <i />
              </>
            )}
          </div>

          <div className="ct-pet ft-pet">
            <Pet kind={pet} size={56} label={petName} wear={petWear} />
            <div className="bubble" role="status" aria-live="polite">
              {bubble}
            </div>
          </div>
        </div>

        <div className="panel ct-pad">
          <Keypad onDigit={digit} onErase={erase} disabled={!typing} />
          {done ? (
            <button type="button" className="btn-primary" onClick={next}>
              Далі
            </button>
          ) : stage === 'guided' ? (
            <div className="ft-pad-note">Обери дію і торкнись чисел.</div>
          ) : stage === 'guidedSolve' ? (
            <div className="ft-pad-note">Впиши правильну відповідь.</div>
          ) : (
            <button type="button" className="btn-success" onClick={placing ? checkSetup : checkSolve}>
              Перевірити
            </button>
          )}
          <button type="button" className="ct-hint" onClick={hint} disabled={!(placing || stage === 'solve')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
            </svg>
            Підказка
          </button>
        </div>
      </div>
      <span className="sr-only" data-testid="error-kind">
        {errorKind ?? ''}
      </span>
    </>
  );
}
