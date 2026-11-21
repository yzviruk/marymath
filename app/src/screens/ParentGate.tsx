import { useEffect, useMemo, useState } from 'react';
import { BackIcon } from '../components/Icons';
import { Keypad } from '../components/Keypad';
import { checkPin, hasPin, PIN_LENGTH, setPin } from '../data/parent';
import './ParentGate.css';

interface Props {
  onPass: () => void;
  onBack: () => void;
}

type Mode = 'loading' | 'enter' | 'new' | 'repeat' | 'forgot';

/** A sum only a grown-up does in their head; the answer lets them set a new PIN. */
const QUESTIONS: [number, number][] = [
  [47, 8],
  [36, 7],
  [58, 6],
  [29, 9],
  [64, 7],
];

/** PIN in front of the parent panel: set it the first time (twice), then enter it; «Забули PIN?». */
export function ParentGate({ onPass, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('loading');
  const [digits, setDigits] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const question = useMemo(() => QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)], []);

  useEffect(() => {
    void hasPin().then((has) => setMode(has ? 'enter' : 'new'));
  }, []);

  const max = mode === 'forgot' ? 4 : PIN_LENGTH;

  function wrong(msg: string) {
    setError(msg);
    setShake((k) => k + 1);
    setDigits('');
  }

  async function full(value: string) {
    if (mode === 'enter') {
      if (await checkPin(value)) onPass();
      else wrong('Невірний PIN. Спробуйте ще раз.');
    } else if (mode === 'new') {
      setFirst(value);
      setDigits('');
      setError('');
      setMode('repeat');
    } else if (mode === 'repeat') {
      if (value === first) {
        await setPin(value);
        onPass();
      } else {
        setFirst('');
        setMode('new');
        wrong('PIN не збігся. Придумайте його ще раз.');
      }
    }
  }

  function digit(d: number) {
    if (mode === 'loading' || digits.length >= max) return;
    const value = digits + d;
    setDigits(value);
    setError('');
    if (mode !== 'forgot' && value.length === PIN_LENGTH) void full(value);
  }

  function answer() {
    if (Number(digits) === question[0] * question[1]) {
      setDigits('');
      setError('');
      setMode('new');
    } else {
      wrong('Не так. Спробуйте ще раз.');
    }
  }

  const title =
    mode === 'enter'
      ? 'Введіть PIN'
      : mode === 'new'
        ? `Придумайте PIN із ${PIN_LENGTH} цифр`
        : mode === 'repeat'
          ? 'Повторіть PIN'
          : `Скільки буде ${question[0]} × ${question[1]}?`;

  return (
    <div className="screen pg">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onBack}>
          <BackIcon />
          Назад
        </button>
      </div>
      <div className="panel pg-card">
        <div className="pg-left">
          <h1>Для батьків</h1>
          <p className="pg-title">{title}</p>
          {mode === 'forgot' ? (
            <div className="pg-answer" key={shake} aria-live="polite">
              {digits || <span className="pg-caret" />}
            </div>
          ) : (
            <div className={`pg-dots${shake ? ' shake' : ''}`} key={shake} role="img" aria-label={`Введено цифр: ${digits.length} з ${PIN_LENGTH}`}>
              {Array.from({ length: PIN_LENGTH }, (_, i) => (
                <span key={i} className={i < digits.length ? 'on' : ''} />
              ))}
            </div>
          )}
          <p className="pg-error" role="alert">
            {error}
          </p>
          {mode === 'enter' && (
            <button type="button" className="pg-link" onClick={() => { setMode('forgot'); setDigits(''); setError(''); }}>
              Забули PIN?
            </button>
          )}
          {mode === 'forgot' && (
            <p className="pg-note">Правильна відповідь дозволить задати новий PIN.</p>
          )}
          {mode === 'new' && <p className="pg-note">PIN захищає панель від дітей. Його можна змінити, якщо забудете.</p>}
        </div>
        <div className="pg-pad">
          <Keypad onDigit={digit} onErase={() => setDigits((v) => v.slice(0, -1))} disabled={mode === 'loading'} />
          {mode === 'forgot' && (
            <button type="button" className="btn-success" onClick={answer} disabled={!digits}>
              Перевірити
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
