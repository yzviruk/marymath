import type { PetKind } from '../data/types';
import { PET_LABELS } from '../data/types';

interface Props {
  kind: PetKind;
  size?: number;
  /** Accessible name; defaults to the pet species. Pass '' to hide from screen readers. */
  label?: string;
}

/** Original pet characters, ported 1:1 from design/project/Pet.dc.html. */
export function Pet({ kind, size = 200, label }: Props) {
  const name = label ?? PET_LABELS[kind];
  const a11y = name ? { role: 'img', 'aria-label': name } : { 'aria-hidden': true as const };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...a11y}>
      {SHAPES[kind]}
    </svg>
  );
}

const dog = (
  <>
    <ellipse cx="22" cy="66" rx="15" ry="27" fill="#D9AE84" transform="rotate(12 22 66)" />
    <ellipse cx="98" cy="66" rx="15" ry="27" fill="#D9AE84" transform="rotate(-12 98 66)" />
    <circle cx="60" cy="64" r="38" fill="#F5E3CA" />
    <circle cx="40" cy="36" r="13" fill="#F5E3CA" />
    <circle cx="54" cy="28" r="14" fill="#F5E3CA" />
    <circle cx="69" cy="28" r="13" fill="#F5E3CA" />
    <circle cx="82" cy="37" r="12" fill="#F5E3CA" />
    <path d="M46 31 q4 -6 8 0 M61 26 q4 -6 8 0 M75 32 q4 -6 8 0" stroke="#DDBF98" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <circle cx="46" cy="62" r="6.5" fill="#1E2440" />
    <circle cx="74" cy="62" r="6.5" fill="#1E2440" />
    <circle cx="48" cy="60" r="2.2" fill="#FFFFFF" />
    <circle cx="76" cy="60" r="2.2" fill="#FFFFFF" />
    <ellipse cx="60" cy="82" rx="17" ry="13" fill="#FFF6EA" />
    <path d="M57 87 Q60 96 63 87 Z" fill="#FF8FA3" />
    <path d="M52 84 Q60 91 68 84" stroke="#1E2440" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <ellipse cx="60" cy="76" rx="6.5" ry="4.8" fill="#1E2440" />
    <circle cx="34" cy="78" r="6" fill="#FFB4B4" opacity="0.75" />
    <circle cx="86" cy="78" r="6" fill="#FFB4B4" opacity="0.75" />
  </>
);

const cat = (
  <>
    <polygon points="22,50 28,10 56,34" fill="#F2A65A" />
    <polygon points="98,50 92,10 64,34" fill="#F2A65A" />
    <polygon points="29,42 32,21 46,34" fill="#FFC9C9" />
    <polygon points="91,42 88,21 74,34" fill="#FFC9C9" />
    <circle cx="60" cy="66" r="40" fill="#F6B76E" />
    <path d="M52 30 v10 M60 28 v12 M68 30 v10" stroke="#E08E3C" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="45" cy="63" rx="6" ry="8" fill="#1E2440" />
    <ellipse cx="75" cy="63" rx="6" ry="8" fill="#1E2440" />
    <circle cx="47" cy="60" r="2.2" fill="#FFFFFF" />
    <circle cx="77" cy="60" r="2.2" fill="#FFFFFF" />
    <ellipse cx="60" cy="83" rx="15" ry="11" fill="#FFE8CF" />
    <path d="M55 76 h10 l-5 6 z" fill="#FF8FA3" />
    <path d="M60 82 q-5 6 -10 2 M60 82 q5 6 10 2" stroke="#1E2440" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M32 80 h-18 M32 86 l-16 5 M88 80 h18 M88 86 l16 5" stroke="#B9733A" strokeWidth="2" strokeLinecap="round" />
    <circle cx="34" cy="74" r="5" fill="#FF9F9F" opacity="0.6" />
    <circle cx="86" cy="74" r="5" fill="#FF9F9F" opacity="0.6" />
  </>
);

const unicorn = (
  <>
    <circle cx="28" cy="52" r="16" fill="#FF9EC7" />
    <circle cx="22" cy="76" r="14" fill="#B79BFF" />
    <circle cx="30" cy="98" r="12" fill="#8FD3FF" />
    <polygon points="38,40 38,14 56,32" fill="#FFFFFF" stroke="#E2D8F5" strokeWidth="3" strokeLinejoin="round" />
    <polygon points="86,40 86,14 68,32" fill="#FFFFFF" stroke="#E2D8F5" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="62" cy="66" r="38" fill="#FFFFFF" stroke="#E2D8F5" strokeWidth="3" />
    <polygon points="55,32 62,2 69,32" fill="#FFD25E" />
    <path d="M57 24 L67 20 M59 15 L66 12" stroke="#F0A92E" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="50" cy="36" r="10" fill="#FF9EC7" />
    <circle cx="40" cy="44" r="8" fill="#B79BFF" />
    <circle cx="49" cy="63" r="6" fill="#1E2440" />
    <circle cx="77" cy="63" r="6" fill="#1E2440" />
    <circle cx="51" cy="61" r="2" fill="#FFFFFF" />
    <circle cx="79" cy="61" r="2" fill="#FFFFFF" />
    <path d="M43 57 l-4 -3 M82 57 l4 -3" stroke="#1E2440" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="63" cy="85" rx="19" ry="12" fill="#FCE6F1" />
    <circle cx="56" cy="84" r="2.2" fill="#C97BA0" />
    <circle cx="70" cy="84" r="2.2" fill="#C97BA0" />
    <path d="M57 91 Q63 95 69 91" stroke="#C97BA0" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <circle cx="38" cy="78" r="5" fill="#FFB4D2" opacity="0.8" />
    <circle cx="88" cy="78" r="5" fill="#FFB4D2" opacity="0.8" />
  </>
);

const panda = (
  <>
    <circle cx="28" cy="32" r="14" fill="#2A2F45" />
    <circle cx="92" cy="32" r="14" fill="#2A2F45" />
    <circle cx="60" cy="66" r="40" fill="#FFFFFF" stroke="#E3E7F0" strokeWidth="3" />
    <ellipse cx="44" cy="62" rx="11" ry="14" fill="#2A2F45" transform="rotate(25 44 62)" />
    <ellipse cx="76" cy="62" rx="11" ry="14" fill="#2A2F45" transform="rotate(-25 76 62)" />
    <circle cx="45" cy="61" r="5" fill="#FFFFFF" />
    <circle cx="75" cy="61" r="5" fill="#FFFFFF" />
    <circle cx="46" cy="62" r="2.6" fill="#1E2440" />
    <circle cx="74" cy="62" r="2.6" fill="#1E2440" />
    <ellipse cx="60" cy="79" rx="7" ry="5" fill="#2A2F45" />
    <path d="M53 86 Q60 92 67 86" stroke="#2A2F45" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <circle cx="34" cy="82" r="6" fill="#FFB4B4" opacity="0.7" />
    <circle cx="86" cy="82" r="6" fill="#FFB4B4" opacity="0.7" />
  </>
);

const capybara = (
  <>
    <circle cx="32" cy="32" r="9" fill="#8E5C38" />
    <circle cx="88" cy="32" r="9" fill="#8E5C38" />
    <rect x="16" y="26" width="88" height="82" rx="40" fill="#B98256" />
    <rect x="30" y="64" width="60" height="40" rx="20" fill="#9C6A43" />
    <ellipse cx="50" cy="77" rx="4" ry="2.6" fill="#4A2E1C" />
    <ellipse cx="70" cy="77" rx="4" ry="2.6" fill="#4A2E1C" />
    <circle cx="42" cy="52" r="5" fill="#1E2440" />
    <circle cx="78" cy="52" r="5" fill="#1E2440" />
    <circle cx="43.5" cy="50.5" r="1.8" fill="#FFFFFF" />
    <circle cx="79.5" cy="50.5" r="1.8" fill="#FFFFFF" />
    <path d="M53 91 Q60 96 67 91" stroke="#4A2E1C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <circle cx="60" cy="18" r="10" fill="#FFB020" />
    <ellipse cx="67" cy="8" rx="6" ry="3.2" fill="#4CAF6A" transform="rotate(-20 67 8)" />
    <circle cx="30" cy="66" r="5" fill="#E89B8A" opacity="0.6" />
    <circle cx="90" cy="66" r="5" fill="#E89B8A" opacity="0.6" />
  </>
);

const SHAPES: Record<PetKind, React.ReactNode> = { dog, cat, unicorn, panda, capybara };
