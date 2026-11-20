import { useMemo, useState } from 'react';
import { BackIcon } from '../components/Icons';
import { describeTask } from '../engine/describe';
import { ISLANDS, LEVELS } from '../engine/levels';
import { randomSeed } from '../engine/rng';
import { buildLevel } from '../engine/session';
import type { IslandId, LevelId, Task } from '../engine/types';
import './LevelsPreview.css';

/** Parent tool: see 10 generated tasks of any level, with answers. */
export function LevelsPreview({ onBack }: { onBack: () => void }) {
  const [island, setIsland] = useState<IslandId>('add');
  const [levelId, setLevelId] = useState<LevelId>('+1');
  const [seed, setSeed] = useState(randomSeed);
  const level = LEVELS.find((l) => l.id === levelId)!;
  const tasks = useMemo(() => buildLevel(levelId, { seed }), [levelId, seed]);

  function pickIsland(id: IslandId) {
    setIsland(id);
    setLevelId(LEVELS.find((l) => l.island === id)!.id);
  }

  return (
    <div className="screen lp">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onBack}>
          <BackIcon />
          Для батьків
        </button>
        <span className="topbar-title">Приклади рівнів</span>
        <div className="lp-islands" role="tablist" aria-label="Острови">
          {ISLANDS.map((i) => (
            <button key={i.id} type="button" role="tab" aria-selected={island === i.id} onClick={() => pickIsland(i.id)}>
              {i.name}
            </button>
          ))}
        </div>
      </div>

      <div className="lp-levels" role="tablist" aria-label="Рівні">
        {LEVELS.filter((l) => l.island === island).map((l) => (
          <button key={l.id} type="button" role="tab" aria-selected={levelId === l.id} onClick={() => setLevelId(l.id)}>
            {l.id}
          </button>
        ))}
        <div className="lp-about">
          <b>{level.title}</b>
          {!level.boss && <span>як у плані: {level.sample}</span>}
        </div>
        <button type="button" className="btn-primary lp-more" onClick={() => setSeed(randomSeed())}>
          Ще
        </button>
      </div>

      <ol className="lp-tasks">
        {tasks.map((t) => (
          <li key={t.key} className="panel">
            <TaskView task={t} />
            <div className="lp-tags">
              {level.boss && <span className="lp-tag lp-from">{t.level}</span>}
              {describeTask(t).map((tag) => (
                <span key={tag} className="lp-tag">
                  {tag}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TaskView({ task }: { task: Task }) {
  return (
    <div className={`lp-lines${task.lines.length > 1 ? ' many' : ''}`}>
      {task.lines.map((line, li) => (
        <span key={li} className="lp-line">
          {line.map((p, pi) =>
            p.t === 'blank' ? (
              <b key={pi} className="lp-ans">
                {task.answers[p.i]}
              </b>
            ) : (
              <span key={pi}>{p.v}</span>
            ),
          )}
        </span>
      ))}
    </div>
  );
}
