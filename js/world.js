// The world's clock and calendar. Pure: every function takes the moment as an argument and never
// reads the clock itself.
//
// The game has two clocks. A hero's own (`hero.age`, seconds adventuring) runs the rules. The world's
// is the real one: `state.lastSavedAt`, the real-world moment the simulation has been run up to, which
// `advance` (js/sim.js) moves forward as it goes. The time of day, the weather, the day's happenings,
// and the notice board all read the world's clock, so they are the same in the sim and on the page,
// and the same for an hour lived through as for an hour spent away.

import { HAPPENINGS } from '../data/board.js';
import { REGIONS } from '../data/regions.js';

// The moment the simulation has reached, as a Date.
export const worldDate = (state) => new Date(state.lastSavedAt);

// The day number of a date by the device's calendar (days since 1 January 1970 in local time).
export const dayOf = (date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
// A steady number in [0, 1) for a whole number and a salt, the same on every device.
export const hash = (n, salt) => ((Math.imul(n ^ (salt * 0x9e3779b1), 2654435761) >>> 0) % 100000) / 100000;

// A better-mixed one for the happenings and the notice board, where neighbouring days must not look alike.
export function mix(n, salt) {
  let h = (n ^ Math.imul(salt, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// The time of day: dawn 5 to 7, day 7 to 18, dusk 18 to 21, night after that.
export function timeOfDay(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  return h < 5 || h >= 21 ? 'night' : h < 7 ? 'dawn' : h < 18 ? 'day' : 'dusk';
}

// Weather by region. Some is always there (the fen's mist, the volcano's embers, the spores of
// the Underdeep); rain, snow, leaves, and blowing sand come and go in spells of an hour and a half,
// the same on every device at the same moment.
const WEATHER = {
  mugwick: { kind: 'clear' },
  mumblewood: { kind: 'leaves', chance: 0.6 },
  saltmarrow: { kind: 'rain', chance: 0.55 },
  peaks: { kind: 'snow', chance: 0.65 },
  gloamfen: { kind: 'mist', chance: 1 },
  cinder: { kind: 'sand', chance: 0.5 },
  underdeep: { kind: 'spores', chance: 1 },
  wyrmspire: { kind: 'embers', chance: 1 },
};
const SPELL_MS = 90 * 60 * 1000;
export function weatherFor(region, now = Date.now()) {
  const w = WEATHER[region];
  if (!w || w.kind === 'clear') return '';
  if (w.chance >= 1) return w.kind;
  const spell = Math.floor(now / SPELL_MS);
  const roll = ((spell * 2654435761 + region.length * 97 + region.charCodeAt(0) * 13) >>> 0) % 1000 / 1000;
  return roll < w.chance ? w.kind : '';
}

// Whether an elusive beast's condition holds at a moment: 'night', 'dusk', 'dawn', or 'weather' (the
// region's own passing weather: leaves, rain, snow, sand).
export function conditionHolds(when, region, date) {
  if (when === 'weather') return weatherFor(region, date.getTime()) !== '';
  return timeOfDay(date) === when;
}

// ----- the day's happenings -----
// Three of the eight regions have something going on each day, and which of a region's two it is
// changes from visit to visit. The same on every device on the same date.
const HAPPENING_REGIONS = 3;
let cacheDay = null;
let cache = {};
let cacheFrom = 0; // the cached day, as a stretch of milliseconds: the sim asks once or more per task
let cacheTo = 0;
export function happeningsOn(date) {
  const ms = date.getTime();
  if (ms >= cacheFrom && ms < cacheTo) return cache;
  const day = dayOf(date);
  cacheFrom = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  cacheTo = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
  if (day === cacheDay) return cache;
  const on = {};
  REGIONS.map((r, i) => ({ r, k: mix(day * 13 + i, 23) })).sort((a, b) => a.k - b.k).slice(0, HAPPENING_REGIONS).forEach(({ r }, n) => {
    const list = HAPPENINGS[r.id];
    on[r.id] = { ...list[Math.floor(mix(day * 7 + n, 29) * list.length)], region: r.id, day };
  });
  cacheDay = day;
  cache = on;
  return on;
}
export const happeningIn = (region, date) => happeningsOn(date)[region] ?? null;
// The time of day and an elusive beast's condition by the moment in milliseconds, read off the cached
// day (hours since local midnight) so the sim makes no Date for it.
export function conditionAt(when, region, ms) {
  if (when === 'weather') return weatherFor(region, ms) !== '';
  if (!(ms >= cacheFrom && ms < cacheTo)) happeningsOn(new Date(ms));
  const h = (ms - cacheFrom) / 3600000;
  return (h < 5 || h >= 21 ? 'night' : h < 7 ? 'dawn' : h < 18 ? 'day' : 'dusk') === when;
}
// The same, by the moment in milliseconds: no Date is made while the moment stays within the cached day.
export function happeningAt(region, ms) {
  return (ms >= cacheFrom && ms < cacheTo ? cache : happeningsOn(new Date(ms)))[region] ?? null;
}
