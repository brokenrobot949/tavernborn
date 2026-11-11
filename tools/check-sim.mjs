// Dev check for the simulation: node tools/check-sim.mjs
// Proves offline progress without waiting overnight. For each class it creates a fresh hero,
// advances 9 hours in one call, and checks that the hero leveled, that the same seed gives the
// same result, that one big call equals many one-second calls, that a month runs quickly, and
// that the save string round-trips. It then checks the Phase 3 activities: quests, dungeon runs,
// travel, what a knockout costs, the cleric's fee, the race quirks, and that a Phase 1 or 2 save
// still loads without losing a level. Exits with an error if any check fails.

import { advance, summarize } from '../js/sim.js';
import { newSave, exportSave, importSave, migrate } from '../js/state.js';
import { createHero, assignScores, defaultAppearance, maxHp, regionOpen, STANDARD_ARRAY } from '../js/hero.js';
import { setFocus, orderTravel, payCleric, clericFee } from '../js/tasks.js';
import { xpForLevel, MAX_LEVEL } from '../js/rules.js';
import { REGIONS } from '../data/regions.js';
import { MONSTERS } from '../data/monsters.js';
import { QUESTS } from '../data/quests.js';
import { DUNGEONS } from '../data/dungeons.js';
import { CHAPTERS } from '../data/story.js';
import { runHero, heroPlan } from './simulate-core.js';
import { CLASSES } from '../data/classes.js';
import { RACES } from '../data/races.js';

let failed = 0;
const ok = (cond, label) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) failed += 1; };

function fresh(seed, cls = 'fighter', race = 'human') {
  const save = newSave(seed, 0);
  const hero = createHero(save, { name: 'Test', race, cls, appearance: defaultAppearance(race), baseScores: assignScores(cls, STANDARD_ARRAY) });
  save.heroes.push(hero);
  save.activeHeroId = hero.id;
  return save;
}
const HOUR = 3600;
const fmt = (s) => (s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

// 1. Overnight: 9 hours in one call, every class and race.
let ko = 0, pots = 0;
console.log('\nNine hours away, one call:');
for (const cls of Object.keys(CLASSES)) {
  for (const race of Object.keys(RACES)) {
    const save = fresh(12345, cls, race);
    const events = advance(save, 9 * HOUR);
    const h = save.heroes[0];
    const s = summarize(events);
    const times = events.filter((e) => e.type === 'levelup').map((e) => `L${e.level} ${fmt(e.at)}`).join(', ');
    console.log(`  ${cls.padEnd(8)}${race.padEnd(11)} level ${h.level}, ${s.tasks} tasks, ${s.knockouts} knockouts, ${s.potions} potions, ${h.gold} gp | ${times}`);
    if (h.level < 2) failed += 1;
    ko += s.knockouts; pots += s.potions;
  }
}
console.log(`  totals: ${ko} knockouts, ${pots} potions`);
ok(failed === 0, 'every hero leveled in nine hours');

// 2. Same seed, same result; a different seed differs.
const a = fresh(777); advance(a, 9 * HOUR);
const b = fresh(777); advance(b, 9 * HOUR);
const c = fresh(778); advance(c, 9 * HOUR);
ok(JSON.stringify(a) === JSON.stringify(b), 'same seed gives an identical save');
ok(JSON.stringify(a) !== JSON.stringify(c), 'a different seed gives a different save');

// 3. One long call equals the live game ticking once a second.
const d = fresh(777);
for (let i = 0; i < 9 * HOUR; i++) advance(d, 1);
ok(JSON.stringify(a) === JSON.stringify(d), 'one 9-hour call equals 32,400 one-second calls');

// 4. Long gaps are fast.
const m = fresh(4242);
const t0 = performance.now();
const monthEvents = advance(m, 30 * 24 * HOUR);
const ms = performance.now() - t0;
console.log(`  30 days: ${monthEvents.length} events in ${ms.toFixed(0)} ms, level ${m.heroes[0].level}, chronicle holds ${m.heroes[0].chronicle.length} lines`);
ok(ms < 1000, 'thirty days away resolves in under a second');
ok(m.heroes[0].chronicle.length <= 200, 'the Chronicle keeps at most 200 lines');

// 5. Export and import.
const text = exportSave(a);
const back = importSave(text);
ok(JSON.stringify(back) === JSON.stringify(a), `save string round-trips (${text.length} characters)`);
advance(back, HOUR); advance(a, HOUR);
ok(JSON.stringify(back) === JSON.stringify(a), 'an imported save carries on exactly like the original');
let threw = false;
try { importSave('not a save'); } catch { threw = true; }
ok(threw, 'a bad save string is refused');

// 6. Content: every region has monsters, six story quests, a dungeon, and a chapter card.
console.log('\nPhase 3 activities:');
ok(REGIONS.every((r) => MONSTERS[r.id]?.length >= 6 && QUESTS[r.id]?.length === 6 && DUNGEONS[r.id]?.boss && CHAPTERS[r.id]), 'all eight regions have monsters, six story quests, a dungeon, and a chapter');
ok(REGIONS.every((r) => QUESTS[r.id].every((q) => q.steps.length >= 5 && q.steps.length <= 8)), 'every story quest has 5 to 8 steps');

// A hero at a given level, standing in a region, with every region up to it open.
function placed(seed, cls, race, level, regionId, focus) {
  const save = fresh(seed, cls, race);
  const h = save.heroes[0];
  h.level = level; h.xp = xpForLevel(level); h.hp = maxHp(h); h.gold = 2000;
  for (const r of REGIONS) { if (r.id === regionId) break; h.dungeonClears[r.id] = 1; }
  h.region = regionId;
  setFocus(h, focus);
  return save;
}

// 7. Quests: six story quests, then a Feat and odd jobs.
const q = placed(31, 'cleric', 'human', 3, 'mugwick', 'quest');
const qs = summarize(advance(q, 6 * HOUR));
const qh = q.heroes[0];
ok(qs.quests.length === 6 && qh.feats.includes('mugwick'), `six story quests in the Vale earn a Feat (${qs.quests.length} done, ${qs.oddJobs} odd jobs after)`);
ok(qh.skillPoints === (qh.level - 3) + 1, 'the Feat is worth one bonus skill point');
ok(qs.oddJobs > 0, 'odd jobs follow the story quests');

// 8. Dungeons: a run ends in a boss, the first clear opens the next region and earns a chapter.
const dn = placed(32, 'fighter', 'dwarf', 4, 'mugwick', 'delve');
ok(!regionOpen(dn.heroes[0], 'mumblewood'), 'the Mumblewood starts locked');
const ds = summarize(advance(dn, 3 * HOUR));
ok(ds.clears.length > 0 && ds.chapters[0] === 1 && ds.opened[0] === 'mumblewood', `clearing the Cellar shows chapter 1 and opens the Mumblewood (${ds.clears.length} clears in 3 h)`);
ok(dn.heroes[0].unread[0] === 'mugwick' && regionOpen(dn.heroes[0], 'mumblewood'), 'the chapter card is waiting and the road is open');

// 9. Travel: ordered once, walked as its own task, and refused for a locked region.
ok(orderTravel(dn.heroes[0], 'mumblewood') && !orderTravel(dn.heroes[0], 'peaks'), 'travel is allowed to an open region and refused to a locked one');
const tEvents = advance(dn, 20 * 60);
ok(dn.heroes[0].region === 'mumblewood' && tEvents.some((e) => e.type === 'arrive'), 'the hero walks to the Mumblewood and arrives');

// 10. A knockout costs the dungeon run or the quest step, and nothing else.
const weak = placed(33, 'wizard', 'elf', 4, 'gloamfen', 'delve'); // far out of their depth
weak.heroes[0].gold = 0;
let lostOnlyTime = true, sawKo = false, sawConfidence = false;
for (let i = 0; i < 16 * HOUR && !sawConfidence; i += 30) {
  const h = weak.heroes[0];
  const before = { xp: h.xp, gold: h.gold, level: h.level };
  const ev = advance(weak, 30);
  const spent = ev.filter((e) => e.type === 'potion').reduce((n, e) => n + e.cost, 0);
  if (ev.some((e) => e.type === 'knockout')) {
    sawKo = true;
    if (h.xp < before.xp || h.gold < before.gold - spent || h.level < before.level || h.delve !== null) lostOnlyTime = false;
  }
  if (ev.some((e) => e.type === 'confidence')) { sawConfidence = true; if (h.focus !== 'roam') lostOnlyTime = false; }
}
ok(sawKo && lostOnlyTime, 'a knockout in a dungeon loses the run and no XP, gold, or levels');
ok(sawConfidence, 'three knockouts running in one dungeon switch the hero to Roam');

// 11. The tavern cleric: a fee to get up at once.
const koSave = placed(34, 'wizard', 'human', 1, 'mugwick', 'delve');
let guard = 0;
while (koSave.heroes[0].knockedOutUntil == null && guard++ < 5000) advance(koSave, 60);
const kh = koSave.heroes[0];
const fee = clericFee(kh);
kh.gold = fee - 1;
ok(fee > 0 && payCleric(koSave, kh) === null && kh.knockedOutUntil != null, `the cleric will not work for less than the fee (${fee} gp at level ${kh.level})`);
kh.gold = fee + 10;
ok(payCleric(koSave, kh) === fee && kh.knockedOutUntil == null && kh.gold === 10 && kh.hp === maxHp(kh), 'paying the fee ends the knockout at full hit points');
ok(clericFee(kh) === null && payCleric(koSave, kh) === null, 'there is nothing to pay when the hero is on their feet');

// 12. Race quirks that waited for this phase.
const count = (race, starts) => {
  let n = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const s2 = placed(500 + seed, 'wizard', race, 2, 'mugwick', 'delve');
    for (const e of advance(s2, 30 * HOUR)) if (e.type === 'story' && e.text.startsWith(starts)) n += 1;
  }
  return n;
};
ok(count('halforc', 'Too Stubborn') > 0, 'Half-Orc: drops to 1 HP instead of 0, once per dungeon run');
ok(count('dragonborn', 'Breath Weapon') > 0, 'Dragonborn: opens boss fights with a free hit');
let grudgeRolls = 0;
for (let seed = 1; seed <= 12; seed++) {
  const s2 = placed(600 + seed, 'wizard', 'dwarf', 2, 'mugwick', 'delve');
  advance(s2, 30 * HOUR);
  const h = s2.heroes[0];
  setFocus(h, 'roam');
  for (let i = 0; i < 60; i++) { advance(s2, 600); grudgeRolls += h.chronicle.slice(-20).some((l) => l.roll?.includes('(grudge)')) ? 1 : 0; }
}
ok(grudgeRolls > 0, 'Dwarf: rolls with a grudge bonus against whatever has knocked them out');

// 13. Every focus is deterministic and tick-independent, not only Roam.
for (const focus of ['quest', 'delve']) {
  const one = placed(41, 'rogue', 'goblin', 5, 'mumblewood', focus); advance(one, 4 * HOUR);
  const many = placed(41, 'rogue', 'goblin', 5, 'mumblewood', focus); for (let i = 0; i < 4 * HOUR; i++) advance(many, 1);
  ok(JSON.stringify(one) === JSON.stringify(many), `${focus}: one 4-hour call equals 14,400 one-second calls`);
}

// 14. A save from Phase 1 or 2 still loads, and the hero keeps their level.
const old = fresh(99, 'rogue', 'elf');
advance(old, 2 * HOUR);
const oh = old.heroes[0];
old.version = 1;
for (const key of ['travelTo', 'returning', 'delve', 'delveFails', 'grudges', 'unread']) delete oh[key];
oh.level = 9;
oh.xp = Math.round(3600 * (11 * 0.5 + (60 - 11) * 0.48)); // half way through level 9 on the old curve
oh.currentTask = { kind: 'roam', monster: 'goose', text: 'Standing ground against a goose', duration: 30, elapsed: 4 };
const moved = migrate(JSON.parse(JSON.stringify(old)));
const mh = moved.heroes[0];
ok(mh.level === 9 && mh.xp >= xpForLevel(9) && mh.xp < xpForLevel(10), `a version 1 save keeps its level (9) and its place within it (${mh.xp} XP; level 10 is at ${xpForLevel(10)})`);
ok(moved.version === 2 && mh.unread.length === 0 && mh.delve === null, 'the new fields are filled in');
advance(moved, 9 * HOUR);
ok(mh.level >= 9 && mh.stats.tasks > 0, `an old save carries on (level ${mh.level} after 9 more hours)`);
const top = fresh(98); top.version = 1; top.heroes[0].level = MAX_LEVEL; top.heroes[0].xp = 100;
ok(migrate(top).heroes[0].level === MAX_LEVEL && top.heroes[0].xp >= xpForLevel(MAX_LEVEL), 'a level 20 hero stays level 20');

// 15. The whole road, played by the simulator's stand-in player: travel, quests, dungeons.
const t1 = performance.now();
const full = runHero(heroPlan(7));
console.log(`  one hero up the whole road in ${(performance.now() - t1).toFixed(0)} ms: level ${full.level} after ${(full.age / 86400).toFixed(1)} days, ${full.knockouts} knockouts, ${full.quests} story quests, ${full.runs} dungeon runs`);
ok(REGIONS.every((r) => full.clears[r.id]), 'a simulated hero clears all eight dungeons, Wyrmspire included');
ok(full.level === MAX_LEVEL, 'and reaches level 20');

// 16. Pacing across many seeds (tools/simulate.html charts all 20 levels).
const reach = {};
for (let seed = 1; seed <= 200; seed++) {
  const s = fresh(seed, Object.keys(CLASSES)[seed % 4], Object.keys(RACES)[seed % 6]);
  for (const e of advance(s, 12 * HOUR)) if (e.type === 'levelup') (reach[e.level] ??= []).push(e.at);
}
console.log('\nMedian time to each level over 200 heroes (target in brackets):');
const target = { 2: '10 min', 3: '1 h', 4: '3 h', 5: '6.5 h', 6: '11 h' };
for (const [level, times] of Object.entries(reach)) {
  times.sort((x, y) => x - y);
  console.log(`  level ${level}: ${fmt(times[Math.floor(times.length / 2)])} [${target[level] ?? '-'}] (${times.length}/200 heroes)`);
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
