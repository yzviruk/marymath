import { digitCount, type ColumnInfo } from '../engine/column';
import { shownTop, type Cell, type ColumnInput } from './columnInput';
import { PLACE } from './texts';
import './ColumnBoard.css';

const LETTER = ['О', 'Д', 'С', 'Т'];

interface Props {
  column: ColumnInfo;
  input: ColumnInput;
  /** Places to shake after a wrong check. */
  wrong: number[];
  /** Places whose answer digit is confirmed (green). */
  done: number[];
  /** Increments to replay the shake animation. */
  shakeKey: number;
  locked: boolean;
  onCell: (cell: Cell) => void;
  onCarry: (place: number) => void;
  onCross: (place: number) => void;
}

/** The column itself: place letters, carry boxes, the two numbers and the answer boxes. */
export function ColumnBoard({ column, input, wrong, done, shakeKey, locked, onCell, onCarry, onCross }: Props) {
  const places = Array.from({ length: column.width }, (_, i) => column.width - 1 - i); // left → right
  const aDigits = digitCount(column.a);
  const bDigits = digitCount(column.b);
  const add = column.op === '+';
  const colW = column.width > 3 ? 80 : 96;
  const grid = { gridTemplateColumns: `56px repeat(${column.width}, ${colW}px)` };
  const isCursor = (kind: Cell['kind'], place: number) =>
    !locked && input.cursor?.kind === kind && input.cursor.place === place;

  return (
    <div className="cb" aria-label={`Приклад у стовпчик: ${column.a} ${column.op} ${column.b}`}>
      <div className="cb-grid" style={grid}>
        <span />
        {places.map((p) => (
          <span key={`h${p}`} className={`cb-letter p${p}`} title={PLACE[p]}>
            {LETTER[p]}
          </span>
        ))}

        {/* Row above the numbers: carry boxes (addition) or the new top digits after borrowing. */}
        <span />
        {places.map((p) =>
          add ? (
            p > 0 ? (
              <button
                key={`c${p}`}
                type="button"
                className={`cb-carry${input.carry[p] !== null ? ' filled' : ''}`}
                aria-label={`Перенесення над ${PLACE[p].toLowerCase()}`}
                aria-pressed={input.carry[p] === 1}
                onClick={() => onCarry(p)}
                disabled={locked}
              >
                {input.carry[p] ?? ''}
              </button>
            ) : (
              <span key={`c${p}`} className="cb-spacer" />
            )
          ) : (
            <span key={`c${p}`} className="cb-borrow" aria-live="polite">
              {(input.crossed[p] || input.crossed[p + 1]) && p < aDigits ? shownTop(input, column, p) : ''}
            </span>
          ),
        )}

        <span />
        {places.map((p) =>
          p >= aDigits ? (
            <span key={`a${p}`} />
          ) : !add && p > 0 ? (
            <button
              key={`a${p}`}
              type="button"
              className={`cb-digit cb-top p${p}${input.crossed[p] ? ' crossed' : ''}`}
              aria-label={`${column.places[p].a} — ${PLACE[p].toLowerCase()}. ${input.crossed[p] ? 'Позичено' : 'Торкнись, щоб позичити'}`}
              aria-pressed={input.crossed[p]}
              onClick={() => onCross(p)}
              disabled={locked}
            >
              {column.places[p].a}
            </button>
          ) : (
            <span key={`a${p}`} className={`cb-digit p${p}`}>
              {column.places[p].a}
            </span>
          ),
        )}

        <span className="cb-sign">{column.op}</span>
        {places.map((p) => (
          <span key={`b${p}`} className={`cb-digit p${p}`}>
            {p < bDigits ? column.places[p].b : ''}
          </span>
        ))}
      </div>

      <div className="cb-line" style={{ width: 56 + column.width * (colW + 10) }} />

      <div className="cb-grid" style={grid}>
        <span />
        {places.map((p) => {
          const cls = [
            'cb-answer',
            `p${p}`,
            isCursor('answer', p) ? 'cursor' : '',
            wrong.includes(p) ? 'wrong' : '',
            done.includes(p) ? 'done' : '',
          ].join(' ');
          return (
            <button
              key={`r${p}-${wrong.includes(p) ? shakeKey : 0}`}
              type="button"
              className={cls}
              aria-label={`Відповідь, ${PLACE[p].toLowerCase()}`}
              onClick={() => onCell({ kind: 'answer', place: p })}
              disabled={locked}
            >
              {input.answer[p] ?? ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
