import { CoinIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import { ItemIcon } from '../components/ShopArt';
import type { PetKind } from '../data/types';
import { getItem } from '../engine/shop';
import './LevelDone.css';

interface Props {
  pet: PetKind;
  petWear?: string[];
  /** A rare shop thing the boss just gave (first pass only). */
  rareItem?: string | null;
  title: string;
  right: number;
  stars: number;
  coins: number;
  bonus: number;
  /** The level had 3 stars already: no coins this time. */
  levelFull?: boolean;
  nextLabel: string | null;
  onAgain: () => void;
  onNext: () => void;
  onMap: () => void;
}

const STAR = 'M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z';

/** Simple level result (screen 6); stickers and the pet's dance come in stage 5. */
export function LevelDone({ pet, petWear, rareItem, title, right, stars, coins, bonus, levelFull, nextLabel, onAgain, onNext, onMap }: Props) {
  const passed = stars > 0;
  return (
    <div className="screen ld">
      <div className="panel ld-card">
        <div className="ld-pet">
          <div className="ld-pet-circle">
            <Pet kind={pet} size={220} label="" wear={petWear} />
          </div>
          <div className="bubble">{passed ? 'Ура! Я так тобою пишаюся!' : 'Ти молодець, що старалась! Спробуймо ще раз?'}</div>
        </div>
        <div className="ld-info">
          <span className="ld-level">{title}</span>
          <h1>{passed ? 'Рівень пройдено!' : 'Майже вийшло!'}</h1>
          <div className="ld-stars" role="img" aria-label={`${stars} зірки з 3`}>
            {[0, 1, 2].map((i) => (
              <svg key={i} width="76" height="76" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d={STAR}
                  fill={i < stars ? '#FFB400' : '#EEF2F8'}
                  stroke={i < stars ? '#E59A00' : '#B7C5E3'}
                  strokeWidth="0.9"
                  strokeLinejoin="round"
                />
              </svg>
            ))}
            <div className="ld-score">
              <b>{right} з 10</b>
              <span>{passed ? (stars < 3 ? `наступна зірка — за ${stars === 1 ? 9 : 10} з 10` : 'усі зірки!') : 'для зірки потрібно 7 з 10'}</span>
            </div>
          </div>
          {rareItem && (
            <div className="ld-rare" role="status">
              <ItemIcon id={rareItem} size={56} />
              <span>
                <b>Нова рідкісна річ!</b> {getItem(rareItem)?.name} — шукай у будиночку.
              </span>
            </div>
          )}
          <div className="ld-coins">
            <CoinIcon size={32} />
            {levelFull ? (
              <span>Тут уже 3 зірки — нові монетки чекають далі!</span>
            ) : (
              <>
                <b>+{coins}</b>
                {bonus > 0 && <span>разом з нагородою за {stars === 1 ? 'зірку' : 'зірки'} {bonus}</span>}
              </>
            )}
          </div>
          <div className="ld-actions">
            {nextLabel && passed ? (
              <button type="button" className="btn-primary" onClick={onNext}>
                {nextLabel}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={onAgain}>
                Ще раз
              </button>
            )}
            <div className="ld-row">
              {nextLabel && passed && (
                <button type="button" className="ld-secondary" onClick={onAgain}>
                  Ще раз
                </button>
              )}
              <button type="button" className="ld-secondary" onClick={onMap}>
                Карта
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
