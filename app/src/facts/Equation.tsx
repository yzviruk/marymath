import type { Line } from '../engine/types';
import './Equation.css';

interface Props {
  lines: Line[];
  values: readonly (number | null)[];
  cursor: number | null;
  wrong?: number[];
  shakeKey?: number;
  /** Captions under the numbers of a one-line division («скільки всього» …). */
  labels?: string[] | null;
  /** The first box is the whole — same colour as the top of the bar model. */
  wholeFirst?: boolean;
  onBlank?: (i: number) => void;
  /** Boxes that are finished and green. */
  done?: boolean;
}

/** A written example with boxes to fill: «12 : 3 = ▢», «4 + 4 + 4 = 4 × ▢ = ▢», four lines of a fact family. */
export function Equation({
  lines,
  values,
  cursor,
  wrong = [],
  shakeKey = 0,
  labels,
  wholeFirst,
  onBlank,
  done,
}: Props) {
  const tokens = Math.max(...lines.map((l) => l.length));
  const size = lines.length > 1 ? 'family' : tokens > 9 ? 'small' : 'big';
  const boxedNums = !!labels;
  const aria = lines.map((l) => l.map((p) => (p.t === 'blank' ? (values[p.i] ?? '?') : p.v)).join(' ')).join('; ');

  return (
    <div className={`eq eq-${size}`} role="group" aria-label={`Приклад: ${aria}`}>
      {lines.map((line, li) => {
        let slot = 0;
        return (
          <div key={li} className="eq-line">
            {line.map((p, k) => {
              if (p.t === 'op') {
                return (
                  <span key={k} className="eq-op">
                    {p.v}
                  </span>
                );
              }
              const label = labels?.[slot];
              const first = slot === 0;
              slot++;
              let box: React.ReactNode;
              if (p.t === 'num') {
                if (!boxedNums) {
                  box = <span className="eq-num">{p.v}</span>;
                } else {
                  box = <span className={`eq-box given${first && wholeFirst ? ' whole' : ''}`}>{p.v}</span>;
                }
              } else {
                const v = values[p.i];
                const isWrong = wrong.includes(p.i);
                const cls = [
                  'eq-box',
                  'blank',
                  cursor === p.i && !done ? 'cursor' : '',
                  isWrong ? 'wrong' : '',
                  done ? 'done' : '',
                  first && wholeFirst ? 'whole' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                box = (
                  <button
                    key={isWrong ? `w${shakeKey}` : 'b'}
                    type="button"
                    className={cls}
                    aria-label={`Віконце ${p.i + 1}: ${v ?? 'порожнє'}`}
                    onClick={() => onBlank?.(p.i)}
                    disabled={!onBlank}
                  >
                    {v ?? (cursor === p.i && !done ? <span className="eq-caret" /> : '')}
                  </button>
                );
              }
              return label ? (
                <span key={k} className="eq-cell">
                  {box}
                  <span className="eq-label">{label}</span>
                </span>
              ) : (
                <span key={k}>{box}</span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
