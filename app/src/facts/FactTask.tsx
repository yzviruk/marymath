import { useEffect, useRef, useState } from 'react';
import type { CheckRecord, Outcome } from '../column/ColumnTask';
import { Keypad } from '../components/Keypad';
import { multiplicationPath, type ArcLabelMode } from '../components/lineGeometry';
import { NumberLine } from '../components/NumberLine';
import { Pet } from '../components/Pet';
import type { PetKind } from '../data/types';
import { classifyError, firstWrongBlank, isCorrect } from '../engine/check';
import type { ErrorKind, Task } from '../engine/types';
import {
  clearAll,
  eraseDigit,
  focusBlank,
  initialFactInput,
  isComplete,
  markWrong,
  placeChoice,
  takeBack,
  typeDigit,
  typeTowards,
  usedChoices,
  type FactInput,
} from './factInput';
import { Equation } from './Equation';
import {
  allGrouped,
  allShared,
  initialGrouping,
  initialShare,
  isEqualShare,
  moveOne,
  tapItem,
  type Place,
} from './objects';
import { ArrayBox, BarModel, Baskets, Boxes, GroupItems, ShareBaskets, Triangle, WideLine } from './Pictures';
import {
  condition,
  explanation,
  factPath,
  firstHint,
  hintLine,
  lineLabels,
  solvedLine,
  startLine,
  themeOf,
  type Explanation,
  type FactMode,
} from './texts';
import { count, GROUP } from './words';
import { taskCoins } from '../engine/rewards';
import { playSfx } from '../sound/sound';
import { useSettings } from '../SettingsContext';
import '../column/ColumnTask.css';
import './FactTask.css';

interface Props {
  task: Task;
  pet: PetKind;
  /** Clothes the pet wears (engine/shop.ts `wornIds`). */
  petWear?: string[];
  petName: string;
  mode: FactMode;
  onCheck: (r: CheckRecord) => void;
  onDone: (outcome: Outcome, coins: number) => void;
}

type Phase = 'solve' | 'solved' | 'explain' | 'explained';

interface ExplainState {
  model: Explanation;
  step: 0 | 1 | 2;
  input: FactInput;
}

/** One × or : task: pictures by the C → P → A stage, then hint → explanation → similar task. */
export function FactTask({ task, pet, petName, petWear, mode, onCheck, onDone }: Props) {
  const blanks = task.answers.length;
  const picture = task.picture;
  const compose = task.kind === 'div-compose';
  const [input, setInput] = useState<FactInput>(() => initialFactInput(blanks));
  const [phase, setPhase] = useState<Phase>('solve');
  const [tries, setTries] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [wrong, setWrong] = useState<number[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [say, setSay] = useState<string | null>(null);
  const [line, setLine] = useState<{ path: number[]; labels: ArcLabelMode }>({
    path: [],
    labels: 'delta',
  });
  const [showPicture, setShowPicture] = useState(mode !== 'abstract');
  const [counted, setCounted] = useState(0);
  const [rotated, setRotated] = useState(false);
  const [share, setShare] = useState(() =>
    initialShare(picture ? picture.groups * picture.size : 0, picture?.groups ?? 0),
  );
  const [grouping, setGrouping] = useState(() => {
    const g = initialGrouping(picture?.size ?? 1);
    if (mode === 'concrete' || picture?.mode !== 'group') return g;
    // Pictorial :2 — the groups are already circled.
    return fullGrouping(picture.groups, picture.size);
  });
  const [ex, setEx] = useState<ExplainState | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>('other');
  const [outcome, setOutcome] = useState<{
    outcome: Outcome;
    coins: number;
  } | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    started.current = Date.now();
  }, [task]);

  const solving = phase === 'solve';
  const finished = phase === 'solved' || phase === 'explained';

  // ── typing ──────────────────────────────────────────────────────────────
  function digit(d: number) {
    if (solving) {
      setInput((s) => typeDigit(s, d));
      setWrong((w) => w.filter((i) => i !== input.cursor));
      setSay(null);
      return;
    }
    if (phase === 'explain' && ex?.step === 2 && ex.input.cursor !== null) {
      const c = ex.input.cursor;
      const { value, result } = typeTowards(ex.input.values[c], d, task.answers[c]);
      if (result === 'wrong') {
        setEx({
          ...ex,
          input: {
            ...ex.input,
            values: ex.input.values.map((v, i) => (i === c ? null : v)),
          },
        });
        setWrong([c]);
        setShakeKey((k) => k + 1);
        playSfx('again');
        setSay(`Ще раз! ${ex.model.pet[1]}`);
        return;
      }
      const values = ex.input.values.map((v, i) => (i === c ? value : v));
      setWrong([]);
      if (result === 'wait') {
        setEx({ ...ex, input: { ...ex.input, values } });
        return;
      }
      advanceExplainInput(values);
    }
  }

  /** :3 — a tapped number. */
  function choose(v: number) {
    if (solving) {
      setInput((s) => placeChoice(s, v));
      setWrong([]);
      setSay(null);
      return;
    }
    if (phase === 'explain' && ex?.step === 2 && ex.input.cursor !== null) {
      const c = ex.input.cursor;
      const { groups, size } = task.picture!;
      const other = ex.input.values[1] === groups ? size : groups;
      const ok = c === 0 ? v === task.main.a : c === 1 ? v === groups || v === size : v === other;
      if (!ok) {
        setWrong([c]);
        setShakeKey((k) => k + 1);
        playSfx('again');
        setSay(c === 0 ? 'Ще раз! Спочатку — скільки всього.' : 'Ще раз! Подивись на малюнок.');
        return;
      }
      setWrong([]);
      advanceExplainInput(ex.input.values.map((x, i) => (i === c ? v : x)));
    }
  }

  function advanceExplainInput(values: (number | null)[]) {
    const next = values.findIndex((v) => v === null);
    if (next >= 0) {
      setEx((e) => e && { ...e, input: { ...e.input, values, cursor: next } });
      return;
    }
    setEx((e) => e && { ...e, input: { ...e.input, values, cursor: null } });
    setInput({ values, cursor: null, fresh: values.map(() => false) });
    setPhase('explained');
    playSfx('correct');
    setOutcome({ outcome: 'explained', coins: 0 });
    setSay(`Ось так! ${solvedLine(task).replace('Правильно! ', '')} Тепер схожий приклад.`);
    const path = factPath(task.main);
    setLine({ path: path ?? [], labels: 'count' });
  }

  function onErase() {
    if (solving) setInput((s) => eraseDigit(s));
  }

  function onReset() {
    if (!solving) return;
    setInput((s) => clearAll(s));
    setWrong([]);
    setSay(null);
  }

  function onBlank(i: number) {
    if (!solving) return;
    if (compose && input.values[i] !== null) {
      setInput((s) => takeBack(s, i));
      setWrong((w) => w.filter((k) => k !== i));
      return;
    }
    setInput((s) => focusBlank(s, i));
  }

  // ── checking ────────────────────────────────────────────────────────────
  function check() {
    if (!isComplete(input)) {
      const empty = input.values.indexOf(null);
      setInput((s) => focusBlank(s, empty));
      setSay(blanks > 1 ? 'Заповни всі віконця.' : 'Спершу впиши відповідь.');
      return;
    }
    const values = input.values as number[];
    const correct = isCorrect(task, values);
    const tryNo = tries + 1;
    const error = classifyError(task, values);
    const firstWrong = firstWrongBlank(task, values);
    onCheck({
      value: values[correct ? blanks - 1 : firstWrong],
      values,
      correct,
      error,
      tryNo,
      hintUsed,
      ms: Date.now() - started.current,
    });

    if (correct) {
      setOutcome({
        outcome: tries === 0 ? 'first' : 'second',
        coins: taskCoins(tries === 0 && !hintUsed, false),
      });
      setPhase('solved');
      playSfx('correct');
      setWrong([]);
      setSay(solvedLine(task));
      if (task.kind !== 'fact-family') setLine({ path: factPath(task.main) ?? [], labels: 'count' });
      return;
    }

    setTries(tryNo);
    const bad = compose
      ? [0, 1, 2].filter((i) => values[i] !== task.answers[i])
      : task.answers.map((a, i) => (values[i] === a ? -1 : i)).filter((i) => i >= 0);
    if (tryNo === 1) {
      setWrong(bad);
      setShakeKey((k) => k + 1);
      playSfx('again');
      setInput((s) => markWrong(s, bad));
      setSay(firstHint(task, error ?? 'other', firstWrong));
      return;
    }
    // Step 2: the explanation of this very task.
    const kind = error ?? 'other';
    setErrorKind(kind);
    const model = explanation(task, values, kind, firstWrong);
    const keep = compose ? values.map(() => null) : values.map((v, i) => (bad.includes(i) ? null : v));
    setEx({
      model,
      step: 0,
      input: {
        values: keep,
        cursor: keep.indexOf(null),
        fresh: keep.map(() => false),
      },
    });
    setPhase('explain');
    playSfx('again');
    setWrong([]);
    setLine({ path: [], labels: 'none' });
    setSay(model.pet[0]);
  }

  function goStep(step: 0 | 1 | 2) {
    if (!ex) return;
    setEx({ ...ex, step });
    setSay(ex.model.pet[step]);
    setWrong([]);
    setLine(step === 1 && !ex.model.wide ? { path: ex.model.path, labels: 'count' } : { path: [], labels: 'none' });
  }

  function hint() {
    if (!solving) return;
    setHintUsed(true);
    const c = input.cursor ?? 0;
    setSay(hintLine(task, c));
    if (compose) return;
    const path = factPath(task.kind === 'fact-family' ? lineFact(task, c) : task.main);
    const plainBlank = (task.kind === 'repeated-add' || task.kind === 'commutative') && c === 0;
    if (path && !plainBlank) setLine({ path, labels: 'delta' });
    else setShowPicture(true);
  }

  // ── concrete objects ────────────────────────────────────────────────────
  function tapBox() {
    if (!picture || counted >= picture.groups) return;
    const k = counted + 1;
    setCounted(k);
    const sums = Array.from({ length: k }, (_, i) => (i + 1) * picture.size);
    const total = picture.groups * picture.size;
    setSay(k === picture.groups ? `${sums.join(', ')} — усього ${total}!` : `${sums.join(', ')}…`);
    if (total <= 20) setLine({ path: multiplicationPath(picture.size, k), labels: 'delta' });
  }

  function moveApple(from: Place, to: Place) {
    const next = moveOne(share, from, to);
    if (next === share) return;
    setShare(next);
    if (allShared(next)) {
      setSay(
        isEqualShare(next)
          ? `Порівну! У кожному кошику по ${next.baskets[0]}.`
          : 'Не порівну — переклади яблука, щоб у кошиках було однаково.',
      );
    } else setSay(null);
  }

  function tapGem(i: number) {
    if (!picture) return;
    const g = tapItem(grouping, i);
    setGrouping(g);
    const total = picture.groups * picture.size;
    if (allGrouped(g, total)) setSay(`Усі камінці в групах! Вийшло ${count(g.groups.length, GROUP)}.`);
    else if (g.groups.length !== grouping.groups.length) setSay(`Груп: ${g.groups.length}.`);
    else setSay(null);
  }

  // ── view ────────────────────────────────────────────────────────────────
  const labels = lineLabels(task, mode);
  const theme = picture ? themeOf(picture, task.main.op) : null;
  const bubble = say ?? startLine(task, mode);
  const concrete = mode === 'concrete' && solving;

  function pictureView() {
    if (!picture || !showPicture) return null;
    const { groups, size } = picture;
    if (compose) return <Boxes groups={groups} size={size} kind="gem" />;
    if (picture.mode === 'array') {
      return <ArrayBox rows={groups} cols={size} rotated={rotated} onRotate={() => setRotated((r) => !r)} />;
    }
    if (picture.mode === 'share') {
      const part = finished || (mode === 'concrete' && isEqualShare(share)) ? size : '?';
      return (
        <>
          {mode === 'concrete' ? (
            <ShareBaskets share={share} perBasket={size} onMove={moveApple} />
          ) : (
            <Baskets groups={groups} size={size} />
          )}
          {mode !== 'abstract' && (
            <BarModel whole={groups * size} parts={groups} part={part} partsLabel={count(groups, PARTS)} />
          )}
        </>
      );
    }
    if (picture.mode === 'group') {
      return <GroupItems total={groups * size} grouping={grouping} onTap={concrete ? tapGem : undefined} />;
    }
    return (
      <Boxes
        groups={groups}
        size={size}
        kind={theme!.item}
        counted={counted}
        onTapBox={concrete && task.main.op === '×' ? tapBox : undefined}
      />
    );
  }

  /** Step 3 of the explanation and after it: the explained fact as a picture, the boxes typed anew. */
  function explainedPicture(model: Explanation) {
    const p = model.picture;
    const whole = p.groups * p.size;
    if (compose) return <Boxes groups={p.groups} size={p.size} kind="gem" />;
    if (p.mode === 'share') {
      return (
        <>
          <Baskets groups={p.groups} size={p.size} />
          <BarModel
            whole={whole}
            parts={p.groups}
            part={phase === 'explained' ? p.size : '?'}
            partsLabel={count(p.groups, PARTS)}
          />
        </>
      );
    }
    if (p.mode === 'group') return <GroupItems total={whole} grouping={fullGrouping(p.groups, p.size)} />;
    return <Boxes groups={p.groups} size={p.size} kind={themeOf(p, model.fact.op).item} />;
  }

  const panelExplain = !!ex && phase === 'explain' && ex.step < 2;
  const boxes = ex ? (phase === 'explained' ? task.answers : ex.input.values) : input.values;
  const boxCursor = ex ? (phase === 'explain' ? ex.input.cursor : null) : solving ? input.cursor : null;
  const used = compose ? usedChoices(boxes, task.choices!) : [];

  return (
    <>
      <NumberLine path={line.path} labels={line.labels} />
      <div className="ct-body">
        {panelExplain ? (
          <ExplainPanel task={task} ex={ex} pet={pet} petName={petName} petWear={petWear} bubble={bubble} onStep={goStep} />
        ) : (
          <div className="panel ct-main ft-main">
            <div className="ft-cond">
              <SpeakButton text={condition(task, mode)} />
              <p>{condition(task, mode)}</p>
            </div>
            {task.kind !== 'fact-family' && (
              <div className="ft-picture">{ex ? explainedPicture(ex.model) : pictureView()}</div>
            )}
            <div className={task.kind === 'fact-family' ? 'ft-family' : 'ft-eq'}>
              {task.kind === 'fact-family' && (
                <Triangle top={task.main.result} left={task.main.a} right={task.main.b} />
              )}
              <Equation
                lines={task.lines}
                values={boxes}
                cursor={boxCursor}
                wrong={wrong}
                shakeKey={shakeKey}
                labels={ex ? (labels ?? lineLabels(task, 'pictorial')) : labels}
                wholeFirst={task.main.op === ':' && (compose || !!labels || !!ex)}
                onBlank={solving ? onBlank : undefined}
                done={finished}
              />
            </div>
            <div className="ct-pet ft-pet">
              <Pet kind={pet} size={64} label={petName} wear={petWear} />
              <div className="bubble" role="status" aria-live="polite">
                {bubble}
              </div>
            </div>
          </div>
        )}

        {!panelExplain && (
          <div className="panel ct-pad">
            {compose ? (
              <div className="ft-choices">
                {task.choices!.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    className="ft-chip"
                    aria-label={`Число ${v}`}
                    onClick={() => choose(v)}
                    disabled={used[i] || finished}
                  >
                    {v}
                  </button>
                ))}
                <p className="ft-choices-note">
                  Торкнись числа, щоб поставити його у віконце. Торкнись віконця, щоб забрати.
                </p>
              </div>
            ) : (
              <Keypad onDigit={digit} onErase={onErase} onReset={onReset} disabled={finished} />
            )}
            {finished ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => outcome && onDone(outcome.outcome, outcome.coins)}
              >
                Далі
              </button>
            ) : phase === 'explain' ? (
              <div className="ft-pad-note">{compose ? 'Постав числа по черзі.' : 'Впиши правильну відповідь.'}</div>
            ) : (
              <button type="button" className="btn-success" onClick={check}>
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
        )}
      </div>
      <span className="sr-only" data-testid="error-kind">
        {errorKind}
      </span>
    </>
  );
}

/** The fact of one line of a fact family. */
function lineFact(task: Task, blank: number) {
  const line = task.lines.find((l) => l.some((p) => p.t === 'blank' && p.i === blank))!;
  const [a, o, b] = line as unknown as [{ v: number }, { v: '×' | ':' }, { v: number }];
  const result = o.v === '×' ? a.v * b.v : a.v / b.v;
  return { op: o.v, a: a.v, b: b.v, result };
}

// ── The explanation panel (mockup «Пояснення помилки») ───────────────────

interface ExplainProps {
  task: Task;
  ex: ExplainState;
  pet: PetKind;
  petName: string;
  petWear?: string[];
  bubble: string;
  onStep: (step: 0 | 1 | 2) => void;
}

/** Steps 1–2 of the explanation over the whole width; step 3 is the task screen again. */
function ExplainPanel({ task, ex, pet, petName, petWear, bubble, onStep }: ExplainProps) {
  const { model, step } = ex;
  const { picture, fact } = model;
  const theme = themeOf(picture, fact.op);
  const total = picture.groups * picture.size;
  const line = task.lines.length === 1 ? task.lines : [lineOf(task, model)];
  const compose = task.kind === 'div-compose';
  const labels = compose
    ? ['усього', 'скільки частин', 'в одній частині']
    : fact.op === ':' && task.lines.length === 1
      ? lineLabels(task, 'pictorial')
      : null;

  return (
    <div className="panel ct-main ft-explain">
      <div className="ft-ex-left">
        <div className="ft-ex-head">
          <span className="ft-ex-title">Що на малюнку?</span>
          <span className="ft-ex-steps" aria-label={`Крок ${step + 1} з 3`}>
            Крок {step + 1} з 3
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < step ? 'ok' : i === step ? 'now' : ''} />
            ))}
          </span>
        </div>
        {step === 1 && model.wide ? (
          <WideLine path={model.path} width={520} />
        ) : picture.mode === 'share' && !compose ? (
          <Baskets groups={picture.groups} size={picture.size} width={520} />
        ) : picture.mode === 'group' ? (
          <GroupItems total={total} width={520} grouping={fullGrouping(picture.groups, picture.size)} />
        ) : (
          <Boxes
            groups={picture.groups}
            size={picture.size}
            kind={compose ? 'gem' : theme.item}
            width={520}
            maxBox={170}
            rowLimit={3}
          />
        )}
        <span className="ft-ex-caption">{model.caption}</span>
        {model.bar && step === 1 && (
          <BarModel
            whole={total}
            parts={picture.groups}
            part={picture.size}
            width={330}
            wholeLabel="ціле"
            partsLabel={`${count(picture.groups, PARTS)} по ${picture.size}`}
          />
        )}
      </div>

      <div className="ft-ex-right">
        <div className="ft-ex-yours">
          <span>Твоя відповідь</span>
          <b>{model.yours}</b>
          <em>{model.yoursNote}</em>
        </div>
        {step === 1 && (
          <>
            <p className="ft-ex-rule">{model.titles[1]}</p>
            <Equation
              lines={line}
              values={task.answers}
              cursor={null}
              labels={labels}
              wholeFirst={fact.op === ':'}
              done
            />
          </>
        )}
        <div className="ct-pet ft-pet ft-ex-pet">
          <Pet kind={pet} size={88} label={petName} wear={petWear} />
          <div className="bubble" role="status" aria-live="polite">
            {bubble}
          </div>
        </div>
        <div className="ft-ex-nav">
          {step > 0 && (
            <button type="button" className="ft-back" onClick={() => onStep(0)}>
              Назад
            </button>
          )}
          <button type="button" className="btn-primary ft-next" onClick={() => onStep((step + 1) as 1 | 2)}>
            {step === 1 ? 'Запишу сам' : 'Далі'}
          </button>
        </div>
      </div>
    </div>
  );
}

const PARTS = ['рівна частина', 'рівні частини', 'рівних частин'] as const;

function fullGrouping(groups: number, size: number) {
  return {
    size,
    picked: [] as number[],
    groups: Array.from({ length: groups }, (_, k) => Array.from({ length: size }, (_, i) => k * size + i)),
  };
}

/** The line of the task the explanation is about (a fact family has four). */
function lineOf(task: Task, model: Explanation) {
  const { a, b, op } = model.fact;
  return (
    task.lines.find(
      (l) => l[0].t === 'num' && l[0].v === a && l[1].t === 'op' && l[1].v === op && l[2].t === 'num' && l[2].v === b,
    ) ?? task.lines[0]
  );
}

export function SpeakButton({ text }: { text: string }) {
  const { speech } = useSettings();
  const can = typeof window !== 'undefined' && 'speechSynthesis' in window;
  if (!can || !speech) return null;
  return (
    <button
      type="button"
      className="ft-speak"
      aria-label="Прочитати умову вголос"
      onClick={() => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'uk-UA';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
      </svg>
    </button>
  );
}
