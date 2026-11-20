// The smith at the tavern (after round five): reforging a piece and enchanting a slot, paid from the hero's
// purse. Pure logic: the two choices change the save and write a Chronicle line, nothing else. The numbers
// are in js/rules.js (SMITH, ENCHANTS, forgePrice, enchantPrice), the words in data/tavern.js.
//
//   Reforging (`reforge`): the piece in a slot counts as one level more (`forge` on the piece, 3 at most).
//     It goes with the piece: if something better turns up, the piece and the work on it are sold together.
//   Enchanting (`enchant`): `hero.enchants[slot]` is one of the eight in ENCHANTS. It belongs to the slot, so
//     it stays when the piece there changes. Each may be on one slot at a time; enchanting another slot with
//     one already on moves it. What they add is counted in `gearMods` (js/loot.js) with the gear itself.

import { SMITH, ENCHANTS, forgePrice, enchantPrice } from './rules.js';
import { SMITH_TEXT, ENCHANT_TEXT } from '../data/tavern.js';
import { SLOT_IDS, SLOT_BY_ID } from './loot.js';
import { chronicle, maxHp } from './hero.js';

export const ENCHANT_IDS = Object.keys(ENCHANTS);
export { forgePrice, enchantPrice, SMITH };
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const gp = (n) => `-${n.toLocaleString('en-US')} gp`;

export const enchantOn = (hero, slot) => (ENCHANTS[hero.enchants?.[slot]] ? hero.enchants[slot] : null);
export const slotOfEnchant = (hero, id) => SLOT_IDS.find((s) => hero.enchants?.[s] === id) ?? null;

// A piece with one more reforging, for showing what it would do before paying.
export const reforged = (item) => (item ? { ...item, forge: (item.forge ?? 0) + 1 } : null);

// Hit points added by a better piece or an enchantment are added at once, as a better helm's are.
function keepHp(hero, before) {
  const gained = maxHp(hero) - before;
  if (gained > 0 && hero.knockedOutUntil == null) hero.hp += gained;
}

// Reforge the piece in a slot. Returns the price paid, or null.
export function reforge(state, hero, slot) {
  const item = hero?.gear[slot];
  const price = forgePrice(item);
  if (price == null || hero.gold < price) return null;
  const before = maxHp(hero);
  hero.gold -= price;
  hero.gear[slot] = reforged(item); // a new object, so the cached gear numbers are worked out again
  keepHp(hero, before);
  hero.stats.forged = (hero.stats.forged ?? 0) + 1;
  chronicle(hero, 'smith', fill(SMITH_TEXT.forged, { item: item.name, name: hero.name, times: SMITH_TEXT.times[item.forge ?? 0] }), { gain: gp(price), slot });
  return price;
}

// Put an enchantment on a slot (moving it if it is on another). Returns the price paid, or null.
export function enchant(state, hero, slot, id) {
  if (!hero || !SLOT_BY_ID[slot] || !ENCHANTS[id] || enchantOn(hero, slot) === id) return null;
  const price = enchantPrice(hero.level);
  if (hero.gold < price) return null;
  const before = maxHp(hero);
  const from = slotOfEnchant(hero, id);
  const next = { ...hero.enchants };
  if (from) delete next[from];
  next[slot] = id;
  hero.enchants = next; // a new object, so the cached gear numbers are worked out again
  hero.gold -= price;
  keepHp(hero, before);
  hero.stats.enchanted = (hero.stats.enchanted ?? 0) + 1;
  const words = { enchant: ENCHANT_TEXT[id].name, name: hero.name, slot: SLOT_BY_ID[slot].name.toLowerCase() };
  chronicle(hero, 'smith', fill(from ? SMITH_TEXT.moved : SMITH_TEXT.enchanted, words), { gain: gp(price), roll: `${ENCHANT_TEXT[id].name}: ${ENCHANT_TEXT[id].does}`, slot });
  return price;
}
