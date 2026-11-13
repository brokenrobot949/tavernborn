// d20 checks, the XP curve, proficiency, and the seeded random generator.
// Nothing here touches the page. Every random number comes from `state.rngSeed`, which lives in
// the save, so the same save and the same amount of time always give the same result.

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
export const MAX_LEVEL = 20;
export const ABILITY_LEVELS = [4, 8, 12, 16, 19]; // levels that grant an ability score increase
export const ABILITY_POINTS = 2; // each increase is two points: +2 to one score or +1 to two
export const ABILITY_MAX = 20;

// ----- random numbers (mulberry32; the generator's whole state is one 32-bit number) -----
export function random(state) {
  const a = (state.rngSeed + 0x6d2b79f5) | 0;
  state.rngSeed = a >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randInt = (state, min, max) => min + Math.floor(random(state) * (max - min + 1));
export const roll = (state, sides) => randInt(state, 1, sides);
export const pick = (state, list) => list[Math.floor(random(state) * list.length)];
export function pickWeighted(state, list, weightOf) {
  const weights = list.map(weightOf);
  let r = random(state) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r < 0) return list[i];
  }
  return list[list.length - 1];
}

// ----- numbers every system shares -----
export const mod = (score) => Math.floor((score - 10) / 2);
export const proficiency = (level) => 2 + Math.floor((level - 1) / 4); // +2 at level 1, +6 at 17

// Pacing: hours since creation at which each level should land (design doc, "Leveling and
// pacing"; levels the doc does not list are filled in between).
// Levels 3 to 6 sit later than the doc's first table (40 min, 2 h, 5 h, 10 h): in Rob's play test
// they came too fast to feel earned.
export const LEVEL_TARGET_HOURS = [0, 0, 1 / 6, 1, 3, 6.5, 11, 18, 30, 48, 72, 105, 144, 192, 247, 312, 384, 468, 552, 636, 720];

// XP_RATE[level] is the XP per second a hero is expected to earn while working toward that level,
// so the XP a level costs is its share of the target hours times that rate. A new hero fighting
// at their own level earns about 0.5 a second. From level 7 the rate climbs, because a hero who
// spends their skill points and ability increases earns faster the more of them they have.
// Tuned with the simulator (tools/simulate.html, or `node tools/simulate.mjs`), whose stand-in
// player spends every point: the median simulated hero lands near every target and reaches
// level 20 at about 30 days. Changing a rate moves every saved hero's XP bar; state.js keeps the
// older curves (PAST_CURVES) so an older save keeps its place within its level.
// Phase 5 raised every rate from level 6 by about 6%: gear adds to rolls, to XP, and to what a
// critical pays, so a geared hero earns that much faster.
export const XP_RATE = [0, 0, 0.5, 0.5, 0.5, 0.5, 0.51, 0.57, 0.595, 0.615, 0.635, 0.67, 0.69, 0.715, 0.715, 0.715, 0.715, 0.715, 0.715, 0.74, 0.74];
export function curve(rates) {
  const total = [0, 0];
  for (let level = 2; level <= MAX_LEVEL; level++) total[level] = total[level - 1] + 3600 * (LEVEL_TARGET_HOURS[level] - LEVEL_TARGET_HOURS[level - 1]) * rates[level];
  return total.map(Math.round);
}
const XP_FOR_LEVEL = curve(XP_RATE);
export const xpForLevel = (level) => XP_FOR_LEVEL[Math.min(level, MAX_LEVEL)];
// Curves older saves were made on: [save version, XP rate per level]. Version 1 (Phases 1 and 2)
// priced levels after 6 at 0.48 a second; version 2 (Phase 3) at 0.51.
// Version 3 (Phase 4) is the rate list below.
const flat = (late) => XP_RATE.map((_, level) => (level < 2 ? 0 : level <= 6 ? 0.5 : late));
const PHASE_4_RATE = [0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.54, 0.56, 0.58, 0.6, 0.63, 0.65, 0.675, 0.675, 0.675, 0.675, 0.675, 0.675, 0.7, 0.7];
export const PAST_CURVES = { 1: curve(flat(0.48)), 2: curve(flat(0.51)), 3: curve(PHASE_4_RATE) };

// One d20 check. `rerollOne` is the Goblin quirk: a natural 1 is rolled again, once.
// `critFrom` is the lowest die that counts as a critical (skills lower it from 20).
// `advantage` rolls two dice and keeps the better; `dropped` is the other one.
export function check(state, bonus, dc, { rerollOne = false, critFrom = 20, advantage = false } = {}) {
  let die = roll(state, 20);
  let dropped = null;
  if (advantage) {
    dropped = roll(state, 20);
    if (dropped > die) [die, dropped] = [dropped, die];
  }
  let rerolled = false;
  if (die === 1 && rerollOne) { die = roll(state, 20); rerolled = true; }
  const total = die + bonus;
  const outcome = die >= critFrom ? 'crit' : die === 1 ? 'fumble' : total >= dc ? 'hit' : 'miss';
  return { die, bonus, total, dc, outcome, rerolled, dropped };
}

// Intelligence: XP added per point of modifier. It was 2% before ability scores could rise; at
// that rate a Wizard with Intelligence 20 ran a tenth ahead of every other class.
export const INT_XP = 0.01;

// What each roll result is worth, as a share of the full reward.
export const REWARD = { crit: 1.5, hit: 1, miss: 0.5, fumble: 0.4 };

// The pacing simulator's "what if monsters hit harder?" switch. The game never changes it.
export const WHAT_IF = { damage: 1 };

// Damage from one task. A natural 20 costs nothing, a success costs a little, a miss the full
// die, and a natural 1 the die plus half again.
export function taskDamage(state, outcome, dmgDie, dodgeChance) {
  if (outcome === 'crit') return 0;
  const base = roll(state, dmgDie);
  let dmg = outcome === 'hit' ? Math.floor(base / 3) : outcome === 'miss' ? base : base + Math.ceil(dmgDie / 2);
  if (dmg > 1 && random(state) < dodgeChance) dmg = Math.ceil(dmg / 2); // Dexterity: dodging hits
  return dmg;
}

// ----- fighting above or below your level -----
// A monster, quest, or dungeon above the hero's level is harder to roll against and hits harder
// for every level of the gap, and pays more XP. One below the hero's level pays a little less.
// Pushing ahead is allowed and rarely worth it; staying behind is safe and slow.
export const OUTMATCHED_DC = 1; // added to the DC per level the hero is short
export const OUTMATCHED_DAMAGE = 0.25; // share added to the damage die per level short
const XP_PER_LEVEL_ABOVE = 0.12;
const XP_PER_LEVEL_BELOW = 0.06;
export function levelGapXp(gap) {
  return gap >= 0 ? 1 + Math.min(5, gap) * XP_PER_LEVEL_ABOVE : Math.max(0.4, 1 + gap * XP_PER_LEVEL_BELOW);
}

// ----- a world that expects the hero to grow (Phase 4) -----
// Ability score increases and skills add to every roll and take the edge off every hit. The DCs
// and damage dice written in data/ were tuned in Phase 3 for a hero with neither, so anything of
// level 4 or more is a little harder to roll against and hits a little harder than its entry
// says, rising with its level. The Chronicle prints the DC actually rolled against.
// Tuned with the simulator; rerun it after touching these.
export const GROWN = { dcFrom: [5, 8, 10, 13, 15, 18], damagePerLevel: 0.02, damageFrom: 3 };
export const grownDc = (level) => GROWN.dcFrom.filter((l) => level >= l).length;
export const grownDamage = (level) => 1 + GROWN.damagePerLevel * Math.max(0, level - GROWN.damageFrom);

// Numbers for tasks that are not one written monster: quest steps and dungeon bosses' purses.
// A hero at the task's level needs about an 8 on the die.
export const baseDc = (level) => 11 + proficiency(level);
export const baseDamage = (level) => Math.round(2 + 1.7 * level);
export const baseGold = (level) => [Math.round(1 + 0.5 * level), Math.round(3 + 1.4 * level)];

// ----- quests -----
export const QUEST_STEP_SECONDS = [240, 300];
export const QUEST_XP_PER_SECOND = 0.5; // a step's XP for a full success, per second it took
export const QUEST_DONE_XP = 150; // bonus for finishing the quest
export const QUEST_DAMAGE = 1.3; // quest steps hit harder than a monster of the same level
export const QUEST_GOLD = 6; // a step pays this many monsters' worth of gold
export const questDoneGold = (level) => 20 * (2 + level);
export const STORY_QUESTS = 6;

// ----- dungeons -----
export const DELVE_XP_PER_SECOND = 0.62; // a room's XP for a full success, per second it took
export const DELVE_GOLD = 1; // multiplier on the dungeon's room gold
export const BOSS_SECONDS = [240, 360];
export const BOSS_XP = 400;
export const BOSS_LOSS_SHARE = 0.25; // XP share for losing to the boss
export const bossGold = (level) => 30 * (2 + level);
export const DUNGEON_POTIONS = 2; // potions the hero carries into one run
export const CONFIDENCE_LIMIT = 3; // knockouts in a row in one dungeon before the hero roams instead
export const GRUDGE_BONUS = 2; // Dwarf quirk: added to rolls against anything that has knocked them out

// ----- travel -----
export const TRAVEL_SECONDS_PER_REGION = 150;
export const RETURN_SECONDS_PER_REGION = 75; // walking back out after a knockout, capped at ten minutes

// ----- healing -----
// After each Roam or Quest task the hero gets back a small share of their maximum plus a share of
// whatever is missing. The second part matters: the more hurt the hero is, the more comes back, so
// harder monsters wear a hero down gradually instead of tipping them over all at once.
export const REST_FLAT = 0.05;
export const REST_MISSING = 0.25;
export const restHeal = (max, hp) => Math.max(1, Math.ceil(max * REST_FLAT + (max - hp) * REST_MISSING));

// Knockout recovery: 15 minutes at level 1 up to 2 hours at level 20, before reductions.
export const recoverySeconds = (level) => Math.round(900 + ((level - 1) * (7200 - 900)) / 19);

// Healing potions are bought and drunk automatically when gold allows.
export const POTION_BELOW = 0.35; // drink when HP is under this share of the maximum
export const POTION_HEAL = 0.5;
export const potionPrice = (level) => 8 + 4 * level;

// The tavern cleric ends a knockout at once for a fee that grows with the time left and the
// hero's level. It costs roughly an hour or two of earnings: handy in a session, pointless overnight.
export const skipFee = (level, secondsLeft) => Math.max(5, Math.ceil((secondsLeft / 60) * (4 + 2 * level)));

// ----- growth -----
// Respec at the tavern: all skill points back and the subclass open again. The price rises with
// level: a few hours of a hero's earnings at that level (450 gp at 3, 3,250 at 10, 11,500 at 20).
export const respecPrice = (level) => 25 * level * (level + 3);

// ----- gear and loot (Phase 5; level weighed more after the visual pass) -----
// A piece's power is its rarity (Common 0 to Legendary 4) plus a seventh of a rarity step for every
// level above 1 (`gearPower`). So seven levels are worth one step: a level 3 Legendary (power 4.3)
// is worn until a Very Rare of level 11 or so, or a Rare of level 18, comes along. Every slot does
// one job, and its number is `at20` (what a Legendary of level 20 gives) in proportion to power.
// The starting kit (Common, level 1) is worth exactly nothing. Along the usual path (rarity about a
// fifth of the level) the numbers match the Phase 5 table; a piece far ahead of its level is worth
// less than it was. `keys` are the same numbers skills change (FX_KEYS in js/skills.js). The weapon
// has two lines: power sets its bonus to rolls (a whole number), level what a critical pays.
export const GEAR_LEVEL_STEP = 1 / 7;
export const gearPower = (item) => (item ? item.tier + Math.max(0, item.level - 1) * GEAR_LEVEL_STEP : -1);
export const GEAR_MAX_POWER = 4 + 19 * GEAR_LEVEL_STEP;
export const GEAR_STATS = {
  weapon: { keys: ['roll'], at20: 4, whole: true, also: { keys: ['critReward'], perLevel: 0.02 } },
  offhand: { keys: ['dodge'], at20: 0.07425 },
  head: { keys: ['hp'], at20: 0.099 },
  body: { keys: ['dr'], at20: 0.099 },
  hands: { keys: ['gold'], at20: 0.1485 },
  feet: { keys: ['travel', 'recovery'], at20: 0.2475 },
  cloak: { keys: ['rest', 'potion'], at20: 0.198 },
  trinket: { keys: ['xp'], at20: 0.0495 },
};
export const LOOT = {
  cloakLevel: 5, // the Cloak slot opens, and a Common cloak is handed over
  // Chance of a piece from a monster beaten on the road and from a dungeon room cleared cleanly.
  // Quests and beaten bosses always give one.
  drop: { roam: 0.01, room: 0.1 },
  critDrop: 2, // a natural 20 multiplies the chance
  wisdom: 0.1, // each point of Wisdom modifier adds this share to the chance
  // Rarity: tier = level / 5 + the source's shift + luck (anything up to one tier), rounded down.
  // So each source has a ceiling for its level. A monster on the road never has better than Very
  // Rare on it, and that only near the end; quests run about a tier behind bosses; a boss of level
  // 18 or 20 is where Legendaries come from.
  shift: { roam: -1.6, odd: -1.1, room: -0.9, quest: -0.8, chest: -0.5, boss: -0.2 },
  luck: 1,
  legend: 0.15, // chance that a beaten boss also gives up its dungeon's named Legendary
};
// What a piece sells for: more with its level, doubling with each rarity step.
export const sellPrice = (item) => (5 + 2 * item.level) * 2 ** item.tier;

// ----- the tavern and legacy (Phase 6) -----
// Tavern upgrades are bought with the active hero's gold and belong to The Wobbly Griffin, so
// every hero, present and future, has them. Each has a few ranks; `price[r]` buys rank r + 1.
// A first hero holds about 20,000 gp at level 8, 65,000 at 10, 170,000 at 12, 500,000 at 15, and
// 1.5 million at 20, so the last ranks are what a whole career saves up for. Everything together
// costs about 3 million: more than one hero earns.
//   room      knockout recovery, added to the same number boots and skills use (60% off at most)
//   stable    travel, added to the same number boots use (75% off at most, as before)
//   notice    odd jobs: more XP and gold per rank, and their gear a little rarer
//   trophies  hooks for the trophy wall; nothing else
export const TAVERN = {
  room: { price: [2500, 15000, 60000, 200000, 600000], per: 0.08 },
  stable: { price: [2500, 15000, 60000, 200000, 600000], per: 0.08 },
  notice: { price: [2000, 12000, 50000, 175000, 500000], per: 0.1, quality: 0.1 },
  trophies: { price: [5000, 50000, 300000], hooks: [3, 6, 8] },
};
export const MAX_HEROES = 3; // hero slots on the roster; one adventures at a time
export const LEGACY = { perLegend: 0.02, cap: 0.1 }; // XP for every future hero, per retired legend
export const legacyFor = (legends) => Math.min(LEGACY.cap, LEGACY.perLegend * legends);

// The Planar Rifts: after level 20, an endless dungeon one floor at a time. Each floor is one
// roll, harder than the last; hit points come back a little between floors, as on the road. A
// knockout sends the hero home and the next run starts at floor 1. Every tenth floor has a
// Warden, who always leaves a piece of gear and sometimes one of the eight named Legendaries.
export const RIFT = {
  secs: [90, 150],
  dcEvery: 3, // +1 DC every this many floors
  damagePerFloor: 0.12,
  rewardPerFloor: 0.04, // XP and gold per floor
  wardenEvery: 10,
  legend: 0.05, // chance a Warden also gives up a named Legendary the hero is not wearing
};
// Paragon ranks: titles only. XP earned after level 20 keeps counting, and rank r needs
// `PARAGON_XP * r * (r + 1) / 2` of it: 50,000 for the first, 150,000 for the second, and so on.
export const PARAGON_XP = 50000;
export const paragonXpFor = (rank) => (PARAGON_XP * rank * (rank + 1)) / 2;
export function paragonRankFor(extraXp) {
  const x = Math.max(0, extraXp);
  let r = Math.max(0, Math.floor((Math.sqrt(1 + (8 * x) / PARAGON_XP) - 1) / 2));
  while (paragonXpFor(r + 1) <= x) r += 1; // square roots can land a hair short
  while (r > 0 && paragonXpFor(r) > x) r -= 1;
  return r;
}

// ----- after Phase 7: the road, the merchant, festivals, deeds -----
// Boons: short spells of luck that come from a choice on the road, the travelling merchant, or a
// festival. Each is a handful of the same numbers skills and gear change (FX_KEYS in js/skills.js),
// held on the hero until a time on the hero's own clock (`hero.boons`). The same boon again
// extends the old one rather than stacking on it.
export const BOONS = {
  luck: { roll: 1 },
  scholar: { xp: 0.1 },
  fortune: { gold: 0.15 },
  swift: { travel: 0.3 },
  hardy: { dr: 0.1 },
  keen: { crit: 1 },
  blessed: { roll: 1, rest: 0.3 },
  festive: { xp: 0.1, gold: 0.1 },
  cursed: { roll: -1 },
};
// Choices on the road. Now and then, between tasks out in the open, the hero meets something and
// waits for word from the player. If none comes within `wait`, the hero picks on their own.
export const ROAD = {
  first: [3600, 7200], // the first meeting, in seconds of the hero's age
  every: [3 * 3600, 6 * 3600], // and then one every this many seconds
  wait: 4 * 3600,
  fromLevel: 2,
};
// What a choice pays in XP is worth so many minutes of work at the hero's level. Gold, and what the
// merchant charges, is counted in units that grow with level (25 gp at level 1, about 5,000 at 10,
// and 40,000 at 20) because a hero's purse does.
export const workXp = (level, minutes) => Math.round(minutes * 60 * XP_RATE[Math.max(2, Math.min(MAX_LEVEL, level))]);
export const goldUnit = (level) => Math.round(5 * level ** 3 + 20);
// The travelling merchant: in the Vale on about six days in ten (by the device's calendar), four
// wares on each visit, one of each per visit.
export const MERCHANT = { chance: 0.6, wares: 4 };
