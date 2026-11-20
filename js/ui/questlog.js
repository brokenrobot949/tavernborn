// The quest log, at the top of the Quests tab: everything the hero has on, in one list. The story
// quest in hand or the next one waiting, the regular's next job, today's errands, the bounty in hand,
// the dungeon that opens the road on, the lesser delves not yet cleared, and at level 20 the Rifts.
// Nothing here is new: it gathers what the region cards, the notice board, and the Hero tab's chips
// already say. Tapping an entry with a place opens that region's card on the map below.

import { REGIONS, REGION_BY_ID } from '../../data/regions.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { QUESTS } from '../../data/quests.js';
import { SITES } from '../../data/sites.js';
import { REGULARS } from '../../data/board.js';
import { regionOpen } from '../hero.js';
import { currentQuest, storyReady, storyOpensAt } from '../tasks.js';
import { happeningsOn } from '../world.js';
import { STORY_QUESTS, MAX_LEVEL } from '../rules.js';
import { riftRuleOn, RIFT_RULE_BY_ID } from '../rifts.js';
import { el, num } from './dom.js';
import { icon } from './icons.js';
import { REGION_COLORS } from './map.js';

// A thin bar, filled to a share.
function bar(have, need) {
  const fill = el('i');
  fill.style.width = `${Math.min(100, (100 * have) / need)}%`;
  return el('div', { className: 'bar thin' }, fill);
}

// One entry: an icon, a kind, a title, a line under it, and a bar if there is a count. `region`
// makes it a button that opens that region's card.
function entry({ glyph, kind, title, note, have, need, region, done }, goTo) {
  const kids = [
    el('span', { className: 'log-icon' }, icon(glyph)),
    el('div', { className: 'log-body' },
      el('p', { className: 'log-kind', textContent: kind + (region ? ` · ${REGION_BY_ID[region].name}` : '') }),
      el('p', { className: 'log-title', textContent: title }),
      note ? el('p', { className: 'hint', textContent: note }) : null,
      need ? bar(have, need) : null),
  ];
  const cls = 'log-entry' + (done ? ' done' : '');
  const node = region
    ? el('button', { type: 'button', className: cls, onclick: () => goTo(region), attrs: { 'aria-label': `${title}. Open ${REGION_BY_ID[region].name} on the map` } }, ...kids)
    : el('div', { className: cls }, ...kids);
  if (region) node.style.setProperty('--region', REGION_COLORS[region]);
  return el('li', {}, node);
}

// Everything on the log, most pressing first.
export function questEntries(state, hero, now = new Date()) {
  const out = [];
  const here = hero.region;
  const open = REGIONS.filter((r) => regionOpen(hero, r.id));

  // The story: the quest in hand here, then any story quest waiting elsewhere.
  const qp = hero.questProgress[here];
  const q = hero.focus === 'quest' && qp?.started ? currentQuest(hero) : null;
  if (q?.story) out.push({ glyph: 'scroll', kind: 'Story quest, in hand', title: q.title, note: `Step ${Math.min(qp.step + 1, q.steps)} of ${q.steps}.`, have: qp.step, need: q.steps, region: here });
  for (const r of open) {
    const p = hero.questProgress[r.id];
    const done = p?.done ?? 0;
    if (done >= STORY_QUESTS || (q?.story && r.id === here)) continue;
    const title = QUESTS[r.id][done].title;
    if (storyReady(hero, r.id)) out.push({ glyph: 'scroll', kind: 'Story quest, ready', title, note: `Story quest ${done + 1} of ${STORY_QUESTS}. ${r.id === here ? 'Order Quest to take it.' : `Travel to ${r.name} and order Quest.`}`, have: done, need: STORY_QUESTS, region: r.id });
    else if (r.id === here || done > 0) out.push({ glyph: 'lock', kind: 'Story quest, waiting', title, note: `Opens at level ${storyOpensAt(r.id, done)}. Odd jobs until then.`, have: done, need: STORY_QUESTS, region: r.id });
  }
  // Errands: today's happenings in open regions, each once a day.
  const news = happeningsOn(now);
  for (const r of open) {
    const h = news[r.id];
    if (!h) continue;
    const ran = (hero.errands ?? []).includes(`${h.id}-${h.day}`);
    const inHand = q?.errand && r.id === here;
    out.push({ glyph: 'star', kind: ran ? 'Errand, done today' : inHand ? 'Errand, in hand' : 'Errand, today only', title: h.errand.title, note: ran ? null : `${h.name}. First on the quest board there; set at ${hero.name}'s own level and pays a piece of gear.`, region: r.id, done: ran });
  }
  // The bounty in hand.
  const b = hero.bounty;
  if (b) out.push({ glyph: 'board', kind: 'Bounty', title: b.title, note: `${Math.min(b.have, b.need)} of ${b.need}. ${b.about}`, have: b.have, need: b.need });
  // The regular here.
  const reg = REGULARS[here];
  const regDone = Math.min(qp?.reg ?? 0, reg.beats.length);
  if (regDone < reg.beats.length) out.push({ glyph: 'heart', kind: 'A regular', title: `${reg.name}: job ${regDone + 1} of ${reg.beats.length}`, note: 'Every fourth odd job on the board here is theirs. After the last, they send a piece of gear.', have: regDone, need: reg.beats.length, region: here });
  // The dungeon that opens the road on.
  const next = REGIONS.find((r) => !(hero.dungeonClears[r.id] > 0));
  if (next && regionOpen(hero, next.id)) {
    const d = DUNGEONS[next.id];
    const after = REGIONS[REGIONS.indexOf(next) + 1];
    out.push({ glyph: 'door', kind: 'The road on', title: `Clear ${d.name}`, note: `Built for level ${d.level}${hero.level < d.level ? `; ${hero.name} is level ${hero.level}` : ''}. ${after ? `It opens ${after.name}.` : 'It is the last dungeon of the road.'}`, region: next.id });
  }
  // Lesser delves not yet cleared, up to the hero's level.
  for (const r of open) {
    for (const s of SITES[r.id]) {
      if (hero.siteClears?.[s.id] || s.level > hero.level) continue;
      out.push({ glyph: 'flag', kind: 'Lesser delve, not cleared', title: s.name, note: `Built for level ${s.level}. Its keeper gives a good piece of gear the first time.`, region: r.id });
    }
  }
  // The Rifts, from level 20: today's rule and the best floor under it.
  if (hero.level >= MAX_LEVEL) {
    const rule = hero.rift?.rule ? RIFT_RULE_BY_ID[hero.rift.rule] : riftRuleOn(now);
    const best = hero.riftBests?.[rule.id] ?? 0;
    out.push({ glyph: 'vortex', kind: hero.rift ? `The Rifts, floor ${hero.rift.floor}` : 'The Rifts today', title: rule.name, note: `${rule.does} Deepest under this rule: ${best ? `floor ${num(best)}` : 'not yet tried'}. Deepest of all: floor ${num(hero.stats.riftBest ?? 0)}.` });
  }
  return out;
}

// A key for redrawing: changes whenever something the log shows changes.
export function questLogKey(state, hero, now = new Date()) {
  return JSON.stringify(questEntries(state, hero, now).map((e) => [e.kind, e.title, e.have, e.need, e.done]));
}

export function questLog(state, hero, goTo) {
  const items = questEntries(state, hero);
  return el('section', { className: 'panel quest-log' },
    el('h3', {}, icon('scroll'), el('span', { textContent: 'Quest log' })),
    items.length
      ? el('ul', { className: 'log' }, ...items.map((e) => entry(e, goTo)))
      : el('p', { className: 'hint', textContent: `Nothing in hand. ${REGION_BY_ID[hero.region].name} is quiet today.` }));
}
