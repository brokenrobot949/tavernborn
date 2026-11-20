// Quests tab (it was the Map tab): the quest log (js/ui/questlog.js) at the top, then the world map (drawn in
// code, nothing to download), the details of the region tapped,
// travel, and the standing order: Roam, Quest, or Delve, and from level 20 the Planar Rifts.
// Round five adds what is going on today (a star on the map and a box on the region's card), the two
// lesser delves beside each dungeon, and the notice board with the day's three bounties.
// The hero is always on the map, in their own gear: standing beside the region they are in, walking the
// road while they travel, and at the tavern's door while they recover there.
//
// The page is rebuilt only when something it shows has changed, so a tap is never lost to the
// once-a-second redraw.

import { REGIONS, REGION_INDEX } from '../../data/regions.js';
import { MONSTERS } from '../../data/monsters.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { CHAPTERS } from '../../data/story.js';
import { regionOpen } from '../hero.js';
import { currentQuest, setFocus, orderTravel, orderDelve, delveTarget, storyReady, storyOpensAt } from '../tasks.js';
import { RARES } from '../../data/rares.js';
import { SITES } from '../../data/sites.js';
import { QUESTS } from '../../data/quests.js';
import { REGULARS, HAPPENING_EFFECT } from '../../data/board.js';
import { happeningsOn, dayOf } from '../world.js';
import { postingsOn, canTake, takeBounty, bountyReward } from '../board.js';
import { STORY_QUESTS, TRAVEL_SECONDS_PER_REGION, MAX_LEVEL, RIFT } from '../rules.js';
import { RIFT_NAME, RIFT_TEXT } from '../../data/tavern.js';
import { el, num, confirmBtn } from './dom.js';
import { showChapter } from './story.js';
import { icon, ICONS } from './icons.js';
import { SpriteView, heroLook } from '../sprite.js';
import { portraitOf } from '../tavern.js';
import { questLog, questLogKey } from './questlog.js';
import { riftRuleOn, RIFT_RULE_BY_ID } from '../rifts.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...kids.filter(Boolean));
  return node;
};

// Where each region sits on the parchment (viewBox 340 x 400), in road order from the tavern at
// the bottom left to the volcano at the top, and a small doodle for each.
const SPOTS = [
  { x: 62, y: 348, doodle: 'M-46 -4h14v-9l-7 -6l-7 6z M-41 -4v-5h4v5 M-35 -17v-4' }, // the tavern
  { x: 188, y: 326, doodle: 'M26 4l6 -14l6 14z M36 6l7 -17l7 17z M30 12v-8 M43 14v-8' }, // trees
  { x: 284, y: 262, doodle: 'M-44 20q5 -6 10 0t10 0t10 0 M-40 28q5 -6 10 0t10 0' }, // waves
  { x: 176, y: 214, doodle: 'M26 8l10 -20l7 10l6 -8l9 18z' }, // peaks
  { x: 58, y: 178, doodle: 'M26 10v-14 M31 10v-18 M36 10v-12 M22 12h20 M26 -4l-3 -3 M31 -8l3 -3' }, // reeds
  { x: 150, y: 112, doodle: 'M-46 12q10 -12 20 0 M-34 16q8 -9 16 0 M-40 -6a4 4 0 1 0 0.1 0' }, // dunes and a sun
  { x: 268, y: 122, doodle: 'M26 -12l4 12l4 -12z M36 -12l3 9l3 -9z M26 10l5 -8l5 8z' }, // stalactites
  { x: 236, y: 44, doodle: 'M-52 14l14 -26h8l14 26z M-36 -14q-2 -6 2 -9t0 -9' }, // the volcano
];

// Each region's colour on the map and on its card, in road order.
export const REGION_COLORS = { mugwick: '#6f9a4a', mumblewood: '#2f6b3a', saltmarrow: '#2f7fa0', peaks: '#737c8a', gloamfen: '#4f7a6a', cinder: '#c9802f', underdeep: '#6a4f9a', wyrmspire: '#b0402a' };

// A smooth road through the eight spots: a Catmull-Rom curve written as cubic segments, so the
// road passes through every spot. `roadLeg(i)` is the stretch from spot i to spot i + 1.
function roadLeg(i) {
  const at = (j) => SPOTS[Math.max(0, Math.min(SPOTS.length - 1, j))];
  const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
  const c1 = [p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6];
  const c2 = [p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6];
  return `M${p1.x} ${p1.y} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2.x} ${p2.y}`;
}
// The tavern's door, by the little house drawn beside Mugwick Vale: where a knocked-out hero recovers.
const TAVERN_DOOR = { x: 40, y: 352 };
const roadPath = () => SPOTS.slice(1).map((_, i) => roadLeg(i)).join(' ');

// The land under the road: a sea down the east side, sand, a swamp, a cave mouth, the volcano's
// glow, and scorched edges on the parchment.
function terrain() {
  const stop = (offset, color, opacity) => svg('stop', { offset, 'stop-color': color, 'stop-opacity': opacity });
  return svg('g', { class: 'terrain' },
    svg('defs', {},
      svg('filter', { id: 'fog', x: '-50%', y: '-50%', width: '200%', height: '200%' }, svg('feGaussianBlur', { stdDeviation: 7 })),
      svg('filter', { id: 'soft', x: '-50%', y: '-50%', width: '200%', height: '200%' }, svg('feGaussianBlur', { stdDeviation: 4 })),
      svg('radialGradient', { id: 'lava' }, stop('0', '#ff8a2a', '0.75'), stop('1', '#ff8a2a', '0')),
      svg('radialGradient', { id: 'burn', r: '72%' }, stop('0.72', '#8a6a3a', '0'), stop('1', '#5a3c18', '0.5'))),
    svg('path', { class: 'sea', d: 'M340 150 C 318 176 300 206 312 236 C 324 266 296 292 312 318 C 324 338 332 352 340 360 Z' }),
    svg('path', { class: 'waves', d: 'M318 196q4 -4 8 0t8 0 M314 242q4 -4 8 0t8 0 M320 300q4 -4 8 0t8 0' }),
    svg('ellipse', { class: 'sand', cx: 132, cy: 104, rx: 70, ry: 34, filter: 'url(#soft)' }),
    svg('ellipse', { class: 'swamp', cx: 52, cy: 186, rx: 40, ry: 30, filter: 'url(#soft)' }),
    svg('ellipse', { class: 'cave', cx: 276, cy: 124, rx: 30, ry: 22, filter: 'url(#soft)' }),
    svg('ellipse', { cx: 236, cy: 40, rx: 52, ry: 36, fill: 'url(#lava)' }),
    svg('path', { class: 'hills', d: 'M132 244l10 -14l10 14 M146 248l12 -18l12 18 M210 236l9 -12l9 12' }),
    svg('path', { class: 'trees', d: 'M150 356l5 -10l5 10z M160 362l5 -10l5 10z M222 350l5 -10l5 10z M232 344l5 -10l5 10z M112 300l5 -10l5 10z' }),
    svg('rect', { x: 0, y: 0, width: 340, height: 400, fill: 'url(#burn)' }));
}

// A compass rose in the corner.
const compass = () => svg('g', { class: 'compass', transform: 'translate(306 366)' },
  svg('circle', { r: 15 }),
  svg('path', { class: 'needle', d: 'M0 -13l4 13l-4 13l-4 -13z' }),
  svg('path', { class: 'needle-n', d: 'M0 -13l4 13h-8z' }),
  svg('text', { y: -18, class: 'compass-n' }, 'N'));

// An icon inside the map's SVG (the same drawing as `icon`, as a group).
function mapIcon(name, transform) {
  const g = svg('g', { transform, class: 'map-icon' });
  for (const d of ICONS[name]) g.append(svg('path', d[0] === '*' ? { d: d.slice(1), class: 'fill' } : { d }));
  return g;
}

// Today's rule in the Rifts, or the rule of the run in progress.
function riftRuleNote(hero) {
  const r = hero.rift ? RIFT_RULE_BY_ID[hero.rift.rule] ?? riftRuleOn(new Date()) : riftRuleOn(new Date());
  const best = hero.riftBests?.[r.id];
  return `${hero.rift ? 'This run' : 'Today'}: ${r.name}. ${r.does}${best ? ` Deepest under it: floor ${best}.` : ''}`;
}

const FOCUS_LABEL = { roam: 'Roam', quest: 'Quest', delve: 'Delve', rift: 'Rifts' };
const FOCUS_ICON = { roam: 'swords', quest: 'scroll', delve: 'door', rift: 'vortex' };
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

// One progress tile on a region card: an icon, a label, a count, and a bar.
function tile(glyph, label, value, done, of) {
  const fill = el('i');
  fill.style.width = `${of ? Math.min(100, (100 * done) / of) : 0}%`;
  return el('div', { className: 'tile' + (of && done >= of ? ' full' : '') },
    el('div', { className: 'tile-head' }, icon(glyph), el('span', { textContent: label })),
    el('strong', { textContent: value }),
    of ? el('div', { className: 'bar thin' }, fill) : null);
}

// The picture strip at the top of a region card: the region's own backdrop, standing still.
function regionStrip(r, i, tag) {
  const strip = el('div', { className: 'scene mini', attrs: { 'data-bg': r.id, 'aria-hidden': 'true' } }, el('div', { className: 'bd' }));
  return el('div', { className: 'region-banner' }, strip,
    el('div', { className: 'region-title' },
      el('span', { className: 'region-num', textContent: String(i + 1) }),
      el('h3', { textContent: r.name }),
      el('span', { className: 'tag', textContent: tag })));
}

export function mountMap(root, app) {
  let selected = null; // region id whose details are showing; follows the hero until tapped
  let followed = null;
  let key = '';
  // The hero on the map: a small sprite beside their region, or walking the road by how far the journey has got.
  const walkCanvas = el('canvas', {});
  const walker = el('div', { className: 'map-walker', hidden: true }, walkCanvas);
  const walkView = new SpriteView(walkCanvas, { stageW: 64, stageH: 64, ground: 1 });
  let walkLook = '';
  let walkPose = '';
  let svgNow = null; // the map drawn last, for measuring the road
  let frameNow = null;
  let legs = []; // the road's legs as path elements, for measuring
  let cardNow = null; // the region card drawn last
  let scrollToCard = false; // set when the quest log opens a region, so the card is brought into view

  function draw(hero) {
    const here = REGION_INDEX[hero.region];
    const news = happeningsOn(new Date());
    const map = svg('svg', { viewBox: '0 0 340 400', class: 'worldmap', role: 'group', 'aria-label': 'World map: eight regions along the road from The Wobbly Griffin' });
    // Open regions glow in their colour; the rest are under fog. The road is solid as far as it is open.
    const openUpTo = REGIONS.reduce((n, r, i) => (regionOpen(hero, r.id) ? i : n), 0);
    map.append(terrain());
    REGIONS.forEach((r, i) => {
      const s = SPOTS[i];
      map.append(regionOpen(hero, r.id)
        ? svg('circle', { cx: s.x, cy: s.y, r: 40, class: 'zone', fill: REGION_COLORS[r.id], filter: 'url(#fog)' })
        : svg('circle', { cx: s.x, cy: s.y, r: 38, class: 'fog', filter: 'url(#fog)' }));
    });
    map.append(
      svg('rect', { x: 3, y: 3, width: 334, height: 394, rx: 10, class: 'map-edge' }),
      svg('path', { d: roadPath(), class: 'road-bed' }),
      svg('path', { d: roadPath(), class: 'road' }),
      svg('path', { d: SPOTS.slice(1, openUpTo + 1).map((_, i) => roadLeg(i)).join(' '), class: 'road-done' }),
      compass());
    // The road leg by leg, unseen, so the walker can be placed along it.
    legs = SPOTS.slice(1).map((_, i) => svg('path', { d: roadLeg(i), fill: 'none', stroke: 'none' }));
    map.append(svg('g', { class: 'legs', 'aria-hidden': 'true' }, ...legs));
    REGIONS.forEach((r, i) => {
      const s = SPOTS[i];
      const open = regionOpen(hero, r.id);
      const state = i === here ? 'here' : open ? 'open' : 'locked';
      const words = r.name.replace(/^The /, '').split(' ');
      const label = svg('text', { x: 0, y: 34, class: 'map-name' });
      label.textContent = words.length > 2 ? words.slice(0, 2).join(' ') : words.join(' ');
      const number = svg('text', { x: 0, y: 5, class: 'map-num' });
      number.textContent = String(i + 1);
      const node = svg('g', {
        transform: `translate(${s.x} ${s.y})`, class: `spot ${state}${r.id === selected ? ' picked' : ''}${hero.travelTo === r.id ? ' bound' : ''}`,
        role: 'button', tabindex: 0, 'aria-pressed': String(r.id === selected),
        'aria-label': `${r.name}, levels ${r.levels[0]} to ${r.levels[1]}, ${state === 'here' ? 'you are here' : state}`,
        style: `--region: ${REGION_COLORS[r.id]}`,
      },
        svg('path', { d: s.doodle, class: 'doodle' }),
        svg('circle', { r: 24, class: 'hit' }),
        state === 'here' ? svg('circle', { r: 15, class: 'pulse' }) : null,
        svg('circle', { r: 15, class: 'dot' }),
        r.id === selected ? svg('circle', { r: 20, class: 'ring' }) : null,
        state === 'locked' ? mapIcon('lock', 'translate(-7 -8) scale(0.58)') : number,
        open && news[r.id] ? svg('g', { class: 'news', transform: 'translate(-15 -15)' }, svg('circle', { r: 7.5 }), mapIcon('star', 'translate(-5.4 -5.4) scale(0.45)')) : null,
        label);
      const pickIt = () => { selected = r.id; app.changed(); };
      node.addEventListener('click', pickIt);
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickIt(); } });
      map.append(node);
    });
    return map;
  }

  function details(state, hero) {
    const i = REGION_INDEX[selected];
    const r = REGIONS[i];
    const d = DUNGEONS[r.id];
    const here = r.id === hero.region;
    const open = regionOpen(hero, r.id);
    const bound = hero.travelTo === r.id;
    const line = (text) => el('p', { className: 'region-line', textContent: text });
    const banner = regionStrip(r, i, here ? 'You are here' : bound ? 'On the way' : open ? 'Open' : 'Locked');
    const levels = el('p', { className: 'region-levels' }, el('strong', { textContent: `Levels ${r.levels[0]} to ${r.levels[1]}. ` }), r.flavor);
    const card = (...kids) => {
      const c = el('section', { className: 'panel region' + (open ? '' : ' locked') }, banner, el('div', { className: 'region-body' }, ...kids.filter(Boolean)));
      c.style.setProperty('--region', REGION_COLORS[r.id]);
      return c;
    };
    if (!open) {
      const before = REGIONS[i - 1];
      return card(levels, line(`A sketch on the map and nothing more. The road opens when ${DUNGEONS[before.id].name}, in ${before.name}, has been cleared.`));
    }

    const all = MONSTERS[r.id];
    const met = all.filter((m) => hero.bestiary[m.id]).length;
    const rareMet = RARES[r.id].filter((m) => hero.bestiary[m.id]).length;
    const sites = SITES[r.id];
    const sitesDone = sites.filter((s) => hero.siteClears?.[s.id]).length;
    const reg = REGULARS[r.id];
    const news = happeningsOn(new Date())[r.id];
    const target = here ? delveTarget(hero) : null;
    const qp = hero.questProgress[r.id];
    const story = qp?.done ?? 0;
    const quest = here && hero.focus === 'quest' && qp?.started ? currentQuest(hero) : null;
    const clears = hero.dungeonClears[r.id] ?? 0;
    const run = here && hero.delve ? hero.delve : null;
    const kids = [levels];
    if (hero.level < r.levels[0]) kids.push(el('p', { className: 'region-warn' }, icon('skull'), el('span', { textContent: `Above ${hero.name}'s level (${hero.level}). Fights here pay more XP and end in the tavern far more often.` })));
    kids.push(el('div', { className: 'tiles' },
      tile('eye', 'Monsters met', `${met} of ${all.length}`, met, all.length),
      tile('scroll', 'Story quests', `${story} of ${STORY_QUESTS}`, story, STORY_QUESTS),
      tile('door', 'Dungeon', clears ? `Cleared ${times(clears)}` : 'Not cleared', clears ? 1 : 0, 1),
      tile('star', 'Rare ones', `${rareMet} of ${RARES[r.id].length}`, rareMet, RARES[r.id].length),
      tile('flag', 'Lesser delves', `${sitesDone} of ${sites.length}`, sitesDone, sites.length),
      tile('heart', reg.name, `${Math.min(qp?.reg ?? 0, reg.beats.length)} of ${reg.beats.length} jobs`, qp?.reg ?? 0, reg.beats.length)));
    // What is going on here today, and the errand that comes with it.
    if (news) {
      const ran = (hero.errands ?? []).includes(`${news.id}-${news.day}`);
      kids.push(el('div', { className: 'news-box' },
        el('p', { className: 'news-name' }, icon('star'), el('span', { textContent: `Today: ${news.name}` })),
        el('p', { className: 'hint', textContent: news.text }),
        el('p', { className: 'news-effect', textContent: HAPPENING_EFFECT[news.kind] }),
        el('p', { className: 'hint', textContent: ran ? `Errand done: ${news.errand.title}.` : `An errand on the quest board, once: ${news.errand.title}. It is set at ${hero.name}'s own level and pays a piece of gear.` })));
    }
    // The next story quest waits for the hero's level.
    if (story < STORY_QUESTS && !storyReady(hero, r.id)) kids.push(line(`Next story quest: ${QUESTS[r.id][story].title}, at level ${storyOpensAt(r.id, story)}. Odd jobs until then.`));
    if (hero.feats.includes(r.id) || qp?.odd) kids.push(line(`${hero.feats.includes(r.id) ? 'Feat earned. ' : ''}${qp?.odd ? `Odd jobs done: ${qp.odd}.` : ''}`.trim()));
    if (quest) kids.push(line(`On the board now: ${quest.title}, step ${Math.min(qp.step + 1, quest.steps)} of ${quest.steps}.`));
    // The places to delve: the dungeon, and the two lesser delves beside it.
    const delveBtn = (place) => {
      const on = here && hero.focus === 'delve' && target === place;
      const b = el('button', { className: 'btn delve-here', type: 'button', textContent: on ? 'Delving here' : 'Delve here', onclick: () => { orderDelve(hero, place.site ? place.id : null); app.changed(); } });
      b.setAttribute('aria-pressed', String(on));
      return b;
    };
    const runIn = (place) => (run && (run.site ?? null) === (place.site ? place.id : null)
      ? line(run.room >= run.rooms ? `Run in progress: every room done, ${place.boss.name} is next.` : `Run in progress: room ${run.room + 1} of ${run.rooms}.`) : null);
    kids.push(el('div', { className: 'dungeon-box' },
      el('p', { className: 'dungeon-name' }, icon('door'), el('span', { textContent: `${d.name}, built for level ${d.level}` })),
      runIn(d),
      el('p', { className: 'hint', textContent: d.about }),
      here ? delveBtn(d) : null));
    kids.push(el('div', { className: 'site-list' }, ...sites.map((s) => {
      const n = hero.siteClears?.[s.id] ?? 0;
      return el('div', { className: 'dungeon-box site-box' + (n ? ' done' : '') },
        el('p', { className: 'dungeon-name' }, icon('flag'), el('span', { textContent: `${s.name}, built for level ${s.level}` })),
        el('p', { className: 'site-state', textContent: `Lesser delve. ${n ? `Cleared ${times(n)}` : 'Not cleared'}${hero.level < s.level ? `. Above ${hero.name}'s level` : ''}.` }),
        runIn(s),
        el('p', { className: 'hint', textContent: s.about }),
        here ? delveBtn(s) : null);
    })));

    const buttons = [];
    if (clears) {
      const c = CHAPTERS[r.id];
      buttons.push(el('button', { className: 'btn', type: 'button', onclick: () => showChapter(document.getElementById('game'), r.id, hero) }, icon('book'), el('span', { textContent: `Read chapter ${c.n}: ${c.title}` })));
    }
    if (!here) {
      buttons.push(bound
        ? el('button', { className: 'btn', type: 'button', textContent: 'Cancel the journey', onclick: () => { orderTravel(hero, hero.region); app.changed(); } })
        : el('button', { className: 'btn primary', type: 'button', onclick: () => { orderTravel(hero, r.id); app.changed(); } }, icon('boots'), el('span', { textContent: 'Travel here' })));
    }
    if (buttons.length) kids.push(el('div', { className: 'row region-actions' }, ...buttons));
    if (!here) {
      const hops = Math.max(1, Math.abs(i - REGION_INDEX[hero.region]));
      const minutes = Math.round((hops * TRAVEL_SECONDS_PER_REGION) / 60 * 10) / 10;
      kids.push(el('p', { className: 'hint', textContent: bound
        ? `${hero.name} sets off when the current task ends.`
        : `About ${minutes} minutes on the road. ${hero.name} sets off when the current task ends.${hero.delve ? ' Leaving abandons the dungeon run in progress.' : ''}` }));
    }
    return card(...kids);
  }

  function orders(hero) {
    const r = REGIONS[REGION_INDEX[hero.region]];
    const d = delveTarget(hero);
    const about = {
      roam: `Roam: ${hero.name} fights the monsters of ${r.name} one at a time. Low risk, steady XP, and it fills the Bestiary.`,
      quest: `Quest: ${hero.name} takes jobs from the quest board, 5 to 8 steps each. Better gold, and finishing all ${STORY_QUESTS} story quests in a region earns a Feat, worth one bonus skill point. Each story quest opens at its own level, with odd jobs in between, and every fourth odd job is for ${REGULARS[r.id].name}. Every finished quest also pays one piece of gear; a story quest's is picked for the slot that needs it most.`,
      delve: `Delve: ${hero.name} runs ${d.name}, ${d.rooms[0]} to ${d.rooms[1]} rooms and then ${d.boss.name}. Hit points do not come back between rooms, and a knockout loses the run and nothing else. ${d.site ? 'A lesser delve: short, and it opens no road. Its keeper gives a good piece of gear the first time.' : 'The first clear opens the next region.'} Built for level ${d.level}${hero.level < d.level ? `; at level ${hero.level} ${hero.name} will be outmatched.` : '.'} Choose where to delve on the region's card above.`,
      rift: `Rifts: ${hero.name} goes down ${RIFT_NAME.replace(/^The /, 'the ')}, one floor at a time, from wherever they stand. ${RIFT_TEXT.about} Hit points come back a little between floors, but only the potions carried in can be drunk. A Warden on every ${RIFT.wardenEvery}th floor leaves gear, and sometimes one of the eight named Legendaries. A knockout ends the run; the next starts at floor 1. Each day the Rifts follow a rule, and a run keeps the rule it began under. ${riftRuleNote(hero)} ${hero.rift ? `Now on floor ${hero.rift.floor}. ` : ''}${hero.stats.riftBest ? `Deepest so far: floor ${hero.stats.riftBest}.` : 'Not yet entered.'}`,
    }[hero.focus];
    const focuses = Object.entries(FOCUS_LABEL).filter(([id]) => id !== 'rift' || hero.level >= MAX_LEVEL);
    return el('section', { className: 'panel orders' },
      el('h3', { textContent: hero.focus === 'rift' ? 'Standing order: the Rifts' : `Standing order in ${r.name}` }),
      el('div', { className: 'order-btns' }, ...focuses.map(([id, label]) => {
        const b = el('button', { type: 'button', className: 'order-btn o-' + id, onclick: () => { setFocus(hero, id); app.changed(); } }, icon(FOCUS_ICON[id]), el('span', { textContent: label }));
        b.setAttribute('aria-pressed', String(hero.focus === id));
        return b;
      })),
      el('p', { className: 'hint', textContent: about }),
      el('p', { className: 'hint', textContent: 'A new order takes effect when the current task ends.' }));
  }

  // The notice board: today's three bounties, and the one in hand. One may be taken a day; it stays
  // until it is done or another is taken in its place.
  function board(state, hero) {
    const now = new Date();
    const free = canTake(hero, now);
    const b = hero.bounty;
    const reward = (kind, level) => { const p = bountyReward(kind, level); return `${num(p.gold)} gp, ${num(p.xp)} XP${p.piece ? ', and a piece of gear' : ''}`; };
    const kids = [el('h3', {}, icon('board'), el('span', { textContent: 'Notice board' }))];
    if (b) {
      const fill = el('i');
      fill.style.width = `${Math.min(100, (100 * b.have) / b.need)}%`;
      kids.push(el('div', { className: 'bounty mine' },
        el('p', { className: 'bounty-title', textContent: `In hand: ${b.title}` }),
        el('p', { className: 'hint', textContent: b.about }),
        el('div', { className: 'bar thin' }, fill),
        el('p', { className: 'bounty-pay', textContent: `${Math.min(b.have, b.need)} of ${b.need}. Pays ${reward(b.kind, b.level)}.` })));
    }
    kids.push(el('p', { className: 'hint', textContent: free
      ? `Three bounties are posted each day. ${hero.name} may take one${b ? ', in place of the one in hand' : ''}; it keeps until it is done.`
      : 'One bounty a day, and today\'s is taken. The board changes at midnight.' }));
    postingsOn(now, hero).forEach((p, i) => {
      const take = () => { if (takeBounty(state, hero, i, new Date())) app.changed(); };
      kids.push(el('div', { className: 'bounty' + (free ? '' : ' shut') },
        el('p', { className: 'bounty-title', textContent: p.title }),
        el('p', { className: 'hint', textContent: p.about }),
        el('p', { className: 'bounty-pay', textContent: `Pays ${reward(p.kind, hero.level)}.` }),
        free ? (b ? confirmBtn('Take this one instead', 'Tap again: drop the old one', take, 'btn') : el('button', { className: 'btn primary', type: 'button', textContent: 'Take this bounty', onclick: take })) : null));
    });
    return el('section', { className: 'panel notice-board' }, ...kids);
  }

  function update(state, hero) {
    if (followed !== hero.id + hero.region) { followed = hero.id + hero.region; selected = hero.region; }
    if (!REGION_INDEX[selected] && selected !== REGIONS[0].id) selected = hero.region;
    const qp = hero.questProgress[selected];
    const next = JSON.stringify([questLogKey(state, hero), riftRuleOn(new Date()).id,
      hero.id, hero.name, hero.level, hero.region, hero.travelTo, hero.focus, selected, hero.dungeonClears, hero.feats.length,
      qp?.done, qp?.step, qp?.odd, qp?.started, hero.delve?.room, hero.delve?.rooms, hero.rift?.floor, hero.stats.riftBest,
      MONSTERS[selected].filter((m) => hero.bestiary[m.id]).length,
      RARES[selected].filter((m) => hero.bestiary[m.id]).length, hero.site, hero.siteClears, hero.delve?.site, qp?.reg, hero.errands?.length,
      dayOf(new Date()), hero.bountyDay, hero.bounty?.title, hero.bounty?.have,
    ]);
    if (next === key) return;
    key = next;
    svgNow = draw(hero);
    walker.classList.remove('placed');
    frameNow = el('div', { className: 'map-frame' }, svgNow, walker);
    cardNow = details(state, hero);
    root.replaceChildren(
      el('h2', { className: 'view-title', textContent: 'Quests' }),
      questLog(state, hero, goTo),
      el('h3', { className: 'view-subtitle', textContent: 'The road from The Wobbly Griffin' }),
      frameNow,
      cardNow,
      orders(hero),
      board(state, hero));
    if (scrollToCard) { scrollToCard = false; requestAnimationFrame(() => cardNow?.scrollIntoView({ block: 'start', behavior: 'smooth' })); }
  }

  // The quest log opens a region's card on the map.
  function goTo(regionId) {
    selected = regionId;
    scrollToCard = true;
    app.changed();
  }

  // Where the hero is on the map. On the road: from one spot to another, a share of the way there,
  // walking. Recovering from a knockout: by the tavern's door. Anywhere else: standing just right of the
  // region's dot, so its number still shows.
  function placeWalker(hero) {
    const t = hero.currentTask;
    walker.hidden = !svgNow || root.hidden;
    if (walker.hidden) return;
    let pt;
    let facing = 'down';
    let still = true;
    if (t && (t.kind === 'travel' || t.kind === 'return')) {
      const from = t.kind === 'return' ? REGION_INDEX[hero.region] : hero.returning ? 0 : REGION_INDEX[hero.region];
      const to = t.kind === 'return' ? 0 : REGION_INDEX[t.to];
      const share = Math.min(1, (t.elapsed + 1) / t.duration); // a second ahead; the CSS eases the rest
      const step = to >= from ? 1 : -1;
      const lens = [];
      for (let i = from; i !== to; i += step) lens.push(legs[Math.min(i, i + step)].getTotalLength());
      let d = share * lens.reduce((a, b) => a + b, 0);
      pt = SPOTS[from];
      for (let k = 0, i = from; i !== to; k++, i += step) {
        const leg = legs[Math.min(i, i + step)];
        if (d <= lens[k] || i + step === to) {
          const along = Math.min(d, lens[k]);
          pt = leg.getPointAtLength(step > 0 ? along : lens[k] - along);
          facing = SPOTS[i + step].x < SPOTS[i].x ? 'left' : 'right'; // the way this stretch of road goes
          break;
        }
        d -= lens[k];
      }
      still = false;
    } else if (t?.kind === 'tavern') {
      pt = TAVERN_DOOR;
    } else {
      const s = SPOTS[REGION_INDEX[hero.region]];
      pt = { x: s.x + 20, y: s.y + 12 };
    }
    // From the map's own units (340 by 400) to pixels in the frame.
    const box = svgNow.getBoundingClientRect();
    const frame = frameNow.getBoundingClientRect();
    if (!box.width) return;
    walker.style.left = `${box.left - frame.left + (pt.x / 340) * box.width}px`;
    walker.style.top = `${box.top - frame.top + (pt.y / 400) * box.height}px`;
    walker.classList.toggle('walking', !still);
    // The first placing after the map is drawn jumps straight there; after that it eases.
    if (!walker.classList.contains('placed')) requestAnimationFrame(() => walker.classList.add('placed'));
    const look = JSON.stringify(portraitOf(hero));
    const pose = look + facing + still;
    if (pose !== walkPose) {
      walkPose = pose;
      walkView.set({ look: heroLook(portraitOf(hero)), anim: 'walk', facing, still });
    }
  }

  function updateAll(state, hero) {
    update(state, hero);
    placeWalker(hero);
  }
  return { update: updateAll };
}
