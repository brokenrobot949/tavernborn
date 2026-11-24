// Skill trees: what can be learned, spending points, the subclass, and respec. Pure logic.
//
// A class has one tree of three branches (Might, Guard, Fortune), eight skills each, in five rows:
//   row 1  two passives with ranks (usually 3; roll bonuses 2)
//   row 2  a fork: two signature moves, of which a hero may learn one
//   row 3  one passive with ranks
//   row 4  a second fork of two moves
//   row 5  the capstone, which only that branch's subclass (chosen at level 3) can learn
// Each point learns a skill or raises it a rank. A row opens once enough points are in the branch
// (`ROW_GATE`: 0, 2, 4, 6, 8). A branch holds 11 or 12 points (`branchPoints`); a hero earns at most 27
// (19 levels and 8 Feats). `hero.skills` lists one entry per point, so a skill at rank 3 is there
// three times, and `fx` (per rank) adds up by itself.
//
// A skill does its work in one of two ways, and tasks.js and hero.js read both through `skillMods`:
//   fx   passive numbers, added up across every learned rank (FX_KEYS below)
//   sig  a signature move: tasks.js looks moves up by type and fires them (SIG_TYPES below)
//
// The functions the player uses (`learnSkill`, `chooseSubclass`, `respec`) only change the save and
// write a Chronicle line. The Skills tab, the Tavern tab, and the simulator call the same ones.

import { FIGHTER } from '../data/skills-fighter.js';
import { WIZARD } from '../data/skills-wizard.js';
import { ROGUE } from '../data/skills-rogue.js';
import { CLERIC } from '../data/skills-cleric.js';
import { BARBARIAN } from '../data/skills-barbarian.js';
import { RANGER } from '../data/skills-ranger.js';
import { RESPEC_DONE, RANK_UP } from '../data/chronicle.js';
import { chronicle, maxHp } from './hero.js';
import { respecPrice } from './rules.js';

export const MAX_SKILLS = 27; // points a hero can spend in all
export const ROWS = [[0, 1], [2, 3], [4], [5, 6], [7]]; // a branch's skills, by row
export const ROW_GATE = [0, 2, 4, 6, 8]; // points in the branch before each row opens
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

export const TREES = { fighter: FIGHTER, wizard: WIZARD, rogue: ROGUE, cleric: CLERIC, barbarian: BARBARIAN, ranger: RANGER };

// Every skill by id, with where it sits: { ...skill, cls, branch, kind, row (1 to 5), ranks, fork (the other
// skill of its fork, or null), capstone }.
export const SKILL_BY_ID = {};
export const BRANCH_BY_ID = {};
for (const tree of Object.values(TREES)) {
  for (const branch of tree.branches) {
    BRANCH_BY_ID[branch.id] = { ...branch, cls: tree.class };
    ROWS.forEach((row, r) => row.forEach((i) => {
      const skill = branch.skills[i];
      const other = row.length === 2 && r % 2 === 1 ? branch.skills[row[0] === i ? row[1] : row[0]].id : null;
      SKILL_BY_ID[skill.id] = { ...skill, cls: tree.class, branch: branch.id, kind: branch.kind, row: r + 1, ranks: skill.ranks ?? 1, fork: other, capstone: i === 7 };
    }));
  }
}
export const ALL_SKILLS = Object.values(SKILL_BY_ID);

export const treeFor = (hero) => TREES[hero.class];
export const subclassName = (hero) => (hero.subclass ? BRANCH_BY_ID[hero.subclass]?.name ?? null : null);
export const hasSkill = (hero, id) => hero.skills.includes(id);
export const rankOf = (hero, id) => hero.skills.reduce((n, k) => n + (k === id), 0);

// What one branch can hold: every rank, counting one side of each fork.
export const branchPoints = (branch) => branch.skills.reduce((n, k) => n + (k.ranks ?? 1), 0) - 2;

// Points the hero has spent in one branch, every rank counted.
export function pointsIn(hero, branchId) {
  let n = 0;
  for (const id of hero.skills) if (SKILL_BY_ID[id]?.branch === branchId) n += 1;
  return n;
}

// Why a skill cannot be learned right now, or null if it can. The Skills tab shows the reason.
export function whyNot(hero, id) {
  const s = SKILL_BY_ID[id];
  if (!s || s.cls !== hero.class) return 'Not a skill of this class.';
  if (rankOf(hero, id) >= s.ranks) return 'Learned.';
  if (hero.skills.length >= MAX_SKILLS) return `A hero spends at most ${MAX_SKILLS} points.`;
  if (s.fork && hero.skills.includes(s.fork)) return `${SKILL_BY_ID[s.fork].name} was chosen instead. A respec at the tavern reopens the choice.`;
  const gate = ROW_GATE[s.row - 1];
  if (pointsIn(hero, s.branch) < gate) return `Opens at ${gate} points in ${BRANCH_BY_ID[s.branch].name}.`;
  if (s.capstone && hero.subclass !== s.branch) {
    return hero.subclass ? `Capstone. Only a ${BRANCH_BY_ID[s.branch].name} can learn it.` : `Capstone. Needs the ${BRANCH_BY_ID[s.branch].name} subclass.`;
  }
  if (hero.skillPoints < 1) return 'No skill points to spend.';
  return null;
}
export const canLearn = (hero, id) => whyNot(hero, id) === null;

const fill = (text, hero) => text.replace(/\{name\}/g, hero.name);

// Spend one point on a skill: learn it, or raise it a rank. Returns true if it was spent.
export function learnSkill(hero, id) {
  if (!canLearn(hero, id)) return false;
  const before = maxHp(hero);
  hero.skills.push(id);
  hero.skillPoints -= 1;
  const gained = maxHp(hero) - before; // a skill that adds hit points adds them now
  if (gained > 0 && hero.knockedOutUntil == null) hero.hp += gained;
  const s = SKILL_BY_ID[id];
  const rank = rankOf(hero, id);
  const text = rank === 1 ? fill(s.learn, hero) : RANK_UP[rank === s.ranks ? 'top' : 'more'].replaceAll('{skill}', s.name).replaceAll('{rank}', rank).replaceAll('{ranks}', s.ranks);
  chronicle(hero, 'learned', text, { skill: id, rank });
  return true;
}

// A save's list of skills, made sound: this class's only, no rank past the top, one side of each fork,
// rows in order, and no more than a hero can spend. Anything that fails is dropped (its point comes back).
export function soundSkills(cls, list, subclass) {
  const out = [];
  const probe = { class: cls, skills: out, subclass, skillPoints: 1 };
  for (const id of Array.isArray(list) ? list : []) if (typeof id === 'string' && whyNot(probe, id) === null) out.push(id);
  return out;
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
