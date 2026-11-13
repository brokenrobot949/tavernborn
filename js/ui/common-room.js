// The common room at the top of the Tavern tab: the tavern backdrop, a pixel-art hearth with a fire
// that burns, the trophy plaques and the glass case of Legendaries on the wall, and every hero on
// the roster walking about the room: over to the fire, to the window, to the bar, standing a while,
// and off again. Drawn in code at two screen pixels to a sprite pixel; nothing to download.

import { el } from './dom.js';
import { SpriteView, heroLook } from '../sprite.js';
import { LEGENDARIES } from '../../data/loot.js';
import { TROPHIES, TROPHY_COLORS } from '../../data/tavern.js';
import { trophyWall, portraitOf } from '../tavern.js';
import { REGION_COLORS } from './map.js';

const PX = 2; // screen pixels to a sprite pixel in the room
const WALK = 34; // screen pixels a second, a stroll
// Places a regular heads for, as a share of the room's width, and which way they face on arrival.
const SPOTS = [
  { x: 0.84, face: 'up', why: 'the fire' },
  { x: 0.73, face: 'up', why: 'the window' },
  { x: 0.25, face: 'up', why: 'the bar' },
  { x: 0.45, face: 'down', why: 'the middle of the room' },
  { x: 0.12, face: 'down', why: 'the door' },
];

// ----- the hearth: a stone surround, logs, and a fire drawn fresh every frame -----
const HW = 34, HH = 32; // in sprite pixels
function drawHearth(g, t) {
  g.clearRect(0, 0, HW, HH);
  // stone surround, with a darker course of mortar every few rows
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < HW; x++) {
      const inOpening = x >= 7 && x < HW - 7 && y >= 11 && (y >= 17 || (x - HW / 2) ** 2 / 100 + (y - 17) ** 2 / 36 <= 1);
      if (inOpening) continue;
      const course = Math.floor(y / 4);
      const brick = Math.floor((x + (course % 2) * 3) / 6);
      const mortar = y % 4 === 0 || (x + (course % 2) * 3) % 6 === 0;
      const shade = ((brick * 7 + course * 13) % 5) * 6;
      g.fillStyle = mortar ? '#4a4048' : `rgb(${120 + shade}, ${112 + shade}, ${118 + shade})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  // mantel
  g.fillStyle = '#5a3e26'; g.fillRect(0, 0, HW, 3);
  g.fillStyle = '#7a5636'; g.fillRect(0, 0, HW, 1);
  // the opening: soot, then the fire
  g.fillStyle = '#1a1214';
  for (let y = 11; y < HH; y++) for (let x = 7; x < HW - 7; x++) {
    if (y >= 17 || (x - HW / 2) ** 2 / 100 + (y - 17) ** 2 / 36 <= 1) g.fillRect(x, y, 1, 1);
  }
  const base = HH - 4;
  for (let x = 9; x < HW - 9; x++) {
    const mid = 1 - Math.abs(x - HW / 2) / (HW / 2 - 9);
    const flick = Math.sin(t / 90 + x * 1.7) + Math.sin(t / 150 + x * 0.9) * 0.6 + Math.sin(t / 55 + x * 3.1) * 0.4;
    const h = Math.max(1, Math.round(3 + mid * 9 + flick * 1.6));
    for (let k = 0; k < h; k++) {
      const f = k / h;
      g.fillStyle = f > 0.8 ? '#c8401e' : f > 0.55 ? '#f07a2a' : f > 0.3 ? '#ffb43a' : '#fff0a0';
      g.fillRect(x, base - k, 1, 1);
    }
  }
  // logs and embers
  g.fillStyle = '#5a3420'; g.fillRect(9, base, HW - 18, 2);
  g.fillStyle = '#7a4a2a'; g.fillRect(11, base - 1, 5, 1); g.fillRect(HW - 16, base - 1, 5, 1);
  g.fillStyle = '#ff6a2a';
  for (let i = 0; i < 4; i++) if (Math.sin(t / 200 + i * 2.1) > 0.2) g.fillRect(10 + i * 4, base + 1, 1, 1);
  // hearthstone
  g.fillStyle = '#6a6068'; g.fillRect(3, HH - 2, HW - 6, 2);
}

export function mountCommonRoom() {
  const hearth = el('canvas', { className: 'hearth' });
  hearth.width = HW; hearth.height = HH;
  hearth.style.width = `${HW * 3}px`; // a size larger than the regulars' pixels: it is nearer the eye
  const hg = hearth.getContext('2d');
  const glow = el('div', { className: 'hearth-glow' });
  const plaques = el('div', { className: 'trophy-wall' });
  const relics = el('div', { className: 'relic-case', attrs: { title: 'The glass case' } });
  const floor = el('div', { className: 'room-floor' });
  const room = el('div', { className: 'scene mini common-room', attrs: { 'data-bg': 'tavern', 'aria-hidden': 'true' } },
    el('div', { className: 'bd' }), el('div', { className: 'tavern-window' }), plaques, relics, glow, hearth, floor);

  let walkers = []; // { id, view, node, x, target, wait, face }
  let key = '';
  let last = 0;
  let frame = 0;

  function plan(w, now) {
    const spot = SPOTS[Math.floor(Math.random() * SPOTS.length)];
    w.target = spot.x + (Math.random() - 0.5) * 0.1; // not all on the same floorboard
    w.face = spot.face;
    w.wait = 0;
    w.until = now;
  }

  function step(now) {
    frame = requestAnimationFrame(step);
    if (room.offsetParent === null) { last = now; return; } // the Tavern tab is not showing
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    drawHearth(hg, now);
    const width = room.clientWidth;
    for (const w of walkers) {
      if (w.wait > now) continue;
      const goal = Math.max(52, Math.min(width - 52, w.target * width)); // keep the whole sprite in the room
      const dx = goal - w.x;
      if (Math.abs(dx) < 2) {
        // arrived: stand a while facing what they came for, then set off somewhere else
        if (!w.standing) { w.standing = true; w.view.set({ anim: 'walk', facing: w.face, still: true }); w.wait = now + 3000 + Math.random() * 6000; continue; }
        w.standing = false;
        plan(w, now);
        continue;
      }
      const facing = dx < 0 ? 'left' : 'right';
      if (w.walkingFacing !== facing || w.view.still) { w.walkingFacing = facing; w.view.set({ anim: 'walk', facing, still: false }); }
      w.x += Math.sign(dx) * Math.min(Math.abs(dx), WALK * dt);
      w.node.style.transform = `translateX(${Math.round((w.x - 64) / PX) * PX}px)`; // x is the middle of the sprite
    }
  }

  // Redraw the plaques, the case, and the regulars when one of them changes.
  function update(state) {
    const hung = trophyWall(state).hung;
    const cased = state.tavern.relics ?? [];
    const looks = state.heroes.map((h) => portraitOf(h));
    const next = JSON.stringify([hung, cased, looks, state.heroes.map((h) => h.id)]);
    if (next === key) return;
    key = next;
    plaques.replaceChildren(...hung.map((id) => { const i = el('i', { title: TROPHIES[id] }); i.style.setProperty('--trophy', TROPHY_COLORS[id]); return i; }));
    relics.replaceChildren(...cased.map((r) => { const i = el('i', { title: LEGENDARIES[r.legend]?.name ?? '' }); i.style.setProperty('--gem', REGION_COLORS[r.legend] ?? '#ff8000'); return i; }));
    relics.hidden = !cased.length;
    // The regulars: keep anyone already in the room where they are, add and remove the rest.
    const width = room.clientWidth || 340;
    const kept = [];
    for (const [n, h] of state.heroes.entries()) {
      let w = walkers.find((x) => x.id === h.id);
      if (!w) {
        const canvas = el('canvas', { className: 'regular' });
        const node = el('div', { className: 'walker' }, canvas);
        const view = new SpriteView(canvas, { stageW: 64, stageH: 64, ground: 1 });
        w = { id: h.id, view, node, x: width * (0.3 + 0.2 * n), target: 0.5, wait: 0, face: 'down' };
        floor.append(node);
        plan(w, performance.now());
        w.wait = performance.now() + 800 * n;
      }
      w.view.set({ look: heroLook(looks[n]), anim: 'walk', facing: w.walkingFacing ?? 'down', still: !!w.standing });
      kept.push(w);
    }
    for (const w of walkers) if (!kept.includes(w)) { cancelAnimationFrame(w.view.frameReq); w.node.remove(); }
    walkers = kept;
    if (!frame) frame = requestAnimationFrame(step);
  }

  return { room, update, setTime(time) { room.dataset.time = time; } };
}
