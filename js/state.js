// The save: create, load, store, migrate, export, and import.
// `lastSavedAt` is the real-world time (ms) the simulation has been run up to. On load, the gap
// between it and now is handed to `advance` as offline progress.

import { RACES } from '../data/races.js';
import { CLASSES } from '../data/classes.js';
import { REGION_BY_ID, START_REGION } from '../data/regions.js';
import { ADVENTURE_FIELDS, STATS } from './hero.js';
import { MAX_LEVEL, LEVEL_TARGET_HOURS, xpForLevel } from './rules.js';

export const SAVE_VERSION = 2;
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

// Version 1 (Phases 1 and 2) priced levels with these two rates. Phase 3 retuned the curve, so a
// version 1 hero's XP is moved to the same place within their level on the new curve. Levels are
// never taken away.
const V1_RATE = 0.5, V1_RATE_LATE = 0.48, V1_LATE_FROM = LEVEL_TARGET_HOURS[6];
function v1XpForLevel(level) {
  const hours = LEVEL_TARGET_HOURS[Math.min(level, MAX_LEVEL)];
  const early = Math.min(hours, V1_LATE_FROM);
  return Math.round(3600 * (early * V1_RATE + (hours - early) * V1_RATE_LATE));
}
function rescaleXp(h) {
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(h.level) || 1));
  h.level = level;
  if (level >= MAX_LEVEL) { h.xp = Math.max(Number(h.xp) || 0, xpForLevel(MAX_LEVEL)); return; }
  const from = v1XpForLevel(level), to = v1XpForLevel(level + 1);
  const part = Math.max(0, Math.min(0.999, ((Number(h.xp) || 0) - from) / (to - from)));
  h.xp = Math.round(xpForLevel(level) + part * (xpForLevel(level + 1) - xpForLevel(level)));
}

// Bring an older or partial save up to the current shape, or throw if it is not a save at all.
export function migrate(save) {
  if (!save || typeof save !== 'object' || !Array.isArray(save.heroes)) throw new Error('That is not a Tavernborn save.');
  if (typeof save.version !== 'number' || save.version > SAVE_VERSION) throw new Error('That save is from a newer version of Tavernborn.');
  for (const h of save.heroes) {
    if (!RACES[h.race] || !CLASSES[h.class] || !h.abilities || !h.appearance) throw new Error('That save has a hero this version cannot read.');
    h.stats = { ...STATS, ...h.stats };
    if (save.version < 2) rescaleXp(h);
    // Phase 3 fields: travel, quests, dungeon runs, grudges, unread chapter cards.
    for (const [key, value] of Object.entries(ADVENTURE_FIELDS())) h[key] ??= value;
    if (!REGION_BY_ID[h.region]) h.region = START_REGION;
    if (!['roam', 'quest', 'delve'].includes(h.focus)) h.focus = 'roam';
    h.feats ??= [];
    // XP never sits below the hero's own level, whatever happened to the curve.
    h.xp = Math.max(Number(h.xp) || 0, xpForLevel(Math.min(h.level, MAX_LEVEL)));
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
