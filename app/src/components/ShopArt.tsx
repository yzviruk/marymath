import type { ReactNode } from 'react';
import type { PetKind } from '../data/types';

/**
 * Pictures of the shop things: a 64×56 icon for the shop card and (clothes) the drawing on the
 * pet's head. Clothes icons follow design/project/PetHome.dc.html; the rest are drawn to match.
 */
export const ITEM_ICONS: Record<string, ReactNode> = {
  hat: (
    <>
      <path d="M10 42 C 10 18, 54 18, 54 42 Z" fill="#2F6FED" />
      <rect x="8" y="38" width="48" height="12" rx="6" fill="#8FB4FF" />
      <circle cx="32" cy="12" r="8" fill="#FFFFFF" stroke="#8FB4FF" strokeWidth="3" />
    </>
  ),
  bow: (
    <g transform="translate(-3 11)">
      <path d="M35 17 L8 4 L8 30 Z" fill="#FF6FA5" />
      <path d="M35 17 L62 4 L62 30 Z" fill="#FF6FA5" />
      <circle cx="35" cy="17" r="8" fill="#E04F88" />
    </g>
  ),
  scarf: (
    <>
      <path d="M8 14 h48 v12 h-48 z" fill="#E5484D" />
      <path d="M40 26 h12 v26 h-12 z" fill="#E5484D" />
      <path d="M18 14 v12 M30 14 v12 M42 30 h10 M42 40 h10" stroke="#FFFFFF" strokeWidth="4" />
    </>
  ),
  glasses: (
    <>
      <circle cx="18" cy="30" r="12" fill="#BFE3FF" stroke="#1E2440" strokeWidth="4" />
      <circle cx="46" cy="30" r="12" fill="#BFE3FF" stroke="#1E2440" strokeWidth="4" />
      <path d="M30 28 q2 -4 4 0" stroke="#1E2440" strokeWidth="4" fill="none" />
    </>
  ),
  mask: (
    <>
      <path d="M4 22 q28 -12 56 0 v12 q-28 10 -56 0 z" fill="#E5484D" fillRule="evenodd" />
      <ellipse cx="20" cy="28" rx="7" ry="5" fill="#FFFFFF" />
      <ellipse cx="44" cy="28" rx="7" ry="5" fill="#FFFFFF" />
      <path d="M4 26 l-4 -6 M60 26 l4 -6" stroke="#E5484D" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  crown: <path d="M8 44 L10 16 L22 28 L32 10 L42 28 L54 16 L56 44 Z" fill="#FFD45C" stroke="#E59A00" strokeWidth="3" strokeLinejoin="round" />,
  wreath: (
    <>
      <ellipse cx="32" cy="32" rx="26" ry="10" fill="none" stroke="#3FA34D" strokeWidth="5" />
      {[8, 18, 30, 42, 54].map((x, i) => (
        <ellipse key={x} cx={x} cy={i % 2 ? 26 : 30} rx="7" ry="4" fill={i % 2 ? '#7ED98A' : '#4CBB5C'} transform={`rotate(${i * 20 - 40} ${x} 28)`} />
      ))}
      <circle cx="22" cy="24" r="4" fill="#FF8FB8" />
      <circle cx="44" cy="24" r="4" fill="#FFD45C" />
    </>
  ),
  ball: (
    <g transform="translate(8 4)">
      <circle cx="24" cy="24" r="22" fill="#FF8A3D" />
      <path d="M3 18c13 5 29 5 42 0M4 31c13 5 27 5 40 0" stroke="#FFFFFF" strokeWidth="4" fill="none" />
    </g>
  ),
  blocks: (
    <>
      <rect x="6" y="28" width="24" height="24" rx="4" fill="#2F6FED" />
      <rect x="34" y="28" width="24" height="24" rx="4" fill="#1E9E63" />
      <rect x="20" y="4" width="24" height="24" rx="4" fill="#E8770E" />
      <text x="18" y="46" fontSize="14" fontWeight="900" fill="#FFFFFF" textAnchor="middle">1</text>
      <text x="46" y="46" fontSize="14" fontWeight="900" fill="#FFFFFF" textAnchor="middle">2</text>
      <text x="32" y="22" fontSize="14" fontWeight="900" fill="#FFFFFF" textAnchor="middle">3</text>
    </>
  ),
  balloon: (
    <>
      <ellipse cx="32" cy="20" rx="15" ry="18" fill="#B79BFF" />
      <ellipse cx="27" cy="13" rx="4" ry="6" fill="#DCD0FF" />
      <path d="M30 38 l2 3 l2 -3 z" fill="#8F6FE8" />
      <path d="M32 41 q-6 6 0 15" stroke="#4F5A78" strokeWidth="2" fill="none" />
    </>
  ),
  teddy: (
    <>
      <circle cx="18" cy="12" r="8" fill="#B98256" />
      <circle cx="46" cy="12" r="8" fill="#B98256" />
      <circle cx="32" cy="22" r="16" fill="#C99366" />
      <ellipse cx="32" cy="44" rx="16" ry="12" fill="#C99366" />
      <ellipse cx="32" cy="27" rx="7" ry="5" fill="#F2D3B0" />
      <circle cx="26" cy="19" r="2.4" fill="#1E2440" />
      <circle cx="38" cy="19" r="2.4" fill="#1E2440" />
      <circle cx="32" cy="25" r="2.4" fill="#1E2440" />
    </>
  ),
  lollipop: (
    <>
      <rect x="29" y="30" width="6" height="26" rx="3" fill="#FFFFFF" stroke="#E3D2DA" />
      <circle cx="32" cy="20" r="18" fill="#FF6FA5" />
      <path d="M32 20 m-12 0 a12 12 0 1 1 24 0 a8 8 0 1 1 -16 0 a4 4 0 1 1 8 0" fill="none" stroke="#FFFFFF" strokeWidth="3" />
    </>
  ),
  flower: (
    <>
      <path d="M32 34 C 14 28, 12 10, 20 2 C 24 16, 30 22, 32 34 Z" fill="#3FA34D" />
      <path d="M32 34 C 50 28, 52 10, 44 2 C 40 16, 34 22, 32 34 Z" fill="#4CBB5C" />
      <path d="M20 34 h24 l-4 20 h-16 z" fill="#E8770E" />
    </>
  ),
  rug: (
    <>
      <ellipse cx="32" cy="34" rx="30" ry="14" fill="#8FC9F0" />
      <ellipse cx="32" cy="34" rx="22" ry="9" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="4 4" />
    </>
  ),
  lamp: (
    <>
      <path d="M20 6 h24 l8 18 h-40 z" fill="#FFD45C" stroke="#E59A00" strokeWidth="2" />
      <rect x="30" y="24" width="4" height="24" fill="#4F5A78" />
      <rect x="20" y="48" width="24" height="6" rx="3" fill="#4F5A78" />
    </>
  ),
  picture: (
    <>
      <rect x="6" y="6" width="52" height="44" rx="4" fill="#C0743C" />
      <rect x="12" y="12" width="40" height="32" fill="#BFE3FF" />
      <path d="M12 44 l12 -14 l8 8 l8 -10 l12 16 z" fill="#5BAE57" />
      <circle cx="44" cy="20" r="4" fill="#FFD45C" />
    </>
  ),
  bed: (
    <>
      <rect x="4" y="26" width="56" height="24" rx="12" fill="#B79BFF" />
      <rect x="10" y="20" width="44" height="16" rx="8" fill="#E6E0FF" />
      <circle cx="18" cy="26" r="5" fill="#FFFFFF" />
    </>
  ),
  aquarium: (
    <>
      <rect x="6" y="10" width="52" height="38" rx="6" fill="#BFE3FF" stroke="#7FB2E0" strokeWidth="3" />
      <rect x="6" y="40" width="52" height="8" fill="#F6DFA4" />
      <ellipse cx="26" cy="26" rx="8" ry="5" fill="#FF9F43" />
      <path d="M33 26 l7 -5 v10 z" fill="#FF9F43" />
      <circle cx="44" cy="18" r="2" fill="#FFFFFF" />
      <circle cx="48" cy="12" r="1.5" fill="#FFFFFF" />
      <path d="M14 40 q-2 -10 2 -16 M50 40 q2 -8 -2 -14" stroke="#3FA34D" strokeWidth="3" fill="none" />
    </>
  ),
  castle: (
    <>
      <path d="M8 52 h48 v-22 h-48 z" fill="#F7C873" />
      <path d="M8 30 v-8 h8 v4 h6 v-4 h8 v4 h6 v-4 h8 v4 h6 v-4 h4 v8 z" fill="#E8B35A" />
      <rect x="24" y="8" width="16" height="22" fill="#F7C873" />
      <path d="M32 8 v-6 l8 3 l-8 3" fill="#E5484D" />
      <path d="M28 52 v-10 a4 4 0 0 1 8 0 v10 z" fill="#C98F4F" />
    </>
  ),
  crystal: (
    <>
      <polygon points="32,2 44,22 38,54 26,54 20,22" fill="#7FD3F7" />
      <polygon points="32,2 44,22 32,26" fill="#BFEAFD" />
      <polygon points="14,24 22,38 18,54 8,54 6,38" fill="#B79BFF" />
      <polygon points="50,28 58,40 54,54 46,54 44,40" fill="#FF9EC7" />
    </>
  ),
};

export function ItemIcon({ id, size = 64 }: { id: string; size?: number }) {
  return (
    <svg width={size} height={(size * 56) / 64} viewBox="0 0 64 56" aria-hidden="true">
      {ITEM_ICONS[id]}
    </svg>
  );
}

/** Where clothes sit on each pet's head (in the 120×120 pet picture). */
const HEAD: Record<PetKind, { cx: number; top: number; eyeY: number; eyeL: number; eyeR: number; chin: number }> = {
  dog: { cx: 60, top: 18, eyeY: 62, eyeL: 46, eyeR: 74, chin: 100 },
  cat: { cx: 60, top: 28, eyeY: 63, eyeL: 45, eyeR: 75, chin: 104 },
  unicorn: { cx: 62, top: 30, eyeY: 63, eyeL: 49, eyeR: 77, chin: 102 },
  panda: { cx: 60, top: 28, eyeY: 62, eyeL: 44, eyeR: 76, chin: 104 },
  capybara: { cx: 60, top: 22, eyeY: 52, eyeL: 42, eyeR: 78, chin: 106 },
};

/** Clothes drawn over the pet picture. */
export function PetClothes({ kind, ids }: { kind: PetKind; ids: string[] }) {
  const h = HEAD[kind];
  const eyeW = h.eyeR - h.eyeL;
  return (
    <>
      {ids.map((id) => {
        switch (id) {
          case 'scarf':
            return (
              <g key={id}>
                <rect x={h.cx - 32} y={h.chin - 10} width="64" height="13" rx="6.5" fill="#E5484D" />
                <rect x={h.cx + 12} y={h.chin - 2} width="12" height="18" rx="3" fill="#E5484D" />
                <path d={`M${h.cx - 18} ${h.chin - 10} v13 M${h.cx - 4} ${h.chin - 10} v13 M${h.cx + 12} ${h.chin + 8} h12`} stroke="#FFFFFF" strokeWidth="3" />
              </g>
            );
          case 'bow':
            return (
              <g key={id} transform={`translate(${h.cx - 44} ${h.top}) scale(0.55)`}>
                {ITEM_ICONS.bow}
              </g>
            );
          case 'glasses':
            return (
              <g key={id} fill="#BFE3FF" fillOpacity="0.35" stroke="#1E2440" strokeWidth="3.5">
                <circle cx={h.eyeL} cy={h.eyeY} r="11" />
                <circle cx={h.eyeR} cy={h.eyeY} r="11" />
                <path d={`M${h.eyeL + 11} ${h.eyeY - 1} q${eyeW / 2 - 11} -5 ${eyeW - 22} 0`} fill="none" />
              </g>
            );
          case 'mask':
            return (
              <path
                key={id}
                fill="#E5484D"
                fillRule="evenodd"
                d={`M${h.eyeL - 17} ${h.eyeY - 7} q${eyeW / 2 + 17} -10 ${eyeW + 34} 0 v13 q-${eyeW / 2 + 17} 9 -${eyeW + 34} 0 z
                    M${h.eyeL - 8} ${h.eyeY} a8 6 0 1 0 16 0 a8 6 0 1 0 -16 0 z
                    M${h.eyeR - 8} ${h.eyeY} a8 6 0 1 0 16 0 a8 6 0 1 0 -16 0 z`}
              />
            );
          case 'hat':
            return (
              <g key={id} transform={`translate(${h.cx - 30} ${h.top - 26}) scale(0.94)`}>
                {ITEM_ICONS.hat}
              </g>
            );
          case 'crown':
            return (
              <g key={id} transform={`translate(${h.cx - 24} ${h.top - 30}) scale(0.75)`}>
                {ITEM_ICONS.crown}
              </g>
            );
          case 'wreath':
            return (
              <g key={id} transform={`translate(${h.cx - 32} ${h.top - 28})`}>
                {ITEM_ICONS.wreath}
              </g>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
