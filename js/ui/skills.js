// Skills tab. The trees are built in Phase 4; until then skill points bank here, as the design
// promises: unspent points never block the hero.

import { CLASSES } from '../../data/classes.js';
import { proficiency, MAX_LEVEL } from '../rules.js';
import { el } from './dom.js';

export function mountSkills(root) {
  function update(state, hero) {
    const n = hero.skillPoints;
    root.replaceChildren(
      el('h2', { className: 'view-title', textContent: 'Skills' }),
      el('section', { className: 'panel' },
        el('p', { className: 'big-number', textContent: String(n) }),
        el('p', { className: 'centered', textContent: `skill point${n === 1 ? '' : 's'} banked` }),
        el('p', { className: 'hint', textContent: `The ${CLASSES[hero.class].name} skill tree is not built yet. Every level from 2 to ${MAX_LEVEL} adds a point, and they wait here until the tree opens. Nothing is lost by waiting.` })),
      el('section', { className: 'panel' },
        el('h3', { textContent: 'Proficiency bonus' }),
        el('p', { textContent: `+${proficiency(hero.level)} on every d20 roll. It rises at levels 5, 9, 13, and 17.` })),
    );
  }
  return { update };
}
