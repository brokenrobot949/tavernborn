// LPC layer compositing and animation.
// Layers are pre-coloured PNGs in assets/lpc (see tools/sprites.mjs). This module only
// stacks them in zPos order on a small buffer and scales the result up with smoothing off.

import { LAYERS, CUSTOM_ANIMS } from '../data/sprite-layers.js';
import { RACES, HAIR_STYLES } from '../data/races.js';
import { GEAR, SLOTS, EMBLEM } from '../data/items.js';
import { layerKey } from './layer-key.js';

export const FRAME = 64;
export const SCALE = 4;
const ASSET_ROOT = new URL('../assets/lpc/', import.meta.url).href;

// Standard LPC sheets: one row per facing (hurt has a single row), frames listed per cycle.
export const ANIMS = {
  walk: { frames: [1, 2, 3, 4, 5, 6, 7, 8], fps: 9, rows: 4 },
  slash: { frames: [0, 1, 2, 3, 4, 5], fps: 10, rows: 4, rest: 350 },
  thrust: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, rows: 4, rest: 350 },
  hurt: { frames: [0, 1, 2, 3, 4, 5], fps: 8, rows: 1, rest: 900 },
};
export const FACINGS = ['up', 'left', 'down', 'right'];

const images = new Map();
function loadImage(file) {
  if (!images.has(file)) {
    images.set(file, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { console.warn('missing sprite layer', file); resolve(null); };
      img.src = ASSET_ROOT + file;
    }));
  }
  return images.get(file);
}

// The layer refs for a hero: body, head, race extras, hair, beard, then one look per gear slot.
// `tiers` maps slot id -> 0..4, or null for an empty slot. The level milestones ride along:
// `emblem` adds the class's neck clip (level 10), and `fx` is what is drawn in code around the
// sprite: { wisp: a colour (level 15), glow: true (level 20) }. LPC has no familiar and no aura.
export function heroLook({ race, build, skin, hairStyle, hairColor, beard, cls, tiers, emblem = false, fx = null }) {
  const r = RACES[race];
  const b = r.builds.find((x) => x.id === build) ?? r.builds[0];
  const fill = (ref) => ({ ...ref, color: ref.color === '$skin' ? skin : ref.color === '$hair' ? hairColor : ref.color });
  const refs = [{ def: 'body', color: skin }, { def: b.head, color: skin }, ...r.extras.map(fill)];
  const gear = [];
  for (const slot of SLOTS) {
    const tier = tiers?.[slot.id];
    if (tier != null) gear.push(...GEAR[cls][slot.id][tier]);
  }
  const style = HAIR_STYLES.find((s) => s.id === hairStyle);
  if (style && !gear.some((g) => g.hideHair)) refs.push({ def: style.def, color: hairColor });
  if (beard && r.beard) refs.push(...r.beard.map(fill));
  refs.push(...gear);
  if (emblem) refs.push(...EMBLEM[cls]);
  return { body: b.body, refs, fx };
}

// LPC draws the front of a shield (110 to 115) over the head but under hats (120 to 139), so a
// wide brim or a big jaw cuts into it. The front is lifted above every hat, in the same order,
// and stays under the weapon (140 and up).
const shieldFront = (ref, z) => (ref.def.startsWith('shield_') && z >= 110 && z < 120 ? 139 + (z - 109) / 10 : z);

// Flatten refs into drawable sub-layers for one body type, sorted by draw order.
function sublayers(look) {
  const out = [];
  look.refs.forEach((ref, order) => {
    const subs = LAYERS[layerKey(ref)];
    if (!subs) { console.warn('no baked layer for', layerKey(ref)); return; }
    for (const s of subs) {
      const set = s.f[s.b[look.body]];
      if (set) out.push({ z: shieldFront(ref, s.z), order, custom: s.c ? CUSTOM_ANIMS[s.c] : null, files: set });
    }
  });
  return out.sort((a, b) => a.z - b.z || a.order - b.order);
}

// Work out what to draw for one animation: the frame cycle, buffer size, and the layer images.
async function prepare(look, anim) {
  const subs = sublayers(look).filter((s) => s.files[anim]);
  const oversize = subs.filter((s) => s.custom);
  const size = Math.max(FRAME, ...oversize.map((s) => s.custom.size));
  // An oversize weapon sheet dictates the cycle; its columns are indexed by position in that cycle.
  let cycle = ANIMS[anim].frames.map((f) => ({ body: f, col: f }));
  if (oversize.length) {
    const c = oversize[0].custom;
    cycle = c.frames.map((f, i) => ({ body: f, col: i })).slice(c.skip ?? 0);
  }
  const layers = await Promise.all(subs.map(async (s) => ({ img: await loadImage(s.files[anim]), cell: s.custom ? s.custom.size : FRAME, custom: !!s.custom })));
  return { size, cycle, layers: layers.filter((l) => l.img), rows: ANIMS[anim].rows };
}

function drawFrame(ctx, prep, step, row) {
  const { size, cycle, layers } = prep;
  const f = cycle[step % cycle.length];
  for (const l of layers) {
    const col = l.custom ? f.col : f.body;
    const off = (size - l.cell) / 2;
    const sx = col * l.cell, sy = row * l.cell;
    if (sx + l.cell > l.img.width || sy + l.cell > l.img.height) continue;
    ctx.drawImage(l.img, sx, sy, l.cell, l.cell, off, off, l.cell, l.cell);
  }
}

// The milestones drawn in code, in canvas pixels. `cx, cy` is the middle of the body frame and
// `unit` one sprite pixel. The glow goes behind the hero; the wisp floats in front, by the
// shoulder, and bobs with `t` (milliseconds).
function drawGlow(ctx, fx, cx, cy, unit, t = 0) {
  if (!fx?.glow) return;
  const r = unit * (34 + 2 * Math.sin(t / 900));
  const g = ctx.createRadialGradient(cx, cy + unit * 6, unit * 4, cx, cy + unit * 6, r);
  g.addColorStop(0, 'rgba(255, 222, 120, 0.55)');
  g.addColorStop(0.55, 'rgba(255, 205, 90, 0.22)');
  g.addColorStop(1, 'rgba(255, 200, 80, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy + unit * 6 - r, 2 * r, 2 * r);
}
function drawWisp(ctx, fx, cx, cy, unit, t = 0) {
  if (!fx?.wisp) return;
  const x = cx - unit * (21 + 2 * Math.sin(t / 1300)), y = cy - unit * (9 + 3 * Math.sin(t / 520));
  const r = unit * 7;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  g.addColorStop(0.25, fx.wisp);
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.fillStyle = '#fff';
  ctx.fillRect(Math.round(x - unit), Math.round(y - unit), unit * 2, unit * 2); // a hard pixel core, to sit with the art
  ctx.restore();
}

// Draw one still frame of a hero onto a canvas. Used for the tier line-up and, later, portraits.
export async function drawStill(canvas, look, { anim = 'walk', facing = 'down', scale = 2, step = 0, wide = false } = {}) {
  const prep = await prepare(look, anim);
  const buf = new OffscreenCanvas(prep.size, prep.size);
  const row = prep.rows === 1 ? 0 : FACINGS.indexOf(facing);
  // step 0 of walk is mid-stride; use the standing frame (column 0) for stills
  const still = { ...prep, cycle: anim === 'walk' && step === 0 ? [{ body: 0, col: 0 }] : prep.cycle };
  drawFrame(buf.getContext('2d'), still, step, row);
  // `wide` keeps the whole oversize buffer so weapon swings are not cropped
  const view = wide ? prep.size : FRAME;
  canvas.width = view * scale;
  canvas.height = view * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const off = (prep.size - view) / 2;
  drawGlow(ctx, look.fx, canvas.width / 2, canvas.height / 2, scale);
  ctx.drawImage(buf, off, off, view, view, 0, 0, view * scale, view * scale);
  drawWisp(ctx, look.fx, canvas.width / 2, canvas.height / 2, scale);
}

// An animated hero on a stage canvas. The stage is wider and taller than one 64 px frame so
// oversize weapon swings have room; anything beyond the stage is clipped.
export class SpriteView {
  constructor(canvas, { stageW = 96, stageH = 96, ground = 10, shadow = false } = {}) {
    this.canvas = canvas;
    this.shadow = shadow; // a soft shadow on the ground under the feet (the Hero tab's scene)
    this.ctx = canvas.getContext('2d');
    this.stageW = stageW;
    this.stageH = stageH;
    this.ground = ground;
    this.buf = new OffscreenCanvas(192, 192);
    this.bctx = this.buf.getContext('2d');
    this.look = null;
    this.anim = 'walk';
    this.facing = 'down';
    this.prep = null;
    this.step = 0;
    this.nextAt = 0;
    this.fxAt = 0;
    this.token = 0;
    this.resize(stageW);
    this.frameReq = requestAnimationFrame((t) => this.tick(t));
  }

  resize(stageW) {
    this.stageW = stageW;
    this.canvas.width = stageW * SCALE;
    this.canvas.height = this.stageH * SCALE;
    this.canvas.style.width = stageW * SCALE + 'px';
    this.canvas.style.height = this.stageH * SCALE + 'px';
    this.render();
  }

  async set({ look = this.look, anim = this.anim, facing = this.facing } = {}) {
    const restart = anim !== this.anim;
    this.look = look;
    this.anim = anim;
    this.facing = facing;
    if (!look) return;
    const token = ++this.token;
    const prep = await prepare(look, anim);
    if (token !== this.token) return; // a newer request superseded this one
    this.prep = prep;
    if (restart) { this.step = 0; this.nextAt = 0; }
    this.render();
  }

  tick(t) {
    this.frameReq = requestAnimationFrame((n) => this.tick(n));
    if (!this.prep) return;
    const a = ANIMS[this.anim];
    // a wisp or a glow moves on its own, a little smoother than the walk cycle
    if (this.look?.fx && t < this.nextAt && t - this.fxAt > 60) { this.fxAt = t; this.render(t); }
    if (t < this.nextAt) return;
    this.step = (this.step + 1) % this.prep.cycle.length;
    // hold the last frame of an attack or a fall for a moment before looping
    const hold = this.step === this.prep.cycle.length - 1 ? a.rest ?? 0 : 0;
    this.nextAt = t + 1000 / a.fps + hold;
    this.fxAt = t;
    this.render(t);
  }

  render(t = performance.now()) {
    const { ctx, bctx, prep } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!prep) return;
    bctx.clearRect(0, 0, 192, 192);
    const row = prep.rows === 1 ? 0 : FACINGS.indexOf(this.facing);
    drawFrame(bctx, prep, this.step, row);
    ctx.imageSmoothingEnabled = false;
    // place the 64 px body frame centred, feet near the ground line
    const frameX = (this.stageW - FRAME) / 2, frameY = this.stageH - this.ground - FRAME;
    const off = (prep.size - FRAME) / 2;
    const cx = (frameX + FRAME / 2) * SCALE, cy = (frameY + FRAME / 2) * SCALE;
    if (this.shadow) {
      ctx.fillStyle = 'rgba(20, 12, 6, 0.28)';
      ctx.beginPath();
      ctx.ellipse(cx, (frameY + FRAME - 3) * SCALE, 13 * SCALE, 3 * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawGlow(ctx, this.look?.fx, cx, cy, SCALE, t);
    ctx.drawImage(this.buf, 0, 0, prep.size, prep.size, (frameX - off) * SCALE, (frameY - off) * SCALE, prep.size * SCALE, prep.size * SCALE);
    drawWisp(ctx, this.look?.fx, cx, cy, SCALE, t);
  }
}
