// The smith's section of the Tavern tab (after round five): every slot with a piece in it, with what a
// reforging would change and the enchantment on the slot. Both are paid from the purse of the hero who is
// out, and both ask for a second tap. Rules in js/smith.js.

import { TIERS } from '../../data/items.js';
import { GEAR_SLOTS } from '../../data/loot.js';
import { SMITH_TEXT, ENCHANT_TEXT } from '../../data/tavern.js';
import { describe } from '../loot.js';
import { reforge, enchant, reforged, enchantOn, slotOfEnchant, forgePrice, enchantPrice, ENCHANT_IDS, SMITH } from '../smith.js';
import { el, num, confirmBtn } from './dom.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';

const TIMES = ['Not yet reforged', 'Reforged once', 'Reforged twice', 'Reforged three times'];
const sentence = (text) => text[0].toUpperCase() + text.slice(1) + '.';

// A key for redrawing: what the section shows, and which prices the purse can meet.
export function smithKey(hero) {
  const ep = enchantPrice(hero.level);
  return JSON.stringify([hero.id, hero.level, hero.gear, hero.enchants, hero.gold >= ep, GEAR_SLOTS.map((s) => hero.gold >= (forgePrice(hero.gear[s.id]) ?? Infinity))]);
}

// The section's contents. `done` is called after anything is bought.
export function smithPanel(state, hero, done) {
  const ep = enchantPrice(hero.level);
  const cards = GEAR_SLOTS.filter((slot) => hero.gear[slot.id]).map((slot) => {
    const item = hero.gear[slot.id];
    const tier = TIERS[item.tier];
    const price = forgePrice(item);
    const kids = [
      el('div', { className: 'slot-head' }, el('span', { className: 'slot-icon' }, icon(slot.id)), el('span', { className: 'slot-name', textContent: slot.name })),
      el('p', { className: 'slot-item', textContent: item.name }),
      el('span', { className: 'rarity-chip', textContent: `${tier.name} · Level ${item.level} · ${TIMES[item.forge ?? 0]}` }),
      el('p', { className: 'slot-does', textContent: `Now: ${describe(slot.id, item)}.` }),
    ];
    // Reforging: what it would do, and the price.
    if (price == null) kids.push(el('p', { className: 'hint', textContent: `Reforged ${SMITH.forgeMax} times. Brannoc says any more and it would be a different piece.` }));
    else {
      const after = describe(slot.id, reforged(item));
      kids.push(el('p', { className: 'hint', textContent: after === describe(slot.id, item) ? 'Reforged, it would count as a level more, though the numbers would not show it yet.' : `Reforged: ${after}.` }));
      const b = confirmBtn(`Reforge for ${num(price)} gp`, `Tap again: pay ${num(price)} gp`, () => { if (reforge(state, hero, slot.id) != null) { sfx('coins'); done(); } }, 'btn');
      b.disabled = hero.gold < price;
      kids.push(el('div', { className: 'row' }, b));
    }
    // The enchantment on the slot, and a choice of another.
    const on = enchantOn(hero, slot.id);
    kids.push(el('p', { className: 'slot-ench' }, icon('spark'), el('span', { textContent: on ? `${ENCHANT_TEXT[on].name}: ${ENCHANT_TEXT[on].does}.` : 'No enchantment.' })));
    const pick = el('select', { className: 'pick', attrs: { 'aria-label': `Enchantment for the ${slot.name.toLowerCase()}` } },
      ...ENCHANT_IDS.filter((id) => id !== on).map((id) => {
        const from = slotOfEnchant(hero, id);
        const where = from ? ` (moves it from the ${GEAR_SLOTS.find((s) => s.id === from).name.toLowerCase()})` : '';
        return el('option', { value: id, textContent: `${ENCHANT_TEXT[id].name}: ${ENCHANT_TEXT[id].does}${where}` });
      }));
    const eb = confirmBtn(`${on ? 'Change' : 'Enchant'} for ${num(ep)} gp`, `Tap again: pay ${num(ep)} gp`, () => { if (enchant(state, hero, slot.id, pick.value) != null) { sfx('coins'); done(); } }, 'btn');
    eb.disabled = hero.gold < ep;
    kids.push(pick, el('div', { className: 'row' }, eb));
    const card = el('li', { className: `slot-card smith-card t${item.tier}` }, ...kids);
    card.style.setProperty('--tier', tier.color);
    return card;
  });
  const used = Object.keys(hero.enchants ?? {}).length;
  return [
    el('h3', {}, icon('hammer'), el('span', { textContent: `The smith, ${SMITH_TEXT.name}` })),
    el('p', { className: 'hint', textContent: SMITH_TEXT.about }),
    el('p', { className: 'hint', textContent: SMITH_TEXT.forge }),
    el('p', { className: 'hint', textContent: `${SMITH_TEXT.enchant} An enchantment costs ${num(ep)} gp at level ${hero.level}. ${used} of ${ENCHANT_IDS.length} in use.` }),
    el('p', { className: 'hint', textContent: `Paid from the purse of ${hero.name}.` }),
    el('ul', { className: 'slot-grid smith-grid' }, ...cards),
  ];
}
