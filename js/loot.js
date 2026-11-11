// Item generation, auto-equip, auto-sell. Pure logic: no page, no clock, and every random number
// from the seeded generator in the save.
//
// A piece of gear is { tier (0 Common to 4 Legendary), level, name } and, for a dungeon's named
// Legendary, `legend` (the region id; its flavour text is in data/loot.js). The slot is the key it
// sits under in `hero.gear`. Nothing is ever kept in a bag: a piece that is better than the one
// worn goes on at once and the old one is sold, and anything else is sold on the spot.
//
// "Better" is rarity first, then level. So the sprite, which shows each slot's rarity, only ever
// moves up. What a piece does is in GEAR_STATS (js/rules.js): one job per slot.
//
// tasks.js decides when something drops and writes the Chronicle line; this file makes the piece
// (`rollItem`, `legendItem`), judges it (`better`), and hands it over (`receive`). `gearMods`
// is the one door from gear into the rules, as `skillMods` is for skills.

import { TIERS } from '../data/items.js';
import {
  GEAR_SLOTS, NOUNS, TRINKETS, STARTING_NAMES, STARTING_CLOAK, ADVERBS, ADJECTIVES, DEGREES, QUALITIES, WHICH, WHAT, LEGENDARIES,
} from '../data/loot.js';
import { DUNGEONS } from '../data/dungeons.js';
import { GEAR_STATS, LOOT, sellPrice, mod, pick, random } from './rules.js';

export const SLOT_IDS = GEAR_SLOTS.map((s) => s.id);
export const SLOT_BY_ID = Object.fromEntries(GEAR_SLOTS.map((s) => [s.id, s]));
export const MAX_TIER = TIERS.length - 1;
export { sellPrice };

// ---------- what a hero starts with ----------

export function startingGear(cls) {
  const names = STARTING_NAMES[cls];
  const gear = {};
  for (const id of SLOT_IDS) gear[id] = names[id] ? { tier: 0, level: 1, name: names[id] } : null;
  return gear;
}
export const startingCloak = () => ({ tier: 0, level: LOOT.cloakLevel, name: STARTING_CLOAK });
export const slotOpen = (hero, slot) => slot !== 'cloak' || hero.level >= LOOT.cloakLevel;

// ---------- what a piece does ----------

const amount = (rule, item) => item.tier * rule.perTier + Math.max(0, item.level - 1) * rule.perLevel;

// The numbers one piece adds, keyed like FX_KEYS: { roll: 2, critReward: 0.16 } for a weapon.
export function itemStats(slot, item) {
  const out = {};
  if (!item) return out;
  for (let rule = GEAR_STATS[slot]; rule; rule = rule.also) {
    const value = amount(rule, item);
    for (const key of rule.keys) out[key] = value;
  }
  return out;
}

const pct = (v) => {
  const p = v * 100;
  return (p >= 10 || Number.isInteger(+p.toFixed(1)) ? p.toFixed(0) : p.toFixed(1)) + '%';
};
const WORDS = {
  roll: (v) => `+${v} to every roll`,
  critReward: (v) => `criticals pay ${pct(v / 1.5)} more`,
  dodge: (v) => `+${pct(v)} chance to halve a hit`,
  hp: (v) => `+${pct(v)} hit points`,
  dr: (v) => `${pct(v)} less damage taken`,
  gold: (v) => `+${pct(v)} gold`,
  travel: (v) => `travel and knockout recovery ${pct(v)} quicker`,
  rest: (v) => `rests and potions heal ${pct(v)} more`,
  xp: (v) => `+${pct(v)} XP`,
};
// "+2 to every roll, criticals pay 11% more". A piece that does nothing yet says so.
export function describe(slot, item) {
  const stats = itemStats(slot, item);
  const parts = Object.keys(WORDS).filter((k) => stats[k] > 0).map((k) => WORDS[k](stats[k]));
  return parts.length ? parts.join(', ') : 'No bonus. It is, at least, paid for.';
}
export const rarityName = (item) => TIERS[item.tier].name;
export const flavorOf = (item) => (item?.legend ? LEGENDARIES[item.legend]?.flavor ?? null : null);

// Everything the hero is wearing, added up. Cached until a slot's piece changes.
const cache = new WeakMap();
export function gearMods(hero) {
  const hit = cache.get(hero);
  if (hit && SLOT_IDS.every((id, i) => hit.items[i] === hero.gear[id])) return hit.mods;
  const mods = {};
  for (const id of SLOT_IDS) {
    for (const [k, v] of Object.entries(itemStats(id, hero.gear[id]))) mods[k] = (mods[k] ?? 0) + v;
  }
  cache.set(hero, { items: SLOT_IDS.map((id) => hero.gear[id]), mods });
  return mods;
}
// The same totals in words, for the Gear tab.
export function describeAll(hero) {
  const mods = gearMods(hero);
  return Object.keys(WORDS).filter((k) => mods[k] > 0).map((k) => WORDS[k](mods[k]));
}

// ---------- judging ----------

// Rarity first, then level. An empty slot loses to anything.
export const better = (item, worn) => !worn || item.tier > worn.tier || (item.tier === worn.tier && item.level > worn.level);

// The open slot most in need of something: empty first, then lowest rarity, then lowest level.
export function weakestSlot(hero) {
  let worst = null;
  for (const id of SLOT_IDS) {
    if (!slotOpen(hero, id)) continue;
    const it = hero.gear[id];
    const rank = it ? it.tier * 100 + it.level : -1;
    if (!worst || rank < worst.rank) worst = { id, rank };
  }
  return worst.id;
}

// ---------- making a piece ----------

function nameFor(state, cls, slot, tier) {
  const [noun, kind] = slot === 'trinket' ? pick(state, TRINKETS[tier]) : NOUNS[cls][slot][tier];
  const way = Math.floor(random(state) * 3);
  if (way === 0) return `${pick(state, ADVERBS[tier])} ${pick(state, ADJECTIVES[kind])} ${noun}`;
  if (way === 1) return `${noun} of ${pick(state, DEGREES[tier])} ${pick(state, QUALITIES)}`;
  return `${noun} of the ${pick(state, WHICH)} ${pick(state, WHAT)}`;
}

// The rarity of something found: its level, where it came from, any skill that sharpens the eye,
// and luck.
export function rollTier(state, level, source, quality = 0) {
  const t = Math.floor(level / 5 + (LOOT.shift[source] ?? 0) + quality + random(state) * LOOT.luck);
  return Math.max(0, Math.min(MAX_TIER, t));
}

// One generated piece: { slot, item }. `slot` may be given (a story quest pays into the slot that
// needs it most); otherwise any open slot.
export function rollItem(state, hero, { level, source, slot = null, quality = 0 }) {
  const open = SLOT_IDS.filter((id) => slotOpen(hero, id));
  const where = slot && open.includes(slot) ? slot : pick(state, open);
  const tier = rollTier(state, level, source, quality);
  return { slot: where, item: { tier, level, name: nameFor(state, hero.class, where, tier) } };
}

// A dungeon's named Legendary, at the dungeon's level.
export function legendItem(regionId) {
  const l = LEGENDARIES[regionId];
  return { slot: l.slot, item: { tier: MAX_TIER, level: DUNGEONS[regionId].level, name: l.name, legend: regionId } };
}
export const wearsLegend = (hero, regionId) => hero.gear[LEGENDARIES[regionId].slot]?.legend === regionId;

// Chance of a piece from a won fight or a cleared room. Wisdom spots more; a natural 20 finds more.
export function dropChance(hero, source, crit) {
  return LOOT.drop[source] * (1 + LOOT.wisdom * Math.max(0, mod(hero.abilities.wis))) * (crit ? LOOT.critDrop : 1);
}

// ---------- handing it over ----------

// Equip the piece if it is better than what is worn and sell whichever one loses.
// Returns { equipped, old (the piece worn before, or null), gold (what the sale paid) }.
export function receive(hero, slot, item) {
  const old = hero.gear[slot] ?? null;
  const equipped = better(item, old);
  const sold = equipped ? old : item;
  const gold = sold ? sellPrice(sold) : 0;
  if (equipped) hero.gear[slot] = item;
  hero.gold += gold;
  hero.stats.itemsFound += 1;
  if (equipped) hero.stats.upgrades += 1;
  hero.stats.soldFor += gold;
  return { equipped, old, gold };
}
