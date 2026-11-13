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
import { shapeFor, pickBy, popRoll, burst, arrival, weatherFor, lootDrop, bossEntrance, healGlow, defeatGhost } from './scene-fx.js';
import { foeCanvas } from './foes.js';
import { MONSTERS } from '../../data/monsters.js';
import { sfx } from '../audio.js';
import { CHOICE_BY_ID } from '../../data/road.js';
import { BOON_TEXT } from '../../data/market.js';
import { answerChoice, optionCost, canAfford, festivalOn } from '../road.js';
import { activeBoons } from '../boons.js';
import { titled } from '../deeds.js';

const STAGE_H = 70; // sprite pixels; the scene is this tall times 4
const SHOWN_LINES = 80;
const WALK_PX_PER_S = 120; // how fast the ground scrolls past a walking hero, in screen pixels
// Regions drawn with open sky, where stars come out at night. The Underdeep is underground.
const OPEN_SKY = new Set(['mugwick', 'saltmarrow', 'peaks', 'gloamfen', 'cinder', 'wyrmspire']);

// Every monster by id, for the foe's shape.
const MONSTER_BY_ID = Object.fromEntries(Object.values(MONSTERS).flat().map((m) => [m.id, m]));
const POPS_UP_TO = 3; // dice rise only for what happened in the last few seconds, not for a long gap

// The foe the hero is facing in this task, as [shape, name, kind, key], or null for none (travel,
// rests, and dungeon rooms that are a trap or a puzzle rather than a monster). The name picks the
// colours (js/ui/foes.js); a quest step has no named foe, so its shape is picked from the task text.
function foeOf(hero, t) {
  if (!t) return null;
  if ((t.kind === 'roam' || t.kind === 'delve') && t.monster) { const m = MONSTER_BY_ID[t.monster]; return m ? [shapeFor(m.name), m.name, '', t.monster] : null; }
  if (t.kind === 'boss') { const b = DUNGEONS[hero.region].boss; return [shapeFor(b.name), b.name, 'boss', 'boss:' + b.name, b.id, b.hits]; }
  if (t.kind === 'rift') return [pickBy(t.text, ['eye', 'flame', 'humanoid', 'blob']), '', 'rift', 'rift:' + t.text];
  if (t.kind === 'quest') return [pickBy(t.text, ['humanoid', 'beast', 'small', 'critter', 'humanoid']), '', '', 'quest:' + t.text];
  return null;
}

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
// Whether the hero has reached the foe yet (the first walk of a fight is the approach).
function engaged(t) {
  const p = t && PATTERNS[t.kind];
  return !!p && t.elapsed >= Math.ceil(t.duration * p.approach);
}
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
  choice: ['road', 'signpost'], deed: ['grow', 'medal'], festival: ['tavern', 'lantern'],
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
  const weather = el('div', { className: 'weather' });
  const foe = el('div', { className: 'foe' });
  const fx = el('div', { className: 'scene-fx', attrs: { 'aria-hidden': 'true' } });
  const fxBack = el('div', { className: 'scene-fx back', attrs: { 'aria-hidden': 'true' } }); // behind the hero
  let foeKey = '';
  // Fight bars over the hero and the foe, and the class's own effects while it swings.
  const heroBar = el('i');
  const foeBar = el('i');
  const foeName = el('span', { className: 'fb-name' });
  const bars = el('div', { className: 'fight-bars', attrs: { 'aria-hidden': 'true' } },
    el('div', { className: 'fb hero-fb' }, el('div', { className: 'fb-track' }, heroBar)),
    el('div', { className: 'fb foe-fb' }, foeName, el('div', { className: 'fb-track' }, foeBar)));
  const classFx = el('div', { className: 'class-fx', attrs: { 'aria-hidden': 'true' } }, el('i'), el('i'), el('i'));
  const festive = el('div', { className: 'festive', attrs: { 'aria-hidden': 'true' } });
  const scene = el('div', { className: 'scene' }, ...backdropTracks(), el('div', { className: 'sky-tint' }), el('div', { className: 'stars' }), el('div', { className: 'tavern-window' }), festive, wall, fxBack, foe, canvas, still, classFx, weather, bars, place, fx);
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
  // A meeting on the road, waiting for word: the two options, and how long the hero will wait.
  const choiceText = el('p', { className: 'choice-text' });
  const choiceRow = el('div', { className: 'choice-btns' });
  const choiceNote = el('p', { className: 'hint' });
  const choiceBox = el('div', { className: 'panel choice', hidden: true },
    el('h3', {}, icon('signpost'), el('span', { textContent: 'On the road' })), choiceText, choiceRow, choiceNote);
  let choiceKey = '';
  // Boons running: a chip each, with the time left.
  const boonRow = el('div', { className: 'boons' });
  let boonKey = '';
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
    boonRow, hp.wrap, xp.wrap, task, choiceBox, cleric, retirePanel,
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
  let seenSince = 0; // when this hero was first drawn: a boss already there on opening is not announced

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
    if (hero.id !== heroId) { heroId = hero.id; lookKey = sceneKey = taskKey = ''; lastLine = 0; highlightKey = -1; wasTavern = null; fallUntil = 0; seenSince = performance.now(); list.replaceChildren(); }

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
      // Weather out in the open (the Underdeep has its spores); none indoors or in the Rifts.
      weather.dataset.kind = !inTavern && !inDungeon && !inRift ? weatherFor(hero.region) : '';
      // The foe: there once the hero has walked up to it, gone between fights and during travel.
      const f = !inTavern && engaged(t) ? foeOf(hero, t) : null;
      const fk = f ? f[3] + t.text : '';
      if (fk !== foeKey) {
        foeKey = fk;
        foe.replaceChildren(...(f ? [foeCanvas(f[0], f[1], f[2], f[4])] : []));
        foe.className = 'foe' + (f ? ' here ' + f[0] + (f[2] === 'boss' ? ' boss' : '') : '');
        // A boss arriving, seen live: a banner and a shudder.
        if (f?.[2] === 'boss' && now - seenSince > 1500 && !root.hidden) { bossEntrance(fx, f[1]); scene.classList.remove('shake'); void scene.offsetWidth; scene.classList.add('shake'); }
      }
      // The bars: the hero's real hit points, and the foe worn down as the fight goes on. The roll at
      // the end decides; the foe's bar only shows how long it has been going. A boss's bar is in as
      // many parts as the blows it takes.
      bars.hidden = !f;
      if (f) {
        const p = PATTERNS[t.kind];
        const start = Math.ceil(t.duration * (p?.approach ?? 0));
        const done = Math.max(0, Math.min(1, (t.elapsed - start) / Math.max(1, t.duration - start)));
        foeBar.style.width = `${Math.round(100 * (1 - 0.85 * done))}%`;
        foeName.textContent = f[1] || (t.kind === 'rift' ? `Floor ${t.floor}` : '');
        bars.classList.toggle('boss', f[2] === 'boss');
        bars.style.setProperty('--blows', String(f[5] ?? 1));
      }
      // While swinging, the class's own effect plays at the foe: a sword arc, a fireball, quick
      // dagger cuts, or a burst of holy light.
      scene.dataset.cls = hero.class;
      scene.classList.toggle('attacking', !!f && actionFor(t) === 'attack');
      scene.classList.toggle('vs-boss', f?.[2] === 'boss'); // the hero gives a boss a little more room
      // A festival dresses the open air and the tavern, not the dungeons or the Rifts.
      const fest = !inDungeon && !inRift ? festivalOn(new Date()) : null;
      festive.dataset.deco = fest?.deco ?? '';
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

    name.textContent = titled(hero);
    const subclass = subclassName(hero);
    const rank = paragonRank(hero);
    sub.textContent = `Level ${hero.level} ${RACES[hero.race].name} ${CLASSES[hero.class].name}${subclass ? ', ' + subclass : ''}${hero.level >= EMBLEM_LEVEL ? '. ' + TITLES[hero.class] : ''}${rank ? `. Paragon ${rank}, ${paragonTitle(rank)}` : ''}`;
    gold.textContent = `${num(hero.gold)} gp`;

    const max = maxHp(hero);
    hp.fill.style.width = (100 * hero.hp) / max + '%';
    heroBar.style.width = (100 * hero.hp) / max + '%';
    heroBar.parentNode.classList.toggle('low', hero.hp < max * 0.35);
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

    // The meeting on the road. Rebuilt only when something on it changes, so taps are not lost.
    const c = CHOICE_BY_ID[hero.choice?.id];
    const left = c ? Math.max(0, hero.choice.until - hero.age) : 0;
    const cKey = c ? [hero.id, c.id, hero.choice.at, c.options.map((o) => canAfford(hero, o) + ':' + optionCost(hero, o))].join('|') : '';
    if (cKey !== choiceKey) {
      choiceKey = cKey;
      choiceBox.hidden = !c;
      if (c) {
        choiceText.textContent = c.text.replace(/\{name\}/g, hero.name);
        choiceRow.replaceChildren(...c.options.map((o, i) => {
          const cost = optionCost(hero, o);
          const b = el('button', { className: 'btn' + (i === 0 ? ' primary' : ''), type: 'button', onclick: () => {
            if (current && answerChoice(current.state, current.hero, i)) { if (cost) sfx('coins'); app.changed(); }
          } }, el('span', { textContent: o.label }), cost ? el('small', { textContent: `${num(cost)} gp` }) : null);
          b.disabled = !canAfford(hero, o);
          return b;
        }));
      }
    }
    if (c) choiceNote.textContent = `With no word in ${left >= 3600 ? `${Math.floor(left / 3600)} h ${Math.floor((left % 3600) / 60)} min` : `${Math.ceil(left / 60)} min`}, ${hero.name} will decide alone: ${c.options[c.auto ?? 0].label.toLowerCase()}, most likely. Work carries on meanwhile.`;

    // Boons running, with the time left in whole minutes.
    const boons = activeBoons(hero);
    const bKey = boons.map((b) => b.id + Math.ceil((b.until - hero.age) / 60)).join() + (hero.supplies?.potions ?? 0);
    if (bKey !== boonKey) {
      boonKey = bKey;
      const until = (b) => { const s = b.until - hero.age; return s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.ceil(s / 60)} min`; };
      const chips = boons.map((b) => el('span', { className: 'boon' + (b.id === 'cursed' ? ' bad' : ''), title: BOON_TEXT[b.id].does },
        icon(b.id === 'cursed' ? 'skull' : b.id === 'festive' ? 'lantern' : 'spark'),
        el('span', { textContent: `${BOON_TEXT[b.id].title}: ${BOON_TEXT[b.id].does}, ${until(b)}` })));
      if (hero.supplies?.potions) chips.push(el('span', { className: 'boon' }, icon('potion'), el('span', { textContent: `${hero.supplies.potions} spare potions for the next dungeon or Rifts run` })));
      boonRow.replaceChildren(...chips);
      boonRow.hidden = !chips.length;
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

  // What just happened, as it happens: dice rising from the fight, the foe flinching or the hero
  // flashing red, the level-up burst, and the banner on arriving somewhere new. `gap` is how many
  // seconds the events cover; after a long gap only the level-up and the arrival are shown.
  function show(events, gap = 1) {
    if (root.hidden || !current) return;
    const hero = current.hero;
    let pops = 0;
    for (const e of events) {
      if (gap <= POPS_UP_TO && e.type === 'task' && e.roll && pops < 3) {
        popRoll(fx, e, pops * 350);
        pops += 1;
        const landed = e.roll.outcome === 'hit' || e.roll.outcome === 'crit' || e.won;
        const cls = landed ? 'flinch' : '';
        if (cls) { foe.classList.remove(cls); void foe.offsetWidth; foe.classList.add(cls); }
        if (landed && e.monster) defeatGhost(scene, foe, foeBar);
        if (e.damage > 0) { canvas.classList.remove('hurt-flash'); void canvas.offsetWidth; canvas.classList.add('hurt-flash'); }
      }
    }
    // A boss beaten: it goes down whatever the roll text says.
    const boss = events.find((e) => e.type === 'task' && e.source === 'boss' && e.won);
    if (boss && gap <= POPS_UP_TO) defeatGhost(scene, foe, foeBar);
    // Gear arriving: a chest, and the piece flying to the hero; Very Rare and Legendary in a beam.
    if (gap <= POPS_UP_TO) {
      const found = events.filter((e) => e.type === 'loot').sort((a, b) => b.tier - a.tier).slice(0, 2);
      found.forEach((e, i) => lootDrop(fx, fxBack, e, 500 + i * 900));
      // Healing: a potion, a heal from a skill, or getting up again.
      if (events.some((e) => e.type === 'potion' || e.heal > 0 || (e.type === 'choice' && e.boon))) healGlow(fx, hero.class);
    }
    const level = events.filter((e) => e.type === 'levelup').at(-1);
    const paragon = events.filter((e) => e.type === 'paragon').at(-1);
    if (level) burst(fx, fxBack, `Level ${level.level}`, hero.name);
    else if (paragon) burst(fx, fxBack, `Paragon ${paragon.rank}`, hero.name);
    const arrived = events.filter((e) => e.type === 'arrive').at(-1);
    if (arrived && !level) {
      const r = REGION_BY_ID[arrived.region];
      arrival(fx, r.name, `Levels ${r.levels[0]} to ${r.levels[1]}`);
    }
  }

  return { update, show, destroy: () => cancelAnimationFrame(view.frameReq) };
}
