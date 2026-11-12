// Gear tab: the eight slots (what is worn, its rarity, and what it does), ability scores,
// lifetime stats, and the Bestiary, each behind its own section tab. There is nothing to manage
// here: gear equips and sells itself. A named Legendary's card is full width, with its story line.
//
// Each section is rebuilt only when something it shows changes, so a tap is never lost to the
// once-a-second redraw.

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
import { drawStill } from '../sprite.js';
import { el, num, signed, duration, sectionTabs } from './dom.js';
import { icon } from './icons.js';
import { heroSpriteLook } from './hero.js';

// 'travel 21% quicker' -> 'Travel 21% quicker.'
const sentence = (text) => text[0].toUpperCase() + text.slice(1) + (text.endsWith('.') ? '' : '.');
const capital = (text) => text[0].toUpperCase() + text.slice(1);

export function mountGear(root) {
  const gearPage = el('div', {});
  const abilityPage = el('div', {});
  const lifePage = el('div', {});
  const beastPage = el('div', {});
  const tabs = sectionTabs('gear', [
    { id: 'gear', label: 'Gear', icon: icon('weapon'), node: gearPage },
    { id: 'abilities', label: 'Abilities', icon: icon('d20'), node: abilityPage },
    { id: 'lifetime', label: 'Lifetime', icon: icon('book'), node: lifePage },
    { id: 'bestiary', label: 'Bestiary', icon: icon('eye'), node: beastPage },
  ]);
  root.append(el('h2', { className: 'view-title', textContent: 'Gear and records' }), tabs.nav, gearPage, abilityPage, lifePage, beastPage);

  const keys = {};
  const changed = (name, value) => { const k = JSON.stringify(value); if (keys[name] === k) return false; keys[name] = k; return true; };

  // ----- gear -----
  const portrait = el('canvas', { className: 'paperdoll', attrs: { 'aria-label': 'Your hero in their gear' } });
  let lookKey = '';
  function drawGear(hero) {
    const look = heroSpriteLook(hero);
    const lk = JSON.stringify(look);
    if (lk !== lookKey) { lookKey = lk; drawStill(portrait, look, { facing: 'down', scale: 2 }); }
    if (!changed('gear', [hero.id, hero.gear, hero.level])) return;
    const slots = GEAR_SLOTS.map((slot) => {
      const item = hero.gear[slot.id];
      if (!item) {
        const why = slot.id === 'cloak' && hero.level < LOOT.cloakLevel ? `Opens at level ${LOOT.cloakLevel}, and comes with a cloak.` : 'Empty. The first one found goes straight in.';
        return el('li', { className: 'slot-card empty' },
          el('div', { className: 'slot-head' }, el('span', { className: 'slot-icon' }, icon(slot.id)), el('span', { className: 'slot-name', textContent: slot.name })),
          el('p', { className: 'slot-item', textContent: why }),
          el('p', { className: 'slot-does', textContent: `${slot.does}.` }));
      }
      const tier = TIERS[item.tier];
      const flavor = flavorOf(item);
      const card = el('li', { className: `slot-card t${item.tier}${item.legend ? ' named' : ''}` },
        el('div', { className: 'slot-head' }, el('span', { className: 'slot-icon' }, icon(slot.id)), el('span', { className: 'slot-name', textContent: slot.name })),
        el('p', { className: 'slot-item', textContent: item.name }),
        el('span', { className: 'rarity-chip', textContent: `${tier.name} · Level ${item.level}` }),
        el('p', { className: 'slot-does', textContent: sentence(describe(slot.id, item)) }),
        flavor ? el('p', { className: 'slot-flavor', textContent: flavor }) : null);
      card.style.setProperty('--tier', tier.color);
      return card;
    });
    const total = describeAll(hero);
    const best = Math.max(...Object.values(hero.gear).filter(Boolean).map((g) => g.tier));
    const doll = el('div', { className: 'doll-card' },
      el('div', { className: 'doll-frame' }, portrait),
      el('div', { className: 'doll-side' },
        el('p', { className: 'doll-title', textContent: 'All told' }),
        total.length
          ? el('ul', { className: 'bonus-chips' }, ...total.map((t) => el('li', { textContent: capital(t) })))
          : el('p', { className: 'hint', textContent: 'Nothing yet. The starting kit is worth what was paid for it.' })));
    doll.style.setProperty('--tier', TIERS[Math.max(0, best)].color);
    const key = el('div', { className: 'rarity-key' }, ...TIERS.map((t) => { const s = el('span', { textContent: t.name }); s.style.setProperty('--tier', t.color); return s; }));
    gearPage.replaceChildren(
      doll,
      el('ul', { className: 'slot-grid' }, ...slots),
      key,
      el('details', { className: 'panel how' }, el('summary', { textContent: 'How gear works' }),
        el('p', { className: 'hint', textContent: 'Gear looks after itself. A better piece goes on the moment it is found and everything else is sold. Better means rarer, or the same rarity at a higher level. Rarity sets the size of a piece\'s bonus and its look on the hero; level adds a little on top. Monsters drop gear rarely, every finished quest pays one piece, and dungeon bosses drop the best. Each dungeon also has one named Legendary.' })));
  }

  // ----- ability scores -----
  function drawAbilities(hero) {
    if (!changed('abilities', [hero.id, hero.abilities, hero.class, hero.race])) return;
    const main = CLASSES[hero.class].main;
    const trait = RACE_TRAITS[hero.race];
    abilityPage.replaceChildren(el('section', { className: 'panel' },
      el('h3', { textContent: 'Ability scores' }),
      el('div', { className: 'abilities' }, ...ABILITIES.map((a) => el('div', { className: 'ability' + (a === main ? ' main' : '') },
        el('span', { className: 'ab-name', textContent: ABILITY_NAMES[a] }),
        el('span', { className: 'ab-score', textContent: String(hero.abilities[a]) }),
        el('span', { className: 'ab-mod', textContent: signed(mod(hero.abilities[a])) })))),
      el('p', { className: 'hint', textContent: `The outlined score is the ${CLASSES[hero.class].name}'s main ability.` }),
      el('p', { className: 'hint', textContent: `${RACES[hero.race].name} quirk, ${trait.quirk}: ${trait.effect[0].toLowerCase() + trait.effect.slice(1)}.${trait.built ? '' : ' (Wakes up in a later build.)'}` })));
  }

  // ----- lifetime -----
  function drawLifetime(hero) {
    const s = hero.stats;
    if (!changed('life', [hero.id, s, hero.feats.length, Math.floor(hero.age / 60)])) return;
    const worst = s.mostEmbarrassingDefeat ? foeName(s.mostEmbarrassingDefeat) : null;
    const stat = (glyph, label, value, cls = '') => el('li', { className: 'life ' + cls }, icon(glyph), el('span', { className: 'life-label', textContent: label }), el('strong', { textContent: value }));
    lifePage.replaceChildren(el('section', { className: 'panel' },
      el('h3', { textContent: 'Lifetime' }),
      el('ul', { className: 'life-grid' },
        stat('pin', 'Time adventuring', duration(hero.age), 'wide'),
        stat('swords', 'Tasks finished', num(s.tasks)),
        stat('star', 'Natural 20s', num(s.natural20s), 'gold'),
        stat('d20', 'Natural 1s', num(s.natural1s), 'red'),
        stat('scroll', 'Story quests', num(s.quests), 'green'),
        stat('board', 'Odd jobs', num(s.oddJobs), 'green'),
        stat('flag', 'Feats', num(hero.feats.length), 'gold'),
        stat('door', 'Dungeons cleared', `${num(s.dungeonClears)} of ${num(s.dungeonRuns)}`, 'purple'),
        stat('trinket', 'Gear found', `${num(s.itemsFound)}, ${num(s.upgrades)} worn`, 'blue'),
        stat('coin', 'Sold the rest for', `${num(s.soldFor)} gp`, 'gold'),
        stat('skull', 'Knockouts', num(s.knockouts), 'red'),
        stat('skull', 'Most Embarrassing Defeat', worst ?? 'None yet', 'wide red'))));
  }

  // ----- bestiary -----
  function drawBestiary(hero) {
    const monsters = MONSTERS[hero.region];
    if (!changed('beasts', [hero.id, hero.region, monsters.map((m) => hero.bestiary[m.id] ?? 0)])) return;
    const met = monsters.filter((m) => hero.bestiary[m.id]).length;
    const fill = el('i');
    fill.style.width = `${(100 * met) / monsters.length}%`;
    beastPage.replaceChildren(el('section', { className: 'panel' },
      el('h3', { textContent: `Bestiary: ${REGION_BY_ID[hero.region].name}` }),
      el('p', { className: 'hint', textContent: `${met} of ${monsters.length} defeated at least once. The Bestiary shows the region the hero is in.` }),
      el('div', { className: 'bar thin beast-bar' }, fill),
      el('ul', { className: 'bestiary' }, ...monsters.map((m) => {
        const count = hero.bestiary[m.id] ?? 0;
        return el('li', { className: count ? 'beast' : 'beast unknown' },
          el('span', { className: 'beast-icon' }, icon(count ? 'eye' : 'lock')),
          el('div', {},
            el('div', { className: 'beast-head' }, el('span', { textContent: count ? m.name : 'Not yet defeated' }), el('span', { className: 'beast-count', textContent: count ? '×' + num(count) : '' })),
            count ? el('p', { className: 'hint', textContent: m.about }) : null));
      }))));
  }

  function update(state, hero) {
    drawGear(hero);
    drawAbilities(hero);
    drawLifetime(hero);
    drawBestiary(hero);
  }
  return { update };
}
