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
// Tuned with the Phase 2 simulator (tools/simulate.html, or `node tools/simulate.mjs`). Past
// level 6 a hero earns a little slower, because tougher monsters mean more misses and the odd
// knockout, so those hours are priced at XP_PER_SECOND_LATE. With both rates the median simulated
// hero lands within a few percent of every target and reaches level 20 at about 30 days.
export const LEVEL_TARGET_HOURS = [0, 0, 1 / 6, 1, 3, 6.5, 11, 18, 30, 48, 72, 105, 144, 192, 247, 312, 384, 468, 552, 636, 720];
export const XP_PER_SECOND = 0.5;
export const XP_PER_SECOND_LATE = 0.48;
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

// Damage from one task. A natural 20 costs nothing, a success costs a little, a miss the full
// die, and a natural 1 the die plus half again.
export function taskDamage(state, outcome, dmgDie, dodgeChance) {
  if (outcome === 'crit') return 0;
  const base = roll(state, dmgDie);
  let dmg = outcome === 'hit' ? Math.floor(base / 3) : outcome === 'miss' ? base : base + Math.ceil(dmgDie / 2);
  if (dmg > 1 && random(state) < dodgeChance) dmg = Math.ceil(dmg / 2); // Dexterity: dodging hits
  return dmg;
}

// Knockout recovery: 15 minutes at level 1 up to 2 hours at level 20, before reductions.
export const recoverySeconds = (level) => Math.round(900 + ((level - 1) * (7200 - 900)) / 19);

// Healing potions are bought and drunk automatically when gold allows.
export const POTION_BELOW = 0.35; // drink when HP is under this share of the maximum
export const POTION_HEAL = 0.5;
export const potionPrice = (level) => 8 + 4 * level;
