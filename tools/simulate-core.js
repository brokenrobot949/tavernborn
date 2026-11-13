// The pacing simulator's engine, shared by tools/simulate.html (charts) and tools/simulate.mjs
// (a table in the terminal). Dev-only: the game never loads this file.
//
// Every hero here is run by the real `advance(state, seconds)` from js/sim.js, in the real eight
// regions with their real monsters, quests, and dungeons. Nothing about rolls, XP, damage, potions,
// travel, or knockouts is copied or stood in for.
//
// THE PLAYER. The one thing the simulator has to invent is the player, who in the real game picks
// a focus and says when to travel. `steer` plays a sensible one, using the same orders the Map tab
// uses (setFocus, orderTravel):
//   - roam until level 2 (a new hero's focus is Roam), then
//   - try the region's dungeon on reaching the level it is built for
//   - if the hero loses confidence there (three knockouts running), wait for the next level
//   - once it is cleared and the hero has reached the next region's range, walk there
//   - otherwise: 'balanced' does the region's six story quests and then roams;
//                'roam' only ever roams
// 'vale' keeps the hero roaming in Mugwick Vale for all 20 levels, to show what staying put costs.
//
// GROWTH. The same player spends what the hero earns, through the functions the Skills tab uses
// (chooseSubclass, learnSkill, raiseAbility): `grow` picks the planned subclass at level 3, puts
// ability points into the class's main ability and then Constitution, and buys skills down the
// subclass's own branch first (capstone included), then the other two branches a tier at a time.
// Each class's three subclasses take turns, so all twelve get an equal share of heroes.
// `growth: false` plays a player who never opens the Skills tab: every point stays banked.
//
// THE TAVERN (Phase 6). The player also spends gold on tavern upgrades, through the same
// `buyUpgrade` the Tavern tab uses (`shop`): whenever the purse holds twice the price of the
// cheapest rank left, it is bought, so there is always gold left over for potions and the cleric.
// Ties go room, stable, notice board, trophy wall. `tavern` starts a hero in a tavern that already
// has upgrades and legends (the second hero of a career); `shop: false` never buys anything.
//
// GEAR. Nothing to play: loot equips and sells itself inside `advance`. The simulator only watches,
// recording the average rarity across the eight slots at each level (an empty slot counts as
// Common), which rarities each slot has worn, and what was found and sold.

import { advance } from '../js/sim.js';
import { newSave } from '../js/state.js';
import { createHero, assignScores, defaultAppearance, raiseAbility, STANDARD_ARRAY } from '../js/hero.js';
import { TREES, BRANCH_BY_ID, canChooseSubclass, chooseSubclass, canLearn, learnSkill } from '../js/skills.js';
import { ABILITY_MAX } from '../js/rules.js';
import { setFocus, orderTravel } from '../js/tasks.js';
import { MAX_LEVEL, LEVEL_TARGET_HOURS, STORY_QUESTS, WHAT_IF } from '../js/rules.js';
import { CLASSES } from '../data/classes.js';
import { RACES } from '../data/races.js';
import { REGIONS, REGION_INDEX } from '../data/regions.js';
import { MONSTERS } from '../data/monsters.js';
import { DUNGEONS } from '../data/dungeons.js';
import { TIERS } from '../data/items.js';
import { SLOT_IDS } from '../js/loot.js';
import { UPGRADE_IDS, upgradePrice, buyUpgrade } from '../js/tavern.js';
import { legacyFor } from '../js/rules.js';

export { MAX_LEVEL, LEVEL_TARGET_HOURS, CLASSES, RACES, REGIONS };
export const CLASS_IDS = Object.keys(CLASSES);
export const RACE_IDS = Object.keys(RACES);
export const DAY = 86400;
export const LAST_REGION = REGIONS[REGIONS.length - 1].id;
export const SUBCLASS_IDS = Object.values(TREES).flatMap((t) => t.branches.map((b) => b.id));
export const TIER_NAMES = TIERS.map((t) => t.name);
const meanTier = (hero) => SLOT_IDS.reduce((sum, id) => sum + (hero.gear[id]?.tier ?? 0), 0) / SLOT_IDS.length;
export const subclassLabel = (id) => `${BRANCH_BY_ID[id].name} (${CLASSES[BRANCH_BY_ID[id].cls].name}, ${BRANCH_BY_ID[id].kind})`;

// Set the "what if monsters hit harder" multiplier (1 = the game as built) and describe the world.
export function prepareWorld({ damageTimes = 1 } = {}) {
  WHAT_IF.damage = damageTimes;
  return REGIONS.map((r) => ({ id: r.id, name: r.name, levels: r.levels, monsters: MONSTERS[r.id], dungeon: DUNGEONS[r.id] }));
}

// Hero number `i` of a run: classes and races take turns so all 24 pairs get an equal share.
export function heroPlan(i, seedBase = 1) {
  const cls = CLASS_IDS[i % CLASS_IDS.length];
  const race = RACE_IDS[Math.floor(i / CLASS_IDS.length) % RACE_IDS.length];
  const subclass = TREES[cls].branches[Math.floor(i / (CLASS_IDS.length * RACE_IDS.length)) % 3].id;
  return { seed: (seedBase * 100003 + i * 7919) >>> 0, cls, race, subclass };
}

// The simulated player on the Skills tab: subclass, ability points, then skill points.
export function grow(hero, subclass) {
  if (canChooseSubclass(hero)) chooseSubclass(hero, subclass);
  const order = [CLASSES[hero.class].main, 'con', ...CLASSES[hero.class].priority];
  while (hero.abilityPoints > 0) {
    const pickOne = order.find((a) => hero.abilities[a] < ABILITY_MAX);
    if (!pickOne || !raiseAbility(hero, pickOne)) break;
  }
  const branches = TREES[hero.class].branches;
  const own = branches.find((b) => b.id === subclass);
  const others = branches.filter((b) => b !== own);
  while (hero.skillPoints > 0) {
    let next = own.skills.find((s) => canLearn(hero, s.id));
    // Outside the subclass's branch: the lowest open tier first, taking turns between the two branches.
    for (let i = 0; !next && i < 12; i++) {
      const pair = [others[0].skills[i], others[1].skills[i]];
      if (hero.skills.length % 2) pair.reverse();
      next = pair.find((s) => canLearn(hero, s.id));
    }
    if (!next || !learnSkill(hero, next.id)) break;
  }
}

// The simulated player at the tavern: buy the cheapest rank left while the purse holds twice its price.
export function shop(save, hero) {
  let spent = 0;
  for (;;) {
    const options = UPGRADE_IDS.map((id) => ({ id, price: upgradePrice(save, id) })).filter((o) => o.price != null);
    if (!options.length) return spent;
    const cheapest = options.reduce((a, b) => (b.price < a.price ? b : a));
    if (hero.gold < 2 * cheapest.price) return spent;
    spent += buyUpgrade(save, hero, cheapest.id);
  }
}
// A tavern after `legends` heroes have retired from it, with the upgrades it already has.
export const tavernAfter = (upgrades, legends = 1) => ({ upgrades: { ...upgrades }, legends: Array.from({ length: legends }, (_, i) => ({ name: `Legend ${i + 1}` })), legacyBonus: legacyFor(legends), trophies: [] });

// The simulated player's standing orders, re-read every few minutes of game time.
export function steer(hero, sim, style) {
  const i = REGION_INDEX[hero.region];
  const region = REGIONS[i];
  const next = REGIONS[i + 1];
  const cleared = (hero.dungeonClears[region.id] ?? 0) > 0;
  if (cleared && next && hero.level >= next.levels[0] && hero.travelTo !== next.id) orderTravel(hero, next.id);
  const ready = hero.level >= Math.max(region.levels[1] - sim.early, sim.retryAt[region.id] ?? 0);
  const storyLeft = (hero.questProgress[region.id]?.done ?? 0) < STORY_QUESTS;
  const focus = !cleared && ready ? 'delve' : style === 'balanced' && storyLeft && hero.level >= 2 ? 'quest' : 'roam';
  if (focus !== hero.focus) setFocus(hero, focus);
}

// Run one hero from creation until they are level 20 and have cleared the last dungeon (or
// `maxDays`). `world` is 'road' or 'vale'; `style` is 'balanced' or 'roam'.
export function runHero({ seed, cls, race, subclass = TREES[cls].branches[0].id }, { world = 'road', style = 'balanced', early = 0, maxDays = 60, chunk = 300, growth = true, shop: shops = true, tavern = null } = {}) {
  const save = newSave(seed, 0);
  if (tavern) save.tavern = JSON.parse(JSON.stringify(tavern));
  const hero = createHero(save, { name: 'Sim', race, cls, appearance: defaultAppearance(race), baseScores: assignScores(cls, STANDARD_ARRAY) });
  save.heroes.push(hero);
  save.activeHeroId = hero.id;
  const out = {
    cls, race, subclass, moves: 0, reach: new Array(MAX_LEVEL + 1).fill(null), knockouts: 0, potions: 0, koSeconds: 0, koAtLevel: new Array(MAX_LEVEL + 1).fill(0),
    koBy: { roam: 0, quest: 0, delve: 0, boss: 0 }, clears: {}, runsLost: {}, quests: 0, feats: 0, tasks: 0, level: 1,
    tierAt: new Array(MAX_LEVEL + 1).fill(null), worn: Object.fromEntries(SLOT_IDS.map((id) => [id, new Set([0])])), legends: [], worse: 0,
    tavernSpent: 0, upgradesAt: new Array(MAX_LEVEL + 1).fill(null),
  };
  const sim = { retryAt: {}, early }; // `early`: levels below the dungeon's own at which to first try it
  const road = world === 'road';
  const limit = maxDays * DAY;
  const finished = () => hero.level >= MAX_LEVEL && (!road || out.clears[LAST_REGION]);
  if (road) steer(hero, sim, style);
  while (!finished() && hero.age < limit) {
    for (const e of advance(save, chunk)) {
      if (e.type === 'levelup') { out.reach[e.level] = e.at; out.tierAt[e.level] = meanTier(hero); out.upgradesAt[e.level] = { ...save.tavern.upgrades }; }
      else if (e.type === 'loot') {
        if (e.equipped) out.worn[e.slot].add(e.tier);
        if (e.legend) out.legends.push(e.legend);
      }
      else if (e.type === 'knockout') {
        out.knockouts += 1; out.koSeconds += e.seconds; out.koAtLevel[hero.level] += 1; out.koBy[e.source] += 1;
        if (e.lost === 'run') out.runsLost[e.region] = (out.runsLost[e.region] ?? 0) + 1;
      } else if (e.type === 'potion') out.potions += 1;
      else if (e.type === 'cleared' && e.first) out.clears[e.region] = { at: e.at, level: hero.level };
      else if (e.type === 'confidence') sim.retryAt[e.region] = Math.min(MAX_LEVEL, hero.level + 1);
      else if (e.type === 'questdone' && e.story) out.quests += 1;
      else if (e.type === 'feat') out.feats += 1;
      else if (e.type === 'skill') out.moves += 1;
    }
    if (growth) grow(hero, subclass);
    if (shops) out.tavernSpent += shop(save, hero);
    if (road) steer(hero, sim, style);
  }
  out.tavern = { ...save.tavern.upgrades };
  out.tasks = hero.stats.tasks;
  out.runs = hero.stats.dungeonRuns;
  out.level = hero.level;
  out.gold = hero.gold;
  out.gear = Object.fromEntries(SLOT_IDS.map((id) => [id, hero.gear[id]?.tier ?? null]));
  out.endTier = meanTier(hero);
  out.itemsFound = hero.stats.itemsFound;
  out.upgrades = hero.stats.upgrades;
  out.soldFor = hero.stats.soldFor;
  out.skills = hero.skills.length;
  out.banked = hero.skillPoints;
  out.abilityPoints = hero.abilityPoints;
  out.age = hero.age;
  out.deeds = [...(hero.deeds ?? [])];
  out.choicesAlone = hero.stats.choicesAlone ?? 0;
  out.n20 = hero.stats.natural20s;
  out.n1 = hero.stats.natural1s;
  return out;
}

const quantile = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : null);
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
const sorted = (list) => list.filter((v) => v != null).sort((a, b) => a - b);

// Seconds to reach `level` across a set of results: 10th percentile, median, 90th, and how many got there.
export function spread(results, level) {
  const times = sorted(results.map((r) => r.reach[level]));
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
      knockouts: mean(rs.map((r) => r.knockouts)), potions: mean(rs.map((r) => r.potions)), endTier: mean(rs.map((r) => r.endTier)),
      clearedLast: rs.filter((r) => r.clears[LAST_REGION]).length,
    };
  });
  const koByLevel = [];
  for (let level = 1; level <= MAX_LEVEL; level++) koByLevel.push({ level, perHero: mean(results.map((r) => r.koAtLevel[level])) });
  // Dungeons: how many heroes cleared each, when, at what level, and how many runs they lost there.
  const dungeons = REGIONS.map((r) => {
    const got = results.filter((x) => x.clears[r.id]);
    return {
      id: r.id, name: DUNGEONS[r.id].name, builtFor: DUNGEONS[r.id].level, cleared: got.length,
      at: quantile(sorted(got.map((x) => x.clears[r.id].at)), 0.5),
      level: quantile(sorted(got.map((x) => x.clears[r.id].level)), 0.5),
      runsLost: mean(results.map((x) => x.runsLost[r.id] ?? 0)),
    };
  });
  // Gear: average rarity across the eight slots on reaching each level, and what is worn at the end.
  const gearByLevel = [];
  for (let level = 2; level <= MAX_LEVEL; level++) {
    const at = results.map((r) => r.tierAt[level]).filter((v) => v != null);
    gearByLevel.push({ level, tier: at.length ? mean(at) : null });
  }
  const slotsAtEnd = results.flatMap((r) => Object.values(r.gear));
  const endShare = TIER_NAMES.map((name, t) => ({ name, share: slotsAtEnd.filter((v) => (v ?? 0) === t).length / Math.max(1, slotsAtEnd.length) }));
  const koBy = {};
  for (const k of ['roam', 'quest', 'delve', 'boss']) koBy[k] = mean(results.map((r) => r.koBy[k]));
  return {
    heroes: results.length,
    finished: results.filter((r) => r.level >= MAX_LEVEL).length,
    levels,
    byClass: group('cls', CLASS_IDS),
    byRace: group('race', RACE_IDS),
    bySubclass: group('subclass', SUBCLASS_IDS).filter((g) => g.heroes),
    moves: mean(results.map((r) => r.moves)),
    skills: mean(results.map((r) => r.skills)),
    gold: mean(results.map((r) => r.gold)),
    koByLevel,
    koBy,
    gearByLevel,
    endShare,
    endTier: mean(results.map((r) => r.endTier)),
    allFive: results.filter((r) => Object.values(r.worn).some((w) => w.size === TIER_NAMES.length)).length,
    anyLegendary: results.filter((r) => Object.values(r.gear).some((t) => t === TIER_NAMES.length - 1)).length,
    itemsFound: mean(results.map((r) => r.itemsFound)),
    upgrades: mean(results.map((r) => r.upgrades)),
    soldFor: mean(results.map((r) => r.soldFor)),
    tavernSpent: mean(results.map((r) => r.tavernSpent)),
    tavernRanks: UPGRADE_IDS.map((id) => ({ id, at: [10, 15, 20].map((l) => mean(results.map((r) => r.upgradesAt[l]?.[id] ?? 0))) })),
    legends: mean(results.map((r) => r.legends.length)),
    dungeons,
    clearedLast: results.filter((r) => r.clears[LAST_REGION]).length,
    knockouts: mean(results.map((r) => r.knockouts)),
    knockoutFree: results.filter((r) => r.knockouts === 0).length,
    potions: mean(results.map((r) => r.potions)),
    koHours: mean(results.map((r) => r.koSeconds)) / 3600,
    tasks: mean(results.map((r) => r.tasks)),
    quests: mean(results.map((r) => r.quests)),
    feats: mean(results.map((r) => r.feats)),
    runs: mean(results.map((r) => r.runs ?? 0)),
  };
}

export function formatTime(seconds) {
  if (seconds == null) return 'not reached';
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  if (seconds < 2 * DAY) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / DAY).toFixed(1)} days`;
}
