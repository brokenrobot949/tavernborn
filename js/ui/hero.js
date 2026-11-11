// Hero tab: scene panel with the sprite, name and level, HP and XP bars, the task bar, and the
// Chronicle beneath.

import { RACES } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { REGION_BY_ID } from '../../data/regions.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { SLOTS, TIERS, EMBLEM_LEVEL } from '../../data/items.js';
import { TITLES } from '../../data/loot.js';
import { SpriteView, heroLook, drawStill } from '../sprite.js';
import { maxHp, xpToNext } from '../hero.js';
import { xpForLevel } from '../rules.js';
import { currentQuest, clericFee, payCleric } from '../tasks.js';
import { subclassName } from '../skills.js';
import { el, num, heroClock } from './dom.js';

const STAGE_H = 70; // sprite pixels; the scene is this tall times 4
const SHOWN_LINES = 80;

// Level milestones: the class emblem at 10, a wisp in the class colour at 15, a golden glow at 20.
// (The cloak at 5 is a real piece of gear and arrives through the Cloak slot.)
const WISP_LEVEL = 15, GLOW_LEVEL = 20;
const WISP_COLOR = { fighter: 'rgba(255, 150, 90, 0.85)', wizard: 'rgba(120, 180, 255, 0.85)', rogue: 'rgba(150, 225, 120, 0.85)', cleric: 'rgba(255, 232, 150, 0.85)' };

// The sprite layers for a hero: appearance, the look of whatever is in each gear slot (its
// rarity picks one of five looks), and the milestones their level has earned.
export function heroSpriteLook(hero) {
  const tiers = Object.fromEntries(SLOTS.map((s) => [s.id, hero.gear[s.id]?.tier ?? null]));
  const fx = hero.level >= WISP_LEVEL ? { wisp: WISP_COLOR[hero.class], glow: hero.level >= GLOW_LEVEL } : null;
  return heroLook({ race: hero.race, cls: hero.class, ...hero.appearance, tiers, emblem: hero.level >= EMBLEM_LEVEL, fx });
}

// One line above the task bar saying what the task is part of.
function taskContext(hero, t) {
  const region = REGION_BY_ID[hero.region];
  const d = DUNGEONS[hero.region];
  let text;
  if (t.kind === 'tavern') text = 'Recovering at The Wobbly Griffin';
  else if (t.kind === 'travel') text = `Travelling to ${REGION_BY_ID[t.to].name}`;
  else if (t.kind === 'return') text = 'Walking back out';
  else if (t.kind === 'camp') text = `Resting before ${d.name}`;
  else if (t.kind === 'boss') text = `${d.name}: ${d.boss.name}`;
  else if (t.kind === 'delve') text = hero.delve ? `${d.name}: room ${hero.delve.room + 1} of ${hero.delve.rooms}` : d.name;
  else if (t.kind === 'quest') {
    const q = currentQuest(hero);
    const step = hero.questProgress[hero.region]?.step ?? 0;
    text = q ? `Quest: ${q.title} (step ${Math.min(step + 1, q.steps)} of ${q.steps})` : 'Quest';
  } else text = `Roaming ${region.name}`;
  if (hero.travelTo && t.kind !== 'travel') text += `. Next: travel to ${REGION_BY_ID[hero.travelTo].name}`;
  return text;
}

export function mountHero(root, app) {
  // ----- scene -----
  const canvas = el('canvas', { attrs: { 'aria-label': 'Your hero' } });
  const still = el('canvas', { className: 'still', hidden: true });
  const place = el('span', { className: 'place' });
  const scene = el('div', { className: 'scene' }, canvas, still, place);
  const view = new SpriteView(canvas, { stageW: 80, stageH: STAGE_H, ground: 8 });
  new ResizeObserver(() => {
    const w = Math.max(64, Math.min(130, Math.floor(scene.clientWidth / 4)));
    if (w !== view.stageW) view.resize(w);
  }).observe(scene);

  // ----- name and bars -----
  const name = el('h2', { className: 'hero-name' });
  const sub = el('p', { className: 'hero-sub' });
  const gold = el('p', { className: 'hero-gold' });
  const bar = (label, cls) => {
    const fill = el('i');
    const text = el('span', { className: 'bar-num' });
    const wrap = el('div', { className: 'stat' }, el('div', { className: 'stat-head' }, el('span', { textContent: label }), text), el('div', { className: 'bar ' + cls }, fill));
    return { wrap, fill, text };
  };
  const hp = bar('HP', 'hp');
  const xp = bar('XP', 'xp');
  const taskCtx = el('p', { className: 'task-ctx' });
  const taskText = el('p', { className: 'task-text' });
  const taskLeft = el('span', { className: 'bar-num' });
  const taskFill = el('i');
  const task = el('div', { className: 'task' },
    el('div', { className: 'stat-head' }, el('span', { textContent: 'Now' }), taskLeft),
    taskCtx,
    taskText,
    el('div', { className: 'bar task-bar', attrs: { role: 'progressbar', 'aria-label': 'Current task' } }, taskFill));
  // The tavern cleric: shown only while the hero is knocked out.
  const clericBtn = el('button', { className: 'btn primary grow', type: 'button' });
  const clericNote = el('p', { className: 'hint' });
  const cleric = el('div', { className: 'panel cleric', hidden: true }, el('div', { className: 'row' }, clericBtn), clericNote);
  let current = null; // { state, hero } as of the last update
  clericBtn.onclick = () => { if (current && payCleric(current.state, current.hero) != null) app.changed(); };

  const list = el('ul', { className: 'chronicle', attrs: { 'aria-live': 'polite' } });
  root.append(
    scene,
    el('div', { className: 'hero-head' }, el('div', {}, name, sub), gold),
    hp.wrap, xp.wrap, task, cleric,
    el('h3', { className: 'section', textContent: 'Chronicle' }),
    list,
  );

  let heroId = null;
  let lookKey = '';
  let sceneKey = '';
  let lastLine = 0;
  let taskKey = '';
  let wasTavern = null; // whether the last update found the hero in the tavern (null: not seen yet)
  let lastUpdate = 0;
  let fallUntil = 0; // while a knockout's fall is playing, the scene stays where it happened

  const lineNode = (line) => {
    const li = el('li', { className: 'k-' + line.k },
      el('span', { className: 'when', textContent: heroClock(line.t) }),
      el('span', { className: 'text', textContent: line.text }),
      line.roll ? el('span', { className: 'roll', textContent: line.roll + (line.gain ? '  ·  ' + line.gain : '') }) : null);
    if (line.tier != null) { li.classList.add('loot'); li.style.setProperty('--tier', TIERS[line.tier].color); }
    return li;
  };

  function update(state, hero) {
    current = { state, hero };
    if (hero.id !== heroId) { heroId = hero.id; lookKey = sceneKey = taskKey = ''; lastLine = 0; wasTavern = null; fallUntil = 0; list.replaceChildren(); }

    // sprite: walk up to the monster, then attack; stand in the tavern while recovering
    const t = hero.currentTask;
    const look = heroSpriteLook(hero);
    const key = JSON.stringify(look);
    const now = performance.now();
    const knockedOut = t?.kind === 'tavern';
    // A knockout seen as it happens (not one found on coming back) plays the fall where the hero
    // stood before the scene moves to the tavern.
    if (knockedOut && wasTavern === false && now - lastUpdate < 3000) {
      fallUntil = now + 1600;
      sceneKey = 'fall';
      view.set({ look: heroSpriteLook(hero), anim: 'hurt' });
      setTimeout(() => { if (current) update(current.state, current.hero); }, 1620);
    }
    wasTavern = knockedOut;
    lastUpdate = now;
    const falling = now < fallUntil && knockedOut;
    const inTavern = knockedOut && !falling;
    const walking = !t || ['travel', 'return', 'camp'].includes(t.kind);
    const inDungeon = !!t && ['delve', 'boss', 'camp'].includes(t.kind);
    const anim = inTavern || walking ? 'walk' : t.elapsed / t.duration >= 0.3 ? CLASSES[hero.class].attack : 'walk';
    const nextScene = (inTavern ? 'tavern' : anim) + key;
    // The backdrop: the tavern, the region's dungeon, or the region itself. All drawn in CSS.
    if (!falling) scene.dataset.bg = inTavern ? 'tavern' : inDungeon ? 'dungeon' : hero.region;
    if (!falling && nextScene !== sceneKey) {
      sceneKey = nextScene;
      scene.classList.toggle('tavern', inTavern);
      canvas.hidden = inTavern;
      still.hidden = !inTavern;
      if (inTavern) drawStill(still, look, { facing: 'down', scale: 4 });
      else view.set({ look, anim, facing: 'right' });
      lookKey = key;
    }
    if (!falling) place.textContent = inTavern ? 'The Wobbly Griffin' : t?.kind === 'travel' || t?.kind === 'return' ? 'On the road' : inDungeon ? DUNGEONS[hero.region].name : REGION_BY_ID[hero.region].name;

    name.textContent = hero.name;
    const subclass = subclassName(hero);
    sub.textContent = `Level ${hero.level} ${RACES[hero.race].name} ${CLASSES[hero.class].name}${subclass ? ', ' + subclass : ''}${hero.level >= EMBLEM_LEVEL ? '. ' + TITLES[hero.class] : ''}`;
    gold.textContent = `${num(hero.gold)} gp`;

    const max = maxHp(hero);
    hp.fill.style.width = (100 * hero.hp) / max + '%';
    hp.text.textContent = knockedOut ? `${hero.hp} / ${max} (recovering)` : `${hero.hp} / ${max}`;
    const next = xpToNext(hero);
    const floor = xpForLevel(hero.level);
    xp.fill.style.width = next == null ? '100%' : Math.max(0, (100 * (hero.xp - floor)) / (next - floor)) + '%';
    xp.text.textContent = next == null ? `${num(hero.xp)} (level 20)` : `${num(hero.xp)} / ${num(next)}`;

    if (t) {
      // aim the bar one second ahead; the CSS transition fills the gap smoothly
      const newKey = t.text + t.duration;
      const restart = newKey !== taskKey || t.elapsed === 0;
      taskKey = newKey;
      if (restart) { taskFill.style.transition = 'none'; taskFill.style.width = (100 * t.elapsed) / t.duration + '%'; void taskFill.offsetWidth; taskFill.style.transition = ''; }
      taskFill.style.width = (100 * Math.min(t.duration, t.elapsed + 1)) / t.duration + '%';
      taskText.textContent = t.text;
      taskCtx.textContent = taskContext(hero, t);
      const left = t.duration - t.elapsed;
      taskLeft.textContent = left >= 60 ? `${Math.floor(left / 60)}m ${left % 60}s` : `${left}s`;
    }

    const fee = clericFee(hero);
    cleric.hidden = fee == null;
    if (fee != null) {
      const left = Math.max(0, hero.knockedOutUntil - hero.age);
      clericBtn.textContent = `Pay the cleric ${num(fee)} gp`;
      clericBtn.disabled = hero.gold < fee;
      clericNote.textContent = `${hero.name} gets up unaided in ${Math.ceil(left / 60)} min. The cleric will see to it now for a fee${hero.gold < fee ? ', which is more gold than there is' : ''}. Waiting costs nothing.`;
    }

    // Chronicle: newest first; only lines not yet on the page are added
    const fresh = hero.chronicle.filter((l) => l.n > lastLine);
    if (fresh.length) {
      lastLine = fresh[fresh.length - 1].n;
      list.prepend(...fresh.slice(-SHOWN_LINES).reverse().map(lineNode));
      while (list.children.length > SHOWN_LINES) list.lastChild.remove();
    }
  }

  return { update, destroy: () => cancelAnimationFrame(view.frameReq) };
}
