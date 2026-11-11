// Legacy screens (Phase 6): the one-time retirement card at level 20, and Hall of Legends
// portraits. A portrait is redrawn from the look data kept when the hero retired (`portraitOf` in
// js/tavern.js), so it shows the sprite exactly as it was: gear, emblem, wisp, and glow.

import { RETIRE_OFFER } from '../../data/tavern.js';
import { heroLook, drawStill } from '../sprite.js';
import { el, confirmBtn } from './dom.js';

const fill = (text, hero) => text.replace(/\{name\}/g, hero.name);

export function drawPortrait(canvas, look, scale = 2) {
  return drawStill(canvas, heroLook(look), { facing: 'down', scale }).catch((err) => console.warn('Could not draw a portrait', err));
}

// The card shown once when a hero reaches level 20. `onRetire` retires them; `onKeep` closes it.
export function showRetireOffer(root, hero, { onRetire, onKeep }) {
  root.querySelector('.overlay.retire-offer')?.remove();
  const portrait = el('canvas', { className: 'portrait', attrs: { 'aria-label': `${hero.name}, as they are now` } });
  const keep = el('button', { className: 'btn', type: 'button', textContent: 'Keep adventuring' });
  const go = confirmBtn('Retire to the Hall', 'Tap again: retire for good', () => { overlay.remove(); onRetire?.(); }, 'btn primary');
  const overlay = el('div', { className: 'overlay retire-offer', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'retire-title' } },
    el('div', { className: 'panel card chapter-card' },
      el('p', { className: 'chapter-kicker', textContent: 'The Wobbly Griffin' }),
      el('h2', { id: 'retire-title', textContent: `${hero.name}, ${RETIRE_OFFER.title}` }),
      el('div', { className: 'portrait-frame' }, portrait),
      ...RETIRE_OFFER.text.map((p) => el('p', { className: 'chapter-text', textContent: fill(p, hero) })),
      el('div', { className: 'row card-actions' }, keep, go)));
  keep.onclick = () => { overlay.remove(); onKeep?.(); };
  root.append(overlay);
  return portrait;
}
