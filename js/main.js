// Boot, tab routing, and the render loop.
// The page never changes the game itself: once a second it asks sim.js to advance the save by
// however many whole seconds have really passed, then redraws. A closed tab, a sleeping phone,
// and a slow timer are all the same thing to it: a bigger gap handed to `advance`.

import { advance, summarize } from './sim.js';
import { loadSave, newSave, storeSave } from './state.js';
import { activeHero } from './hero.js';
import { pending } from './skills.js';
import { switchHero, dismissHero, retire, canRecruit, canRetire, portraitOf } from './tavern.js';
import { el } from './ui/dom.js';
import { mountCreate } from './ui/create.js';
import { mountHero } from './ui/hero.js';
import { mountMap } from './ui/map.js';
import { mountSkills } from './ui/skills.js';
import { mountGear } from './ui/gear.js';
import { mountTavern } from './ui/tavern.js';
import { showAway } from './ui/away.js';
import { showChapter } from './ui/story.js';
import { showRetireOffer, drawPortrait } from './ui/legacy.js';
import { unlockOnTap, playEvents, sfx } from './audio.js';

const AWAY_SECONDS = 600; // the summary card appears after more than ten minutes away
const SAVE_EVERY = 10; // seconds between automatic saves
const TABS = [['hero', 'Hero'], ['map', 'Map'], ['skills', 'Skills'], ['gear', 'Gear'], ['tavern', 'Tavern']];

const root = document.getElementById('game');
const wide = matchMedia('(min-width: 860px)');
let save = loadSave() ?? newSave();
let screen = null; // { views, sections, buttons } while the game is showing
let tab = 'hero';
let sideTab = 'map'; // the tab shown beside the pinned Hero panel on a wide screen
let sinceStore = 0;
let returnTo = null; // the hero to go back to if creating a new one is called off

// The roster: one hero adventures at a time and the others wait at the tavern exactly as they
// were. Before the active hero changes, the time that has passed is settled on the one who was
// out adventuring through it.
function settle() { if (activeHero(save)) tick(); }
const app = {
  currentSave: () => save,
  replaceSave(next) { save = next; storeSave(save); start(); },
  recruit() {
    if (!canRecruit(save)) return;
    settle();
    returnTo = save.activeHeroId;
    save.activeHeroId = null;
    storeSave(save);
    start();
  },
  switchHero(id) { settle(); if (switchHero(save, id)) { storeSave(save); start(); } },
  retire(id) {
    settle();
    const wasActive = id === save.activeHeroId;
    if (!retire(save, id)) return;
    sfx('retire');
    storeSave(save);
    if (wasActive) start('tavern'); else render();
  },
  dismiss(id) {
    settle();
    const wasActive = id === save.activeHeroId;
    if (!dismissHero(save, id)) return;
    storeSave(save);
    if (wasActive) start('tavern'); else render();
  },
  // A standing order was given or a choice made (focus, travel, the cleric, a skill, a respec): keep it and redraw.
  changed() { storeSave(save); render(); },
};

function start(firstTab = 'hero') {
  screen?.views.hero.destroy();
  screen = null;
  root.replaceChildren();
  if (!activeHero(save)) {
    // Creation. With other heroes waiting it can be called off, back to whoever was out.
    const cancel = save.heroes.length ? () => { save.activeHeroId = save.heroes.some((h) => h.id === returnTo) ? returnTo : save.heroes[0].id; returnTo = null; save.lastSavedAt = Date.now(); start(); } : null;
    mountCreate(root, save, (hero) => {
      save.heroes.push(hero);
      save.activeHeroId = hero.id;
      save.lastSavedAt = Date.now();
      returnTo = null;
      storeSave(save);
      start();
    }, cancel);
    return;
  }

  const sections = Object.fromEntries(TABS.map(([id]) => [id, el('section', { className: 'view view-' + id, id: 'view-' + id })]));
  const buttons = Object.fromEntries(TABS.map(([id, label]) => [id, el('button', { type: 'button', textContent: label, onclick: () => showTab(id), attrs: { role: 'tab', 'data-tab': id } })]));
  root.append(
    el('main', { className: 'views' }, ...Object.values(sections)),
    el('nav', { className: 'tabbar', attrs: { role: 'tablist', 'aria-label': 'Sections' } }, ...Object.values(buttons)));
  screen = {
    sections, buttons,
    views: { hero: mountHero(sections.hero, app), map: mountMap(sections.map, app), skills: mountSkills(sections.skills, app), gear: mountGear(sections.gear), tavern: mountTavern(sections.tavern, app) },
  };
  tab = firstTab;
  sideTab = firstTab === 'hero' ? sideTab : firstTab;
  showTab(tab);
  tick();
}

// On a phone one tab shows at a time. On a wide screen the Hero panel stays pinned on the left
// and the other four tabs share the right.
function shownTabs() {
  if (!wide.matches) return [tab];
  return ['hero', tab === 'hero' ? sideTab : tab];
}

function showTab(id) {
  tab = id;
  if (id !== 'hero') sideTab = id;
  const shown = shownTabs();
  for (const [key, section] of Object.entries(screen.sections)) section.hidden = !shown.includes(key);
  for (const [key, button] of Object.entries(screen.buttons)) button.setAttribute('aria-selected', String(wide.matches ? key === shown[1] : key === tab));
  render();
  if (!wide.matches) window.scrollTo(0, 0);
}

function render() {
  const hero = activeHero(save);
  if (!screen || !hero) return;
  for (const id of shownTabs()) screen.views[id].update(save, hero);
  // The badge on the Skills tab: skill points, a subclass, or ability points waiting to be spent.
  const waiting = pending(hero).total;
  const skills = screen.buttons.skills;
  if (skills.dataset.badge !== String(waiting || '')) {
    skills.dataset.badge = waiting || '';
    skills.setAttribute('aria-label', waiting ? `Skills, ${waiting} waiting` : 'Skills');
  }
}

function tick() {
  const hero = activeHero(save);
  if (!screen || !hero) return;
  const now = Date.now();
  let gap = Math.floor((now - save.lastSavedAt) / 1000);
  if (gap < 0) { save.lastSavedAt = now; gap = 0; } // the device clock was moved back
  const events = advance(save, gap);
  save.lastSavedAt += gap * 1000;
  sinceStore += gap;
  // Sound: one effect for what just happened, or one chime for a long time away.
  if (gap >= AWAY_SECONDS) { showAway(root, { seconds: gap, summary: summarize(events), hero }); sfx('away'); }
  else if (events.length) { playEvents(events); screen.views.hero.show(events, gap); }
  if (sinceStore >= SAVE_EVERY) { sinceStore = 0; storeSave(save); }
  // Story chapter cards earned by a first dungeon clear, one at a time, after any away card.
  if (hero.unread.length && !root.querySelector('.overlay')) {
    showChapter(root, hero.unread[0], hero, () => { hero.unread.shift(); storeSave(save); });
  }
  // Level 20: retirement is offered once, by a card. After that it waits on the Hero tab.
  if (canRetire(hero) && !hero.retireOffered && !root.querySelector('.overlay')) {
    hero.retireOffered = true;
    storeSave(save);
    const portrait = showRetireOffer(root, hero, { onRetire: () => app.retire(hero.id) });
    drawPortrait(portrait, portraitOf(hero), 3);
  }
  render();
}

unlockOnTap();
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (activeHero(save)) storeSave(save); } else tick();
});
addEventListener('pagehide', () => { if (activeHero(save)) storeSave(save); });
wide.addEventListener('change', () => { if (screen) showTab(tab); });

start();
