import { useState } from 'react';
import { BackIcon, CoinIcon } from '../components/Icons';
import { Keypad } from '../components/Keypad';
import { NumberLine } from '../components/NumberLine';
import { bridgeTenPath, divisionPath, multiplicationPath, type ArcLabelMode } from '../components/lineGeometry';
import { Pet } from '../components/Pet';
import type { Profile } from '../data/types';
import './TaskDemo.css';

interface Example {
  left: number;
  sign: '+' | '×' | ':';
  right: number;
  answer: number;
  path: number[];
  labels: ArcLabelMode;
  hint: string;
}

// Fixed demo set for stage 1; real generators arrive in stage 2.
const EXAMPLES: Example[] = [
  { left: 3, sign: '×', right: 4, answer: 12, path: multiplicationPath(3, 4), labels: 'delta', hint: 'Стрибаємо від 0 чотири рази по 3.' },
  { left: 12, sign: ':', right: 3, answer: 4, path: divisionPath(12, 3), labels: 'count', hint: 'Від 12 назад по 3 до нуля. Скільки стрибків?' },
  { left: 7, sign: '+', right: 8, answer: 15, path: bridgeTenPath(7, 8), labels: 'delta', hint: 'Спершу до 10 (+3), потім ще +5.' },
];

const MAX_DIGITS = 3;
type Status = 'typing' | 'right' | 'wrong';

/** Stage-1 demo of a task screen: number line on top, example, answer and keypad. */
export function TaskDemo({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState<Status>('typing');
  const [showJumps, setShowJumps] = useState(false);
  const ex = EXAMPLES[index];

  const say =
    status === 'right'
      ? `Так! ${ex.left} ${ex.sign} ${ex.right} = ${ex.answer}. Молодець!`
      : status === 'wrong'
        ? `Майже! ${ex.hint}`
        : showJumps
          ? ex.hint
          : 'Набери відповідь на клавіатурі.';

  function digit(d: number) {
    if (status === 'right') return;
    setStatus('typing');
    setTyped((t) => (t.length >= MAX_DIGITS || (t === '0' && d === 0) ? t : t === '0' ? String(d) : t + d));
  }
  function erase() {
    setStatus('typing');
    setTyped((t) => t.slice(0, -1));
  }
  function check() {
    if (!typed) return;
    const ok = Number(typed) === ex.answer;
    setStatus(ok ? 'right' : 'wrong');
    if (!ok) setShowJumps(true);
  }
  function next() {
    setIndex((i) => (i + 1) % EXAMPLES.length);
    setTyped('');
    setStatus('typing');
    setShowJumps(false);
  }

  return (
    <div className="screen task">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onBack}>
          <BackIcon />
          Карта
        </button>
        <span className="topbar-title">Пробне завдання</span>
        <div className="task-dots" aria-label={`Приклад ${index + 1} з ${EXAMPLES.length}`}>
          {EXAMPLES.map((_, i) => (
            <span key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />
          ))}
        </div>
        <span className="coins">
          <CoinIcon />
          {profile.coins}
        </span>
      </div>

      <NumberLine path={showJumps || status === 'right' ? ex.path : []} labels={ex.labels} />

      <div className="task-body">
        <div className="panel task-main">
          <div className="task-example" aria-live="polite">
            <span>{ex.left}</span>
            <span className="task-sign">{ex.sign}</span>
            <span>{ex.right}</span>
            <span className="task-sign">=</span>
            <output className={`task-answer ${status}`} aria-label="Твоя відповідь">
              {typed || '?'}
            </output>
          </div>
          <div className="task-pet">
            <Pet kind={profile.pet} size={88} label={profile.petName} />
            <div className="bubble" role="status">
              {say}
            </div>
          </div>
        </div>

        <div className="panel task-pad">
          <Keypad onDigit={digit} onErase={erase} onReset={() => setTyped('')} disabled={status === 'right'} />
          {status === 'right' ? (
            <button type="button" className="btn-primary" onClick={next}>
              Далі
            </button>
          ) : (
            <button type="button" className="btn-success" onClick={check} disabled={!typed}>
              Перевірити
            </button>
          )}
          <button type="button" className="task-hint" onClick={() => setShowJumps(true)} disabled={showJumps}>
            Підказка
          </button>
        </div>
      </div>
    </div>
  );
}
