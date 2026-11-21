/**
 * Sounds and background music (stage 6b), made with Web Audio — no files, works offline.
 * The variants were chosen on the sound picker (21.11.2026):
 * correct A «Дзвіночок», again A «Два кроки вниз», coin B «Іскорка», star B «Дзвони»,
 * sticker A «Відклеїти і приліпити», buy B «Радісне арпеджіо», jump C «Щипок угору»,
 * tap C «Бульбашка», boss C «Каскад дзвонів»; music «Острівна прогулянка», quieter in tasks.
 */
export type Sfx = 'correct' | 'again' | 'coin' | 'sticker' | 'buy' | 'tap' | 'boss';

/** In tasks the music plays at this share of its volume. */
export const QUIET_SHARE = 0.35;
const MUSIC_GAIN = 0.6;

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
let musicBus: GainNode;
let noiseBuf: AudioBuffer;

/** Names of the sounds played, newest last — for e2e tests (`window.__sfx`). */
export const sfxLog: string[] = [];
function note(name: string) {
  sfxLog.push(name);
  if (sfxLog.length > 50) sfxLog.shift();
}

const state = { sound: true, music: true, volume: 40, mode: 'off' as 'off' | 'normal' | 'quiet' };

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    // A gentle limiter: a sound over the music never clips (clipping crackles on tablet speakers).
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    // The music goes through a low-pass: no sharp overtones to buzz in small speakers.
    const musicTone = ctx.createBiquadFilter();
    musicTone.type = 'lowpass';
    musicTone.frequency.value = 3200;
    musicTone.Q.value = 0.5;
    musicBus.connect(musicTone);
    musicTone.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    applyMusicGain();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface Note {
  f: number;
  at: number;
  d?: number;
  type?: OscillatorType;
  g?: number;
  a?: number;
  f2?: number;
  r?: number;
  bus?: GainNode;
  detune?: number;
}

function tone({ f, at, d = 0.2, type = 'sine', g = 0.3, a = 0.005, f2, r, bus = sfxBus, detune = 0 }: Note) {
  const c = ctx!;
  const t0 = Math.max(c.currentTime, at);
  const o = c.createOscillator();
  o.type = type;
  o.detune.value = detune;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d * 0.9);
  const v = c.createGain();
  v.gain.setValueAtTime(0.0001, t0);
  v.gain.exponentialRampToValueAtTime(g, t0 + a);
  if (r) v.gain.setValueAtTime(g, Math.max(t0 + a, t0 + d - r));
  v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(v);
  v.connect(bus);
  o.start(t0);
  o.stop(t0 + d + 0.05);
}

function bell(f: number, at: number, d = 1.2, g = 0.22, bus = sfxBus) {
  for (const [m, k] of [
    [1, 1],
    [2.76, 0.35],
    [5.4, 0.15],
    [8.9, 0.06],
  ]) {
    tone({ f: f * m, at, d: d / (m > 1 ? 1.6 : 1), g: g * k, bus });
  }
}

function noise({ at, d = 0.1, g = 0.2, type = 'bandpass', f = 2000, f2, q = 1, bus = sfxBus }: { at: number; d?: number; g?: number; type?: BiquadFilterType; f?: number; f2?: number; q?: number; bus?: GainNode }) {
  const c = ctx!;
  const t0 = Math.max(c.currentTime, at);
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const fl = c.createBiquadFilter();
  fl.type = type;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t0);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  const v = c.createGain();
  v.gain.setValueAtTime(0.0001, t0);
  v.gain.exponentialRampToValueAtTime(g, t0 + 0.005);
  v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(fl);
  fl.connect(v);
  v.connect(bus);
  s.start(t0, Math.random() * 0.5);
  s.stop(t0 + d + 0.05);
}

const EFFECTS: Record<Sfx, (t: number) => void> = {
  correct: (t) => {
    bell(hz(84), t, 1.0);
    bell(hz(88), t + 0.12, 1.2);
  },
  again: (t) => [76, 72].forEach((m, i) => tone({ f: hz(m), at: t + i * 0.14, d: 0.3, g: 0.18 })),
  coin: (t) => {
    tone({ f: 1975, at: t, d: 0.4, g: 0.15 });
    tone({ f: 2637, at: t + 0.05, d: 0.35, g: 0.1 });
  },
  sticker: (t) => {
    noise({ at: t, d: 0.25, g: 0.12, f: 600, f2: 4000, q: 2 });
    tone({ f: 220, f2: 660, at: t + 0.25, d: 0.12, g: 0.25 });
    bell(hz(84), t + 0.32, 0.8, 0.15);
  },
  buy: (t) => [67, 71, 74, 79].forEach((m, i) => tone({ f: hz(m), at: t + i * 0.08, d: 0.4, type: 'triangle', g: 0.2 })),
  tap: (t) => tone({ f: 300, f2: 750, at: t, d: 0.06, g: 0.2 }),
  boss: (t) => [91, 88, 84, 79, 84, 88, 91, 96].forEach((m, i) => bell(hz(m), t + i * 0.1, 1.0, 0.12)),
};

/** One sound effect, `delay` seconds from now (nothing when sounds are off). */
export function playSfx(name: Sfx, delay = 0) {
  if (!state.sound) return;
  note(name);
  const c = audio();
  if (!c) return;
  EFFECTS[name](c.currentTime + 0.02 + delay);
}

/** «Дзвони»: one bell per star, each higher, 0.35 s apart. */
export function playStars(count: number, delay = 0) {
  if (!state.sound || count <= 0) return;
  note(`stars:${count}`);
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.02 + delay;
  for (let k = 0; k < Math.min(count, 3); k++) bell(hz([79, 83, 86][k]), t + k * 0.35, 1.0, 0.2);
}

/** «Щипок угору»: a rising pluck per jump on the number line, in time with the arcs (0.35 s). */
export function playJumps(count: number) {
  if (!state.sound || count <= 0) return;
  note(`jumps:${count}`);
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.02;
  for (let k = 0; k < Math.min(count, 12); k++) tone({ f: hz(72 + Math.min(k, 7) * 2), at: t + k * 0.35, d: 0.2, type: 'triangle', g: 0.2 });
}

// ── Music: «Острівна прогулянка», 100 bpm, 8 bars in a loop ───────────────

/**
 * A soft music note: a 20–30 ms fade-in, a decay, and a fade to exactly 0 before it stops —
 * no clicks at either end (fast attacks on low notes were heard as knocking).
 */
function musicNote(f: number, at: number, d: number, type: OscillatorType, g: number, a = 0.02) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  const v = c.createGain();
  v.gain.setValueAtTime(0, at);
  v.gain.linearRampToValueAtTime(g, at + a);
  v.gain.exponentialRampToValueAtTime(g * 0.35, at + d * 0.7);
  v.gain.linearRampToValueAtTime(0, at + d);
  o.connect(v);
  v.connect(musicBus);
  o.start(at);
  o.stop(at + d + 0.02);
}

const CHORDS: Record<string, number[]> = {
  C: [48, 60, 64, 67],
  G: [43, 59, 62, 67],
  Am: [45, 60, 64, 69],
  F: [41, 60, 65, 69],
};
const PROGRESSION = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'];
const MELODY = [76, null, 79, 76, 74, null, 72, null, 74, 76, null, 79, 81, null, 79, null];
const BPM = 100;
const STEPS = 128;

let timer: number | null = null;
let nextTime = 0;
let step = 0;

function playStep(s: number, t: number, beat: number) {
  const bar = Math.floor(s / 16) % 8;
  const inBar = s % 16;
  const ch = CHORDS[PROGRESSION[bar]];
  // The bass an octave up (175–260 Hz): tablet speakers rattle on the lower one.
  if (inBar % 4 === 0) musicNote(hz(ch[0] + 12), t, beat * 0.875, 'sine', 0.13, 0.03);
  if (inBar % 4 === 2) ch.slice(1).forEach((m, i) => musicNote(hz(m), t + i * 0.012, beat * 0.625, 'triangle', 0.045));
  const m = MELODY[inBar];
  if (m && bar % 2 === 1) musicNote(hz(m + (bar === 7 ? -2 : 0)), t, beat * 0.45, 'triangle', 0.065);
}

function startLoop() {
  const c = audio();
  if (!c || timer !== null) return;
  const sixteenth = 60 / BPM / 4;
  nextTime = c.currentTime + 0.1;
  timer = window.setInterval(() => {
    // A busy tablet can wake the timer late: skip the notes already gone instead of playing
    // them all at once (that was heard as stumbling).
    while (nextTime < c.currentTime + 0.02) {
      nextTime += sixteenth;
      step++;
    }
    while (nextTime < c.currentTime + 0.5) {
      playStep(step % STEPS, nextTime, sixteenth * 4);
      nextTime += sixteenth;
      step++;
    }
  }, 40);
}

function stopLoop() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

function applyMusicGain() {
  if (!ctx) return;
  const share = state.mode === 'quiet' ? QUIET_SHARE : 1;
  const target = state.music && state.mode !== 'off' ? (state.volume / 100) * MUSIC_GAIN * share : 0;
  musicBus.gain.setTargetAtTime(Math.max(target, 0), ctx.currentTime, 0.3);
}

/** Where the child is: the map and the home — normal; a level — quiet; elsewhere — no music. */
export function setMusicMode(mode: 'off' | 'normal' | 'quiet') {
  state.mode = mode;
  (window as unknown as { __music?: string }).__music = mode;
  sync();
}

export function setSoundSettings(s: { sound: boolean; music: boolean; musicVolume: number }) {
  state.sound = s.sound;
  state.music = s.music;
  state.volume = s.musicVolume;
  sync();
}

function sync() {
  const want = state.music && state.mode !== 'off';
  if (want && ctx) startLoop();
  applyMusicGain();
  if (!want) window.setTimeout(() => !(state.music && state.mode !== 'off') && stopLoop(), 600);
}

// ── The first touch unlocks audio (browsers start it only after a gesture) ──

/** Elements whose touch makes the «tap» bubble: circles, chips, action buttons, pictures. */
const TAP = '.cb-carry, .pic-box, .pic-gem, .pic-drag, .pic-rotate, .dp-disk.grab, .pt-sign, .pt-num, .ft-chip';

let installed = false;
export function installSound() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  (window as unknown as { __sfx?: string[] }).__sfx = sfxLog;
  document.addEventListener(
    'pointerdown',
    (e) => {
      const c = audio();
      if (c && state.music && state.mode !== 'off') startLoop();
      const el = (e.target as Element | null)?.closest?.(TAP);
      if (el && !(el as HTMLButtonElement).disabled) playSfx('tap');
    },
    true,
  );
}
