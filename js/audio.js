// Sound (Phase 7): short effects for what happens, and a tavern tune. Everything is made in code
// with the Web Audio API, so there are no recordings to download and none to credit.
//
// The sim never makes a sound: `main.js` hands the events of each live tick to `playEvents`, which
// picks the one that matters most. Time away is summed up by a single chime when the "While you
// were away" card opens. Settings (the mute switch, effects, music, volume) are a preference of
// this device, kept in localStorage apart from the save, so a save string does not carry them.
//
// Browsers keep sound off until the page is touched, so nothing plays before the first tap.

const KEY = 'tavernborn.settings';
export const DEFAULTS = { muted: false, effects: true, music: false, volume: 0.6 };

let settings = load();
let ctx = null; // the AudioContext, made on the first tap
let master, fxBus, musicBus;
let lastFx = 0;

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULTS }; }
}
export const getSettings = () => ({ ...settings });
export function setSettings(change) {
  settings = { ...settings, ...change };
  settings.volume = Math.max(0, Math.min(1, Number(settings.volume) || 0));
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode: the choice lasts this visit */ }
  apply();
}

// ---------- the audio graph ----------

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  fxBus = ctx.createGain();
  musicBus = ctx.createGain();
  fxBus.connect(master);
  musicBus.connect(master);
  master.connect(ctx.destination);
  apply();
  return ctx;
}
function apply() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : settings.volume, t, 0.05);
  fxBus.gain.setTargetAtTime(settings.effects ? 1 : 0, t, 0.05);
  musicBus.gain.setTargetAtTime(settings.music ? 0.55 : 0, t, 0.3);
  if (settings.music && !settings.muted) music.start(); else music.stop();
}

// Sound may start only after a tap. Call once at boot.
export function unlockOnTap() {
  const go = () => {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    apply();
  };
  addEventListener('pointerdown', go, { passive: true });
  addEventListener('keydown', go);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
}

// ---------- instruments ----------

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// A plucked string: a bright attack that dulls as it fades.
function pluck(bus, midi, at, { len = 0.9, gain = 0.25, type = 'triangle', bright = 3200 } = {}) {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = hz(midi);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(bright, at);
  f.frequency.exponentialRampToValueAtTime(400, at + len);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(f).connect(g).connect(bus);
  o.start(at);
  o.stop(at + len + 0.05);
}
// A small bell: a sine and a quieter one an octave and a fifth up.
function bell(bus, midi, at, { len = 1.2, gain = 0.18 } = {}) {
  for (const [mult, share] of [[1, 1], [3, 0.25], [4.2, 0.08]]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = hz(midi) * mult;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain * share, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len / mult ** 0.3);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + len + 0.05);
  }
}
// A breathy pipe for the tune: a sine with a little vibrato and a soft start.
function pipe(bus, midi, at, len, gain = 0.07) {
  const o = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = hz(midi);
  lfo.frequency.value = 5;
  depth.gain.value = hz(midi) * 0.006;
  lfo.connect(depth).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.06);
  g.gain.setValueAtTime(gain, at + Math.max(0.07, len - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(bus);
  for (const n of [o, lfo]) { n.start(at); n.stop(at + len + 0.05); }
}
// A thump: a falling sine, for knockouts and dropped things.
function thump(bus, at, { from = 140, to = 45, len = 0.35, gain = 0.5 } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(from, at);
  o.frequency.exponentialRampToValueAtTime(to, at + len);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(bus);
  o.start(at);
  o.stop(at + len + 0.05);
}
// A short burst of filtered noise: coins, a door, a page.
function rattle(bus, at, { len = 0.06, freq = 6000, gain = 0.15 } = {}) {
  const n = Math.ceil(ctx.sampleRate * len);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = buf;
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 3;
  g.gain.value = gain;
  src.connect(f).connect(g).connect(bus);
  src.start(at);
}

// ---------- the effects ----------

// Each effect is a few notes; `t` is when it starts. Pitches are MIDI numbers (60 is middle C).
export const EFFECTS = {
  levelup: (t) => { [67, 71, 74, 79].forEach((m, i) => pluck(fxBus, m, t + i * 0.09, { gain: 0.22 })); bell(fxBus, 86, t + 0.36, { len: 1.6 }); },
  clear: (t) => { [60, 64, 67].forEach((m, i) => pluck(fxBus, m, t + i * 0.14, { gain: 0.22, len: 0.7 })); pluck(fxBus, 72, t + 0.42, { gain: 0.25, len: 1.6 }); bell(fxBus, 84, t + 0.42, { len: 2 }); },
  crit: (t) => { bell(fxBus, 88, t, { len: 0.8, gain: 0.14 }); bell(fxBus, 95, t + 0.07, { len: 1, gain: 0.12 }); },
  fumble: (t) => { pluck(fxBus, 50, t, { type: 'sawtooth', bright: 900, gain: 0.12, len: 0.25 }); pluck(fxBus, 49, t + 0.16, { type: 'sawtooth', bright: 700, gain: 0.12, len: 0.5 }); },
  knockout: (t) => { thump(fxBus, t); rattle(fxBus, t + 0.02, { len: 0.18, freq: 900, gain: 0.25 }); pluck(fxBus, 55, t + 0.25, { gain: 0.12, len: 0.4 }); pluck(fxBus, 50, t + 0.45, { gain: 0.12, len: 0.9 }); },
  quest: (t) => { pluck(fxBus, 74, t, { gain: 0.2 }); pluck(fxBus, 81, t + 0.12, { gain: 0.2, len: 1.2 }); },
  coins: (t) => { for (let i = 0; i < 4; i++) rattle(fxBus, t + i * 0.055 + Math.random() * 0.02, { freq: 5200 + i * 500, gain: 0.12 }); },
  potion: (t) => { rattle(fxBus, t, { len: 0.05, freq: 2500, gain: 0.1 }); pluck(fxBus, 79, t + 0.06, { type: 'sine', gain: 0.1, len: 0.3 }); },
  paragon: (t) => { [74, 78, 81].forEach((m) => bell(fxBus, m, t, { len: 2, gain: 0.1 })); },
  away: (t) => { pluck(fxBus, 67, t, { gain: 0.16 }); pluck(fxBus, 74, t + 0.1, { gain: 0.16, len: 1.1 }); },
  retire: (t) => { [62, 66, 69, 74].forEach((m, i) => pluck(fxBus, m, t + i * 0.18, { gain: 0.2, len: 1.4 })); [74, 78, 81, 86].forEach((m) => bell(fxBus, m, t + 0.8, { len: 2.4, gain: 0.07 })); },
  // A found piece: a chime that climbs with rarity; a Legendary adds a run of bells.
  loot: (t, tier = 0) => {
    const base = 72 + [0, 2, 4, 7, 12][tier];
    bell(fxBus, base, t, { len: 0.9, gain: 0.12 });
    if (tier >= 2) bell(fxBus, base + 7, t + 0.08, { len: 1, gain: 0.08 });
    if (tier >= 4) [0, 4, 7, 12].forEach((d, i) => bell(fxBus, base + 12 + d, t + 0.2 + i * 0.07, { len: 1.4, gain: 0.07 }));
  },
};

// Play one effect now (if sound is on and the page has been touched).
export function sfx(name, arg) {
  if (!ctx || ctx.state !== 'running' || settings.muted || !settings.effects || !EFFECTS[name]) return false;
  EFFECTS[name](ctx.currentTime + 0.02, arg);
  return true;
}

// What one live tick sounds like: the event that matters most, and only one, so a busy second
// does not turn into a racket. A level-up outranks a clear, a clear a knockout, and so on.
const RANK = ['levelup', 'clear', 'paragon', 'knockout', 'legendary', 'quest', 'crit', 'loot', 'fumble', 'potion'];
export function pickSound(events) {
  let best = null;
  for (const e of events) {
    let name = null, arg;
    if (e.type === 'levelup') name = 'levelup';
    else if (e.type === 'cleared') name = 'clear';
    else if (e.type === 'paragon') name = 'paragon';
    else if (e.type === 'knockout') name = 'knockout';
    else if (e.type === 'loot' && e.equipped) { name = e.tier >= 4 ? 'legendary' : 'loot'; arg = e.tier; }
    else if (e.type === 'questdone') name = 'quest';
    else if (e.type === 'task' && e.outcome === 'crit') name = 'crit';
    else if (e.type === 'task' && e.outcome === 'fumble') name = 'fumble';
    else if (e.type === 'potion') name = 'potion';
    if (name && (!best || RANK.indexOf(name) < RANK.indexOf(best.name))) best = { name, arg };
  }
  if (best?.name === 'legendary') return { name: 'loot', arg: 4 };
  return best;
}
export function playEvents(events) {
  const pick = pickSound(events);
  if (!pick) return null;
  const now = performance.now();
  if (now - lastFx < 400 && pick.name !== 'levelup') return null; // let the last one ring
  if (sfx(pick.name, pick.arg)) lastFx = now;
  return pick;
}

// ---------- the tavern tune ----------
// A slow tune in D minor, in three time, as a lute and a pipe might play it in a corner of The
// Wobbly Griffin: Dm, C, Bb, A over eight bars, with a melody that changes on the second pass.
const BEAT = 0.42; // seconds per beat, about 143 a minute
const CHORDS = [[50, 57, 62, 65], [48, 55, 60, 64], [46, 53, 58, 62], [45, 52, 57, 61]]; // Dm C Bb A
export const TUNE = [ // [MIDI pitch or null, beats], 24 beats a pass
  [[69, 2], [67, 1], [65, 2], [64, 1], [62, 3], [null, 1], [64, 1], [65, 1], [67, 2], [65, 1], [64, 2], [61, 1], [62, 3], [null, 3]],
  [[74, 2], [72, 1], [70, 2], [69, 1], [67, 2], [65, 1], [64, 3], [65, 1], [67, 1], [69, 1], [70, 1], [69, 1], [67, 1], [64, 2], [null, 1], [61, 3]],
];
const music = {
  timer: 0, next: 0, bar: 0, pass: 0, note: 0, noteAt: 0,
  start() {
    if (this.timer || !ensure()) return;
    this.next = ctx.currentTime + 0.3;
    this.noteAt = this.next;
    this.bar = 0; this.note = 0; this.pass = 0;
    this.timer = setInterval(() => this.schedule(), 100);
  },
  stop() { clearInterval(this.timer); this.timer = 0; },
  // Schedule everything due in the next half second.
  schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const until = ctx.currentTime + 0.5;
    while (this.next < until) {
      const chord = CHORDS[Math.floor(this.bar / 2) % 4];
      pluck(musicBus, chord[0] - 12, this.next, { gain: 0.22, len: 1.6, bright: 1200 });
      pluck(musicBus, chord[1], this.next + BEAT, { gain: 0.1, len: 0.9 });
      pluck(musicBus, chord[2], this.next + BEAT * 1.02, { gain: 0.09, len: 0.9 });
      pluck(musicBus, chord[3], this.next + BEAT * 2, { gain: 0.1, len: 0.9 });
      pluck(musicBus, chord[2], this.next + BEAT * 2.02, { gain: 0.08, len: 0.9 });
      this.next += BEAT * 3;
      this.bar = (this.bar + 1) % 8;
    }
    while (this.noteAt < until) {
      const line = TUNE[this.pass];
      const [pitch, beats] = line[this.note];
      if (pitch != null) pipe(musicBus, pitch, this.noteAt, beats * BEAT * 0.95);
      this.noteAt += beats * BEAT;
      this.note += 1;
      if (this.note >= line.length) { this.note = 0; this.pass = (this.pass + 1) % TUNE.length; }
    }
  },
};
export const musicPlaying = () => !!music.timer;
