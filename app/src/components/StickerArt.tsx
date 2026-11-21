import type { StickerDef } from '../engine/stickers';
import './StickerArt.css';

/** Sticker icons (24×24 stroke paths), as on design/project/Album.dc.html. */
const PATHS: Record<string, string> = {
  flag: 'M5 21V4M5 4h12l-2.5 4 2.5 4H5',
  tree: 'M12 3l6 8h-3.5l4.5 6H5l4.5-6H6z M12 17v4',
  cactus: 'M10 21V5a2 2 0 0 1 4 0v16M10 13H8a2 2 0 0 1-2-2V8M14 11h2a2 2 0 0 0 2-2V6M6 21h12',
  lolly: 'M6 9a6 6 0 1 0 12 0a6 6 0 1 0-12 0M12 9a2.5 2.5 0 1 1 2.5 2.5M12 15v7',
  crystal: 'M7 3h10l4 6-9 12L3 9z M3 9h18 M12 21L8 9l4-6 4 6z',
  castle: 'M4 21V8h3v3h3V8h4v3h3V8h3v13z M10 21v-4a2 2 0 0 1 4 0v4',
  swap: 'M17 7H8a4 4 0 0 0 0 8h9 M14 4l3 3-3 3',
  triangle: 'M12 4l8.5 15h-17z',
  book: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z',
  star: 'M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z',
  coin: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9',
  heart: 'M12 20s-7.5-4.5-7.5-10a4 4 0 0 1 7.5-2.4A4 4 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z',
  bag: 'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  cal: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5',
};

interface Props {
  sticker: StickerDef;
  got: boolean;
  size?: number;
  /** Degrees; stickers in the album sit a little crooked. */
  tilt?: number;
}

/** A round sticker: coloured with a white edge when got, a dashed grey place when not. */
export function StickerBadge({ sticker, got, size = 88, tilt = 0 }: Props) {
  const ink = got ? '#FFFFFF' : '#A3AECB';
  const glyph = sticker.glyph;
  return (
    <span
      className={`sticker${got ? ' got' : ''}`}
      style={{
        width: size,
        height: size,
        background: got ? sticker.color : '#F2F6FD',
        boxShadow: got ? `0 0 0 3px ${sticker.color}55, 0 ${Math.round(size / 18)}px 0 rgba(30,36,64,0.18)` : undefined,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        borderWidth: got ? Math.max(3, Math.round(size / 18)) : 3,
      }}
      aria-hidden="true"
    >
      {glyph ? (
        <b style={{ color: ink, fontSize: Math.round(size * (glyph.length > 2 ? 0.3 : 0.39)) }}>{glyph}</b>
      ) : (
        <svg
          width={Math.round(size * 0.52)}
          height={Math.round(size * 0.52)}
          viewBox="0 0 24 24"
          style={{ fill: 'none', stroke: ink, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }}
        >
          <path d={PATHS[sticker.icon ?? 'star']} />
        </svg>
      )}
    </span>
  );
}
