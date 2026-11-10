// Map tab. Phase 1 has one open region and one focus (Roam); the drawn world map, travel, and
// the other seven regions arrive in Phase 3.

import { REGIONS } from '../../data/regions.js';
import { MONSTERS } from '../../data/monsters.js';
import { el, pressBtn } from './dom.js';

export function mountMap(root) {
  function update(state, hero) {
    const cards = REGIONS.map((r, i) => {
      const here = r.id === hero.region;
      const head = el('div', { className: 'region-head' },
        el('h3', { textContent: `${i + 1}. ${r.name}` }),
        el('span', { className: 'tag', textContent: here ? 'You are here' : 'Locked' }));
      const levels = el('p', { className: 'hint', textContent: `Levels ${r.levels[0]} to ${r.levels[1]}. ${r.flavor}` });
      if (!here) return el('section', { className: 'panel region locked' }, head, levels);
      const all = MONSTERS[r.id];
      const met = all.filter((m) => hero.bestiary[m.id]).length;
      const off = (label) => { const b = pressBtn(label, false, null); b.disabled = true; return b; };
      return el('section', { className: 'panel region' }, head, levels,
        el('p', { className: 'region-line', textContent: `Monsters defeated at least once: ${met} of ${all.length}.` }),
        el('p', { className: 'region-line', textContent: `Dungeon: ${r.dungeon}. The door is stuck for now.` }),
        el('div', { className: 'row focus' }, el('span', { className: 'label', textContent: 'Focus' }), pressBtn('Roam', true, null), off('Quest'), off('Delve')),
        el('p', { className: 'hint', textContent: 'Roam: the hero fights the region\'s monsters one at a time. Quests and dungeons open in a later build.' }));
    });
    root.replaceChildren(el('h2', { className: 'view-title', textContent: 'The road from The Wobbly Griffin' }), ...cards);
  }
  return { update };
}
