// Gear tab: the eight slots (what is worn, its rarity, and what it does), ability scores,
// lifetime stats, and the Bestiary. There is nothing to manage here: gear equips and sells itself.

import { TIERS } from '../../data/items.js';
import { MONSTERS } from '../../data/monsters.js';
import { REGION_BY_ID } from '../../data/regions.js';
import { foeName } from '../tasks.js';
import { RACES, RACE_TRAITS } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { ABILITIES, ABILITY_NAMES, mod } from '../rules.js';
import { GEAR_SLOTS } from '../../data/loot.js';
import { describe, describeAll, flavorOf } from '../loot.js';
import { LOOT } from '../rules.js';
import { el, num, signed, duration } from './dom.js';


// 'travel 21% quicker' -> 'Travel 21% quicker.'
const sentence = (text) => text[0].toUpperCase() + text.slice(1) + (text.endsWith('.') ? '' : '.');

export function mountGear(root) {
  function update(state, hero) {
    const slots = GEAR_SLOTS.map((slot) => {
      const item = hero.gear[slot.id];
      if (!item) {
        const why = slot.id === 'cloak' && hero.level < LOOT.cloakLevel ? `Opens at level ${LOOT.cloakLevel}, and comes with a cloak.` : 'Empty. The first one found goes straight in.';
        return el('li', { className: 'slot empty' },
          el('div', { className: 'slot-top' }, el('span', { className: 'slot-name', textContent: slot.name })),
          el('p', { className: 'slot-item', textContent: why }),
          el('p', { className: 'slot-does', textContent: `${slot.does}.` }));
      }
      const tier = TIERS[item.tier];
      const flavor = flavorOf(item);
      const row = el('li', { className: 'slot filled' },
        el('div', { className: 'slot-top' }, el('span', { className: 'slot-name', textContent: slot.name }), el('span', { className: 'slot-rarity', textContent: `${tier.name}, level ${item.level}` })),
        el('p', { className: 'slot-item', textContent: item.name }),
        el('p', { className: 'slot-does', textContent: sentence(describe(slot.id, item)) }),
        flavor ? el('p', { className: 'slot-flavor', textContent: flavor }) : null);
      row.style.setProperty('--tier', tier.color);
      return row;
    });
    const total = describeAll(hero);
    const key = el('div', { className: 'rarity-key' }, ...TIERS.map((t) => { const s = el('span', { textContent: t.name }); s.style.setProperty('--tier', t.color); return s; }));

    const main = CLASSES[hero.class].main;
    const abilities = ABILITIES.map((a) => el('div', { className: 'ability' + (a === main ? ' main' : '') },
      el('span', { className: 'ab-name', textContent: ABILITY_NAMES[a] }),
      el('span', { className: 'ab-score', textContent: String(hero.abilities[a]) }),
      el('span', { className: 'ab-mod', textContent: signed(mod(hero.abilities[a])) })));

    const worst = hero.stats.mostEmbarrassingDefeat ? foeName(hero.stats.mostEmbarrassingDefeat) : null;
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
        key,
        el('p', { className: 'gear-total', textContent: total.length ? `All told: ${total.join(', ')}.` : 'All told: nothing yet. The starting kit is worth what was paid for it.' }),
        el('p', { className: 'hint', textContent: 'Gear looks after itself. A better piece goes on the moment it is found and everything else is sold. Better means rarer, or the same rarity at a higher level. Rarity sets the size of a piece\'s bonus and its look on the hero; level adds a little on top. Monsters drop gear rarely, every finished quest pays one piece, and dungeon bosses drop the best. Each dungeon also has one named Legendary.' })),
      el('section', { className: 'panel' }, el('h3', { textContent: 'Ability scores' }), el('div', { className: 'abilities' }, ...abilities),
        el('p', { className: 'hint', textContent: `${RACES[hero.race].name} quirk, ${trait.quirk}: ${trait.effect[0].toLowerCase() + trait.effect.slice(1)}.${trait.built ? '' : ' (Wakes up in a later build.)'}` })),
      el('section', { className: 'panel' }, el('h3', { textContent: 'Lifetime' }), el('ul', { className: 'stats' },
        stat('Time adventuring', duration(hero.age)),
        stat('Tasks finished', num(hero.stats.tasks)),
        stat('Natural 20s', num(hero.stats.natural20s)),
        stat('Natural 1s', num(hero.stats.natural1s)),
        stat('Story quests finished', num(hero.stats.quests)),
        stat('Odd jobs done', num(hero.stats.oddJobs)),
        stat('Feats', num(hero.feats.length)),
        stat('Dungeons cleared', `${num(hero.stats.dungeonClears)} of ${num(hero.stats.dungeonRuns)} runs`),
        stat('Gear found', `${num(hero.stats.itemsFound)}, ${num(hero.stats.upgrades)} worn`),
        stat('Gold from selling the rest', `${num(hero.stats.soldFor)} gp`),
        stat('Knockouts', num(hero.stats.knockouts)),
        stat('Most Embarrassing Defeat', worst ?? 'None yet'))),
      el('section', { className: 'panel' }, el('h3', { textContent: `Bestiary: ${REGION_BY_ID[hero.region].name} (${monsters.filter((m) => hero.bestiary[m.id]).length} of ${monsters.length})` }), el('ul', { className: 'bestiary' }, ...bestiary)),
    );
  }
  return { update };
}
