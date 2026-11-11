// d20 checks, the XP curve, proficiency, and the seeded random generator.
// Nothing here touches the page. Every random number comes from `state.rngSeed`, which lives in
// the save, so the same save and the same amount of time always give the same result.

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
export const MAX_LEVEL = 20;

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
// pacing"; levels the doc does not list are filled in between). A hero fighting at their own
// level earns about XP_PER_SECOND, so the XP needed is just the target time times that rate.
// Levels 3 to 6 sit later than the doc's first table (40 min, 2 h, 5 h, 10 h): in Rob's play test
// they came too fast to feel earned.
// Tuned with the simulator (tools/simulate.html, or `node tools/simulate.mjs`). The hours after
// level 6 are priced at XP_PER_SECOND_LATE. Phase 3 retuned it from 0.48 to 0.51 for the real
// regions, quests, and dungeons: with both rates the median simulated hero lands within a few
// percent of every target and reaches level 20 at about 29.5 days. Changing either rate moves
// every saved hero's XP bar; state.js rescales version 1 saves and would need the same again.
export const LEVEL_TARGET_HOURS = [0, 0, 1 / 6, 1, 3, 6.5, 11, 18, 30, 48, 72, 105, 144, 192, 247, 312, 384, 468, 552, 636, 720];
export const XP_PER_SECOND = 0.5;
export const XP_PER_SECOND_LATE = 0.51;
const LATE_FROM_HOURS = LEVEL_TARGET_HOURS[6];
export function xpForLevel(level) {
  const hours = LEVEL_TARGET_HOURS[Math.min(level, MAX_LEVEL)];
  const early = Math.min(hours, LATE_FROM_HOURS);
  return Math.round(3600 * (early * XP_PER_SECOND + (hours - early) * XP_PER_SECOND_LATE));
}

// One d20 check. `rerollOne` is the Goblin quirk: a natural 1 is rolled again, once.
export function check(state, bonus, dc, { rerollOne = false } = {}) {
  let die = roll(state, 20);
  let rerolled = false;
  if (die === 1 && rerollOne) { die = roll(state, 20); rerolled = true; }
  const total = die + bonus;
  const outcome = die === 20 ? 'crit' : die === 1 ? 'fumble' : total >= dc ? 'hit' : 'miss';
  return { die, bonus, total, dc, outcome, rerolled };
}

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
