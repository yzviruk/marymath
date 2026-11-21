import { useEffect, useState } from 'react';
import { BED_COLORS, bedColor, FlowerArt } from '../components/FlowerArt';
import { BackIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import { listAttempts } from '../data/attempts';
import type { Profile } from '../data/types';
import { bloomedCount, flowersOf, garden, GARDEN_SIZE, type Bed, type Flower } from '../engine/garden';
import { KNOWN_DAYS } from '../engine/stats';
import { wornIds } from '../engine/shop';
import { plural } from '../facts/words';
import './Garden.css';

interface Props {
  profile: Profile;
  onBack: () => void;
  onWater: () => void;
}

const DAYS = ['день', 'дні', 'днів'] as const;

const STATE_NAME: Record<Flower['state'], (f: Flower) => string> = {
  bloom: () => 'розквітла',
  bud: (f) => `бутон, ${f.days} з ${KNOWN_DAYS}`,
  thirsty: () => 'хоче пити',
  seed: () => 'зернятко',
};

function petSays(f: Flower): string {
  switch (f.state) {
    case 'bloom':
      return 'Розквітла! Цей факт ти знаєш.';
    case 'thirsty':
      return 'Ця квітка хоче пити. Полий її — і вона знову підросте!';
    case 'seed':
      return 'Тут поки зернятко. Полий — і зʼявиться бутон!';
    case 'bud':
      return f.wateredToday
        ? `Сьогодні вже полито. Полий завтра ще раз — і бутон ${f.days + 1 >= KNOWN_DAYS ? 'розквітне' : 'підросте'}!`
        : `Полий сьогодні — і бутон ${f.days + 1 >= KNOWN_DAYS ? 'розквітне' : 'підросте'}!`;
  }
}

/** The one to show first: a thirsty flower, a bud to water today, a seed, else the first. */
function firstPick(beds: Bed[]): string {
  const all = flowersOf(beds);
  const f =
    all.find((x) => x.state === 'thirsty') ??
    all.find((x) => x.state === 'bud' && !x.wateredToday) ??
    all.find((x) => x.state === 'seed') ??
    all[0];
  return f.key;
}

/** «Садочок фактів» (design/project/Garden.dc.html): every × / : fact is a flower. */
export function Garden({ profile, onBack, onWater }: Props) {
  const [beds, setBeds] = useState<Bed[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void listAttempts(profile.id).then((list) => {
      if (!alive) return;
      const b = garden(list, new Date());
      setBeds(b);
      setPicked(firstPick(b));
    });
    return () => {
      alive = false;
    };
  }, [profile.id]);

  if (!beds) return <div className="screen" />;

  const bloomed = bloomedCount(beds);
  const flower = flowersOf(beds).find((f) => f.key === picked) ?? flowersOf(beds)[0];
  const { a, b } = flower;
  const p = a * b;
  const family = a === b ? [`${p} : ${a} = ${a}`] : [`${b} × ${a} = ${p}`, `${p} : ${a} = ${b}`, `${p} : ${b} = ${a}`];

  return (
    <div className="screen gd">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onBack}>
          <BackIcon />
          Карта
        </button>
        <h1 className="topbar-title">Садочок фактів</h1>
        <span className="gd-grow" />
        <div className="gd-count" aria-label={`Розквітло ${bloomed} з ${GARDEN_SIZE}`}>
          <b>
            Розквітло {bloomed} з {GARDEN_SIZE}
          </b>
          <span className="gd-bar">
            <i style={{ width: `${(bloomed / GARDEN_SIZE) * 100}%` }} />
          </span>
        </div>
      </div>

      <div className="gd-body">
        <div className="gd-garden">
          {beds.map((bed) => (
            <section key={bed.factor} className="gd-bed" aria-label={`Грядка на ${bed.factor}`}>
              <div className="gd-bed-name" style={{ background: bedColor(bed.factor) }}>
                <span>грядка</span>
                <b>на {bed.factor}</b>
              </div>
              <div className="gd-soil">
                {bed.flowers.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`gd-flower ${f.state}${f.key === flower.key ? ' picked' : ''}`}
                    aria-label={`${f.a} × ${f.b} — ${STATE_NAME[f.state](f)}`}
                    aria-pressed={f.key === flower.key}
                    data-state={f.state}
                    onClick={() => setPicked(f.key)}
                  >
                    <FlowerArt state={f.state} color={bedColor(bed.factor)} />
                    <b>
                      {f.a} × {f.b}
                    </b>
                    <span className="gd-dots" aria-hidden="true">
                      {Array.from({ length: KNOWN_DAYS }, (_, i) => (
                        <i key={i} className={i < f.days ? 'on' : ''} />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}

          <div className="gd-legend">
            <span>
              <FlowerArt state="seed" color={BED_COLORS[2]} size={22} />
              зернятко — ще не пробували
            </span>
            <span>
              <FlowerArt state="bud" color={BED_COLORS[2]} size={22} />
              бутон — 1–2 дні з 3
            </span>
            <span>
              <FlowerArt state="thirsty" color={BED_COLORS[2]} size={22} />
              хоче пити — була помилка
            </span>
            <span>
              <FlowerArt state="bloom" color={BED_COLORS[2]} size={22} />
              квітка — знаю (3 дні)
            </span>
          </div>
        </div>

        <aside className="panel gd-side">
          <div className="gd-big" style={{ background: `${bedColor(a)}22` }}>
            <FlowerArt state={flower.state} color={bedColor(a)} size={84} />
          </div>
          <b className="gd-fact">
            {a} × {b} = {p}
          </b>
          <div className="gd-family">
            {family.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="gd-days">
            {Array.from({ length: KNOWN_DAYS }, (_, i) => (
              <i key={i} className={i < flower.days ? 'on' : ''} />
            ))}
            {flower.days} {plural(flower.days, DAYS)} з {KNOWN_DAYS}
          </div>
          <div className="gd-pet">
            <Pet kind={profile.pet} size={84} label="" wear={wornIds(profile.worn)} />
            <div className="bubble" role="status">
              {petSays(flower)}
            </div>
          </div>
          <button type="button" className="btn-success gd-water" onClick={onWater}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 10h11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M15 12l5-4 M4 10a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3 M21 14l-1 2 M18 15l-1 2" />
            </svg>
            Полити квіти
          </button>
          <span className="gd-note">10 прикладів з бутонів і тих, що хочуть пити</span>
        </aside>
      </div>
    </div>
  );
}
