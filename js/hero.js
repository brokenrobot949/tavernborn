// Hero creation and leveling. Pure logic; the page is never touched here.

import { RACES, RACE_TRAITS, HAIR_COLORS, HAIR_STYLES } from '../data/races.js';
import { CLASSES } from '../data/classes.js';
import { NAMES } from '../data/names.js';
import { REGIONS, REGION_INDEX, START_REGION } from '../data/regions.js';
import { ARRIVAL, ABILITY_RAISED } from '../data/chronicle.js';
import { ABILITIES, ABILITY_NAMES, ABILITY_LEVELS, ABILITY_POINTS, ABILITY_MAX, MAX_LEVEL, mod, pick, roll, xpForLevel } from './rules.js';
import { skillMods } from './skills.js';
import { gearMods, startingGear } from './loot.js';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const MAX_ROLLS = 3;
export const CHRONICLE_MAX = 200;
// Highlights (level-ups, dungeons, finished quests, knockouts, Very Rare and Legendary gear) are
// trimmed last, so up to KEPT_MAX of them outlive the ordinary lines of a busy day.
export const KEPT_MAX = 60;
const KEPT_KINDS = new Set(['sitecleared', 'bounty', 'regular', 'deed', 'festival', 'levelup', 'milestone', 'paragon', 'feat', 'knockout', 'boss', 'cleared', 'chapter', 'unlock', 'trophy', 'questdone']);
export const isHighlight = (line) => KEPT_KINDS.has(line.k) || (line.k === 'upgrade' && line.tier >= 3) || (line.k === 'mastery' && line.rank >= 3);

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

// Hit points come from the class, the level, Constitution, skills, and whatever is on the hero's
// head, so they are always recomputed.
export function maxHp(hero) {
  const die = CLASSES[hero.class].hitDie;
  const con = mod(hero.abilities.con);
  const base = Math.max(hero.level, die + (hero.level - 1) * (die / 2 + 1) + hero.level * con);
  const { n } = skillMods(hero);
  return Math.floor(base * (1 + n.hp + (gearMods(hero).hp ?? 0))) + hero.level * n.hpLevel;
}

export const xpToNext = (hero) => (hero.level >= MAX_LEVEL ? null : xpForLevel(hero.level + 1));

// Every hero starts in their class's Common kit (js/loot.js). The Cloak slot opens at level 5
// and the Trinket, which never shows on the sprite, starts empty.

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

export const STATS = { knockouts: 0, mostEmbarrassingDefeat: null, natural20s: 0, natural1s: 0, tasks: 0, quests: 0, oddJobs: 0, dungeonRuns: 0, dungeonClears: 0, itemsFound: 0, upgrades: 0, soldFor: 0, riftRuns: 0, riftFloors: 0, riftBest: 0, choices: 0, choicesAlone: 0, bought: 0, festivals: 0, rares: 0, authorities: 0, siteRuns: 0, siteClears: 0, bounties: 0, errands: 0, regulars: 0, forged: 0, enchanted: 0, mentorWords: 0 };
// What Phase 6 keeps on a hero.
//   rift           the Planar Rifts run in progress: { floor }, or null
//   paragon        Paragon ranks already announced in the Chronicle (titles only)
//   retireOffered  true once the level 20 retirement card has been shown
export const LEGACY_FIELDS = () => ({ rift: null, paragon: 0, retireOffered: false });
// What the road, the merchant, festivals, and deeds keep on a hero (after Phase 7).
//   choice        the meeting on the road waiting for word: { id, at, until }, or null
//   nextChoiceAt  the hero's age at which the next one may turn up (null: not yet set)
//   lastChoice    the last meeting, so the same one does not come twice running
//   boons         short spells of luck: [{ id, until }] (js/boons.js)
//   supplies      { potions }: bought from the merchant, carried into the next dungeon or Rifts run
//   joined        festivals joined, as 'id-year'
//   deeds, title  deeds done (ids) and the one whose title is worn, or null
//   rested        Well Rested: seconds waited at the tavern, three to a second of rest at the tavern (js/tavern.js, REST in rules.js)
export const ROAD_FIELDS = () => ({ choice: null, nextChoiceAt: null, lastChoice: null, boons: [], supplies: { potions: 0 }, joined: [], deeds: [], title: null, rested: 0 });

// What round five keeps on a hero (rare monsters need nothing new: they are counted in the Bestiary).
//   site        the lesser delve that Delve goes to in its own region (an id from data/sites.js), or null for the dungeon
//   siteClears  per lesser delve: times cleared
//   bounty      the bounty taken from the notice board: { day, kind, title, about, monster, need, have, level }, or null
//   bountyDay   the day (js/world.js, dayOf) a bounty was last taken: one a day
//   errands     happenings' errands already done, as 'id-day'
//   seen        the happening last written into the Chronicle, as 'id-day'
export const EXPLORE_FIELDS = () => ({ site: null, siteClears: {}, bounty: null, bountyDay: null, errands: [], seen: null });

// What the smith, mentors, the Rifts' rules, Paragon keepsakes, and the Stats tab's charts keep (after round five).
//   career        for the charts: `days` (per day of the hero's age, [XP, gold held, knockouts, level] as the day's
//                 last task left them), `levelAt` (the hero's age at each level), `ko` (knockouts by region id, or 'rift')
//   enchants      the smith's enchantments, by slot: { weapon: 'keen', ... } (js/smith.js)
//   mentor        the id of the legend in the Hall who has this hero in hand, or null; `mentorDay` the hero's day of
//                 the last word from them, `mentorRescue` the hero's day of the last knockout they shortened
//   riftBests     the deepest floor of the Planar Rifts under each of the Rifts' rules
//   wisp          the colour chosen for the level 15 wisp (an id from WISP_CHOICES), or null for the class's own
export const LATE_FIELDS = () => ({ career: { days: [], levelAt: { 1: 0 }, ko: {} }, enchants: {}, mentor: null, mentorDay: null, mentorRescue: null, riftBests: {}, wisp: null });

// The career, for the Stats tab's charts. `noteCareer` is called by `advance` after every task, so each day
// keeps how it ended; `noteLevel` when a level is reached.
export function noteCareer(hero) {
  const c = (hero.career ??= LATE_FIELDS().career);
  c.days[Math.floor(hero.age / 86400)] = [Math.round(hero.xp), Math.round(hero.gold), hero.stats.knockouts, hero.level];
}
export function noteLevel(hero, level) {
  const c = (hero.career ??= LATE_FIELDS().career);
  c.levelAt[level] ??= hero.age;
}

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
    gear: startingGear(cls),
    gold: 0,
    region: START_REGION,
    focus: 'roam',
    currentTask: null,
    knockedOutUntil: null,
    ...ADVENTURE_FIELDS(),
    ...GROWTH_FIELDS(),
    ...LEGACY_FIELDS(),
    ...ROAD_FIELDS(),
    ...EXPLORE_FIELDS(),
    ...LATE_FIELDS(),
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

// How many highlights a Chronicle list holds, remembered per list so it is not counted again after
// every task. A list the sim did not build itself (a loaded save, a test) is simply counted once.
const highlightCount = new WeakMap();

// Add a Chronicle line (kept to the last 200) and return it.
export function chronicle(hero, kind, text, extra = {}) {
  const line = { n: ++hero.lines, t: hero.age, k: kind, text, ...extra };
  const list = hero.chronicle;
  let highlights = highlightCount.get(list);
  if (highlights == null) { highlights = 0; for (let i = 0; i < list.length; i++) if (isHighlight(list[i])) highlights += 1; }
  list.push(line);
  if (isHighlight(line)) highlights += 1;
  highlightCount.set(list, highlights);
  if (list.length > CHRONICLE_MAX) {
    // Drop the oldest ordinary lines first, and the oldest highlights only beyond KEPT_MAX.
    let over = list.length - CHRONICLE_MAX;
    let spare = Math.max(0, highlights - KEPT_MAX);
    // The usual case is one line too many: take that one out in place (this runs after every task).
    if (over === 1) {
      for (let i = 0; i < list.length; i++) {
        const hl = isHighlight(list[i]);
        if (spare <= 0 && hl) continue;
        list.splice(i, 1);
        if (hl) highlightCount.set(list, highlights - 1);
        break;
      }
    } else hero.chronicle = list.filter((l) => {
      if (over <= 0) return true;
      if (isHighlight(l)) { if (spare <= 0) return true; spare -= 1; }
      over -= 1;
      return false;
    });
  }
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
