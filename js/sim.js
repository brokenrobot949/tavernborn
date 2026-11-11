// The simulation. `advance(state, seconds)` is the only way game time moves.
//
// It never touches the page, the clock, or Math.random: everything it needs is in `state`, and
// every random number comes from the seeded generator in the save. The same save advanced by the
// same number of seconds always ends up the same. It updates `state` in place and returns the
// list of things that happened; the Chronicle and "While you were away" are built from that list.
//
// The live game calls it once a second. On load it is called once with the seconds since
// `lastSavedAt`. Time moves task by task, not second by second, so a month away costs about as
// much work as the number of tasks in it.

import { activeHero } from './hero.js';
import { nextTask, resolveTask } from './tasks.js';

export function advance(state, seconds) {
  const events = [];
  const hero = activeHero(state);
  if (!hero) return events;
  if (!hero.currentTask) hero.currentTask = nextTask(state, hero, events);
  let left = Math.max(0, Math.floor(seconds));
  while (left > 0) {
    const task = hero.currentTask;
    const step = Math.min(left, task.duration - task.elapsed);
    task.elapsed += step;
    hero.age += step;
    left -= step;
    if (task.elapsed >= task.duration) {
      resolveTask(state, hero, task, events);
      hero.currentTask = nextTask(state, hero, events);
    }
  }
  return events;
}

// Boil a list of events down to the numbers the "While you were away" card shows.
export function summarize(events) {
  const s = {
    tasks: 0, xp: 0, gold: 0, natural20s: 0, natural1s: 0, knockouts: 0, potions: 0, levels: [], newMonsters: [], knockedOutBy: [],
    quests: [], oddJobs: 0, feats: [], clears: [], chapters: [], opened: [], arrived: [], runsLost: 0, confidence: [], moves: 0,
    found: 0, upgrades: [], soldFor: 0,
  };
  for (const e of events) {
    if (e.xp) s.xp += e.xp;
    if (e.gold) s.gold += e.gold;
    if (e.type === 'task') {
      s.tasks += 1;
      if (e.outcome === 'crit') s.natural20s += 1;
      if (e.outcome === 'fumble') s.natural1s += 1;
    } else if (e.type === 'levelup') s.levels.push(e.level);
    else if (e.type === 'knockout') { s.knockouts += 1; s.knockedOutBy.push(e.monster ?? e.source); if (e.lost === 'run') s.runsLost += 1; }
    else if (e.type === 'potion') { s.potions += 1; s.gold -= e.cost; }
    else if (e.type === 'bestiary') s.newMonsters.push(e.monster);
    else if (e.type === 'questdone') { if (e.story) s.quests.push(e.quest); else s.oddJobs += 1; }
    else if (e.type === 'feat') s.feats.push(e.region);
    else if (e.type === 'cleared') s.clears.push(e.region);
    else if (e.type === 'chapter') s.chapters.push(e.chapter);
    else if (e.type === 'unlock') s.opened.push(e.region);
    else if (e.type === 'arrive') s.arrived.push(e.region);
    else if (e.type === 'confidence') s.confidence.push(e.region);
    else if (e.type === 'skill') s.moves += 1;
    else if (e.type === 'loot') { s.found += 1; s.soldFor += e.gold; if (e.equipped) s.upgrades.push({ slot: e.slot, tier: e.tier, name: e.name }); }
  }
  return s;
}
