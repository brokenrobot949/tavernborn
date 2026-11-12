// What happens on top of the Hero tab's scene besides the hero: the foe they are fighting (a dark
// shape, as LPC has no monster art), dice that rise when a roll lands, the level-up burst, the
// banner on arriving in a region, and the weather. All drawn in code; nothing to download.

import { el } from './dom.js';
import { icon } from './icons.js';

const NS = 'http://www.w3.org/2000/svg';

// Foe shapes on a 64 x 64 box, standing on its bottom edge and facing left, toward the hero.
// `eyes` is where the two glints go. A path starting with '~' is a stroke (legs, a weapon).
const SHAPES = {
  humanoid: { eyes: [[29, 12], [33, 12]], d: ['M32 4c5 0 8 4 8 8 0 3-1 5-3 6l5 3 2 18h-5l-1-11-1 13 2 23h-6l-2-17-2 17h-6l2-23-1-13-2 6-6 2v-4l4-1 3-14 5-3c-2-1-3-3-3-6 0-4 3-8 8-8z', '~M18 42l-8-18'] },
  small: { scale: 0.72, eyes: [[28, 30], [33, 30]], d: ['M31 22c6 0 9 3 9 7l7-4-2 7-5 1 2 4 4 12 1 15h-6l-2-11-2 11h-6l1-15-3-6-6 4-2-3 7-7c-1-2-2-4-2-7 0-4 3-8 9-8z'] },
  big: { scale: 1.3, eyes: [[27, 13], [33, 13]], d: ['M30 3c6 0 9 4 9 9 0 2 0 3-1 5l10 4 4 18-5 2-4-12v14l3 21h-8l-3-17-3 17h-8l2-21-1-14-4 10-8 4-2-4 6-6 3-14 10-4c-1-2-1-3-1-5 0-5 3-9 9-9z'] },
  beast: { eyes: [[9, 30], [13, 30]], d: ['M4 36l2-8 6-4 6 2 4 4h24c8 0 12 4 13 10l4 2-2 4-3-2c-1 3-3 5-5 6v14h-5l-1-11H25l-2 11h-5l1-14c-3-2-5-5-6-8l-6 1z'] },
  critter: { scale: 0.75, eyes: [[11, 46], [15, 46]], d: ['M6 54c0-6 4-10 10-10l6-4c3-1 5 0 6 2h12c10 0 16 6 16 14v8H8z', '~M56 58q6-2 6 4'] },
  bird: { eyes: [[16, 18], [19, 18]], d: ['M8 22l8-8c4-2 8 0 9 4l2 6 14-10 14 2-10 6 8 4-14 4-4 10h4v20h-4V44h-4v16h-4V44l-6-8c-4-2-6-6-6-10l-6-2z'] },
  tree: { scale: 1.15, eyes: [[25, 22], [36, 22]], d: ['M32 4c13 0 22 8 22 18 0 8-6 14-14 15l-2 5v22H26V42l-2-5c-8-1-14-7-14-15C10 12 19 4 32 4z', '~M26 46l-10-8', '~M38 48l10-6'] },
  blob: { eyes: [[24, 40], [34, 40]], d: ['M6 64c0-6 2-10 4-12 0-12 10-22 22-22 13 0 24 10 24 24 2 2 2 6 2 10z'] },
  spider: { scale: 0.9, eyes: [[16, 40], [20, 40]], d: ['M14 44c0-6 5-10 11-10 4 0 7 2 8 4 4-4 10-6 16-4 7 3 9 10 6 16-3 5-10 7-16 5-3 3-7 4-11 4-8 0-14-7-14-15z', '~M22 50l-8 14', '~M28 52l-2 12', '~M38 54l2 10', '~M44 54l10 10', '~M24 38l-12-6-4 6', '~M46 40l10-10 6 4'] },
  flame: { eyes: [[27, 38], [35, 38]], d: ['M32 6c4 10 18 18 18 34 0 12-8 20-18 20s-18-8-18-20c0-8 4-12 6-18 2 4 4 6 6 6-2-8 0-16 6-22z'] },
  eye: { eyes: [[28, 32], [36, 32]], d: ['M32 10c13 0 22 9 22 21s-9 21-22 21-22-9-22-21 9-21 22-21z', '~M14 44l-6 18', '~M24 52l-2 12', '~M40 52l2 12', '~M50 44l6 18'] },
  dragon: { scale: 1.4, eyes: [[11, 16], [14, 16]], d: ['M4 20l8-8c4-2 8-1 10 2l4 10 8-16 6 4 4-12 6 10 8-2-4 12 8 4-10 4c2 6 2 12-2 18l4 14h-7l-4-10h-8l-2 10h-7l3-14c-4-4-6-8-6-12l-6-8-6 4-8-1z'] },
};
export const FOE_SHAPES = Object.keys(SHAPES);

// Which shape a foe takes, from its name.
const SHAPE_RULES = [
  [/dragon|drake|vexaldrith|salamander/i, 'dragon'], [/spider|scorpion/i, 'spider'], [/eyes|voice/i, 'eye'],
  [/wisp|elemental|dust devil/i, 'flame'], [/ooze|bog|leech|mimic/i, 'blob'],
  [/oak|scarecrow|bramble|stalactite|toadstool|myconid/i, 'tree'],
  [/owlbear|boar|wolf|mule|goat|camel|sphinx/i, 'beast'], [/goose|gull|harpy/i, 'bird'], [/\brat\b|crab/i, 'critter'],
  [/ogre|giant|troll|guardian|tide-reeve|seneschal|hekmet/i, 'big'], [/goblin|sprite/i, 'small'],
];
export function shapeFor(name) {
  for (const [re, shape] of SHAPE_RULES) if (re.test(name)) return shape;
  return 'humanoid';
}
// A steady pick from a list for a piece of text (a quest step has no named foe).
export const pickBy = (text, list) => list[[...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % list.length];

// The foe's <svg>. `tint` is the colour of its glinting eyes.
export function foeSvg(shape, tint = '#ff5a3a') {
  const s = SHAPES[shape] ?? SHAPES.humanoid;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', 'foe-shape');
  svg.style.setProperty('--foe-scale', String(s.scale ?? 1));
  for (const d of s.d) {
    const p = document.createElementNS(NS, 'path');
    if (d[0] === '~') { p.setAttribute('d', d.slice(1)); p.setAttribute('class', 'limb'); } else p.setAttribute('d', d);
    svg.append(p);
  }
  for (const [x, y] of s.eyes) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 1.4); c.setAttribute('class', 'glint');
    c.style.fill = tint;
    svg.append(c);
  }
  return svg;
}

// A roll rising from the fight: the die, coloured by how it went, and what it paid or cost.
export function popRoll(layer, e, delay = 0) {
  const r = e.roll;
  const gains = [];
  if (e.xp) gains.push(el('span', { className: 'pop-xp', textContent: `+${Math.round(e.xp)} XP` }));
  if (e.gold) gains.push(el('span', { className: 'pop-gold', textContent: `+${Math.round(e.gold)} gp` }));
  if (e.damage) gains.push(el('span', { className: 'pop-hurt', textContent: `-${Math.round(e.damage)} HP` }));
  const pop = el('div', { className: `pop o-${r.outcome}` },
    el('span', { className: 'pop-die' }, icon('d20'), el('strong', { textContent: String(r.die) })),
    r.outcome === 'crit' ? el('span', { className: 'pop-word', textContent: 'Natural 20' }) : r.outcome === 'fumble' ? el('span', { className: 'pop-word', textContent: 'Natural 1' }) : null,
    gains.length ? el('span', { className: 'pop-gains' }, ...gains) : null);
  pop.style.animationDelay = `${delay}ms`;
  layer.append(pop);
  setTimeout(() => pop.remove(), 2200 + delay);
}

// The level-up burst: gold rays on `back` (a layer behind the hero) and a banner on `layer`.
export function burst(layer, back, title, sub) {
  layer.querySelector('.burst')?.remove();
  back.querySelector('.burst')?.remove();
  const rays = el('div', { className: 'burst' }, el('div', { className: 'rays' }));
  const b = el('div', { className: 'burst' },
    el('div', { className: 'burst-banner' }, el('strong', { textContent: title }), sub ? el('span', { textContent: sub }) : null));
  back.append(rays);
  layer.append(b);
  setTimeout(() => { b.remove(); rays.remove(); }, 3200);
}

// The banner on arriving in a region.
export function arrival(layer, name, sub) {
  layer.querySelector('.arrival')?.remove();
  const b = el('div', { className: 'arrival' }, el('small', { textContent: 'Arriving in' }), el('strong', { textContent: name }), el('span', { textContent: sub }));
  layer.append(b);
  setTimeout(() => b.remove(), 4200);
}

// Weather by region. Some is always there (the fen's mist, the volcano's embers, the spores of
// the Underdeep); rain, snow, leaves, and blowing sand come and go in spells of an hour and a half,
// the same on every device at the same moment.
const WEATHER = {
  mugwick: { kind: 'clear' },
  mumblewood: { kind: 'leaves', chance: 0.6 },
  saltmarrow: { kind: 'rain', chance: 0.55 },
  peaks: { kind: 'snow', chance: 0.65 },
  gloamfen: { kind: 'mist', chance: 1 },
  cinder: { kind: 'sand', chance: 0.5 },
  underdeep: { kind: 'spores', chance: 1 },
  wyrmspire: { kind: 'embers', chance: 1 },
};
const SPELL_MS = 90 * 60 * 1000;
export function weatherFor(region, now = Date.now()) {
  const w = WEATHER[region];
  if (!w || w.kind === 'clear') return '';
  if (w.chance >= 1) return w.kind;
  const spell = Math.floor(now / SPELL_MS);
  const roll = ((spell * 2654435761 + region.length * 97 + region.charCodeAt(0) * 13) >>> 0) % 1000 / 1000;
  return roll < w.chance ? w.kind : '';
}
