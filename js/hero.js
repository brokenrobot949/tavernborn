// Hero creation and leveling. Pure logic; the page is never touched here.

import { RACES, RACE_TRAITS, HAIR_COLORS, HAIR_STYLES } from '../data/races.js';
import { CLASSES } from '../data/classes.js';
import { NAMES } from '../data/names.js';
import { REGIONS, REGION_INDEX, START_REGION } from '../data/regions.js';
import { ARRIVAL, ABILITY_RAISED } from '../data/chronicle.js';
import { ABILITIES, ABILITY_NAMES, ABILITY_LEVELS, ABILITY_POINTS, ABILITY_MAX, MAX_LEVEL, mod, pick, roll, xpForLevel } from './rules.js';
import { skillMods } from './skills.js';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const MAX_ROLLS = 3;
export const CHRONICLE_MAX = 200;

export const activeHero = (state) => state.heroes.find((h) => h.id === state.activeHeroId) ?? null;

// Six scores go to the six abilities in the order the class cares about, highest first.
export function assignScores(cls, scores) {
  const sorted = [...scores].sort((a, b) => b - a);
  return Object.fromEntries(CLASSES[cls].priority.map((ability, i) => [ability, sorted[i]]));
}

// "Roll instead": six times, roll 4d6 and drop the lowest die.
export function rollScores(state) {
  return ABILITIES.map(() => {
    const dice = [0, 0, 0, 0].map(() => roll(state, 6)).sort((a, b) => a - b);
    return dice[1] + dice[2] + dice[3];
  });
}

export function withRaceBonus(abilities, race) {
  const bonus = RACE_TRAITS[race].bonus;
  return Object.fromEntries(ABILITIES.map((a) => [a, abilities[a] + (bonus[a] ?? 0)]));
}

export function randomName(state, race) {
  const parts = NAMES[race] ?? NAMES.human;
  return `${pick(state, parts.first)} ${pick(state, parts.last)}`;
}

// A random look for a race: build, skin, hair. Used by the creation screen's Randomize button.
export function randomAppearance(state, race) {
  const r = RACES[race];
  const build = pick(state, r.builds);
  return {
    build: build.id,
    skin: pick(state, r.skins),
    hairStyle: r.hair === 'none' ? 'none' : pick(state, HAIR_STYLES).id,
    hairColor: pick(state, HAIR_COLORS),
    beard: !!build.beard,
  };
}

export function defaultAppearance(race) {
  const r = RACES[race];
  return { build: r.builds[0].id, skin: r.skins[0], hairStyle: r.hair, hairColor: 'chestnut', beard: !!r.builds[0].beard };
}

// Hit points come from the class, the level, Constitution, and skills, so they are always recomputed.
export function maxHp(hero) {
  const die = CLASSES[hero.class].hitDie;
  const con = mod(hero.abilities.con);
  const base = Math.max(hero.level, die + (hero.level - 1) * (die / 2 + 1) + hero.level * con);
  const { n } = skillMods(hero);
  return Math.floor(base * (1 + n.hp)) + hero.level * n.hpLevel;
}

export const xpToNext = (hero) => (hero.level >= MAX_LEVEL ? null : xpForLevel(hero.level + 1));

// Phase 1 has no loot: every hero wears the Common look in each slot. The Cloak slot unlocks at
// level 5 (Phase 5) and the Trinket never shows on the sprite.
const STARTING_GEAR = () => ({
  weapon: { tier: 0 }, offhand: { tier: 0 }, head: { tier: 0 }, body: { tier: 0 },
  hands: { tier: 0 }, feet: { tier: 0 }, cloak: null, trinket: null,
});

// Everything Phase 3 keeps on a hero. state.js uses the same list to bring older saves up to date.
//   travelTo        region the hero has been told to walk to, or null
//   returning       true while walking back out after a knockout
//   questProgress   per region: { done (story quests finished), step, started, odd (odd jobs done), job }
//   dungeonClears   per region: times its dungeon has been cleared
//   delve           the dungeon run in progress: { region, room, rooms, potions, stubborn }, or null
//   delveFails      per region: knockouts in a row in its dungeon
//   grudges         what has knocked the hero out (the Dwarf quirk reads it)
//   unread          story chapters earned and not yet shown as a card
export const ADVENTURE_FIELDS = () => ({
  travelTo: null, returning: false, questProgress: {}, dungeonClears: {}, delve: null, delveFails: {}, grudges: {}, unread: [],
});
// What Phase 4 keeps on a hero.
//   abilityPoints   ability score points waiting to be spent (two arrive at levels 4, 8, 12, 16, 19)
//   raised          points already put into each ability, for the record
//   cooldowns       per signature move: the hero's age at which it can fire again
//   fresh           true until the first roll after arriving somewhere (Divine Favor reads it)
export const GROWTH_FIELDS = () => ({ abilityPoints: 0, raised: {}, cooldowns: {}, fresh: false });
// Ability points a hero of this level has been granted in all.
export const abilityPointsBy = (level) => ABILITY_POINTS * ABILITY_LEVELS.filter((l) => l <= level).length;

export const STATS = { knockouts: 0, mostEmbarrassingDefeat: null, natural20s: 0, natural1s: 0, tasks: 0, quests: 0, oddJobs: 0, dungeonRuns: 0, dungeonClears: 0 };

// A region is open once the dungeon of the region before it has been cleared. The first always is.
export function regionOpen(hero, regionId) {
  const i = REGION_INDEX[regionId];
  if (i == null) return false;
  return i === 0 || (hero.dungeonClears[REGIONS[i - 1].id] ?? 0) > 0;
}

// `baseScores` are the six ability scores already assigned to abilities, before the race bonus.
export function createHero(state, { name, race, cls, appearance, baseScores }) {
  const hero = {
    id: 'h' + (state.heroes.length + 1) + '-' + roll(state, 1e9).toString(36),
    name: name.trim().slice(0, 24) || randomName(state, race),
    race,
    class: cls,
    subclass: null,
    appearance: { ...appearance },
    level: 1,
    xp: 0,
    hp: 1,
    abilities: withRaceBonus(baseScores, race),
    skillPoints: 0,
    skills: [],
    gear: STARTING_GEAR(),
    gold: 0,
    region: START_REGION,
    focus: 'roam',
    currentTask: null,
    knockedOutUntil: null,
    ...ADVENTURE_FIELDS(),
    ...GROWTH_FIELDS(),
    bestiary: {},
    feats: [],
    stats: { ...STATS },
    age: 0, // seconds this hero has existed; the Chronicle's clock
    lines: 0, // Chronicle lines ever written
    chronicle: [],
  };
  hero.hp = maxHp(hero);
  for (const text of ARRIVAL) chronicle(hero, 'story', text.replace('{name}', hero.name));
  return hero;
}

// Add a Chronicle line (kept to the last 200) and return it.
export function chronicle(hero, kind, text, extra = {}) {
  const line = { n: ++hero.lines, t: hero.age, k: kind, text, ...extra };
  hero.chronicle.push(line);
  if (hero.chronicle.length > CHRONICLE_MAX) hero.chronicle.splice(0, hero.chronicle.length - CHRONICLE_MAX);
  return line;
}

// Add XP and return the levels reached, lowest first. Each level gives a skill point, and levels
// 4, 8, 12, 16, and 19 give two ability score points. Both bank until the player spends them, so
// time away costs nothing. A conscious hero is healed to full by a level-up.
export function gainXp(hero, amount) {
  const reached = [];
  hero.xp += amount;
  while (hero.level < MAX_LEVEL && hero.xp >= xpForLevel(hero.level + 1)) {
    hero.level += 1;
    hero.skillPoints += 1;
    if (ABILITY_LEVELS.includes(hero.level)) hero.abilityPoints += ABILITY_POINTS;
    reached.push(hero.level);
  }
  if (reached.length && hero.knockedOutUntil == null) hero.hp = maxHp(hero);
  return reached;
}

// Spend one banked ability point: +1 to one score, up to 20. Returns true if it was spent.
export function raiseAbility(hero, ability) {
  if (!ABILITIES.includes(ability) || !(hero.abilityPoints > 0) || hero.abilities[ability] >= ABILITY_MAX) return false;
  const before = maxHp(hero);
  hero.abilities[ability] += 1;
  hero.abilityPoints -= 1;
  hero.raised[ability] = (hero.raised[ability] ?? 0) + 1;
  const gained = maxHp(hero) - before; // Constitution adds its hit points at once
  if (gained > 0 && hero.knockedOutUntil == null) hero.hp += gained;
  chronicle(hero, 'growth', `${ABILITY_NAMES[ability]} rises to ${hero.abilities[ability]}. ${ABILITY_RAISED[ability]}`, { ability });
  return true;
}
