// Skill trees: what can be learned, spending points, the subclass, and respec. Pure logic.
//
// A class has one tree of three branches (Might, Guard, Fortune), twelve skills each, in four
// tiers of three. A tier opens after two points are spent in the tier above it. Choosing a
// subclass at level 3 marks one branch as primary; only that branch's last skill, the capstone,
// can be learned. A hero earns at most 27 points (19 levels and 8 Feats) for 36 skills.
//
// A skill does its work in one of two ways, and tasks.js and hero.js read both through `skillMods`:
//   fx   passive numbers, added up across every learned skill (FX_KEYS below)
//   sig  a signature move: tasks.js looks moves up by type and fires them (SIG_TYPES below)
//
// The functions the player uses (`learnSkill`, `chooseSubclass`, `respec`) only change the save and
// write a Chronicle line. The Skills tab, the Tavern tab, and the simulator call the same ones.

import { FIGHTER } from '../data/skills-fighter.js';
import { WIZARD } from '../data/skills-wizard.js';
import { ROGUE } from '../data/skills-rogue.js';
import { CLERIC } from '../data/skills-cleric.js';
import { RESPEC_DONE } from '../data/chronicle.js';
import { chronicle, maxHp } from './hero.js';
import { respecPrice } from './rules.js';

export const MAX_SKILLS = 27;
export const TIER_SIZE = 3;
export const TIER_GATE = 2; // points in the tier above before a tier opens
export const SUBCLASS_LEVEL = 3;
export const BRANCH_KINDS = { might: 'Might', guard: 'Guard', fortune: 'Fortune' };

// Passive numbers a skill may change. All are fractions unless noted.
export const FX_KEYS = {
  roll: 'added to every d20 roll (whole number)',
  rollRoam: 'added to rolls against roaming monsters', rollQuest: 'added to quest rolls',
  rollDelve: 'added to dungeon room rolls', rollBoss: 'added to boss rolls',
  crit: 'widens the critical range by this many faces of the die (whole number)',
  critReward: 'added to the reward share of a critical', missReward: 'added to the reward share of a failed roll',
  xp: 'XP from every source', xpRoam: 'XP from roaming', xpQuest: 'XP from quests', xpDelve: 'XP from dungeon rooms', xpBoss: 'XP from bosses',
  gold: 'gold from every source', goldRoam: 'gold from roaming', goldQuest: 'gold from quests', goldDelve: 'gold from dungeon rooms', goldBoss: 'gold from bosses',
  dr: 'damage taken, everywhere', drRoam: 'damage while roaming', drQuest: 'damage on quests', drDelve: 'damage in dungeon rooms',
  drBoss: 'damage from bosses', drTrap: 'damage in dungeon rooms with no monster in them',
  dodge: 'chance to halve a hit', hp: 'maximum hit points', hpLevel: 'maximum hit points per level (whole number)',
  rest: 'healing between tasks', potion: 'healing from a potion', potionPrice: 'off the price of a potion', potions: 'extra potions per dungeon run (whole number)',
  speedRoam: 'off the length of monster tasks', speedQuest: 'off the length of quest steps', speedDelve: 'off the length of dungeon rooms',
  quality: 'added to the rarity of everything found, in rarity steps',
  travel: 'off travel time', recovery: 'off knockout recovery', rooms: 'fewer rooms per dungeon run (whole number)',
};

// Signature moves, by type. tasks.js holds the code for each.
export const SIG_TYPES = {
  autoWin: 'a chance to win a task outright, with no roll and no damage',
  reroll: 'a failed roll (or a natural 1) is made again',
  turn: 'a chance that a failed roll counts as a success',
  advantage: 'a roll made twice, keeping the better die',
  clearRoom: 'once per dungeon run, a failed room is cleared anyway',
  skipRoom: 'once per dungeon run, a room is skipped',
  shortcut: 'dungeon runs lose rooms',
  hiddenRoom: 'a chance of a hidden room on each dungeon run, with gold and a chest in it',
  negate: 'a chance that a failed roll costs no hit points',
  cheatDeath: 'drops to 1 hit point (or better) instead of 0',
  secondWind: 'recovers hit points in a dungeon when low',
  roomHeal: 'recovers hit points between dungeon rooms',
  shortRest: 'recovers hit points on the road when low',
  freeBossHit: 'opens a boss fight with a blow already landed',
  smite: 'criticals count for more against a boss',
  bossShield: 'the first exchanges of a boss fight cost no hit points',
  bossPurse: 'a beaten boss pays more gold and drops more gear',
  windfall: 'a chance of double gold for a finished quest',
  bonusLoot: 'a chance of a second piece of gear whenever a room, a chest, a boss, or a quest gives one',
  onCrit: 'a natural 20 pays or heals more',
};

export const TREES = { fighter: FIGHTER, wizard: WIZARD, rogue: ROGUE, cleric: CLERIC };

// Every skill by id, with where it sits: { ...skill, cls, branch, kind, tier (1 to 4), capstone }.
export const SKILL_BY_ID = {};
export const BRANCH_BY_ID = {};
for (const tree of Object.values(TREES)) {
  for (const branch of tree.branches) {
    BRANCH_BY_ID[branch.id] = { ...branch, cls: tree.class };
    branch.skills.forEach((skill, i) => {
      SKILL_BY_ID[skill.id] = { ...skill, cls: tree.class, branch: branch.id, kind: branch.kind, tier: Math.floor(i / TIER_SIZE) + 1, capstone: i === branch.skills.length - 1 };
    });
  }
}
export const ALL_SKILLS = Object.values(SKILL_BY_ID);

export const treeFor = (hero) => TREES[hero.class];
export const subclassName = (hero) => (hero.subclass ? BRANCH_BY_ID[hero.subclass]?.name ?? null : null);
export const hasSkill = (hero, id) => hero.skills.includes(id);

// Points the hero has spent in one tier of one branch.
export function pointsIn(hero, branchId, tier) {
  let n = 0;
  for (const id of hero.skills) {
    const s = SKILL_BY_ID[id];
    if (s && s.branch === branchId && s.tier === tier) n += 1;
  }
  return n;
}

// Why a skill cannot be learned right now, or null if it can. The Skills tab shows the reason.
export function whyNot(hero, id) {
  const s = SKILL_BY_ID[id];
  if (!s || s.cls !== hero.class) return 'Not a skill of this class.';
  if (hero.skills.includes(id)) return 'Learned.';
  if (hero.skills.length >= MAX_SKILLS) return `A hero learns at most ${MAX_SKILLS} skills.`;
  if (s.tier > 1 && pointsIn(hero, s.branch, s.tier - 1) < TIER_GATE) return `Opens after ${TIER_GATE} skills in tier ${s.tier - 1} of this branch.`;
  if (s.capstone && hero.subclass !== s.branch) {
    return hero.subclass ? `Capstone. Only a ${BRANCH_BY_ID[s.branch].name} can learn it.` : `Capstone. Needs the ${BRANCH_BY_ID[s.branch].name} subclass.`;
  }
  if (hero.skillPoints < 1) return 'No skill points to spend.';
  return null;
}
export const canLearn = (hero, id) => whyNot(hero, id) === null;

const fill = (text, hero) => text.replace(/\{name\}/g, hero.name);

// Spend one point on a skill. Returns true if it was learned.
export function learnSkill(hero, id) {
  if (!canLearn(hero, id)) return false;
  const before = maxHp(hero);
  hero.skills.push(id);
  hero.skillPoints -= 1;
  const gained = maxHp(hero) - before; // a skill that adds hit points adds them now
  if (gained > 0 && hero.knockedOutUntil == null) hero.hp += gained;
  chronicle(hero, 'learned', fill(SKILL_BY_ID[id].learn, hero), { skill: id });
  return true;
}

export const canChooseSubclass = (hero) => hero.level >= SUBCLASS_LEVEL && !hero.subclass;

// Pick a subclass: one of the class's three branches, from level 3. It stays until a respec.
export function chooseSubclass(hero, branchId) {
  const branch = BRANCH_BY_ID[branchId];
  if (!canChooseSubclass(hero) || !branch || branch.cls !== hero.class) return false;
  hero.subclass = branchId;
  chronicle(hero, 'growth', fill(branch.chosen, hero), { subclass: branchId });
  return true;
}

// Respec at the tavern: every point comes back and the subclass is open again. Ability score
// increases are kept. The price rises with level; there is nothing to pay for until something
// has been chosen.
export function respecCost(hero) {
  return hero.skills.length || hero.subclass ? respecPrice(hero.level) : null;
}
export function respec(hero) {
  const cost = respecCost(hero);
  if (cost == null || hero.gold < cost) return null;
  hero.gold -= cost;
  hero.skillPoints += hero.skills.length;
  hero.skills = [];
  hero.subclass = null;
  hero.cooldowns = {};
  hero.hp = Math.max(hero.knockedOutUntil == null ? 1 : 0, Math.min(hero.hp, maxHp(hero)));
  chronicle(hero, 'growth', RESPEC_DONE.replace('{cost}', cost).replace('{points}', hero.skillPoints), { cost });
  return cost;
}

// What is waiting for the player on the Skills tab. The badge on the tab button shows `total`.
export function pending(hero) {
  const points = hero.skills.length >= MAX_SKILLS ? 0 : hero.skillPoints;
  const subclass = canChooseSubclass(hero) ? 1 : 0;
  const abilities = hero.abilityPoints ?? 0;
  return { points, subclass, abilities, total: points + subclass + abilities };
}

// ---------- what the learned skills add up to ----------

const EMPTY = () => Object.fromEntries(Object.keys(FX_KEYS).map((k) => [k, 0]));
const cache = new WeakMap();

// { n: every FX_KEYS number summed, sigs: { type: [{ id, name, fire, ...sig }] } }
export function skillMods(hero) {
  const key = hero.skills.join(',');
  const hit = cache.get(hero);
  if (hit && hit.key === key) return hit.mods;
  const n = EMPTY();
  const sigs = {};
  for (const id of hero.skills) {
    const s = SKILL_BY_ID[id];
    if (!s) continue;
    for (const [k, v] of Object.entries(s.fx ?? {})) n[k] += v;
    if (s.sig) (sigs[s.sig.type] ??= []).push({ id: s.id, name: s.name, fire: s.fire, ...s.sig });
  }
  const mods = { n, sigs };
  cache.set(hero, { key, mods });
  return mods;
}
