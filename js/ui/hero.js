// Hero tab: scene panel with the sprite, name and level, HP and XP bars, the task bar, and the
// Chronicle beneath.

import { RACES } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { REGION_BY_ID } from '../../data/regions.js';
import { SLOTS } from '../../data/items.js';
import { SpriteView, heroLook, drawStill } from '../sprite.js';
import { maxHp, xpToNext } from '../hero.js';
import { xpForLevel } from '../rules.js';
import { el, num, heroClock } from './dom.js';

const STAGE_H = 70; // sprite pixels; the scene is this tall times 4
const SHOWN_LINES = 80;

// The sprite layers for a hero: appearance plus the look of whatever is in each gear slot.
export function heroSpriteLook(hero) {
  const tiers = Object.fromEntries(SLOTS.map((s) => [s.id, hero.gear[s.id]?.tier ?? null]));
  return heroLook({ race: hero.race, cls: hero.class, ...hero.appearance, tiers });
}

export function mountHero(root) {
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
  const taskText = el('p', { className: 'task-text' });
  const taskLeft = el('span', { className: 'bar-num' });
  const taskFill = el('i');
  const task = el('div', { className: 'task' },
    el('div', { className: 'stat-head' }, el('span', { textContent: 'Now' }), taskLeft),
    taskText,
    el('div', { className: 'bar task-bar', attrs: { role: 'progressbar', 'aria-label': 'Current task' } }, taskFill));

  const list = el('ul', { className: 'chronicle', attrs: { 'aria-live': 'polite' } });
  root.append(
    scene,
    el('div', { className: 'hero-head' }, el('div', {}, name, sub), gold),
    hp.wrap, xp.wrap, task,
    el('h3', { className: 'section', textContent: 'Chronicle' }),
    list,
  );

  let heroId = null;
  let lookKey = '';
  let sceneKey = '';
  let lastLine = 0;
  let taskKey = '';

  const lineNode = (line) => el('li', { className: 'k-' + line.k },
    el('span', { className: 'when', textContent: heroClock(line.t) }),
    el('span', { className: 'text', textContent: line.text }),
    line.roll ? el('span', { className: 'roll', textContent: line.roll + (line.gain ? '  ·  ' + line.gain : '') }) : null);

  function update(state, hero) {
    if (hero.id !== heroId) { heroId = hero.id; lookKey = sceneKey = taskKey = ''; lastLine = 0; list.replaceChildren(); }

    // sprite: walk up to the monster, then attack; stand in the tavern while recovering
    const t = hero.currentTask;
    const look = heroSpriteLook(hero);
    const key = JSON.stringify(look);
    const inTavern = t?.kind === 'tavern';
    const anim = inTavern ? 'walk' : t && t.elapsed / t.duration >= 0.3 ? CLASSES[hero.class].attack : 'walk';
    const nextScene = (inTavern ? 'tavern' : anim) + key;
    if (nextScene !== sceneKey) {
      sceneKey = nextScene;
      scene.classList.toggle('tavern', inTavern);
      canvas.hidden = inTavern;
      still.hidden = !inTavern;
      if (inTavern) drawStill(still, look, { facing: 'down', scale: 4 });
      else view.set({ look, anim, facing: 'right' });
      lookKey = key;
    }
    place.textContent = inTavern ? 'The Wobbly Griffin' : REGION_BY_ID[hero.region].name;

    name.textContent = hero.name;
    sub.textContent = `Level ${hero.level} ${RACES[hero.race].name} ${CLASSES[hero.class].name}`;
    gold.textContent = `${num(hero.gold)} gp`;

    const max = maxHp(hero);
    hp.fill.style.width = (100 * hero.hp) / max + '%';
    hp.text.textContent = inTavern ? `${hero.hp} / ${max} (recovering)` : `${hero.hp} / ${max}`;
    const next = xpToNext(hero);
    const floor = xpForLevel(hero.level);
    xp.fill.style.width = next == null ? '100%' : (100 * (hero.xp - floor)) / (next - floor) + '%';
    xp.text.textContent = next == null ? `${num(hero.xp)} (level 20)` : `${num(hero.xp)} / ${num(next)}`;

    if (t) {
      // aim the bar one second ahead; the CSS transition fills the gap smoothly
      const newKey = t.text + t.duration;
      const restart = newKey !== taskKey || t.elapsed === 0;
      taskKey = newKey;
      if (restart) { taskFill.style.transition = 'none'; taskFill.style.width = (100 * t.elapsed) / t.duration + '%'; void taskFill.offsetWidth; taskFill.style.transition = ''; }
      taskFill.style.width = (100 * Math.min(t.duration, t.elapsed + 1)) / t.duration + '%';
      taskText.textContent = t.text;
      const left = t.duration - t.elapsed;
      taskLeft.textContent = left >= 60 ? `${Math.floor(left / 60)}m ${left % 60}s` : `${left}s`;
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
