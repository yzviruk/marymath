import { buildArcs, LINE_HEIGHT, LINE_MAX, LINE_MIN, LINE_WIDTH, xOf, type ArcLabelMode } from './lineGeometry';
import './NumberLine.css';

interface Props {
  /** Points the jumps pass through, e.g. [0, 3, 6, 9, 12] for 3 × 4. */
  path?: number[];
  labels?: ArcLabelMode;
}

const NUMBERS = Array.from({ length: LINE_MAX - LINE_MIN + 1 }, (_, i) => LINE_MIN + i);

/** The 0–20 number line pinned at the top of every task screen (one row, 1232×120). */
export function NumberLine({ path = [], labels = 'delta' }: Props) {
  const arcs = buildArcs(path, labels);
  const landed = new Set(arcs.flatMap((a) => [a.from, a.to]));
  const dots = arcs.map((a) => a.to);
  const aria =
    arcs.length > 0 ? `Числова шкала від 0 до 20, стрибки: ${path.join(' → ')}` : 'Числова шкала від 0 до 20';

  return (
    <div className="nl" role="img" aria-label={aria} style={{ width: LINE_WIDTH, height: LINE_HEIGHT }}>
      <div className="nl-axis" />
      {arcs.map((a, i) => (
        <div
          key={`${a.from}-${a.to}-${i}`}
          className="nl-arc"
          style={{ left: a.left, width: a.width, animationDelay: `${i * 0.35}s` }}
        >
          <svg width={a.width} height={56} viewBox={`0 0 ${a.width} 56`} aria-hidden="true">
            <path d={a.d} />
            <polygon points={a.head} />
          </svg>
          {a.label && <div className="nl-arc-label">{a.label}</div>}
        </div>
      ))}
      {NUMBERS.map((n) => {
        const major = n % 5 === 0;
        return (
          <div key={n}>
            <div className={`nl-tick${major ? ' major' : ''}`} style={{ left: xOf(n) - 1.5 }} />
            <div
              className={`nl-num${n === 0 ? ' zero' : ''}${landed.has(n) ? ' on' : ''}`}
              style={{ left: xOf(n) - 22 }}
            >
              {n}
            </div>
          </div>
        );
      })}
      {dots.map((n, i) => (
        <div key={`dot-${i}`} className="nl-dot" style={{ left: xOf(n) - 8 }} />
      ))}
    </div>
  );
}
