import type { FlowerState } from '../engine/garden';

/** Bed colours of the garden (design/project/Garden.dc.html): «на 2» … «на 5». */
export const BED_COLORS: Record<number, string> = { 2: '#E0508E', 3: '#E8770E', 4: '#8A5BD6', 5: '#2F6FED' };
export const bedColor = (factor: number) => BED_COLORS[factor] ?? '#5B3FD6';

interface Props {
  state: FlowerState;
  color: string;
  /** Width; the height is 9/8 of it. */
  size?: number;
}

/** A flower of the fact garden: seed, bud, thirsty bud or a bloomed flower. */
export function FlowerArt({ state, color, size = 56 }: Props) {
  return (
    <svg width={size} height={(size * 72) / 64} viewBox="0 0 64 72" aria-hidden="true" className={`flower ${state}`}>
      {state === 'bloom' && (
        <>
          <path d="M32 72V36" stroke="#3E9B4F" strokeWidth="4" fill="none" />
          <path d="M32 56c-10-2-14-8-14-14c8 0 14 6 14 14z" fill="#5DBB63" />
          <g fill={color}>
            <circle cx="32" cy="14" r="9" />
            <circle cx="42.4" cy="20" r="9" />
            <circle cx="42.4" cy="32" r="9" />
            <circle cx="32" cy="38" r="9" />
            <circle cx="21.6" cy="32" r="9" />
            <circle cx="21.6" cy="20" r="9" />
          </g>
          <circle cx="32" cy="26" r="8" fill="#FFD34D" />
        </>
      )}
      {state === 'bud' && (
        <>
          <path d="M32 72V40" stroke="#3E9B4F" strokeWidth="4" fill="none" />
          <path d="M32 60c-10-2-14-8-14-14c8 0 14 6 14 14z" fill="#5DBB63" />
          <ellipse cx="32" cy="30" rx="9" ry="13" fill={color} />
          <path d="M23 34c3 8 15 8 18 0c-2 6-16 6-18 0z" fill="#5DBB63" />
        </>
      )}
      {state === 'thirsty' && (
        <>
          <path d="M32 72C32 54 36 44 46 42" stroke="#7FA86A" strokeWidth="4" fill="none" />
          <path d="M32 62c-9-2-12-7-12-12c7 0 12 5 12 12z" fill="#9CC48A" />
          <ellipse cx="48" cy="48" rx="7" ry="11" transform="rotate(-30 48 48)" fill={color} opacity="0.55" />
          <path d="M14 10c-5 7-7 10-7 13a7 7 0 0 0 14 0c0-3-2-6-7-13z" fill="#3A8FD6" />
        </>
      )}
      {state === 'seed' && (
        <>
          <ellipse cx="32" cy="66" rx="20" ry="6" fill="#B98A5C" />
          <path d="M32 62V50" stroke="#7FB86E" strokeWidth="3" fill="none" />
          <path d="M32 52c-6 0-9-4-9-8c5 0 9 3 9 8zM32 54c5 0 8-3 8-7c-5 0-8 3-8 7z" fill="#9CD08A" />
        </>
      )}
    </svg>
  );
}
