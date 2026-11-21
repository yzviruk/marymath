import { useState } from 'react';
import { CoinIcon, StarIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import type { Profile } from '../data/types';
import { ISLANDS, type LevelDef } from '../engine/levels';
import { blockedBy, continueLevel, currentLevel, isPassed, isUnlocked, levelsOf, passedCount, tasksIslandOpen } from '../engine/progress';
import type { IslandId } from '../engine/types';
import { wornIds } from '../engine/shop';
import { ISLAND_ART, SEA_ART, TASKS_ART } from './mapArt';
import './MapScreen.css';

interface Props {
  profile: Profile;
  onSwitchChild: () => void;
  onOpenLevel: (levelId: string) => void;
  onOpenPetHome: () => void;
  onOpenAlbum: () => void;
}

type ActionIsland = 'add' | 'sub' | 'mul' | 'div';

/** Where each island sits on the sea, its sign post and the path points of its levels (from the mockup). */
const LAYOUT: Record<ActionIsland, { left: number; top: number; sign: [number, number, number]; points: [number, number][] }> = {
  add: {
    left: 16,
    top: 8,
    sign: [6, 0, -3],
    points: [[100, 104], [162, 92], [224, 100], [286, 92], [296, 180], [234, 188], [172, 184], [110, 188]],
  },
  sub: {
    left: 456,
    top: 0,
    sign: [206, 0, 2],
    points: [[96, 106], [156, 94], [216, 102], [276, 96], [262, 184], [196, 188]],
  },
  mul: {
    left: 24,
    top: 284,
    sign: [10, 4, -2],
    points: [[104, 100], [164, 90], [226, 96], [288, 92], [300, 178], [238, 186], [176, 182]],
  },
  div: {
    left: 460,
    top: 278,
    sign: [216, 6, 3],
    points: [[104, 104], [164, 92], [226, 100], [288, 96], [262, 182], [196, 186]],
  },
};

const PET = 46;

/** ?1, ?2 beside the castle and the boss on its top (castle area 300×104). */
const TASKS_POINTS: [number, number][] = [
  [40, 46],
  [260, 46],
  [150, 30],
];

/**
 * A spot for the pet next to the current level: right of it as in the mockup, else left, below
 * or above — the one that covers the least of other levels and the sign post.
 */
function petSpot(points: [number, number][], at: number, sign: [number, number, number]): [number, number] {
  const [x, y] = points[at];
  const busy = [
    ...points.filter((_, i) => i !== at).map(([px, py]) => [px - 28, py - 28, px + 28, py + 44]),
    [sign[0], sign[1], sign[0] + 240, sign[1] + 62],
  ];
  const covered = ([l, t]: [number, number]) =>
    busy.reduce((sum, [a, b, c, d]) => sum + Math.max(0, Math.min(l + PET, c) - Math.max(l, a)) * Math.max(0, Math.min(t + PET, d) - Math.max(t, b)), 0);
  const spots: [number, number][] = [
    [x + 30, y - 40],
    [x - 30 - PET, y - 40],
    [x + 30, y - 10],
    [x - 30 - PET, y - 10],
    [x - PET / 2, y + 32],
    [x - PET / 2, y - 32 - PET],
  ].filter(([l, t]) => l >= 0 && t >= 0 && l + PET <= 400 && t + PET <= 260) as [number, number][];
  return spots.reduce((best, s) => (covered(s) < covered(best) ? s : best));
}

const label = (l: LevelDef) => (l.boss ? '♛' : l.id);
const levelName = (l: LevelDef) => (l.boss ? 'бос острова' : `рівень ${l.id}`);
const islandName = (id: IslandId) => ISLANDS.find((i) => i.id === id)!.name;

/**
 * The island map: four islands with paths of levels, the Задачі castle, «Продовжити».
 * Opening rules live in engine/progress.ts.
 */
export function MapScreen({ profile, onSwitchChild, onOpenLevel, onOpenPetHome, onOpenAlbum }: Props) {
  const stars = profile.levelStars ?? {};
  const opened = profile.openIslands ?? [];
  const next = continueLevel(stars, profile.lastLevel, opened);
  const [say, setSay] = useState<string | null>(null);
  const tasksOpen = tasksIslandOpen(stars) || (profile.openIslands ?? []).includes('tasks');
  const wear = wornIds(profile.worn);

  function tapLocked(l: LevelDef) {
    const need = blockedBy(stars, l.id, opened);
    setSay(
      need
        ? `Цей рівень відкриється, коли пройдеш ${levelName(need)} — 7 правильних з 10.`
        : l.island === 'tasks'
          ? 'Острів Задачі відкриється, коли переможеш усіх чотирьох босів.'
          : null,
    );
  }

  /** A level on a path: passed with stars, the current one, open, or locked. */
  function node(l: LevelDef, x: number, y: number, current: LevelDef | null) {
    const s = stars[l.id] ?? 0;
    const state = l === current ? 'current' : isPassed(stars, l.id) ? 'done' : isUnlocked(stars, l.id, opened) ? 'open' : 'locked';
    const locked = state === 'locked';
    return (
      <div key={l.id} className={`map-node ${state}`} style={{ left: x - 32, top: y - (state === 'current' ? 29 : 26) }}>
        <button
          type="button"
          className="map-level"
          aria-label={`Рівень ${l.id}${s ? `, зірок: ${s}` : ''}${locked ? ', закрито' : ''}`}
          onClick={() => (locked ? tapLocked(l) : onOpenLevel(l.id))}
        >
          {locked && (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="3" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          )}
          {label(l)}
        </button>
        {state === 'done' && (
          <span className="map-stars" aria-hidden="true">
            {'★'.repeat(s) + '☆'.repeat(3 - s)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="screen map">
      <h1 className="sr-only">Карта островів</h1>
      <div className="map-top">
        <button type="button" className="map-who" onClick={onSwitchChild} aria-label="Змінити гравця">
          <Pet kind={profile.pet} size={54} label="" wear={wear} />
        </button>
        <span className="map-name">{profile.name}</span>
        <span className="map-grow" />
        <span className="map-chip" aria-label={`Зірки: ${profile.stars}`}>
          <StarIcon size={26} />
          <b>{profile.stars}</b>
          <span>зірок</span>
        </span>
        <span className="map-chip coins">
          <CoinIcon size={26} />
          <b>{profile.coins}</b>
          <span>монеток</span>
        </span>
        <button type="button" className="map-home map-album" onClick={onOpenAlbum}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a6 6 0 1 0 0 12a6 6 0 1 0 0-12" />
            <path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7" />
          </svg>
          Наліпки
        </button>
        <button type="button" className="map-home" onClick={onOpenPetHome}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11l9-7 9 7" />
            <path d="M5 10v10h14V10" />
            <path d="M10 20v-5h4v5" />
          </svg>
          Будиночок
        </button>
      </div>

      <div className="map-body">
        <div className="map-sea">
          <svg width="880" height="644" viewBox="0 0 880 644" aria-hidden="true" className="map-layer" dangerouslySetInnerHTML={{ __html: SEA_ART }} />

          {(Object.keys(LAYOUT) as ActionIsland[]).map((id) => {
            const lay = LAYOUT[id];
            const art = ISLAND_ART[id];
            const levels = levelsOf(id);
            const current = currentLevel(stars, id, opened);
            const trail = 'M ' + lay.points.map((p) => p.join(' ')).join(' L ');
            const petHere = next && next.island === id ? petSpot(lay.points, levels.indexOf(next), lay.sign) : null;
            return (
              <div key={id} className="map-island" style={{ left: lay.left, top: lay.top }} data-island={id}>
                <svg width="400" height="260" viewBox="0 0 400 260" aria-hidden="true" className="map-layer">
                  <g dangerouslySetInnerHTML={{ __html: art.under }} />
                  <path d={trail} fill="none" stroke={art.trail[0]} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={trail} fill="none" stroke={art.trail[1]} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={trail} fill="none" stroke={art.trail[2]} strokeWidth="3" strokeDasharray="6 10" strokeLinecap="round" strokeLinejoin="round" />
                  <g dangerouslySetInnerHTML={{ __html: art.over }} />
                </svg>

                {levels.map((l, i) => node(l, lay.points[i][0], lay.points[i][1], current))}

                {petHere && (
                  <div className="map-pet-here" style={{ left: petHere[0], top: petHere[1] }}>
                    <Pet kind={profile.pet} size={PET} label="" wear={wear} />
                  </div>
                )}

                <div className="map-sign" style={{ left: lay.sign[0], top: lay.sign[1] }}>
                  <div style={{ transform: `rotate(${lay.sign[2]}deg)` }}>
                    {islandName(id)}
                    <span>
                      {passedCount(stars, id)} / {levels.length}
                    </span>
                  </div>
                  <i />
                </div>
              </div>
            );
          })}

          <div className="map-tasks" data-island="tasks">
            <svg width="300" height="104" viewBox="0 0 300 104" aria-hidden="true" className="map-layer" dangerouslySetInnerHTML={{ __html: TASKS_ART }} />
            {tasksOpen ? (
              levelsOf('tasks').map((l, i) => node(l, TASKS_POINTS[i][0], TASKS_POINTS[i][1], currentLevel(stars, 'tasks', opened)))
            ) : (
              <div className="map-tasks-text">
                <b>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="3" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  Острів Задачі
                </b>
                <span>після всіх чотирьох босів</span>
              </div>
            )}
          </div>
        </div>

        <div className="map-side">
          {next ? (
            <div className="map-continue">
              <span className="map-continue-head">Продовжити</span>
              <b>
                {islandName(next.island)} · {next.boss ? 'Бос острова' : `Рівень ${next.id}`}
              </b>
              <span>{next.title}</span>
              <button type="button" onClick={() => onOpenLevel(next.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 4l13 8-13 8z" />
                </svg>
                Грати
              </button>
            </div>
          ) : (
            <div className="map-continue">
              <span className="map-continue-head">Усі острови пройдено!</span>
              <b>Можна перепройти будь-який рівень і зібрати всі зірки.</b>
            </div>
          )}
          <div className="map-buddy">
            <div className="bubble" role="status">
              {say ?? `Привіт, ${profile.name}! ${next ? 'Тисни «Грати» або обери рівень на карті.' : 'Ти молодець!'}`}
            </div>
            <Pet kind={profile.pet} size={130} label={profile.petName} wear={wear} />
          </div>
        </div>
      </div>
    </div>
  );
}
