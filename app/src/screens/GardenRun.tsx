import { useEffect, useRef, useState } from 'react';
import type { CheckRecord, Outcome } from '../column/ColumnTask';
import { bedColor, FlowerArt } from '../components/FlowerArt';
import { BackIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import { listAttempts, saveAttempt } from '../data/attempts';
import { syncStickers } from '../data/stickers';
import type { Profile } from '../data/types';
import { FactTask } from '../facts/FactTask';
import { plural } from '../facts/words';
import { flowersOf, garden, otherForm, wateringTasks, type Flower } from '../engine/garden';
import { Rng, randomSeed } from '../engine/rng';
import { wornIds } from '../engine/shop';
import type { Task } from '../engine/types';
import { playSfx } from '../sound/sound';
import './LevelRun.css';
import './Garden.css';
import './GardenRun.css';

interface Props {
  profile: Profile;
  onBack: () => void;
  onProfileChanged: () => void | Promise<void>;
}

interface Slot {
  task: Task;
  /** The other form of the fact after an explanation: not counted among the 10. */
  extra: boolean;
}

const FLOWERS = ['квітку', 'квітки', 'квіток'] as const;

/** «Полити квіти»: 10 × / : facts from the garden, written only (no pictures, no coins). */
export function GardenRun({ profile, onBack, onProfileChanged }: Props) {
  const rng = useRef(new Rng(randomSeed()));
  const before = useRef<Flower[]>([]);
  const saving = useRef<Promise<void>[]>([]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Outcome[]>([]);
  const [after, setAfter] = useState<{ bloomed: Flower[]; grown: Flower[]; watered: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void listAttempts(profile.id).then((list) => {
      if (!alive) return;
      const beds = garden(list, new Date());
      before.current = flowersOf(beds);
      setSlots(wateringTasks(beds, rng.current).map((task) => ({ task, extra: false })));
    });
    return () => {
      alive = false;
    };
  }, [profile.id]);

  if (!slots) return <div className="screen" />;

  if (after) {
    return (
      <div className="screen gr-done">
        <div className="panel gr-card">
          <h1>
            Полито {after.watered} {plural(after.watered, FLOWERS)}!
          </h1>
          <Pet kind={profile.pet} size={150} label={profile.petName} wear={wornIds(profile.worn)} />
          {after.bloomed.length > 0 && (
            <div className="gr-list">
              <span>Розквітли:</span>
              {after.bloomed.map((f) => (
                <b key={f.key}>
                  <FlowerArt state="bloom" color={bedColor(f.a)} size={36} />
                  {f.a} × {f.b}
                </b>
              ))}
            </div>
          )}
          {after.grown.length > 0 && (
            <div className="gr-list">
              <span>Підросли:</span>
              {after.grown.map((f) => (
                <b key={f.key}>
                  <FlowerArt state="bud" color={bedColor(f.a)} size={36} />
                  {f.a} × {f.b}
                </b>
              ))}
            </div>
          )}
          <p className="bubble">
            {after.bloomed.length
              ? 'Ура, нові квіти! Садочок стає дедалі гарнішим.'
              : after.grown.length
                ? 'Бутони підросли. Полий їх завтра — і вони розквітнуть!'
                : 'Квітки напилися. Завтра польємо ще!'}
          </p>
          <button type="button" className="btn-primary" onClick={onBack}>
            До садочка
          </button>
        </div>
      </div>
    );
  }

  const slot = slots[index];
  const counted = slots.slice(0, index).filter((s) => !s.extra).length;
  const total = slots.filter((s) => !s.extra).length;

  function record(r: CheckRecord) {
    const { main } = slot.task;
    saving.current.push(
      saveAttempt({
        profileId: profile.id,
        at: new Date().toISOString(),
        level: slot.task.level,
        taskKey: slot.task.key,
        op: main.op,
        a: main.a,
        b: main.b,
        value: r.value,
        values: r.values,
        correct: r.correct,
        error: r.error,
        tryNo: r.tryNo,
        hintUsed: r.hintUsed,
        ms: r.ms,
      }),
    );
  }

  async function done(outcome: Outcome) {
    let list = slots!;
    if (!slot.extra) setResults((rs) => [...rs, outcome]);
    if (outcome === 'explained') {
      list = [...list.slice(0, index + 1), { task: otherForm(slot.task, rng.current), extra: true }, ...list.slice(index + 1)];
      setSlots(list);
    }
    if (index + 1 < list.length) {
      setIndex(index + 1);
      return;
    }
    await Promise.all(saving.current);
    const now = flowersOf(garden(await listAttempts(profile.id), new Date()));
    const was = new Map(before.current.map((f) => [f.key, f]));
    const bloomed = now.filter((f) => f.state === 'bloom' && was.get(f.key)?.state !== 'bloom');
    const grown = now.filter((f) => f.state === 'bud' && f.days > (was.get(f.key)?.days ?? 0));
    const watered = new Set(list.map((s) => now.find((f) => covers(f, s.task))?.key)).size;
    await syncStickers(profile.id);
    await onProfileChanged();
    if (bloomed.length) playSfx('sticker');
    setAfter({ bloomed, grown, watered });
  }

  return (
    <div className="screen lr">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onBack}>
          <BackIcon />
          Садочок
        </button>
        <span className="topbar-title">Садочок · Поливаємо квіти</span>
        <div className="lr-dots" aria-label={`Приклад ${Math.min(counted + 1, total)} з ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < results.length ? (results[i] === 'explained' ? 'learn' : 'ok') : i === counted ? 'now' : ''} />
          ))}
        </div>
      </div>
      <FactTask
        key={`${index}-${slot.task.key}`}
        task={slot.task}
        pet={profile.pet}
        petName={profile.petName}
        petWear={wornIds(profile.worn)}
        mode="abstract"
        onCheck={record}
        onDone={(outcome) => void done(outcome)}
      />
    </div>
  );
}

/** Whether a task is about this flower: 24 : 6 and 4 × 6 are both the flower 4 × 6. */
function covers(f: Flower, task: Task): boolean {
  const { op, a, b, result } = task.main;
  const [x, y] = op === '×' ? [a, b] : [b, result];
  return Math.min(x, y) === f.a && Math.max(x, y) === f.b;
}
