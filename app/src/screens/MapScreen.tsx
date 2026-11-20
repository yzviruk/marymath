import { CoinIcon, StarIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import type { Profile } from '../data/types';
import { LEVELS } from '../engine/levels';
import type { IslandId } from '../engine/types';
import './MapScreen.css';

interface Props {
  profile: Profile;
  onSwitchChild: () => void;
  onOpenLevel: (levelId: string) => void;
  onOpenPetHome: () => void;
}

const ISLANDS: { id: IslandId | 'tasks'; name: string; theme: string; sign: string; color: string; bg: string; ready: boolean }[] = [
  { id: 'add', name: 'Додавання', theme: 'ліс', sign: '+', color: '#2E9C5B', bg: '#DDF5E5', ready: true },
  { id: 'sub', name: 'Віднімання', theme: 'пустеля', sign: '−', color: '#C9822B', bg: '#FCEBD2', ready: true },
  { id: 'mul', name: 'Множення', theme: 'цукерки', sign: '×', color: '#D6457E', bg: '#FDE2EE', ready: false },
  { id: 'div', name: 'Ділення', theme: 'кристали', sign: ':', color: '#2F6FED', bg: '#DFEAFE', ready: false },
  { id: 'tasks', name: 'Задачі', theme: 'замок', sign: '♛', color: '#5B3FD6', bg: '#ECE7FF', ready: false },
];

/**
 * Temporary map (the island map with paths comes in stage 5): every column level is open,
 * × and : arrive in stage 4.
 */
export function MapScreen({ profile, onSwitchChild, onOpenLevel, onOpenPetHome }: Props) {
  const stars = profile.levelStars ?? {};
  return (
    <div className="screen map">
      <div className="topbar">
        <button type="button" className="chip-btn map-who" onClick={onSwitchChild} aria-label="Змінити гравця">
          <Pet kind={profile.pet} size={40} label="" />
          {profile.name}
        </button>
        <span className="topbar-title map-title">Карта островів</span>
        <span className="coins" aria-label={`Зірки: ${profile.stars}`}>
          <StarIcon size={24} />
          {profile.stars}
        </span>
        <span className="coins">
          <CoinIcon />
          {profile.coins}
        </span>
      </div>

      <ul className="map-islands">
        {ISLANDS.map((isl) => (
          <li key={isl.id} style={{ background: isl.bg }} className={isl.ready ? 'ready' : ''}>
            <div className="map-head">
              <span className="map-sign" style={{ color: isl.color }}>
                {isl.sign}
              </span>
              <span className="map-name">{isl.name}</span>
            </div>
            {isl.ready ? (
              <div className="map-levels">
                {LEVELS.filter((l) => l.island === isl.id).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`map-level${l.boss ? ' boss' : ''}`}
                    onClick={() => onOpenLevel(l.id)}
                    aria-label={`Рівень ${l.id}${stars[l.id] ? `, зірок: ${stars[l.id]}` : ''}`}
                    style={{ color: isl.color }}
                  >
                    {l.boss ? '♛' : l.id}
                    <span className="map-level-stars" aria-hidden="true">
                      {'★'.repeat(stars[l.id] ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="map-theme">{isl.theme} · скоро</span>
            )}
          </li>
        ))}
      </ul>

      <div className="map-bottom">
        <div className="map-pet">
          <Pet kind={profile.pet} size={110} label={profile.petName} />
          <div className="bubble">Привіт, {profile.name}! Обери рівень на острові Додавання чи Віднімання.</div>
        </div>
        <div className="map-actions">
          <button type="button" className="map-home" onClick={onOpenPetHome}>
            Будиночок
          </button>
        </div>
      </div>
    </div>
  );
}
