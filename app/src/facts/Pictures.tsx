import { useRef, useState } from 'react';
import type { ItemKind } from './texts';
import { groupOf, type Grouping, type Place, type Share } from './objects';
import { CANDY, count, ROW } from './words';
import './Pictures.css';

// ── Items ────────────────────────────────────────────────────────────────

export function Item({ kind, size }: { kind: ItemKind; size: number }) {
  if (kind === 'apple') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 7c-2-2-7-2-8 3s2 11 5 11c1.2 0 1.8-.6 3-.6s1.8.6 3 .6c3 0 6-6 5-11s-6-5-8-3z" fill="#E5484D" />
        <path d="M12 7c0-2 1-4 3-5" stroke="#6B4423" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M13 4c2-1.5 4-1 5 0-1.5 1.5-3.5 1.5-5 0z" fill="#3FA34D" />
      </svg>
    );
  }
  if (kind === 'gem') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h12l4 5-10 12L2 9z" fill="#3FB6E8" />
        <path d="M2 9h20M9 4l3 5 3-5" stroke="#1E86B5" strokeWidth="1.4" fill="none" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 6.5l6 5.5-6 5.5z" fill="#F7A8C8" />
      <path d="M23 6.5l-6 5.5 6 5.5z" fill="#F7A8C8" />
      <circle cx="12" cy="12" r="6.5" fill="#D6457E" />
      <path d="M8.8 9.8c1.6-1.4 4.6-1.4 6.4.6" stroke="#FFD1E3" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Columns of items inside one box: 4 → 2×2, 6 → 3×2, 10 → 5×2. */
const colsFor = (n: number) => (n <= 2 ? n : n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 5);

/** Box width for `groups` boxes across `width` px (two rows when there are many). */
function boxWidth(groups: number, width: number, max: number, rowLimit = 6) {
  const perRow = groups > rowLimit ? Math.ceil(groups / 2) : groups;
  return Math.min(max, Math.floor((width - 12 * (perRow - 1)) / perRow));
}

// ── Equal groups (×, :3) ─────────────────────────────────────────────────

interface BoxesProps {
  groups: number;
  size: number;
  kind: ItemKind;
  width?: number;
  maxBox?: number;
  /** More boxes than this go in two rows. */
  rowLimit?: number;
  /** Concrete ×: boxes are tapped in turn and counted. */
  counted?: number;
  onTapBox?: () => void;
}

export function Boxes({ groups, size, kind, width = 820, maxBox = 200, rowLimit = 6, counted = 0, onTapBox }: BoxesProps) {
  const w = boxWidth(groups, width, maxBox, rowLimit);
  const cols = colsFor(size);
  const item = Math.max(14, Math.min(44, Math.floor((w - 20) / cols) - 4));
  const holder = kind === 'candy' ? 'candy' : 'gem';
  return (
    <div className="pic-boxes" style={{ maxWidth: width }}>
      {Array.from({ length: groups }, (_, g) => {
        const content = (
          <span className="pic-box-items" style={{ gridTemplateColumns: `repeat(${cols}, ${item}px)` }}>
            {Array.from({ length: size }, (_, i) => (
              <Item key={i} kind={kind} size={item} />
            ))}
          </span>
        );
        const tapped = g < counted;
        return onTapBox ? (
          <button
            key={g}
            type="button"
            className={`pic-box ${holder}${tapped ? ' counted' : ''}`}
            style={{ width: w }}
            aria-label={`Коробка ${g + 1}${tapped ? `, полічено: ${(g + 1) * size}` : ''}`}
            onClick={onTapBox}
          >
            {content}
            {tapped && <span className="pic-badge">{(g + 1) * size}</span>}
          </button>
        ) : (
          <div key={g} className={`pic-box ${holder}`} style={{ width: w }}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

// ── Array with rotation (×2) ─────────────────────────────────────────────

export function ArrayBox({
  rows,
  cols,
  rotated,
  onRotate,
}: {
  rows: number;
  cols: number;
  rotated: boolean;
  onRotate: () => void;
}) {
  const r = rotated ? cols : rows;
  const c = rotated ? rows : cols;
  const item = Math.min(48, Math.floor(190 / Math.max(r, 1)) - 4, Math.floor(480 / c) - 4);
  return (
    <div className="pic-array-wrap">
      <div
        className={`pic-array${rotated ? ' turned' : ''}`}
        key={rotated ? 'r' : 'n'}
        role="img"
        aria-label={`${count(r, ROW)} по ${count(c, CANDY)}`}
        style={{ gridTemplateColumns: `repeat(${c}, ${item}px)` }}
      >
        {Array.from({ length: r * c }, (_, i) => (
          <Item key={i} kind="candy" size={item} />
        ))}
      </div>
      <div className="pic-array-side">
        <span className="pic-array-count">
          {count(r, ROW)} по {c}
        </span>
        <button type="button" className="pic-rotate" onClick={onRotate}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.5-5.8" />
            <path d="M20 4v5h-5" />
          </svg>
          Повернути
        </button>
      </div>
    </div>
  );
}

// ── Baskets (:1) ─────────────────────────────────────────────────────────

function basketItemSize(perBasket: number, w: number) {
  const cols = colsFor(Math.max(perBasket, 1));
  return Math.max(16, Math.min(34, Math.floor((w - 24) / cols) - 4));
}

/** Filled baskets for the pictorial stage and the explanation. */
export function Baskets({ groups, size, width = 820 }: { groups: number; size: number; width?: number }) {
  const w = boxWidth(groups, width, 200);
  const item = basketItemSize(size, w);
  return (
    <div className="pic-boxes" style={{ maxWidth: width }}>
      {Array.from({ length: groups }, (_, g) => (
        <div key={g} className="pic-basket-wrap" style={{ width: w }}>
          <div className="pic-basket">
            {Array.from({ length: size }, (_, i) => (
              <Item key={i} kind="apple" size={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Drag {
  from: Place;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  scale: number;
  key: string;
}

/** Concrete :1 — apples dragged one by one from the pile into baskets (and back). */
export function ShareBaskets({
  share,
  perBasket,
  onMove: moveItem,
}: {
  share: Share;
  perBasket: number;
  onMove: (from: Place, to: Place) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const groups = share.baskets.length;
  const w = boxWidth(groups, 820, 200);
  const item = basketItemSize(perBasket, w);

  function onDown(e: React.PointerEvent, from: Place, key: string) {
    const stage = root.current?.closest('.stage') as HTMLElement | null;
    const scale = stage ? stage.getBoundingClientRect().width / 1280 : 1;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ from, key, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, scale });
  }
  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({
      ...drag,
      dx: (e.clientX - drag.x0) / drag.scale,
      dy: (e.clientY - drag.y0) / drag.scale,
    });
  }
  function onUp(e: React.PointerEvent) {
    if (!drag) return;
    const target = document
      .elementsFromPoint(e.clientX, e.clientY)
      .filter((el) => !(e.currentTarget as Element).contains(el))
      .map((el) => el.closest('[data-share-place]'))
      .find(Boolean) as HTMLElement | undefined;
    if (target) {
      const p = target.dataset.sharePlace!;
      moveItem(drag.from, p === 'pile' ? 'pile' : Number(p));
    }
    setDrag(null);
  }

  const apple = (from: Place, i: number, size: number) => {
    const key = `${from}-${i}`;
    const moving = drag?.key === key;
    return (
      <span
        key={key}
        className={`pic-drag${moving ? ' moving' : ''}`}
        data-testid={from === 'pile' ? 'pile-apple' : `basket-apple-${from}`}
        style={
          moving
            ? {
                transform: `translate(${drag!.dx}px, ${drag!.dy}px) scale(1.15)`,
              }
            : undefined
        }
        onPointerDown={(e) => onDown(e, from, key)}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => setDrag(null)}
      >
        <Item kind="apple" size={size} />
      </span>
    );
  };

  return (
    <div className="pic-share" ref={root}>
      <div className="pic-pile" data-share-place="pile" aria-label={`Яблук у купці: ${share.pile}`}>
        {Array.from({ length: share.pile }, (_, i) => apple('pile', i, 34))}
        {share.pile === 0 && <span className="pic-pile-empty">усі яблука в кошиках</span>}
      </div>
      <div className="pic-boxes">
        {share.baskets.map((n, g) => (
          <div key={g} className="pic-basket-wrap" style={{ width: w }}>
            <div
              className="pic-basket"
              data-share-place={g}
              data-testid={`basket-${g}`}
              aria-label={`Кошик ${g + 1}: ${n}`}
            >
              {Array.from({ length: n }, (_, i) => apple(g, i, item))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Groups by taps (:2) ──────────────────────────────────────────────────

const GROUP_COLORS = [
  '#5B3FD6',
  '#E8770E',
  '#138A55',
  '#2F6FED',
  '#D6457E',
  '#8A5A00',
  '#0E8C8C',
  '#B23A48',
  '#4F5A78',
  '#6F42C1',
];

interface GroupProps {
  total: number;
  grouping: Grouping;
  onTap?: (i: number) => void;
  width?: number;
}

export function GroupItems({ total, grouping, onTap, width = 800 }: GroupProps) {
  const perRow = total <= 12 ? total : Math.ceil(total / 2);
  const size = Math.min(56, Math.floor(width / perRow) - 10);
  return (
    <div className="pic-group" style={{ gridTemplateColumns: `repeat(${perRow}, ${size + 8}px)` }}>
      {Array.from({ length: total }, (_, i) => {
        const g = groupOf(grouping, i);
        const picked = grouping.picked.includes(i);
        const color = g >= 0 ? GROUP_COLORS[g % GROUP_COLORS.length] : undefined;
        const label =
          g >= 0 ? `Камінець ${i + 1}, група ${g + 1}` : picked ? `Камінець ${i + 1}, вибрано` : `Камінець ${i + 1}`;
        const style = color ? { borderColor: color, background: `${color}22` } : undefined;
        return onTap ? (
          <button
            key={i}
            type="button"
            className={`pic-gem${picked ? ' picked' : ''}`}
            style={style}
            aria-label={label}
            onClick={() => onTap(i)}
          >
            <Item kind="gem" size={size - 12} />
            {g >= 0 && (
              <span className="pic-gem-no" style={{ background: color }}>
                {g + 1}
              </span>
            )}
          </button>
        ) : (
          <span key={i} className="pic-gem" style={style}>
            <Item kind="gem" size={size - 12} />
            {g >= 0 && (
              <span className="pic-gem-no" style={{ background: color }}>
                {g + 1}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── Bar model ────────────────────────────────────────────────────────────

interface BarProps {
  whole: number | '?';
  parts: number;
  part: number | '?';
  wholeLabel?: string;
  partsLabel?: string;
  width?: number;
}

/** «Ціле і частини»: the whole on top, equal parts below; the whole has the colour of the first box. */
export function BarModel({ whole, parts, part, wholeLabel = 'усього', partsLabel, width = 600 }: BarProps) {
  return (
    <div className="bar" role="img" aria-label={`Смужка: ${whole} — це ${parts} рівних частин по ${part}`}>
      <span className="bar-side right">{wholeLabel}</span>
      <div className="bar-body" style={{ width }}>
        <div className="bar-whole">{whole}</div>
        <div className="bar-parts" style={{ gridTemplateColumns: `repeat(${parts}, minmax(0, 1fr))` }}>
          {Array.from({ length: parts }, (_, i) => (
            <div key={i} className="bar-part">
              {part}
            </div>
          ))}
        </div>
      </div>
      <span className="bar-side">{partsLabel ?? `${parts} рівні частини`}</span>
    </div>
  );
}

// ── Fact family triangle (:4) ────────────────────────────────────────────

export function Triangle({ top, left, right }: { top: number; left: number; right: number }) {
  return (
    <div className="tri" role="img" aria-label={`Трикутник: ${top} вгорі, ${left} і ${right} внизу`}>
      <svg width="300" height="190" viewBox="0 0 300 190" aria-hidden="true">
        <path d="M150 34 L48 158 L252 158 Z" fill="#F1EDFF" stroke="#B9A8FF" strokeWidth="6" strokeLinejoin="round" />
      </svg>
      <span className="tri-num top">{top}</span>
      <span className="tri-num left">{left}</span>
      <span className="tri-num right">{right}</span>
    </div>
  );
}

// ── A temporary line 0–35 for facts above 20 ─────────────────────────────

export function WideLine({ path, max = 35, width = 560 }: { path: number[]; max?: number; width?: number }) {
  const step = (width - 24) / max;
  const x = (n: number) => 12 + n * step;
  const jumps = path.slice(1).map((to, i) => ({ from: path[i], to, n: i + 1 }));
  return (
    <svg
      className="wide-line"
      width={width}
      height={96}
      viewBox={`0 0 ${width} 96`}
      role="img"
      aria-label={`Шкала від 0 до ${max}, стрибки: ${path.join(' → ')}`}
    >
      <line x1={x(0)} y1={64} x2={x(max)} y2={64} stroke="#8C9BC0" strokeWidth={3} strokeLinecap="round" />
      {Array.from({ length: max + 1 }, (_, n) => (
        <line
          key={n}
          x1={x(n)}
          x2={x(n)}
          y1={n % 5 === 0 ? 56 : 60}
          y2={n % 5 === 0 ? 72 : 68}
          stroke="#8C9BC0"
          strokeWidth={n % 5 === 0 ? 3 : 2}
        />
      ))}
      {Array.from({ length: max / 5 + 1 }, (_, k) => (
        <text key={k} x={x(k * 5)} y={92} textAnchor="middle" fontSize={15} fontWeight={800} fill="#4F5A78">
          {k * 5}
        </text>
      ))}
      {jumps.map(({ from, to, n }) => {
        const a = x(from);
        const b = x(to);
        const mid = (a + b) / 2;
        return (
          <g key={n}>
            <path d={`M ${a} 62 Q ${mid} ${10} ${b} 62`} fill="none" stroke="#5B3FD6" strokeWidth={3} />
            <text x={mid} y={26} textAnchor="middle" fontSize={14} fontWeight={900} fill="#3E27A3">
              {n}
            </text>
          </g>
        );
      })}
      {path.map((n, i) => (
        <circle
          key={i}
          cx={x(n)}
          cy={64}
          r={i === path.length - 1 ? 7 : 4}
          fill={i === path.length - 1 ? '#E8770E' : '#5B3FD6'}
        />
      ))}
    </svg>
  );
}
