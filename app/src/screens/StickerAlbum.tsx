import { useEffect, useState } from 'react';
import { BackIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import { StickerBadge } from '../components/StickerArt';
import { stickerFacts, syncStickers } from '../data/stickers';
import type { Profile } from '../data/types';
import { wornIds } from '../engine/shop';
import { getSticker, nextSticker, STICKER_ROWS, STICKERS, type StickerFacts } from '../engine/stickers';
import './StickerAlbum.css';

interface Props {
  profile: Profile;
  onBack: () => void;
  onChanged: () => Promise<void>;
}

const TILTS = [-6, 4, -3, 6, -4, 3];
const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
const dayText = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

const NEXT_NAMES: Record<string, (have: number) => string> = {
  'coins-100': (h) => `${h} з 100`,
  'ten-row': (h) => `${h} з 10 поспіль`,
  week: (h) => `${h} з 7 днів`,
};

/** «Альбом наліпок» (design/project/Album.dc.html). */
export function StickerAlbum({ profile, onBack, onChanged }: Props) {
  const got = profile.stickers ?? {};
  const [facts, setFacts] = useState<StickerFacts | null>(null);
  // The newest day; on the same day the one glued in last.
  const latest = Object.entries(got).reverse().sort((x, y) => y[1].localeCompare(x[1]))[0]?.[0];
  const [picked, setPicked] = useState<string>(latest ?? STICKERS[0].id);

  // Stickers earned before the album existed are glued in when it opens.
  useEffect(() => {
    let alive = true;
    void syncStickers(profile.id).then(async ({ profile: fresh, added }) => {
      if (added.length) {
        await onChanged();
        if (alive) setPicked(added[added.length - 1]);
      }
      const f = await stickerFacts(fresh);
      if (alive) setFacts(f);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const count = Object.keys(got).length;
  const sticker = getSticker(picked)!;
  const has = !!got[picked];
  const next = facts ? nextSticker(facts, Object.keys(got)) : null;
  const wear = wornIds(profile.worn);

  return (
    <div className="screen sa">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onBack}>
          <BackIcon />
          Карта
        </button>
        <h1 className="topbar-title">Альбом наліпок</h1>
        <span className="sa-grow" />
        <div className="sa-count" aria-label={`Наліпок: ${count} з ${STICKERS.length}`}>
          <b>
            {count} з {STICKERS.length}
          </b>
          <span className="sa-bar">
            <i style={{ width: `${(count / STICKERS.length) * 100}%` }} />
          </span>
        </div>
      </div>

      <div className="sa-body">
        <div className="sa-book">
          {STICKER_ROWS.map((row) => (
            <section key={row.id} className="sa-row">
              <h2>{row.title}</h2>
              <div className="sa-grid">
                {STICKERS.filter((s) => s.row === row.id).map((s, i) => {
                  const on = !!got[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`sa-tile${on ? ' got' : ''}${picked === s.id ? ' picked' : ''}`}
                      aria-label={on ? `${s.name} — є` : `${s.name} — ще немає: ${s.how}`}
                      aria-pressed={picked === s.id}
                      onClick={() => setPicked(s.id)}
                    >
                      <StickerBadge sticker={s} got={on} tilt={on ? TILTS[i] : 0} />
                      <span>{on ? s.name : s.how}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="panel sa-side">
          <StickerBadge sticker={sticker} got={has} size={168} tilt={has ? -6 : 0} />
          <b className="sa-name">{sticker.name}</b>
          <span className="sa-how">{has ? 'Є в альбомі!' : `Як отримати: ${sticker.how}.`}</span>
          {has && <span className="sa-day">{dayText(got[picked])}</span>}
          <div className="sa-pet">
            <Pet kind={profile.pet} size={84} label="" wear={wear} />
            <div className="bubble" role="status">
              {count === 0
                ? 'Тут житимуть наші наліпки. Пограємо?'
                : has
                  ? `Наліпка «${sticker.name}» — наша!`
                  : 'Ще трохи — і вона буде наша!'}
            </div>
          </div>
          {next && (
            <div className="sa-next">
              <span>Скоро нова наліпка</span>
              <b>{getSticker(next.id)!.name}</b>
              <span className="sa-bar big">
                <i style={{ width: `${(next.have / next.need) * 100}%` }} />
              </span>
              <span>{NEXT_NAMES[next.id](next.have)}</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
