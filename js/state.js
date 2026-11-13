// The save: create, load, store, migrate, export, and import.
// `lastSavedAt` is the real-world time (ms) the simulation has been run up to. On load, the gap
// between it and now is handed to `advance` as offline progress.

import { RACES } from '../data/races.js';
import { CLASSES } from '../data/classes.js';
import { REGION_BY_ID, START_REGION } from '../data/regions.js';
import { ADVENTURE_FIELDS, GROWTH_FIELDS, LEGACY_FIELDS, STATS, abilityPointsBy } from './hero.js';
import { startingGear, startingCloak, SLOT_IDS, MAX_TIER } from './loot.js';
import { LEGENDARIES } from '../data/loot.js';
import { SKILL_BY_ID, BRANCH_BY_ID, MAX_SKILLS } from './skills.js';
import { MAX_LEVEL, MAX_HEROES, PAST_CURVES, LOOT, TAVERN, xpForLevel, legacyFor } from './rules.js';
import { paragonRank } from './tavern.js';
import { TROPHIES } from '../data/tavern.js';
import { REGIONS } from '../data/regions.js';

export const SAVE_VERSION = 5;
const SAVE_KEY = 'tavernborn.save.v1';
const EXPORT_PREFIX = 'TVB1.';

export function newSave(seed = (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0, now = Date.now()) {
  return {
    version: SAVE_VERSION,
    lastSavedAt: now,
    rngSeed: seed >>> 0,
    tavern: { upgrades: {}, legends: [], legacyBonus: 0, trophies: [], relics: [] },
    activeHeroId: null,
    heroes: [],
  };
}

// The XP curve has been retuned twice (Phase 3, then Phase 4 when skills arrived). A hero from an
// older save is moved to the same place within their level on the current curve. Levels are
// never taken away.
function rescaleXp(h, old) {
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(h.level) || 1));
  h.level = level;
  if (level >= MAX_LEVEL) { h.xp = Math.max(Number(h.xp) || 0, xpForLevel(MAX_LEVEL)); return; }
  const from = old[level], to = old[level + 1];
  const part = Math.max(0, Math.min(0.999, ((Number(h.xp) || 0) - from) / (to - from)));
  h.xp = Math.round(xpForLevel(level) + part * (xpForLevel(level + 1) - xpForLevel(level)));
}

// Phase 4 (version 3): skills, the subclass, and ability score increases. A hero from an older
// save gets the ability points their level has already earned, and never fewer skill points than
// their levels and Feats are worth.
function growthFields(h, version) {
  h.skills = Array.isArray(h.skills) ? [...new Set(h.skills)].filter((id) => SKILL_BY_ID[id]?.cls === h.class).slice(0, MAX_SKILLS) : [];
  if (BRANCH_BY_ID[h.subclass]?.cls !== h.class) h.subclass = null;
  const fields = GROWTH_FIELDS();
  if (version < 3) h.abilityPoints = abilityPointsBy(h.level);
  for (const [key, value] of Object.entries(fields)) h[key] ??= value;
  const earned = (h.level - 1) + h.feats.length;
  h.skillPoints = Math.max(Number(h.skillPoints) || 0, earned - h.skills.length);
}

// Phase 5 (version 4): gear is real. Before it, every slot held a bare `{ tier: 0 }`; each becomes
// the named piece of the class's starting kit, a hero already past level 5 is handed the cloak
// that level now comes with, and anything unreadable is put back to the starting piece. Nothing
// is taken away: gold, levels, skills, and points are not touched.
function gearFields(h) {
  const start = startingGear(h.class);
  const old = h.gear && typeof h.gear === 'object' ? h.gear : {};
  h.gear = {};
  for (const id of SLOT_IDS) {
    const it = old[id];
    const good = it && typeof it === 'object' && Number.isInteger(it.tier) && it.tier >= 0 && it.tier <= MAX_TIER;
    if (!good) { h.gear[id] = start[id]; continue; }
    const named = typeof it.name === 'string' && it.name;
    h.gear[id] = { tier: it.tier, level: Math.max(1, Math.min(MAX_LEVEL, Math.floor(it.level) || 1)), name: named ? it.name : start[id]?.name ?? 'Unlabelled Piece' };
    if (LEGENDARIES[it.legend]?.slot === id) h.gear[id].legend = it.legend;
  }
  if (!h.gear.cloak && h.level >= LOOT.cloakLevel) h.gear.cloak = startingCloak();
}

// Phase 6 (version 5): the tavern is real. Upgrades are kept only if they are ranks that exist;
// the trophy wall is filled from every dungeon a hero here has already cleared; the legacy bonus
// is worked out again from the legends in the Hall. A hero already past level 20 has their
// Paragon ranks counted quietly, so the Chronicle does not announce them all at once.
function tavernFields(save) {
  const t = save.tavern && typeof save.tavern === 'object' ? save.tavern : {};
  const upgrades = {};
  for (const [id, rule] of Object.entries(TAVERN)) {
    const r = Math.floor(Number(t.upgrades?.[id]) || 0);
    if (r > 0) upgrades[id] = Math.min(r, rule.price.length);
  }
  const legends = Array.isArray(t.legends) ? t.legends.filter((l) => l && typeof l === 'object' && l.name) : [];
  const trophies = Array.isArray(t.trophies) ? [...new Set(t.trophies)].filter((id) => TROPHIES[id]) : [];
  for (const r of save.version < 5 ? REGIONS : []) {
    if (!trophies.includes(r.id) && save.heroes.some((h) => (h.dungeonClears?.[r.id] ?? 0) > 0)) trophies.push(r.id);
  }
  // The glass case (after Phase 7): one entry per named Legendary at most, each one that exists.
  const relics = (Array.isArray(t.relics) ? t.relics : []).filter((r, i, all) => r && LEGENDARIES[r.legend] && all.findIndex((x) => x?.legend === r.legend) === i)
    .map((r) => ({ legend: r.legend, level: Math.max(1, Math.min(MAX_LEVEL, Math.floor(r.level) || 1)), hero: typeof r.hero === 'string' ? r.hero : '' }));
  save.tavern = { ...t, upgrades, legends, trophies, relics, legacyBonus: legacyFor(legends.length) };
}

// Bring an older or partial save up to the current shape, or throw if it is not a save at all.
export function migrate(save) {
  if (!save || typeof save !== 'object' || !Array.isArray(save.heroes)) throw new Error('That is not a Tavernborn save.');
  if (typeof save.version !== 'number' || save.version > SAVE_VERSION) throw new Error('That save is from a newer version of Tavernborn.');
  for (const h of save.heroes) {
    if (!RACES[h.race] || !CLASSES[h.class] || !h.abilities || !h.appearance) throw new Error('That save has a hero this version cannot read.');
    h.stats = { ...STATS, ...h.stats };
    if (PAST_CURVES[save.version]) rescaleXp(h, PAST_CURVES[save.version]);
    // Phase 3 fields: travel, quests, dungeon runs, grudges, unread chapter cards.
    for (const [key, value] of Object.entries(ADVENTURE_FIELDS())) h[key] ??= value;
    if (!REGION_BY_ID[h.region]) h.region = START_REGION;
    h.feats ??= [];
    growthFields(h, save.version);
    gearFields(h);
    for (const [key, value] of Object.entries(LEGACY_FIELDS())) h[key] ??= value;
    if (!['roam', 'quest', 'delve', 'rift'].includes(h.focus) || (h.focus === 'rift' && h.level < MAX_LEVEL)) h.focus = 'roam';
    // XP never sits below the hero's own level, whatever happened to the curve.
    h.xp = Math.max(Number(h.xp) || 0, xpForLevel(Math.min(h.level, MAX_LEVEL)));
    h.chronicle ??= [];
    h.bestiary ??= {};
    h.lines ??= h.chronicle.length;
    h.age ??= 0;
    if (save.version < 5) h.paragon = paragonRank(h);
  }
  if (save.heroes.length > MAX_HEROES) throw new Error('That save has more heroes than the roster holds.');
  tavernFields(save);
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
