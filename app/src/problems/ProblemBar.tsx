import type { BarSpec } from '../engine/problems';

interface Props {
  bar: BarSpec;
  /** The unknown numbers once solved: the whole, or the «?» parts. */
  reveal?: { whole?: number; part?: number };
}

/**
 * Bar model of a word problem: the whole on top, the parts below. Unequal parts (+ and −)
 * are drawn as wide as their numbers; × and : get equal parts.
 */
export function ProblemBar({ bar, reveal }: Props) {
  const known = bar.parts.reduce((s, p) => s + (p.value ?? 0), 0);
  const unknown = bar.parts.filter((p) => p.value === null).length;
  const rest = bar.whole !== null && unknown ? Math.max(1, (bar.whole - known) / unknown) : 1;
  const widths = bar.equal ? bar.parts.map(() => 1) : bar.parts.map((p) => p.value ?? rest);
  const smallest = Math.min(...widths);
  // Keep a tiny part readable: no part narrower than a sixth of the biggest.
  const big = Math.max(...widths);
  const cols = widths.map((w) => `${Math.max(w, big / 6, smallest)}fr`).join(' ');
  const whole = bar.whole ?? reveal?.whole;
  const show = (v: number | null) => (v ?? reveal?.part ?? '?');
  const many = bar.parts.length > 6;

  return (
    <div className="pb" role="img" aria-label={`Смужка: ціле ${whole ?? 'невідоме'}, частини ${bar.parts.map((p) => show(p.value)).join(', ')}`}>
      <div className="pb-row">
        <span className="pb-side">{bar.wholeLabel}</span>
        <div className={`pb-whole${bar.whole === null ? ' unknown' : ''}`}>{whole ?? '?'}</div>
      </div>
      <div className="pb-row">
        <span className="pb-side" />
        <div className="pb-parts" style={{ gridTemplateColumns: cols }}>
          {bar.parts.map((p, i) => (
            <div key={i} className={`pb-part${p.value === null ? ' unknown' : ''}${many ? ' small' : ''}`}>
              <b>{show(p.value)}</b>
              {p.label && <span>{p.label}</span>}
            </div>
          ))}
        </div>
      </div>
      <span className="pb-note">{bar.partsLabel}</span>
    </div>
  );
}
