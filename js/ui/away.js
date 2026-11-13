// The "While you were away" card, built from the events `advance` returned for the gap.

import { REGION_BY_ID } from '../../data/regions.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { foeName } from '../tasks.js';
import { pending } from '../skills.js';
import { TIERS } from '../../data/items.js';
import { el, num, duration } from './dom.js';
import { DEED_BY_ID } from '../../data/deeds.js';

export function showAway(root, { seconds, summary: s, hero }) {
  root.querySelector('.overlay')?.remove();
  const SOURCES = { roam: 'the road', quest: 'a quest', delve: 'a dungeon', boss: 'a dungeon boss' };
  const names = (ids) => [...new Set(ids)].map((id) => foeName(id) ?? SOURCES[id] ?? id).join(', ');
  const places = (ids) => [...new Set(ids)].map((id) => REGION_BY_ID[id].name).join(', ');
  const dungeons = (ids) => [...new Set(ids)].map((id) => DUNGEONS[id].name).join(', ');
  const item = (label, value) => el('li', {}, el('span', { textContent: label }), el('span', { textContent: value }));
  const waiting = pending(hero);
  // Loot: how much turned up, and the best of what went on (the rarest first, three at most).
  const worn = [...s.upgrades].sort((a, b) => b.tier - a.tier);
  const best = worn.slice(0, 3).map((u) => `${u.name} (${TIERS[u.tier].name})`).join(', ') + (worn.length > 3 ? `, and ${worn.length - 3} more` : '');
  const rows = [
    s.levels.length ? item('Levels gained', `${s.levels.length} (now level ${hero.level})`) : item('Level', `${hero.level}, no change`),
    item('Tasks finished', num(s.tasks)),
    item('XP earned', '+' + num(s.xp)),
    item('Gold', (s.gold >= 0 ? '+' : '') + num(s.gold) + ' gp'),
    item('Natural 20s', num(s.natural20s)),
    item('Natural 1s', num(s.natural1s)),
    s.quests.length ? item('Story quests finished', s.quests.length <= 2 ? s.quests.join(', ') : num(s.quests.length)) : null,
    s.oddJobs ? item('Odd jobs done', num(s.oddJobs)) : null,
    s.feats.length ? item('Feats earned', `${s.feats.length} (a bonus skill point each)`) : null,
    s.clears.length ? item('Dungeons cleared', `${s.clears.length} (${dungeons(s.clears)})`) : null,
    s.chapters.length ? item('Story', `Chapter ${s.chapters.join(' and ')} recovered`) : null,
    s.opened.length ? item('Roads opened', places(s.opened)) : null,
    s.arrived.length ? item('Travelled to', places(s.arrived.slice(-1))) : null,
    item('Knockouts', s.knockouts ? `${s.knockouts} (${names(s.knockedOutBy)})` : 'None'),
    s.runsLost ? item('Dungeon runs lost', num(s.runsLost)) : null,
    s.confidence.length ? item('Change of plan', `Roaming to rebuild confidence after ${dungeons(s.confidence)}`) : null,
    s.found ? item('Gear found', `${num(s.found)} piece${s.found === 1 ? '' : 's'}, ${worn.length} better than what was worn`) : item('Gear found', 'None'),
    worn.length ? item('Now wearing', best) : null,
    s.found ? item('Sold', `${num(s.soldFor)} gp for the rest`) : null,
    s.potions ? item('Potions drunk', num(s.potions)) : null,
    s.newMonsters.length ? item('New in the Bestiary', names(s.newMonsters)) : null,
    s.riftFloors ? item('Rift floors cleared', `${num(s.riftFloors)} (deepest ever: floor ${hero.stats.riftBest})`) : null,
    s.paragon.length ? item('Paragon', `Rank ${Math.max(...s.paragon)}`) : null,
    s.trophies.length ? item('Trophies won', num(s.trophies.length)) : null,
    s.moves ? item('Signature moves used', num(s.moves)) : null,
    s.choicesAlone ? item('Decided alone on the road', `${num(s.choicesAlone)} time${s.choicesAlone === 1 ? '' : 's'}`) : null,
    s.deeds.length ? item('Deeds done', s.deeds.map((id) => DEED_BY_ID[id]?.name).filter(Boolean).join(', ')) : null,
    hero.choice ? item('On the road now', 'A choice is waiting for word, on the Hero tab') : null,
    waiting.points ? item('Skill points to spend', num(waiting.points)) : null,
    waiting.subclass ? item('Subclass', 'Ready to choose') : null,
    waiting.abilities ? item('Ability points to place', num(waiting.abilities)) : null,
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
