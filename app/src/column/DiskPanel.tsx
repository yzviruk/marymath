import { useRef, useState } from 'react';
import type { ColumnInfo } from '../engine/column';
import { canMerge, canSplit, DISK_VALUE, initialDisks, merge, split, type Disks } from './disks';
import { PLACE } from './texts';
import './DiskPanel.css';

interface Props {
  column: ColumnInfo;
  /** Concrete mode: the child drags disks to exchange them. Otherwise `shown` is drawn as is. */
  draggable: boolean;
  /** Disks to show in the pictorial mode. */
  shown?: Disks;
}

interface Drag {
  place: number;
  index: number;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  scale: number;
}

/** «Кружечки розрядів»: 1, 10, 100 (and 1000) disks per place, exchanged by dragging. */
export function DiskPanel({ column, draggable, shown }: Props) {
  const [own, setOwn] = useState<Disks>(() => initialDisks(column));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [note, setNote] = useState<string>('');
  const [pulse, setPulse] = useState<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const disks = draggable ? own : (shown ?? initialDisks(column));
  const add = column.op === '+';
  const places = [...column.places].reverse(); // left to right: biggest place first

  function exchange(from: number, to: number) {
    if (add && to === from + 1) {
      if (canMerge(own, from)) {
        setOwn(merge(own, from));
        setPulse(to);
        setNote(`10 ${PLACE[from].toLowerCase()} → 1 ${unitName(to)}!`);
      } else {
        setNote(`Щоб обміняти, потрібно 10 кружечків «${DISK_VALUE[from]}».`);
      }
    } else if (!add && to === from - 1) {
      if (canSplit(own, from)) {
        setOwn(split(own, from));
        setPulse(to);
        setNote(`1 ${unitName(from)} → 10 кружечків «${DISK_VALUE[to]}»!`);
      }
    } else {
      setNote(add ? 'Тягни у сусідній стовпчик ліворуч.' : 'Тягни у сусідній стовпчик праворуч.');
    }
  }

  function onDown(e: React.PointerEvent, place: number, index: number) {
    if (!draggable) return;
    const stage = panel.current?.closest('.stage') as HTMLElement | null;
    const scale = stage ? stage.getBoundingClientRect().width / 1280 : 1;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ place, index, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, scale });
  }
  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, dx: (e.clientX - drag.x0) / drag.scale, dy: (e.clientY - drag.y0) / drag.scale });
  }
  function onUp(e: React.PointerEvent) {
    if (!drag) return;
    // The dragged disk itself is under the finger: look past it.
    const target = document
      .elementsFromPoint(e.clientX, e.clientY)
      .filter((el) => el !== e.currentTarget)
      .map((el) => el.closest('[data-disk-place]'))
      .find(Boolean) as HTMLElement | undefined;
    const to = target ? Number(target.dataset.diskPlace) : -1;
    if (to >= 0 && to !== drag.place) exchange(drag.place, to);
    setDrag(null);
  }

  return (
    <div className="panel dp" ref={panel}>
      <span className="dp-title">Кружечки розрядів</span>
      <div className="dp-cols" style={{ gridTemplateColumns: `repeat(${places.length}, minmax(0, 1fr))` }}>
        {places.map(({ place }) => {
          const ready = add ? disks[place] >= 10 && place + 1 < disks.length : false;
          return (
            <div
              key={place}
              className={`dp-col p${place}${ready ? ' ready' : ''}${pulse === place ? ' pulse' : ''}`}
              data-disk-place={place}
              onAnimationEnd={() => setPulse(null)}
            >
              <span className="dp-name">{PLACE[place]}</span>
              <div className="dp-disks" aria-label={`${PLACE[place]}: ${disks[place]}`}>
                {Array.from({ length: disks[place] }, (_, i) => {
                  const moving = drag && drag.place === place && drag.index === i;
                  return (
                    <span
                      key={i}
                      className={`dp-disk p${place}${draggable ? ' grab' : ''}${moving ? ' moving' : ''}`}
                      style={moving ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
                      onPointerDown={(e) => onDown(e, place, i)}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                      onPointerCancel={() => setDrag(null)}
                      data-testid={`disk-${place}`}
                    >
                      {DISK_VALUE[place]}
                    </span>
                  );
                })}
              </div>
              {draggable && (
                <button
                  type="button"
                  className="sr-only"
                  onClick={() => exchange(place, add ? place + 1 : place - 1)}
                >
                  {add ? `Обміняти 10 кружечків ${DISK_VALUE[place]}` : `Розміняти кружечок ${DISK_VALUE[place]}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="dp-note" role="status">
        {note ||
          (draggable
            ? add
              ? 'Є 10 однакових? Перетягни кружечок ліворуч — 10 стануть 1.'
              : 'Не вистачає? Перетягни кружечок праворуч — 1 стане 10.'
            : add
              ? '10 одиниць = 1 десяток'
              : '1 десяток = 10 одиниць')}
      </div>
    </div>
  );
}

function unitName(place: number): string {
  return ['одиниця', 'десяток', 'сотня', 'тисяча'][place];
}
