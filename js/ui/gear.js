// Gear tab: the eight slots, ability scores, lifetime stats, and the Bestiary.
// Loot arrives in Phase 5; until then every hero wears the Common starting kit.

import { TIERS } from '../../data/items.js';
import { MONSTERS, MONSTER_BY_ID } from '../../data/monsters.js';
import { RACES, RACE_TRAITS } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { ABILITIES, ABILITY_NAMES, mod } from '../rules.js';
import { el, num, signed, duration } from './dom.js';

const SLOT_NAMES = [['weapon', 'Weapon'], ['offhand', 'Off-hand'], ['head', 'Head'], ['body', 'Body'], ['hands', 'Hands'], ['feet', 'Feet'], ['cloak', 'Cloak'], ['trinket', 'Trinket']];

export function mountGear(root) {
  function update(state, hero) {
    const slots = SLOT_NAMES.map(([id, label]) => {
      const item = hero.gear[id];
      const tier = item ? TIERS[item.tier] : null;
      const value = el('span', { className: 'slot-value', textContent: tier ? `${tier.name} starting kit` : id === 'cloak' ? 'Unlocks at level 5' : 'Empty' });
      if (tier) value.style.setProperty('--tier', tier.color);
      return el('li', { className: tier ? 'slot filled' : 'slot' }, el('span', { className: 'slot-name', textContent: label }), value);
    });

    const main = CLASSES[hero.class].main;
    const abilities = ABILITIES.map((a) => el('div', { className: 'ability' + (a === main ? ' main' : '') },
      el('span', { className: 'ab-name', textContent: ABILITY_NAMES[a] }),
      el('span', { className: 'ab-score', textContent: String(hero.abilities[a]) }),
      el('span', { className: 'ab-mod', textContent: signed(mod(hero.abilities[a])) })));

    const worst = hero.stats.mostEmbarrassingDefeat ? MONSTER_BY_ID[hero.stats.mostEmbarrassingDefeat]?.name : null;
    const stat = (label, value) => el('li', {}, el('span', { textContent: label }), el('span', { textContent: value }));
    const trait = RACE_TRAITS[hero.race];

    const monsters = MONSTERS[hero.region];
    const bestiary = monsters.map((m) => {
      const count = hero.bestiary[m.id] ?? 0;
      return el('li', { className: count ? 'beast' : 'beast unknown' },
        el('div', { className: 'beast-head' }, el('span', { textContent: count ? m.name : 'Not yet defeated' }), el('span', { textContent: count ? '×' + num(count) : '' })),
        count ? el('p', { className: 'hint', textContent: m.about }) : null);
    });

    root.replaceChildren(
      el('h2', { className: 'view-title', textContent: 'Gear and records' }),
      el('section', { className: 'panel' }, el('h3', { textContent: 'Gear' }), el('ul', { className: 'slots' }, ...slots),
        el('p', { className: 'hint', textContent: 'Gear will equip itself when loot arrives in a later build.' })),
      el('section', { className: 'panel' }, el('h3', { textContent: 'Ability scores' }), el('div', { className: 'abilities' }, ...abilities),
        el('p', { className: 'hint', textContent: `${RACES[hero.race].name} quirk, ${trait.quirk}: ${trait.effect[0].toLowerCase() + trait.effect.slice(1)}.${trait.built ? '' : ' (Wakes up in a later build.)'}` })),
      el('section', { className: 'panel' }, el('h3', { textContent: 'Lifetime' }), el('ul', { className: 'stats' },
        stat('Time adventuring', duration(hero.age)),
        stat('Tasks finished', num(hero.stats.tasks)),
        stat('Natural 20s', num(hero.stats.natural20s)),
        stat('Natural 1s', num(hero.stats.natural1s)),
        stat('Knockouts', num(hero.stats.knockouts)),
        stat('Most Embarrassing Defeat', worst ?? 'None yet'))),
      el('section', { className: 'panel' }, el('h3', { textContent: `Bestiary (${monsters.filter((m) => hero.bestiary[m.id]).length} of ${monsters.length})` }), el('ul', { className: 'bestiary' }, ...bestiary)),
    );
  }
  return { update };
}
