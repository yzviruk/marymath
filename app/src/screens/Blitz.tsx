import { useCallback, useEffect, useRef, useState } from "react";
import { BackIcon, CoinIcon } from "../components/Icons";
import { Keypad } from "../components/Keypad";
import { Pet } from "../components/Pet";
import { saveAttempt } from "../data/attempts";
import { recordBlitz } from "../data/daily";
import { syncStickers } from "../data/stickers";
import type { Profile } from "../data/types";
import {
  BLITZ_HURRY,
  BLITZ_SECONDS,
  blitzHasDivision,
  blitzTask,
} from "../engine/blitz";
import { classifyError } from "../engine/check";
import { Rng, randomSeed } from "../engine/rng";
import { wornIds } from "../engine/shop";
import { factPair, pairKey } from "../engine/stats";
import type { Task } from "../engine/types";
import { plural } from "../facts/words";
import { playSfx } from "../sound/sound";
import "./Blitz.css";

interface Props {
  profile: Profile;
  onExit: () => void;
  onProfileChanged: () => void | Promise<void>;
}

interface Answered {
  text: string;
  /** What she wrote when it was wrong. */
  wrong?: number;
}

interface Result {
  right: number;
  before: number;
  record: boolean;
  coins: number;
  facts: number;
}

const RIGHT = ["правильна", "правильні", "правильних"] as const;
const FACTS = ["факт", "факти", "фактів"] as const;
const CHEERS = ["Так!", "Ого, як швидко!", "Молодець!", "Супер!", "Далі!"];
const RING = 2 * Math.PI * 52;
const MAX_DIGITS = 2;

const exampleText = (t: Task) =>
  `${t.main.a} ${t.main.op} ${t.main.b} = ${t.main.result}`;

/**
 * «Бліц» (design/project/Blitz.dc.html): one minute of × and : facts, only her own record counts.
 * A mistake shows the right answer and the round goes on; first tries feed the garden.
 */
export function Blitz({ profile, onExit, onProfileChanged }: Props) {
  const rng = useRef(new Rng(randomSeed()));
  const division = blitzHasDivision(
    profile.levelStars ?? {},
    profile.openIslands ?? [],
  );
  const best = profile.blitzBest ?? 0;
  const [phase, setPhase] = useState<"ready" | "play" | "done">("ready");
  const [task, setTask] = useState<Task>(() =>
    blitzTask(rng.current, division),
  );
  const [answer, setAnswer] = useState("");
  const [right, setRight] = useState(0);
  const [recent, setRecent] = useState<Answered[]>([]);
  const [say, setSay] = useState("Поїхали! Скільки встигнеш за хвилину?");
  const [left, setLeft] = useState(BLITZ_SECONDS);
  const [result, setResult] = useState<Result | null>(null);
  const startedAt = useRef(0);
  const taskAt = useRef(0);
  const factsRight = useRef(new Set<string>());
  const saving = useRef<Promise<void>[]>([]);

  function start() {
    rng.current = new Rng(randomSeed());
    setTask(blitzTask(rng.current, division));
    setAnswer("");
    setRight(0);
    setRecent([]);
    setSay("Поїхали! Скільки встигнеш за хвилину?");
    setLeft(BLITZ_SECONDS);
    setResult(null);
    factsRight.current = new Set();
    saving.current = [];
    startedAt.current = Date.now();
    taskAt.current = Date.now();
    setPhase("play");
  }

  const finish = useCallback(
    async (count: number) => {
      setPhase("done");
      await Promise.all(saving.current);
      const r = await recordBlitz(profile.id, count);
      await syncStickers(profile.id);
      await onProfileChanged();
      if (r.record) playSfx("boss");
      setResult({
        right: count,
        before: r.before,
        record: r.record,
        coins: r.coins,
        facts: factsRight.current.size,
      });
    },
    [profile.id, onProfileChanged],
  );

  // The clock: a whole second at a time, the round ends at 0.
  const rightRef = useRef(0);
  rightRef.current = right;
  useEffect(() => {
    if (phase !== "play") return;
    const id = window.setInterval(() => {
      const s = Math.max(
        0,
        BLITZ_SECONDS - Math.floor((Date.now() - startedAt.current) / 1000),
      );
      setLeft(s);
      if (s === 0) {
        window.clearInterval(id);
        void finish(rightRef.current);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, finish]);

  function submit() {
    if (phase !== "play" || !answer) return;
    const value = Number(answer);
    const ok = value === task.answers[0];
    const now = Date.now();
    saving.current.push(
      saveAttempt({
        profileId: profile.id,
        at: new Date(now).toISOString(),
        level: task.level,
        taskKey: task.key,
        op: task.main.op,
        a: task.main.a,
        b: task.main.b,
        value,
        correct: ok,
        error: ok ? null : classifyError(task, [value]),
        tryNo: 1,
        hintUsed: false,
        ms: now - taskAt.current,
      }),
    );
    if (ok) {
      playSfx("correct");
      setRight((n) => n + 1);
      const pair = factPair(task.main);
      if (pair) factsRight.current.add(pairKey(...pair));
      setSay(CHEERS[rng.current.int(0, CHEERS.length - 1)]);
    } else {
      playSfx("again");
      setSay(
        task.main.op === ":"
          ? `${exampleText(task)}. Ділення — спершу скільки всього.`
          : `${exampleText(task)}. Нічого, далі вийде!`,
      );
    }
    setRecent((r) =>
      [{ text: exampleText(task), wrong: ok ? undefined : value }, ...r].slice(
        0,
        5,
      ),
    );
    setTask(blitzTask(rng.current, division, task.key));
    setAnswer("");
    taskAt.current = now;
  }

  // Enter checks too (a desktop keyboard, tests).
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goal = Math.max(best + 1, right);
  const hurry = left <= BLITZ_HURRY;
  const toRecord =
    best === 0
      ? "Перший бліц — це й буде твій рекорд!"
      : right > best
        ? "Новий рекорд!"
        : `ще ${best + 1 - right} — і буде новий рекорд`;

  return (
    <div className="screen bz">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onExit}>
          <BackIcon />
          Карта
        </button>
        <span className="topbar-title bz-title">
          Бліц · ×{division ? " і :" : ""}
        </span>
        <span className="bz-sub">хвилина — скільки встигнеш</span>
        <span className="bz-grow" />
        <span className="bz-record" aria-label={`Рекорд ${best}`}>
          <TrophyIcon />
          Рекорд {best}
        </span>
      </div>

      <div className="bz-body">
        <div className="panel bz-main">
          <div className="bz-head">
            <div
              className={`bz-timer${hurry ? " hurry" : ""}`}
              role="timer"
              aria-label={`Залишилось ${left} секунд`}
            >
              <svg viewBox="0 0 124 124" aria-hidden="true">
                <circle cx="62" cy="62" r="52" className="bz-track" />
                {left > 0 && (
                  <circle
                    cx="62"
                    cy="62"
                    r="52"
                    className="bz-arc"
                    strokeDasharray={`${(RING * left) / BLITZ_SECONDS} ${RING}`}
                    transform="rotate(-90 62 62)"
                  />
                )}
              </svg>
              <b>{left}</b>
              <span>секунд</span>
            </div>
            <div className="bz-score">
              <div>
                <b data-testid="blitz-right">{right}</b>
                <span>{plural(right, RIGHT)}</span>
              </div>
              <div className="bz-goal">
                <i
                  style={{ width: `${(Math.min(right, goal) / goal) * 100}%` }}
                />
                {best > 0 && <em style={{ left: `${(best / goal) * 100}%` }} />}
              </div>
              <span className="bz-goal-text">{toRecord}</span>
            </div>
          </div>

          <div className="bz-eq" data-answer={task.answers[0]}>
            <span>
              {task.main.a} {task.main.op} {task.main.b} =
            </span>
            <span className="bz-box" aria-label="Відповідь">
              {answer}
              <i />
            </span>
          </div>

          <div className="bz-recent">
            <span>Щойно:</span>
            {recent.map((r, i) => (
              <span
                key={recent.length - i}
                className={r.wrong === undefined ? "ok" : "miss"}
              >
                {r.text}
                {r.wrong !== undefined && <small>не {r.wrong}</small>}
              </span>
            ))}
          </div>

          <div className="bz-pet">
            <Pet
              kind={profile.pet}
              size={76}
              label=""
              wear={wornIds(profile.worn)}
            />
            <div className="bubble" role="status">
              {say}
            </div>
          </div>
        </div>

        <div className="panel bz-pad">
          <Keypad
            onDigit={(d) =>
              setAnswer((a) =>
                a.length >= MAX_DIGITS ? a : a === "0" ? String(d) : a + d,
              )
            }
            onErase={() => setAnswer((a) => a.slice(0, -1))}
            disabled={phase !== "play"}
          />
          <button
            type="button"
            className="btn-success bz-done"
            onClick={submit}
            disabled={phase !== "play" || !answer}
          >
            Готово
          </button>
        </div>
      </div>

      {phase === "ready" && (
        <div className="bz-cover">
          <div className="panel bz-card">
            <h1>Бліц</h1>
            <Pet
              kind={profile.pet}
              size={120}
              label=""
              wear={wornIds(profile.worn)}
            />
            <p>
              Хвилина — скільки встигнеш прикладів на ×{division ? " і :" : ""}.
              Помилка не страшна: я покажу відповідь, і йдемо далі.
            </p>
            {best > 0 && <span className="bz-record">Твій рекорд: {best}</span>}
            <div className="bz-actions">
              <button type="button" className="btn-primary" onClick={start}>
                Почати
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="bz-cover">
          <div className="panel bz-card" role="dialog" aria-label="Час вийшов">
            <span className="bz-over">Час вийшов!</span>
            {result ? (
              <>
                <div className="bz-total">
                  <Pet
                    kind={profile.pet}
                    size={120}
                    label=""
                    wear={wornIds(profile.worn)}
                  />
                  <div>
                    <b data-testid="blitz-total">{result.right}</b>
                    <span>{plural(result.right, RIGHT)} за хвилину</span>
                  </div>
                </div>
                <span className="bz-record big">
                  <TrophyIcon />
                  {result.record
                    ? result.before
                      ? `Новий рекорд! Було ${result.before}`
                      : "Твій перший рекорд!"
                    : `Рекорд ${result.before} — ще трохи!`}
                </span>
                <div className="bz-chips">
                  {result.coins > 0 && (
                    <span>
                      <CoinIcon size={22} />+{result.coins} за рекорд
                    </span>
                  )}
                  {result.facts > 0 && (
                    <span className="garden">
                      садочок полито: {result.facts}{" "}
                      {plural(result.facts, FACTS)}
                    </span>
                  )}
                </div>
                <div className="bz-actions">
                  <button type="button" className="btn-primary" onClick={start}>
                    Ще раз
                  </button>
                  <button type="button" className="bz-map" onClick={onExit}>
                    Карта
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="bz-trophy">
      <path d="M7 4h10v5a5 5 0 0 1-10 0z M7 6H4v1a3 3 0 0 0 3 3 M17 6h3v1a3 3 0 0 1-3 3 M12 14v3 M8 21h8 M9 21l1-4h4l1 4" />
    </svg>
  );
}
