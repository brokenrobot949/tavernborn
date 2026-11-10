// The save: create, load, store, migrate, export, and import.
// `lastSavedAt` is the real-world time (ms) the simulation has been run up to. On load, the gap
// between it and now is handed to `advance` as offline progress.

import { RACES } from '../data/races.js';
import { CLASSES } from '../data/classes.js';

export const SAVE_VERSION = 1;
const SAVE_KEY = 'tavernborn.save.v1';
const EXPORT_PREFIX = 'TVB1.';

export function newSave(seed = (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0, now = Date.now()) {
  return {
    version: SAVE_VERSION,
    lastSavedAt: now,
    rngSeed: seed >>> 0,
    tavern: { upgrades: {}, legends: [], legacyBonus: 0 },
    activeHeroId: null,
    heroes: [],
  };
}

// Bring an older or partial save up to the current shape, or throw if it is not a save at all.
export function migrate(save) {
  if (!save || typeof save !== 'object' || !Array.isArray(save.heroes)) throw new Error('That is not a Tavernborn save.');
  if (typeof save.version !== 'number' || save.version > SAVE_VERSION) throw new Error('That save is from a newer version of Tavernborn.');
  for (const h of save.heroes) {
    if (!RACES[h.race] || !CLASSES[h.class] || !h.abilities || !h.appearance) throw new Error('That save has a hero this version cannot read.');
    h.stats = { knockouts: 0, mostEmbarrassingDefeat: null, natural20s: 0, natural1s: 0, tasks: 0, ...h.stats };
    h.chronicle ??= [];
    h.bestiary ??= {};
    h.lines ??= h.chronicle.length;
    h.age ??= 0;
  }
  save.tavern = { upgrades: {}, legends: [], legacyBonus: 0, ...save.tavern };
  save.rngSeed = (Number(save.rngSeed) || 1) >>> 0;
  if (!Number.isFinite(save.lastSavedAt)) save.lastSavedAt = Date.now();
  if (!save.heroes.some((h) => h.id === save.activeHeroId)) save.activeHeroId = save.heroes[0]?.id ?? null;
  save.version = SAVE_VERSION;
  return save;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch (err) {
    console.warn('Could not read the save', err);
    return null;
  }
}

export function storeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (err) {
    console.warn('Could not write the save', err);
    return false;
  }
}

// The save string: the save as JSON, UTF-8, base64, with a short prefix so it is recognizable.
export function exportSave(save) {
  const bytes = new TextEncoder().encode(JSON.stringify(save));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return EXPORT_PREFIX + btoa(bin);
}

export function importSave(text) {
  const trimmed = String(text).replace(/\s+/g, '');
  if (!trimmed.startsWith(EXPORT_PREFIX)) throw new Error('That does not look like a Tavernborn save string.');
  let parsed;
  try {
    const bin = atob(trimmed.slice(EXPORT_PREFIX.length));
    parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    throw new Error('That save string is damaged or incomplete.');
  }
  return migrate(parsed);
}
