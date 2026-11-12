// Dev-only: make a save string for a hero who has been adventuring a while, for testing screens.
// node tools/make-test-save.mjs [days] [class] [race] > save.txt
// The hero is played by the simulator's player (skills, upgrades, the road), and the save is
// timed so it opens as if the phone had been closed a moment ago.
import { newSave, exportSave } from '../js/state.js';
import { advance } from '../js/sim.js';
import { createHero, defaultAppearance, assignScores } from '../js/hero.js';
import { grow, shop, steer } from './simulate-core.js';
import { TREES } from '../js/skills.js';

const [days = '6', cls = 'fighter', race = 'human'] = process.argv.slice(2);
const save = newSave(12345, 0);
const hero = createHero(save, { name: 'Testa Brightwell', race, cls, appearance: defaultAppearance(race), baseScores: assignScores(cls, [15, 14, 13, 12, 10, 8]) });
save.heroes.push(hero);
save.activeHeroId = hero.id;
const sim = { retryAt: {}, early: 0 };
steer(hero, sim, 'balanced');
const end = Number(days) * 86400;
while (hero.age < end) {
  for (const e of advance(save, 300)) if (e.type === 'confidence') sim.retryAt[e.region] = Math.min(20, hero.level + 1);
  grow(hero, TREES[cls].branches[0].id);
  shop(save, hero);
  steer(hero, sim, 'balanced');
}
hero.unread = []; // the chapter cards were read along the way
save.lastSavedAt = Date.now();
process.stdout.write(exportSave(save));
