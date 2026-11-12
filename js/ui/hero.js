// Hero tab: scene panel with the sprite, name and level, HP and XP bars, the task bar, and the
// Chronicle beneath. At level 20 the XP bar counts toward the next Paragon rank, and a panel
// offers retirement to the Hall of Legends.

import { RACES } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { REGION_BY_ID } from '../../data/regions.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { TIERS, EMBLEM_LEVEL } from '../../data/items.js';
import { RIFT_NAME, TROPHIES, TROPHY_COLORS } from '../../data/tavern.js';
import { TITLES } from '../../data/loot.js';
import { SpriteView, heroLook, drawStill } from '../sprite.js';
import { maxHp, xpToNext, isHighlight } from '../hero.js';
import { xpForLevel, paragonXpFor, legacyFor } from '../rules.js';
import { portraitOf, paragonRank, paragonTitle, paragonXp, canRetire, trophyWall } from '../tavern.js';
import { currentQuest, clericFee, payCleric } from '../tasks.js';
import { subclassName } from '../skills.js';
import { el, num, heroClock, confirmBtn } from './dom.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';

const STAGE_H = 70; // sprite pixels; the scene is this tall times 4
const SHOWN_LINES = 80;
const WALK_PX_PER_S = 120; // how fast the ground scrolls past a walking hero, in screen pixels
// Regions drawn with open sky, where stars come out at night. The Underdeep is underground.
const OPEN_SKY = new Set(['mugwick', 'saltmarrow', 'peaks', 'gloamfen', 'cinder', 'wyrmspire']);

// The two scrolling layers of a backdrop: sky and ground, three tiles each (see css/backdrops.css).
function backdropTracks() {
  const tiles = (ground) => [0, 1, 2].map((i) => el('div', { className: 'bd' + (i === 1 ? ' flip' : '') }, ground ? el('i') : null));
  return [el('div', { className: 'bd-track sky' }, ...tiles(false)), el('div', { className: 'bd-track ground' }, ...tiles(true))];
}

// The time of day on this device: dawn 5 to 7, day 7 to 18, dusk 18 to 21, night after that.
export function timeOfDay(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  return h < 5 || h >= 21 ? 'night' : h < 7 ? 'dawn' : h < 18 ? 'day' : 'dusk';
}

// What the hero is doing this second. Travel is all walking. A fight alternates: a walk up to the
// foe, then bursts of swings with short walks between, so the same motion does not repeat for
// minutes. The pattern is read from the task's elapsed seconds, so it is the same on every redraw.
const PATTERNS = {
  roam: { approach: 0.2, beats: [['attack', 4], ['walk', 3]] },
  quest: { approach: 0, beats: [['walk', 6], ['attack', 4], ['walk', 3], ['attack', 3]] },
  delve: { approach: 0.15, beats: [['attack', 4], ['walk', 2]] },
  boss: { approach: 0.1, beats: [['attack', 5], ['walk', 2]] },
  rift: { approach: 0.15, beats: [['attack', 4], ['walk', 2]] },
};
function actionFor(t) {
  const p = t && PATTERNS[t.kind];
  if (!p) return 'walk';
  const start = Math.ceil(t.duration * p.approach);
  if (t.elapsed < start) return 'walk';
  const cycle = p.beats.reduce((n, [, s]) => n + s, 0);
  let at = (t.elapsed - start) % cycle;
  for (const [what, s] of p.beats) { if (at < s) return what; at -= s; }
  return 'walk';
}


// The sprite layers for a hero: appearance, the look of whatever is in each gear slot (its
// rarity picks one of five looks), and the milestones their level has earned.
// The Hall of Legends keeps the same look data (`portraitOf`, js/tavern.js) to redraw a portrait.
// How each kind of Chronicle line is shown: its colour family and its icon. Which lines are
// highlights (kept longer, listed under Highlights, and drawn as cards) is `isHighlight` in js/hero.js.
const LINE_LOOK = {
  hit: ['fight', 'swords'], miss: ['miss', 'swords'], task: ['fight', 'swords'], roll: ['fight', 'd20'],
  crit: ['crit', 'star'], fumble: ['bad', 'd20'], knockout: ['bad', 'skull'],
  levelup: ['grow', 'up'], milestone: ['grow', 'crown'], paragon: ['grow', 'crown'],
  growth: ['grow', 'up'], feat: ['grow', 'star'], learned: ['skill', 'book'], skill: ['skill', 'spark'],
  boss: ['dungeon', 'crown'], cleared: ['dungeon', 'door'], chapter: ['dungeon', 'book'], unlock: ['dungeon', 'flag'], trophy: ['dungeon', 'trophy'],
  questdone: ['quest', 'scroll'], quest: ['quest', 'scroll'],
  travel: ['road', 'boots'], arrive: ['road', 'pin'],
  upgrade: ['loot', 'trinket'], sold: ['sold', 'coin'],
  potion: ['heal', 'potion'], recovered: ['heal', 'heart'],
  tavern: ['tavern', 'mug'], rift: ['rift', 'vortex'],
  story: ['story', 'book'], confidence: ['story', 'eye'], bestiary: ['story', 'eye'],
};
const lookOf = (line) => LINE_LOOK[line.k] ?? ['plain', 'd20'];

export const heroSpriteLook = (hero) => heroLook(portraitOf(hero));

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
  else if (t.kind === 'rift') text = `${RIFT_NAME}: floor ${t.floor}${hero.stats.riftBest ? ` (deepest ${hero.stats.riftBest})` : ''}`;
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
  const wall = el('div', { className: 'trophy-wall', attrs: { 'aria-hidden': 'true' } }); // the tavern's trophy wall
  let wallKey = '';
  const scene = el('div', { className: 'scene' }, ...backdropTracks(), el('div', { className: 'sky-tint' }), el('div', { className: 'stars' }), el('div', { className: 'tavern-window' }), wall, canvas, still, place);
  const view = new SpriteView(canvas, { stageW: 80, stageH: STAGE_H, ground: 8, shadow: true });
  new ResizeObserver(() => {
    const w = Math.max(64, Math.min(130, Math.floor(scene.clientWidth / 4)));
    if (w !== view.stageW) view.resize(w);
    // The ground slides two scene-widths per loop at about the pace of the walk cycle.
    scene.style.setProperty('--ground-time', ((2 * scene.clientWidth) / WALK_PX_PER_S).toFixed(2) + 's');
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
  clericBtn.onclick = () => { if (current && payCleric(current.state, current.hero) != null) { sfx('coins'); app.changed(); } };
  // Retirement: offered once by a card at level 20, then always here. No penalty for ignoring it.
  const retireNote = el('p', { className: 'hint' });
  const retireRow = el('div', { className: 'row' });
  const retirePanel = el('div', { className: 'panel retire', hidden: true }, el('h3', { textContent: 'Retirement' }), retireNote, retireRow);
  let retireKey = '';

  const list = el('ul', { className: 'chronicle', attrs: { 'aria-live': 'polite' } });
  const highlights = el('ul', { className: 'chronicle', hidden: true });
  const noHighlights = el('p', { className: 'hint', hidden: true, textContent: 'No highlights yet. Level-ups, dungeons, finished quests, rare gear, and knockouts are kept here.' });
  let onlyHighlights = false;
  let highlightKey = -1;
  const filterBtn = (label, hl) => el('button', { type: 'button', className: 'seg', textContent: label, onclick: () => { onlyHighlights = hl; drawFilter(); if (current) update(current.state, current.hero); } });
  const allBtn = filterBtn('Everything', false);
  const hlBtn = filterBtn('Highlights', true);
  function drawFilter() {
    allBtn.setAttribute('aria-pressed', String(!onlyHighlights));
    hlBtn.setAttribute('aria-pressed', String(onlyHighlights));
    list.hidden = onlyHighlights;
    highlights.hidden = !onlyHighlights;
  }
  drawFilter();
  root.append(
    scene,
    el('div', { className: 'hero-head' }, el('div', {}, name, sub), gold),
    hp.wrap, xp.wrap, task, cleric, retirePanel,
    el('div', { className: 'chronicle-head' }, el('h3', { className: 'section', textContent: 'Chronicle' }), el('div', { className: 'segs', attrs: { role: 'group', 'aria-label': 'Show' } }, allBtn, hlBtn)),
    list, highlights, noHighlights,
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
    const [family, glyph] = lookOf(line);
    const li = el('li', { className: `k-${line.k} c-${family}${isHighlight(line) ? ' hl' : ''}` },
      el('span', { className: 'badge' }, icon(glyph)),
      el('div', { className: 'body' },
        el('span', { className: 'when', textContent: heroClock(line.t) }),
        el('span', { className: 'text', textContent: line.text }),
        line.roll || line.gain ? el('span', { className: 'roll' },
          line.roll ? el('span', { textContent: line.roll }) : null,
          line.gain ? el('span', { className: 'gain', textContent: line.gain }) : null) : null));
    if (line.tier != null) { li.classList.add('loot'); li.style.setProperty('--tier', TIERS[line.tier].color); if (line.tier === 4) li.classList.add('legendary'); }
    return li;
  };

  function update(state, hero) {
    current = { state, hero };
    if (hero.id !== heroId) { heroId = hero.id; lookKey = sceneKey = taskKey = ''; lastLine = 0; highlightKey = -1; wasTavern = null; fallUntil = 0; list.replaceChildren(); }

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
    const inRift = t?.kind === 'rift';
    const anim = inTavern || walking ? 'walk' : actionFor(t) === 'attack' ? CLASSES[hero.class].attack : 'walk';
    // The backdrop scrolls only while the hero walks somewhere (not in the tavern, not mid-swing).
    scene.classList.toggle('moving', !inTavern && !falling && anim === 'walk');
    const nextScene = (inTavern ? 'tavern' : anim) + key;
    // The backdrop: the tavern, the region's dungeon, or the region itself. All drawn in CSS.
    if (!falling) {
      scene.dataset.bg = inTavern ? 'tavern' : inRift ? 'rift' : inDungeon ? 'dungeon' : hero.region;
      scene.dataset.dungeon = inDungeon ? hero.region : ''; // each dungeon dresses the shared stone its own way
      scene.dataset.time = timeOfDay();
      const outdoor = !inTavern && !inDungeon && !inRift && hero.region !== 'underdeep';
      scene.classList.toggle('outdoor', outdoor);
      scene.classList.toggle('open-sky', outdoor && OPEN_SKY.has(hero.region));
      const hung = inTavern ? trophyWall(state).hung : [];
      if (hung.join() !== wallKey) {
        wallKey = hung.join();
        wall.replaceChildren(...hung.map((id) => { const i = el('i', { title: TROPHIES[id] }); i.style.setProperty('--trophy', TROPHY_COLORS[id]); return i; }));
      }
    }
    if (!falling && nextScene !== sceneKey) {
      sceneKey = nextScene;
      scene.classList.toggle('tavern', inTavern);
      canvas.hidden = inTavern;
      still.hidden = !inTavern;
      if (inTavern) drawStill(still, look, { facing: 'down', scale: 4 });
      else view.set({ look, anim, facing: 'right' });
      lookKey = key;
    }
    if (!falling) place.textContent = inTavern ? 'The Wobbly Griffin' : inRift ? RIFT_NAME : t?.kind === 'travel' || t?.kind === 'return' ? 'On the road' : inDungeon ? DUNGEONS[hero.region].name : REGION_BY_ID[hero.region].name;

    name.textContent = hero.name;
    const subclass = subclassName(hero);
    const rank = paragonRank(hero);
    sub.textContent = `Level ${hero.level} ${RACES[hero.race].name} ${CLASSES[hero.class].name}${subclass ? ', ' + subclass : ''}${hero.level >= EMBLEM_LEVEL ? '. ' + TITLES[hero.class] : ''}${rank ? `. Paragon ${rank}, ${paragonTitle(rank)}` : ''}`;
    gold.textContent = `${num(hero.gold)} gp`;

    const max = maxHp(hero);
    hp.fill.style.width = (100 * hero.hp) / max + '%';
    hp.text.textContent = knockedOut ? `${hero.hp} / ${max} (recovering)` : `${hero.hp} / ${max}`;
    const next = xpToNext(hero);
    const floor = xpForLevel(hero.level);
    if (next != null) {
      xp.fill.style.width = Math.max(0, (100 * (hero.xp - floor)) / (next - floor)) + '%';
      xp.text.textContent = `${num(hero.xp)} / ${num(next)}`;
    } else {
      // Level 20: the bar fills toward the next Paragon rank instead.
      const done = paragonXp(hero) - paragonXpFor(rank);
      const need = paragonXpFor(rank + 1) - paragonXpFor(rank);
      xp.fill.style.width = Math.max(0, Math.min(100, (100 * done) / need)) + '%';
      xp.text.textContent = `Paragon ${rank + 1}: ${num(done)} / ${num(need)}`;
    }

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

    // Retirement, from level 20. Rebuilt only when something on it changes, so taps are not lost.
    const legends = state.tavern.legends.length;
    const rKey = [hero.id, canRetire(hero), legends].join('|');
    if (rKey !== retireKey) {
      retireKey = rKey;
      retirePanel.hidden = !canRetire(hero);
      if (canRetire(hero)) {
        const after = legacyFor(legends + 1);
        retireNote.textContent = `${hero.name} can retire to the Hall of Legends: a portrait on the wall, a record of the career, and the hero slot freed. Every hero after them earns ${Math.round(after * 100)}% more XP (2% per legend, 10% at most${legends ? `; ${legends} in the Hall already` : ''}). Or keep going: the Planar Rifts are open on the Map tab, for Paragon ranks, which are titles only. Their gold goes with them, so spend it on tavern upgrades first. Retiring cannot be undone.`;
        retireRow.replaceChildren(confirmBtn('Retire to the Hall of Legends', 'Tap again: retire for good', () => app.retire(hero.id), 'btn primary grow'));
      }
    }

    // Chronicle: newest first; only lines not yet on the page are added
    const fresh = hero.chronicle.filter((l) => l.n > lastLine);
    if (fresh.length) {
      lastLine = fresh[fresh.length - 1].n;
      list.prepend(...fresh.slice(-SHOWN_LINES).reverse().map(lineNode));
      while (list.children.length > SHOWN_LINES) list.lastChild.remove();
    }
    // Highlights: drawn from the whole kept Chronicle, and only while that view is showing.
    if (onlyHighlights && highlightKey !== lastLine) {
      highlightKey = lastLine;
      const picked = hero.chronicle.filter(isHighlight).slice(-SHOWN_LINES).reverse();
      highlights.replaceChildren(...picked.map(lineNode));
      noHighlights.hidden = picked.length > 0;
    }
    if (!onlyHighlights) noHighlights.hidden = true;
  }

  return { update, destroy: () => cancelAnimationFrame(view.frameReq) };
}
