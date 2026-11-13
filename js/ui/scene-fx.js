// What happens on top of the Hero tab's scene besides the hero: which kind of foe they are fighting
// (drawn in js/ui/foes.js), dice that rise when a roll lands, the level-up burst, the banner on
// arriving in a region, and the weather. All drawn in code; nothing to download.

import { el } from './dom.js';
import { icon } from './icons.js';

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
