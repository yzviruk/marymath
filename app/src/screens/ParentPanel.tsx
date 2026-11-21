import { useEffect, useRef, useState } from 'react';
import { Pet } from '../components/Pet';
import { listAttempts } from '../data/attempts';
import {
  backupFileName,
  exportBackup,
  parseBackup,
  removeProfile,
  resetProgress,
  restoreBackup,
  setIslandOpen,
  type Backup,
  type Settings,
} from '../data/parent';
import { MAX_NAME_LENGTH, ProfileError, updateProfile } from '../data/profiles';
import { PET_KINDS, PET_LABELS, type Attempt, type Profile } from '../data/types';
import { ERROR_LABELS } from '../engine/describe';
import { ISLANDS } from '../engine/levels';
import { attemptText, factTable, journal, minutesByDay, topErrors, topicAccuracy, type FactStatus } from '../engine/stats';
import type { ErrorKind } from '../engine/types';
import { useSettings } from '../SettingsContext';
import './ParentPanel.css';

interface Props {
  profiles: Profile[];
  onExit: () => void;
  onAddProfile: () => void;
  onPreview: () => void;
  onChanged: () => Promise<void>;
  onSettings: (patch: Partial<Settings>) => Promise<void>;
}

type Sheet = null | 'profile' | 'journal' | { restore: Backup };

const FACT_LEGEND: [FactStatus, string][] = [
  ['known', 'знає'],
  ['learning', 'вчить'],
  ['wrong', 'помиляється'],
  ['new', 'ще не було'],
];

/** «Панель батьків» (design/project/Parent.dc.html): statistics per child, settings, backup. */
export function ParentPanel({ profiles, onExit, onAddProfile, onPreview, onChanged, onSettings }: Props) {
  const settings = useSettings();
  const [childId, setChildId] = useState<string | null>(profiles[0]?.id ?? null);
  const child = profiles.find((p) => p.id === childId) ?? profiles[0] ?? null;
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [note, setNote] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const now = new Date();

  useEffect(() => {
    let alive = true;
    if (child) void listAttempts(child.id).then((a) => alive && setAttempts(a));
    else setAttempts([]);
    return () => {
      alive = false;
    };
  }, [child?.id, child?.stars]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveCopy() {
    const backup = await exportBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(backup);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNote(`Копію збережено: ${a.download}`);
  }

  async function pickFile(f: File | undefined) {
    if (!f) return;
    try {
      setSheet({ restore: parseBackup(await f.text()) });
      setNote('');
    } catch (e) {
      setNote(e instanceof ProfileError ? e.message : 'Не вдалося прочитати файл');
    }
    if (file.current) file.current.value = '';
  }

  const topics = topicAccuracy(attempts, now);
  const errors = topErrors(attempts, now);
  const table = factTable(attempts);
  const days = minutesByDay(attempts, now);
  const maxMin = Math.max(20, ...days.map((d) => d.minutes));

  return (
    <div className="screen pp">
      <div className="pp-top">
        <h1>Панель батьків</h1>
        <div className="pp-kids" role="tablist" aria-label="Профілі дітей">
          {profiles.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={p.id === child?.id} className="pp-kid" onClick={() => setChildId(p.id)}>
              <span>
                <Pet kind={p.pet} size={32} label="" />
              </span>
              {p.name}
            </button>
          ))}
          <button type="button" className="pp-add" onClick={onAddProfile}>
            + Додати профіль
          </button>
        </div>
        <span className="pp-grow" />
        {child && (
          <>
            <button type="button" className="pp-btn" onClick={() => setSheet('profile')}>
              Профіль
            </button>
            <button type="button" className="pp-btn" onClick={() => setSheet('journal')}>
              Журнал
            </button>
          </>
        )}
        <button type="button" className="pp-btn" onClick={onExit}>
          Вийти
        </button>
      </div>

      {child ? (
        <div className="pp-body">
          <div className="pp-col">
            <section className="pp-card">
              <div className="pp-head">
                <h2>Точність за темами</h2>
                <span>перші спроби, останні 7 днів</span>
              </div>
              {topics.map((t) => (
                <div key={t.island} className="pp-topic">
                  <span>{t.name}</span>
                  <div className="pp-track">
                    <i style={{ width: `${t.pct ?? 0}%` }} className={t.pct !== null && t.pct < 70 ? 'low' : ''} />
                  </div>
                  <b>{t.pct === null ? '—' : `${t.pct}%`}</b>
                </div>
              ))}
            </section>
            <section className="pp-card grow">
              <div className="pp-head">
                <h2>Найчастіші помилки</h2>
                <span>останні 30 днів</span>
              </div>
              {errors.length ? (
                errors.map((e) => (
                  <div key={e.kind} className="pp-error">
                    <b>{e.count}</b>
                    <div>
                      <span>{ERROR_LABELS[e.kind]}</span>
                      <em>{e.example}</em>
                    </div>
                  </div>
                ))
              ) : (
                <p className="pp-empty">Типових помилок поки немає.</p>
              )}
            </section>
          </div>

          <div className="pp-col">
            <section className="pp-card">
              <div className="pp-head">
                <h2>Таблиця фактів × і :</h2>
                <div className="pp-legend">
                  {FACT_LEGEND.map(([s, t]) => (
                    <span key={s}>
                      <i className={`st-${s}`} />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pp-facts" role="table" aria-label="Таблиця фактів">
                {table.map((r) => (
                  <div key={r.row} className="pp-frow" role="row">
                    <span className="pp-fhead" role="rowheader">
                      × {r.row}
                    </span>
                    {r.cells.map((c, i) =>
                      c ? (
                        <span key={i} role="cell" className={`pp-fcell st-${c.status}`} title={`${c.a} × ${c.b} = ${c.product}`}>
                          {c.product}
                        </span>
                      ) : (
                        <span key={i} role="cell" className="pp-fcell none" />
                      ),
                    )}
                  </div>
                ))}
              </div>
              <span className="pp-small">
                Рядок і стовпчик — множники 2–7 і 10, у клітинці добуток; множення й обидва ділення з нього рахуються разом. «Знає» —
                3 правильні з першої спроби поспіль у різні дні.
              </span>
            </section>
            <section className="pp-card grow">
              <div className="pp-head">
                <h2>Час занять, хв</h2>
                <span>останні 7 днів</span>
              </div>
              <div className="pp-days">
                {days.map((d) => (
                  <div key={d.day} className="pp-day">
                    <span>{d.minutes || '—'}</span>
                    <i style={{ height: `${Math.max(4, (d.minutes / maxMin) * 120)}px` }} />
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="pp-body pp-none">
          <p>Профілів ще немає. Додайте перший.</p>
        </div>
      )}

      <div className="pp-bar">
        <label>
          <input type="checkbox" checked={settings.sound} onChange={(e) => onSettings({ sound: e.target.checked })} />
          Звуки
        </label>
        <label>
          <input type="checkbox" checked={settings.music} onChange={(e) => onSettings({ music: e.target.checked })} />
          Музика
        </label>
        <label>
          <input type="checkbox" checked={settings.speech} onChange={(e) => onSettings({ speech: e.target.checked })} />
          Озвучення умов
        </label>
        <span className="pp-note" role="status">
          {note}
        </span>
        <button type="button" className="pp-btn" onClick={onPreview}>
          Приклади рівнів
        </button>
        <button type="button" className="pp-btn" onClick={saveCopy}>
          Зберегти копію
        </button>
        <button type="button" className="pp-btn" onClick={() => file.current?.click()}>
          Відновити з файлу
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Файл копії"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {sheet === 'profile' && child && (
        <ProfileSheet
          child={child}
          onClose={() => setSheet(null)}
          onChanged={onChanged}
          onRemoved={async () => {
            setSheet(null);
            setChildId(null);
            await onChanged();
          }}
        />
      )}
      {sheet === 'journal' && child && <JournalSheet child={child} attempts={attempts} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && (
        <RestoreSheet
          backup={sheet.restore}
          onClose={() => setSheet(null)}
          onRestore={async () => {
            await restoreBackup(sheet.restore);
            setSheet(null);
            setChildId(null);
            setNote('Дані відновлено з копії.');
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="pp-veil" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pp-sheet">
        <div className="pp-sheet-head">
          <h2>{title}</h2>
          <button type="button" className="pp-btn" onClick={onClose}>
            Закрити
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProfileSheet({
  child,
  onClose,
  onChanged,
  onRemoved,
}: {
  child: Profile;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onRemoved: () => Promise<void>;
}) {
  const [name, setName] = useState(child.name);
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null);
  const [msg, setMsg] = useState('');
  // Shown at once; the stored profile catches up after the save.
  const [opened, setOpened] = useState(() => new Set(child.openIslands ?? []));

  async function run(job: () => Promise<unknown>, done: string) {
    try {
      await job();
      setMsg(done);
      await onChanged();
    } catch (e) {
      setMsg(e instanceof ProfileError ? e.message : 'Не вдалося зберегти');
    }
  }

  return (
    <SheetFrame title={`Профіль: ${child.name}`} onClose={onClose}>
      <div className="pp-form">
        <form
          className="pp-row"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updateProfile(child.id, { name }), 'Імʼя збережено');
          }}
        >
          <label htmlFor="pp-name">Імʼя</label>
          <input id="pp-name" value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="pp-btn">
            Зберегти
          </button>
        </form>
        <div className="pp-row">
          <span className="pp-label">Улюбленець</span>
          <div className="pp-pets">
            {PET_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={child.pet === k}
                aria-label={PET_LABELS[k]}
                onClick={() => run(() => updateProfile(child.id, { pet: k }), `Тепер улюбленець — ${PET_LABELS[k].toLocaleLowerCase('uk')}`)}
              >
                <Pet kind={k} size={52} label="" />
              </button>
            ))}
          </div>
        </div>
        <div className="pp-row top">
          <span className="pp-label">Відкрити острів</span>
          <div className="pp-islands">
            {ISLANDS.map((i) => (
              <label key={i.id}>
                <input
                  type="checkbox"
                  checked={opened.has(i.id)}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setOpened((o) => {
                      const n = new Set(o);
                      if (on) n.add(i.id);
                      else n.delete(i.id);
                      return n;
                    });
                    void run(() => setIslandOpen(child.id, i.id, on), on ? `Острів «${i.name}» відкрито` : `Острів «${i.name}» — за звичними правилами`);
                  }}
                />
                {i.name}
              </label>
            ))}
            <span className="pp-small">Відкритий острів — усі його рівні доступні без проходження попередніх.</span>
          </div>
        </div>
        <div className="pp-row">
          <span className="pp-label">Почати заново</span>
          {confirm === 'reset' ? (
            <>
              <button type="button" className="pp-btn danger" onClick={() => run(() => resetProgress(child.id), 'Прогрес скинуто').then(() => setConfirm(null))}>
                Так, скинути зірки, монетки, речі й статистику
              </button>
              <button type="button" className="pp-btn" onClick={() => setConfirm(null)}>
                Ні
              </button>
            </>
          ) : (
            <button type="button" className="pp-btn" onClick={() => setConfirm('reset')}>
              Скинути прогрес
            </button>
          )}
        </div>
        <div className="pp-row">
          <span className="pp-label">Видалити</span>
          {confirm === 'delete' ? (
            <>
              <button
                type="button"
                className="pp-btn danger"
                onClick={async () => {
                  await removeProfile(child.id);
                  await onRemoved();
                }}
              >
                Так, видалити {child.name} назавжди
              </button>
              <button type="button" className="pp-btn" onClick={() => setConfirm(null)}>
                Ні
              </button>
            </>
          ) : (
            <button type="button" className="pp-btn" onClick={() => setConfirm('delete')}>
              Видалити профіль
            </button>
          )}
        </div>
        <p className="pp-msg" role="status">
          {msg}
        </p>
      </div>
    </SheetFrame>
  );
}

const time = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function JournalSheet({ child, attempts, onClose }: { child: Profile; attempts: Attempt[]; onClose: () => void }) {
  const rows = journal(attempts);
  return (
    <SheetFrame title={`Журнал: ${child.name}`} onClose={onClose}>
      {rows.length ? (
        <div className="pp-journal">
          <table>
            <thead>
              <tr>
                <th>Коли</th>
                <th>Рівень</th>
                <th>Відповідь</th>
                <th>Спроба</th>
                <th>Результат</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? i}>
                  <td>{time(r.at)}</td>
                  <td>{r.level}</td>
                  <td>{attemptText(r)}</td>
                  <td>{r.stage === 'setup' ? 'вибір дії' : r.tryNo}</td>
                  <td className={r.correct ? 'ok' : 'bad'}>
                    {r.correct ? '✓ правильно' : `✗ ${(r.error && ERROR_LABELS[r.error as ErrorKind]) || 'інша помилка'}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="pp-empty">Спроб ще немає.</p>
      )}
    </SheetFrame>
  );
}

function RestoreSheet({ backup, onClose, onRestore }: { backup: Backup; onClose: () => void; onRestore: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <SheetFrame title="Відновити з копії" onClose={onClose}>
      <div className="pp-form">
        <p className="pp-text">
          Копія від <b>{time(backup.exportedAt)}</b>: профілі <b>{backup.profiles.map((p) => p.name).join(', ') || 'немає'}</b>, спроб —{' '}
          <b>{backup.attempts.length}</b>.
        </p>
        <p className="pp-text">Усі профілі й статистика на цьому планшеті заміняться даними з копії. PIN залишиться той самий.</p>
        <div className="pp-row">
          <button
            type="button"
            className="pp-btn danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onRestore();
            }}
          >
            Замінити все даними з копії
          </button>
          <button type="button" className="pp-btn" onClick={onClose}>
            Скасувати
          </button>
        </div>
      </div>
    </SheetFrame>
  );
}
