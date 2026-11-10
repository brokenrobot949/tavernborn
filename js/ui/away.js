// The "While you were away" card, built from the events `advance` returned for the gap.

import { MONSTER_BY_ID } from '../../data/monsters.js';
import { el, num, duration } from './dom.js';

export function showAway(root, { seconds, summary: s, hero }) {
  root.querySelector('.overlay')?.remove();
  const names = (ids) => [...new Set(ids)].map((id) => MONSTER_BY_ID[id]?.name ?? id).join(', ');
  const item = (label, value) => el('li', {}, el('span', { textContent: label }), el('span', { textContent: value }));
  const rows = [
    s.levels.length ? item('Levels gained', `${s.levels.length} (now level ${hero.level})`) : item('Level', `${hero.level}, no change`),
    item('Tasks finished', num(s.tasks)),
    item('XP earned', '+' + num(s.xp)),
    item('Gold', (s.gold >= 0 ? '+' : '') + num(s.gold) + ' gp'),
    item('Natural 20s', num(s.natural20s)),
    item('Natural 1s', num(s.natural1s)),
    item('Knockouts', s.knockouts ? `${s.knockouts} (${names(s.knockedOutBy)})` : 'None'),
    s.potions ? item('Potions drunk', num(s.potions)) : null,
    s.newMonsters.length ? item('New in the Bestiary', names(s.newMonsters)) : null,
    hero.skillPoints ? item('Skill points banked', num(hero.skillPoints)) : null,
  ];
  const close = el('button', { className: 'btn primary', type: 'button', textContent: 'Carry on' });
  const overlay = el('div', { className: 'overlay', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'away-title' } },
    el('div', { className: 'panel card' },
      el('h2', { id: 'away-title', textContent: 'While you were away' }),
      el('p', { className: 'hint', textContent: `${hero.name} carried on without you for ${duration(seconds)}.` }),
      el('ul', { className: 'stats' }, ...rows.filter(Boolean)),
      close));
  close.onclick = () => overlay.remove();
  root.append(overlay);
  close.focus();
}
