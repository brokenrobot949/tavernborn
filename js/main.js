// Boot, tab routing, and the render loop.
// The page never changes the game itself: once a second it asks sim.js to advance the save by
// however many whole seconds have really passed, then redraws. A closed tab, a sleeping phone,
// and a slow timer are all the same thing to it: a bigger gap handed to `advance`.

import { advance, summarize } from './sim.js';
import { loadSave, newSave, storeSave } from './state.js';
import { activeHero } from './hero.js';
import { pending } from './skills.js';
import { el } from './ui/dom.js';
import { mountCreate } from './ui/create.js';
import { mountHero } from './ui/hero.js';
import { mountMap } from './ui/map.js';
import { mountSkills } from './ui/skills.js';
import { mountGear } from './ui/gear.js';
import { mountTavern } from './ui/tavern.js';
import { showAway } from './ui/away.js';
import { showChapter } from './ui/story.js';

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

const app = {
  currentSave: () => save,
  replaceSave(next) { save = next; storeSave(save); start(); },
  newHero() { save.heroes = save.heroes.filter((h) => h.id !== save.activeHeroId); save.activeHeroId = null; storeSave(save); start(); },
  // A standing order was given or a choice made (focus, travel, the cleric, a skill, a respec): keep it and redraw.
  changed() { storeSave(save); render(); },
};

function start() {
  screen?.views.hero.destroy();
  screen = null;
  root.replaceChildren();
  if (!activeHero(save)) {
    mountCreate(root, save, (hero) => {
      save.heroes.push(hero);
      save.activeHeroId = hero.id;
      save.lastSavedAt = Date.now();
      storeSave(save);
      start();
    });
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
  tab = 'hero';
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
  if (gap >= AWAY_SECONDS) showAway(root, { seconds: gap, summary: summarize(events), hero });
  if (sinceStore >= SAVE_EVERY) { sinceStore = 0; storeSave(save); }
  // Story chapter cards earned by a first dungeon clear, one at a time, after any away card.
  if (hero.unread.length && !root.querySelector('.overlay')) {
    showChapter(root, hero.unread[0], hero, () => { hero.unread.shift(); storeSave(save); });
  }
  render();
}

setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (activeHero(save)) storeSave(save); } else tick();
});
addEventListener('pagehide', () => { if (activeHero(save)) storeSave(save); });
wide.addEventListener('change', () => { if (screen) showTab(tab); });

start();
