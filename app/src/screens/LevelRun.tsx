import { useEffect, useMemo, useState } from 'react';
import { ColumnTask, type CheckRecord, type DiskMode, type Outcome } from '../column/ColumnTask';
import { BackIcon, CoinIcon } from '../components/Icons';
import { columnReviewTasks, saveAttempt } from '../data/attempts';
import { addCoins, recordLevelStars } from '../data/profiles';
import type { Profile } from '../data/types';
import { getLevel, ISLANDS, LEVELS } from '../engine/levels';
import { randomSeed } from '../engine/rng';
import { buildLevel, similarTask, TASKS_PER_LEVEL } from '../engine/session';
import type { Task } from '../engine/types';
import { LevelDone } from './LevelDone';
import './LevelRun.css';

/** Disks are dragged on the first 3 tasks that carry or borrow, shown afterwards, hidden on a boss. */
const CONCRETE_TASKS = 3;
export const LEVEL_BONUS = 5;

/** Stars for a level: 7, 9 or 10 right out of 10 (right = solved before the explanation). */
export function starsFor(right: number): number {
  return right >= 10 ? 3 : right >= 9 ? 2 : right >= 7 ? 1 : 0;
}

interface Props {
  profile: Profile;
  levelId: string;
  onExit: () => void;
  onNextLevel: (levelId: string) => void;
  onProfileChanged: () => void | Promise<void>;
}

interface Slot {
  task: Task;
  /** The «similar task» after an explanation: extra, not counted among the 10. */
  extra: boolean;
}

export function LevelRun({ profile, levelId, onExit, onNextLevel, onProfileChanged }: Props) {
  const level = getLevel(levelId);
  const [run, setRun] = useState(0);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Outcome[]>([]);
  const [earned, setEarned] = useState(0);
  const [finished, setFinished] = useState<{ stars: number; right: number; bonus: number } | null>(null);

  // Build the level (with yesterday's mistakes of this island mixed in).
  useEffect(() => {
    let alive = true;
    const islandLevels = LEVELS.filter((l) => l.island === level.island && !l.boss).map((l) => l.id);
    void columnReviewTasks(profile.id, islandLevels).then((review) => {
      if (!alive) return;
      const tasks = buildLevel(levelId, { seed: randomSeed(), review: level.boss ? [] : review });
      setSlots(tasks.map((task) => ({ task, extra: false })));
      setIndex(0);
      setResults([]);
      setEarned(0);
      setFinished(null);
    });
    return () => {
      alive = false;
    };
  }, [levelId, run, profile.id, level.boss, level.island]);

  const diskModes = useMemo(() => {
    if (!slots) return [];
    let concrete = 0;
    return slots.map(({ task }): DiskMode => {
      if (level.boss) return 'none';
      if (!task.column?.regroup.length) return 'show';
      concrete++;
      return concrete <= CONCRETE_TASKS ? 'drag' : 'show';
    });
  }, [slots, level.boss]);

  if (!slots) return <div className="screen" />;

  const island = ISLANDS.find((i) => i.id === level.island)!;
  const title = level.boss ? `${island.name} · Бос острова` : `${island.name} · Рівень ${level.id}`;

  if (finished) {
    const next = nextLevelId(levelId);
    return (
      <LevelDone
        pet={profile.pet}
        title={title}
        right={finished.right}
        stars={finished.stars}
        coins={earned + finished.bonus}
        bonus={finished.bonus}
        nextLabel={next ? (getLevel(next).boss ? 'Далі: бос острова' : `Далі: рівень ${next}`) : null}
        onAgain={() => setRun((r) => r + 1)}
        onNext={() => next && onNextLevel(next)}
        onMap={onExit}
      />
    );
  }

  const slot = slots[index];
  const counted = slots.slice(0, index).filter((s) => !s.extra).length;

  function record(r: CheckRecord) {
    const { main } = slot.task;
    void saveAttempt({
      profileId: profile.id,
      at: new Date().toISOString(),
      level: slot.task.level,
      taskKey: slot.task.key,
      op: main.op,
      a: main.a,
      b: main.b,
      value: r.value,
      correct: r.correct,
      error: r.error,
      tryNo: r.tryNo,
      hintUsed: r.hintUsed,
      ms: r.ms,
    });
  }

  async function done(outcome: Outcome, coins: number) {
    setEarned((e) => e + coins);
    void addCoins(profile.id, coins);
    let list = slots!;
    const nextResults = slot.extra ? results : [...results, outcome];
    if (outcome === 'explained') {
      // Step 3: a similar task right away.
      list = [...list.slice(0, index + 1), { task: similarTask(slot.task, randomSeed()), extra: true }, ...list.slice(index + 1)];
      setSlots(list);
    }
    setResults(nextResults);
    if (index + 1 < list.length) {
      setIndex(index + 1);
      return;
    }
    const right = nextResults.filter((o) => o !== 'explained').length;
    const stars = starsFor(right);
    const bonus = stars > 0 ? LEVEL_BONUS : 0;
    if (bonus) await addCoins(profile.id, bonus);
    await recordLevelStars(profile.id, levelId, stars);
    await onProfileChanged();
    setFinished({ stars, right, bonus });
  }

  return (
    <div className="screen lr">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onExit}>
          <BackIcon />
          Карта
        </button>
        <span className="topbar-title">{title}</span>
        <div className="lr-dots" aria-label={`Приклад ${Math.min(counted + 1, TASKS_PER_LEVEL)} з ${TASKS_PER_LEVEL}`}>
          {Array.from({ length: TASKS_PER_LEVEL }, (_, i) => (
            <span
              key={i}
              className={
                i < results.length ? (results[i] === 'explained' ? 'learn' : 'ok') : i === counted ? 'now' : ''
              }
            />
          ))}
        </div>
        <span className="coins">
          <CoinIcon />
          {profile.coins + earned}
        </span>
      </div>
      <ColumnTask
        key={`${run}-${index}-${slot.task.key}`}
        task={slot.task}
        pet={profile.pet}
        petName={profile.petName}
        diskMode={diskModes[index] ?? (level.boss ? 'none' : 'show')}
        onCheck={record}
        onDone={done}
      />
    </div>
  );
}

/** The next level on the same island, the boss after the last one. */
export function nextLevelId(id: string): string | null {
  const level = getLevel(id);
  const same = LEVELS.filter((l) => l.island === level.island);
  const i = same.findIndex((l) => l.id === id);
  return same[i + 1]?.id ?? null;
}
