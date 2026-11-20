export const BackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const CoinIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#F5A524" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#FFD66B" strokeWidth="2" />
  </svg>
);

export const StarIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#FFB400" />
  </svg>
);

export const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="3" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const PlusIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none', stroke: '#5B3FD6', strokeWidth: 3, strokeLinecap: 'round' }}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
