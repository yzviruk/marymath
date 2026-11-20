import { CoinIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import type { Profile } from '../data/types';
import './MapScreen.css';

interface Props {
  profile: Profile;
  onSwitchChild: () => void;
  onOpenTask: () => void;
  onOpenPetHome: () => void;
}

const ISLANDS = [
  { name: 'Додавання', theme: 'ліс', sign: '+', color: '#2E9C5B', bg: '#DDF5E5' },
  { name: 'Віднімання', theme: 'пустеля', sign: '−', color: '#C9822B', bg: '#FCEBD2' },
  { name: 'Множення', theme: 'цукерки', sign: '×', color: '#D6457E', bg: '#FDE2EE' },
  { name: 'Ділення', theme: 'кристали', sign: ':', color: '#2F6FED', bg: '#DFEAFE' },
  { name: 'Задачі', theme: 'замок', sign: '♛', color: '#5B3FD6', bg: '#ECE7FF' },
];

/** Placeholder for screen 2 (island map, built in stage 5): profile header and entry points. */
export function MapScreen({ profile, onSwitchChild, onOpenTask, onOpenPetHome }: Props) {
  return (
    <div className="screen map">
      <div className="topbar">
        <button type="button" className="chip-btn map-who" onClick={onSwitchChild} aria-label="Змінити гравця">
          <Pet kind={profile.pet} size={40} label="" />
          {profile.name}
        </button>
        <span className="topbar-title map-title">Карта островів</span>
        <span className="coins">
          <CoinIcon />
          {profile.coins}
        </span>
      </div>

      <ul className="map-islands">
        {ISLANDS.map((isl) => (
          <li key={isl.name} style={{ background: isl.bg }}>
            <span className="map-sign" style={{ color: isl.color }}>
              {isl.sign}
            </span>
            <span className="map-name">{isl.name}</span>
            <span className="map-theme">{isl.theme} · скоро</span>
          </li>
        ))}
      </ul>

      <div className="map-bottom">
        <div className="map-pet">
          <Pet kind={profile.pet} size={110} label={profile.petName} />
          <div className="bubble">Привіт, {profile.name}! Острови ще будуються. Пострибаймо по шкалі?</div>
        </div>
        <div className="map-actions">
          <button type="button" className="btn-primary" onClick={onOpenTask}>
            Пробне завдання
          </button>
          <button type="button" className="map-home" onClick={onOpenPetHome}>
            Будиночок
          </button>
        </div>
      </div>
    </div>
  );
}
