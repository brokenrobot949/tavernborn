// The pacing simulator's engine, shared by tools/simulate.html (charts) and tools/simulate.mjs
// (a table in the terminal). Dev-only: the game never loads this file.
//
// Every hero here is run by the real `advance(state, seconds)` from js/sim.js. Nothing about
// rolls, XP, damage, potions, or knockouts is copied.
//
// STAND-INS. Only Mugwick Vale has monsters so far, and its toughest is level 3. A level 12 hero
// left there never misses and is never hurt, which says nothing about the finished game. So for
// every region that has no monsters in data/monsters.js yet, this file makes nine temporary ones
// from the Vale's nine and moves the hero up the road as they level:
//   level   the region's lowest, middle, and highest level (three monsters each)
//   dc      10 + proficiency at that level, plus the Vale monster's 0 or 1 extra, so the roll
//           stays about as hard as it is for a new hero in the Vale
//   dmg     the Vale monster's damage die, scaled with a typical hero's hit points
//   xp, secs  unchanged, so a hero at the right level earns XP at the Vale's rate
//   gold    scaled with the price of a potion
// The stand-ins exist only in memory while the simulator runs. Phase 3's real monsters replace
// them automatically: a region with real monsters is never given stand-ins.

import { advance } from '../js/sim.js';
import { newSave } from '../js/state.js';
import { createHero, assignScores, defaultAppearance, STANDARD_ARRAY } from '../js/hero.js';
import { MAX_LEVEL, LEVEL_TARGET_HOURS, proficiency, potionPrice } from '../js/rules.js';
import { CLASSES } from '../data/classes.js';
import { RACES } from '../data/races.js';
import { REGIONS, START_REGION } from '../data/regions.js';
import { MONSTERS, MONSTER_BY_ID } from '../data/monsters.js';

export { MAX_LEVEL, LEVEL_TARGET_HOURS, CLASSES, RACES, REGIONS };
export const CLASS_IDS = Object.keys(CLASSES);
export const RACE_IDS = Object.keys(RACES);
export const DAY = 86400;

// Hit points of a middling hero (d8 class, Constitution 14) at a level; only used to scale damage.
const typicalHp = (level) => 8 + (level - 1) * 5 + level * 2;

const standInRegions = new Set();
const realDamage = new Map(); // monster -> its damage die before the "what if" multiplier

function standIn(region, t, template) {
  const [lo, hi] = region.levels;
  const level = t.level <= 1 ? lo : t.level >= 3 ? hi : Math.round((lo + hi) / 2);
  const easiest = Math.min(...template.filter((m) => m.level === t.level).map((m) => m.dc));
  const goldScale = potionPrice(level) / potionPrice(t.level);
  return {
    ...t,
    id: `standin_${region.id}_${t.id}`,
    name: `${region.name} stand-in (${t.name})`,
    level,
    dc: 10 + proficiency(level) + (t.dc - easiest),
    dmg: Math.max(1, Math.round((t.dmg * typicalHp(level)) / typicalHp(t.level))),
    gold: [Math.round(t.gold[0] * goldScale), Math.round(t.gold[1] * goldScale)],
    standIn: true,
  };
}

// Make sure every region has monsters, and apply the "what if monsters hit harder" multiplier
// (1 = the game's real numbers). Safe to call again with a different multiplier.
export function prepareWorld({ damageTimes = 1 } = {}) {
  const template = MONSTERS[START_REGION];
  for (const region of REGIONS) {
    if (MONSTERS[region.id] && !standInRegions.has(region.id)) continue;
    standInRegions.add(region.id);
    MONSTERS[region.id] = template.map((t) => standIn(region, { ...t, dmg: realDamage.get(t) ?? t.dmg }, template));
    for (const m of MONSTERS[region.id]) MONSTER_BY_ID[m.id] = m;
  }
  for (const m of Object.values(MONSTERS).flat()) {
    if (!realDamage.has(m)) realDamage.set(m, m.dmg);
    m.dmg = Math.max(1, Math.round(realDamage.get(m) * damageTimes));
  }
  return REGIONS.map((r) => ({ id: r.id, name: r.name, levels: r.levels, standIn: standInRegions.has(r.id), monsters: MONSTERS[r.id] }));
}

// The furthest region whose level range the hero has reached. Travel is Phase 3; here the hero
// simply turns up.
export function regionFor(level) {
  let id = START_REGION;
  for (const r of REGIONS) if (level >= r.levels[0]) id = r.id;
  return id;
}

// Hero number `i` of a run: classes and races take turns so all 24 pairs get an equal share.
export function heroPlan(i, seedBase = 1) {
  return { seed: (seedBase * 100003 + i * 7919) >>> 0, cls: CLASS_IDS[i % CLASS_IDS.length], race: RACE_IDS[Math.floor(i / CLASS_IDS.length) % RACE_IDS.length] };
}

// Run one hero from creation to level 20 (or `maxDays`). `world` is 'road' (move up the regions as
// levels allow) or 'vale' (stay in Mugwick Vale, which is the game as built today).
export function runHero({ seed, cls, race }, { world = 'road', maxDays = 60, chunk = 900 } = {}) {
  const save = newSave(seed, 0);
  const hero = createHero(save, { name: 'Sim', race, cls, appearance: defaultAppearance(race), baseScores: assignScores(cls, STANDARD_ARRAY) });
  save.heroes.push(hero);
  save.activeHeroId = hero.id;
  const out = { cls, race, reach: new Array(MAX_LEVEL + 1).fill(null), knockouts: 0, potions: 0, koSeconds: 0, koAtLevel: new Array(MAX_LEVEL + 1).fill(0), tasks: 0, level: 1 };
  const limit = maxDays * DAY;
  while (hero.level < MAX_LEVEL && hero.age < limit) {
    for (const e of advance(save, chunk)) {
      if (e.type === 'levelup') out.reach[e.level] = e.at;
      else if (e.type === 'knockout') { out.knockouts += 1; out.koSeconds += e.seconds; out.koAtLevel[hero.level] += 1; }
      else if (e.type === 'potion') out.potions += 1;
    }
    if (world === 'road') {
      const region = regionFor(hero.level);
      if (region !== hero.region) { hero.region = region; hero.currentTask = null; }
    }
  }
  out.tasks = hero.stats.tasks;
  out.level = hero.level;
  out.gold = hero.gold;
  return out;
}

const quantile = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : null);
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

// Seconds to reach `level` across a set of results: 10th percentile, median, 90th, and how many got there.
export function spread(results, level) {
  const times = results.map((r) => r.reach[level]).filter((t) => t != null).sort((a, b) => a - b);
  return { count: times.length, p10: quantile(times, 0.1), median: quantile(times, 0.5), p90: quantile(times, 0.9), min: times[0] ?? null, max: times[times.length - 1] ?? null };
}

export function summarize(results) {
  const levels = [];
  for (let level = 2; level <= MAX_LEVEL; level++) levels.push({ level, target: LEVEL_TARGET_HOURS[level] * 3600, ...spread(results, level) });
  const group = (key, ids) => ids.map((id) => {
    const rs = results.filter((r) => r[key] === id);
    return {
      id, heroes: rs.length,
      l5: spread(rs, 5).median, l10: spread(rs, 10).median, l20: spread(rs, MAX_LEVEL).median,
      knockouts: mean(rs.map((r) => r.knockouts)), potions: mean(rs.map((r) => r.potions)),
    };
  });
  const koByLevel = [];
  for (let level = 1; level < MAX_LEVEL; level++) koByLevel.push({ level, perHero: mean(results.map((r) => r.koAtLevel[level])) });
  return {
    heroes: results.length,
    finished: results.filter((r) => r.level >= MAX_LEVEL).length,
    levels,
    byClass: group('cls', CLASS_IDS),
    byRace: group('race', RACE_IDS),
    koByLevel,
    knockouts: mean(results.map((r) => r.knockouts)),
    knockoutFree: results.filter((r) => r.knockouts === 0).length,
    potions: mean(results.map((r) => r.potions)),
    koHours: mean(results.map((r) => r.koSeconds)) / 3600,
    tasks: mean(results.map((r) => r.tasks)),
  };
}

export function formatTime(seconds) {
  if (seconds == null) return 'not reached';
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  if (seconds < 2 * DAY) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / DAY).toFixed(1)} days`;
}
