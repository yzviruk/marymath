import { useEffect, useRef } from 'react';
import './Keypad.css';

interface Props {
  onDigit: (digit: number) => void;
  onErase: () => void;
  /** Start the current example over; the key is hidden when omitted. */
  onReset?: () => void;
  /** Also accept a physical keyboard (handy on a desktop and in tests). */
  physicalKeys?: boolean;
  disabled?: boolean;
}

/** On-screen digit pad from the mockups: 1–9, then ⌫ 0 ↺; keys are 80px tall. */
export function Keypad({ onDigit, onErase, onReset, physicalKeys = true, disabled = false }: Props) {
  const handlers = useRef({ onDigit, onErase, onReset });
  handlers.current = { onDigit, onErase, onReset };

  useEffect(() => {
    if (!physicalKeys || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (/^[0-9]$/.test(e.key)) handlers.current.onDigit(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete') handlers.current.onErase();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [physicalKeys, disabled]);

  const digit = (d: number) => (
    <button key={d} type="button" className="key" onClick={() => onDigit(d)} disabled={disabled}>
      {d}
    </button>
  );

  return (
    <div className="keypad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit)}
      <button type="button" className="key erase" aria-label="Стерти" onClick={onErase} disabled={disabled}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z" />
          <path d="M12 9l5 6M17 9l-5 6" />
        </svg>
      </button>
      {digit(0)}
      {onReset ? (
        <button type="button" className="key" aria-label="Почати приклад знову" onClick={onReset} disabled={disabled}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 2.5-5.8" />
            <path d="M4 4v5h5" />
          </svg>
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
