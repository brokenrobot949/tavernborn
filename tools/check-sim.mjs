// Dev check for the simulation: node tools/check-sim.mjs
// Proves offline progress without waiting overnight. For each class it creates a fresh hero,
// advances 9 hours in one call, and checks that the hero leveled, that the same seed gives the
// same result, that one big call equals many one-second calls, that a month runs quickly, and
// that the save string round-trips. It then checks the Phase 3 activities: quests, dungeon runs,
// travel, what a knockout costs, the cleric's fee, the race quirks, and that a Phase 1 or 2 save
// still loads without losing a level. Then Phase 4, growth: the shape of the four skill trees,
// proof that each of the 144 skills changes what happens and writes its Chronicle line, tier
// gating, the capstone rule, the 27-point cap, ability score increases, respec, and that a
// Phase 3 save loads with every level, skill point, and Feat. Exits with an error if any check fails.

import { advance, summarize } from '../js/sim.js';
import { newSave, exportSave, importSave, migrate } from '../js/state.js';
import { createHero, assignScores, defaultAppearance, maxHp, regionOpen, raiseAbility, abilityPointsBy, STANDARD_ARRAY } from '../js/hero.js';
import {
  TREES, ALL_SKILLS, FX_KEYS, SIG_TYPES, MAX_SKILLS, canLearn, whyNot, learnSkill, chooseSubclass, respec, respecCost, pending,
} from '../js/skills.js';
import { setFocus, orderTravel, payCleric, clericFee } from '../js/tasks.js';
import { xpForLevel, respecPrice, PAST_CURVES, ABILITY_LEVELS, ABILITY_MAX, MAX_LEVEL } from '../js/rules.js';
import { REGIONS } from '../data/regions.js';
import { MONSTERS } from '../data/monsters.js';
import { QUESTS } from '../data/quests.js';
import { DUNGEONS } from '../data/dungeons.js';
import { CHAPTERS } from '../data/story.js';
import { runHero, heroPlan, grow } from './simulate-core.js';
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
ok(moved.version === 3 && mh.unread.length === 0 && mh.delve === null, 'the new fields are filled in');
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

// ---------- Phase 4: growth ----------
console.log('\nPhase 4 growth:');

// 17. The shape of the trees: four classes, three branches of twelve, one capstone each.
const branches = Object.values(TREES).flatMap((t) => t.branches);
ok(Object.keys(TREES).length === 4 && branches.length === 12 && branches.every((b) => b.skills.length === 12) && ALL_SKILLS.length === 144, 'four trees, three branches of twelve skills each: 144 skills, every id unique');
ok(Object.values(TREES).every((t) => ['might', 'guard', 'fortune'].every((k) => t.branches.filter((b) => b.kind === k).length === 1)), 'every class has one Might, one Guard, and one Fortune branch');
ok(ALL_SKILLS.filter((x) => x.capstone).length === 12 && ALL_SKILLS.filter((x) => x.capstone).every((x) => x.tier === 4), 'twelve capstones, each the last skill of its branch');
const badShape = ALL_SKILLS.filter((x) => {
  const fx = Object.entries(x.fx ?? {});
  const fxOk = fx.every(([k, v]) => k in FX_KEYS && typeof v === 'number' && v > 0);
  const sigOk = !x.sig || (x.sig.type in SIG_TYPES && typeof x.fire === 'string' && x.fire.startsWith(x.name + '.'));
  return !(x.name && x.text && typeof x.learn === 'string' && x.learn.startsWith(`Learned ${x.name}.`) && fxOk && sigOk && (fx.length || x.sig));
});
ok(badShape.length === 0, `every skill has a name, a description, a known effect, and a line for learning it${badShape.length ? ' (not: ' + badShape.map((x) => x.id).join(', ') + ')' : ''}`);
const lines = [...ALL_SKILLS.flatMap((x) => [x.learn, x.fire, x.text]), ...branches.map((b) => b.chosen)].filter(Boolean);
ok(lines.every((l) => !l.includes('!')), 'no skill line has an exclamation mark');
const moves = ALL_SKILLS.filter((x) => x.sig);
console.log(`  ${ALL_SKILLS.length - moves.length} passives, ${moves.length} signature moves of ${new Set(moves.map((x) => x.sig.type)).size} kinds`);

// 18. Every skill does something. For each of the 144: one hero has only that skill, a twin has
// none, and both live the same two days (roaming, quests, a dungeon at their level, a journey, and
// two dungeons above them, where the knockouts are). The skill must change how those days went,
// and a signature move must fire and write its own Chronicle line.
function trial(seed, skill) {
  const save = placed(seed, skill.cls, 'human', 9, 'saltmarrow', 'roam');
  const h = save.heroes[0];
  for (const r of REGIONS) h.dungeonClears[r.id] = 1;
  h.gold = 6000;
  if (skill.id) { h.skills = [skill.id]; h.subclass = skill.branch; h.hp = maxHp(h); }
  const fired = [];
  const run = (seconds) => { for (const e of advance(save, seconds)) if (e.type === 'skill') fired.push(e); };
  run(3 * HOUR);
  setFocus(h, 'quest'); run(8 * HOUR);
  setFocus(h, 'delve'); run(12 * HOUR);
  orderTravel(h, 'peaks'); run(HOUR);
  setFocus(h, 'delve'); run(12 * HOUR);
  orderTravel(h, 'gloamfen'); run(HOUR);
  setFocus(h, 'delve'); run(10 * HOUR);
  h.skills = []; h.subclass = null; // so only what happened is compared
  return { text: JSON.stringify(save), fired };
}
const plain = {};
const noEffect = [], noLine = [];
let firedTotal = 0;
for (const skill of ALL_SKILLS) {
  let changed = false, line = !skill.sig;
  for (let seed = 9001; seed <= 9008 && !(changed && line); seed++) {
    plain[skill.cls + seed] ??= trial(seed, { cls: skill.cls }).text;
    const t = trial(seed, skill);
    changed ||= t.text !== plain[skill.cls + seed];
    const mine = t.fired.filter((e) => e.skill === skill.id);
    firedTotal += mine.length;
    line ||= mine.length > 0 && mine.every((e) => e.text.startsWith(skill.name + '.'));
  }
  if (!changed) noEffect.push(skill.id);
  if (!line) noLine.push(skill.id);
}
ok(noEffect.length === 0, `each of the 144 skills changes what happens to the hero${noEffect.length ? ' (no effect: ' + noEffect.join(', ') + ')' : ''}`);
ok(noLine.length === 0, `each of the ${moves.length} signature moves fires and writes its own Chronicle line (${firedTotal} firings seen)${noLine.length ? ' (never fired: ' + noLine.join(', ') + ')' : ''}`);

// A hero with points to spend, for the rules of the tree.
function student(cls, level, points) {
  const save = placed(51, cls, 'human', level, 'mugwick', 'roam');
  const h = save.heroes[0];
  h.skillPoints = points;
  return h;
}
// Learning writes the skill's own line, for all 144.
let learnedLines = 0;
for (const skill of ALL_SKILLS) {
  const h = student(skill.cls, 10, 40);
  chooseSubclass(h, skill.branch);
  for (const other of TREES[skill.cls].branches.find((b) => b.id === skill.branch).skills) {
    if (other.id === skill.id) break;
    learnSkill(h, other.id);
  }
  const before = h.skillPoints;
  if (learnSkill(h, skill.id) && h.skillPoints === before - 1 && h.chronicle.at(-1).text === skill.learn.replace('{name}', h.name) && h.chronicle.at(-1).k === 'learned') learnedLines += 1;
}
ok(learnedLines === 144, `learning a skill costs one point and writes that skill's Chronicle line (${learnedLines} of 144)`);

// 19. Tiers: a tier opens after two points in the tier above it.
const g = student('fighter', 10, 10);
const van = TREES.fighter.branches[0].skills.map((x) => x.id);
ok(!canLearn(g, van[3]) && whyNot(g, van[3]).includes('tier 1'), 'a tier 2 skill is closed to a hero with nothing in tier 1');
learnSkill(g, van[0]);
ok(!canLearn(g, van[3]), 'one point in tier 1 is not enough');
learnSkill(g, van[1]);
ok(canLearn(g, van[3]) && !canLearn(g, van[6]), 'two points in tier 1 open tier 2, and not tier 3');
ok(!learnSkill(g, van[0]) && !learnSkill(g, 'w_fireball') && g.skills.length === 2, 'a skill cannot be learned twice, and a Fighter cannot learn Fireball');
const poor = student('rogue', 5, 0);
ok(!learnSkill(poor, 'r_quick_draw') && poor.skills.length === 0, 'no points, no skill');

// 20. Subclass and capstone: chosen from level 3, once; only its own capstone opens.
const young = student('cleric', 2, 1);
ok(!chooseSubclass(young, 'pilgrim') && young.subclass === null && pending(young).subclass === 0, 'no subclass before level 3');
const c1 = student('cleric', 12, 30);
ok(pending(c1).subclass === 1 && !chooseSubclass(c1, 'evoker') && chooseSubclass(c1, 'pilgrim') && !chooseSubclass(c1, 'warpriest') && c1.subclass === 'pilgrim', 'a Cleric picks one Cleric subclass, once');
for (const b of TREES.cleric.branches) for (const x of b.skills.slice(0, 11)) learnSkill(c1, x.id);
ok(c1.skills.length === MAX_SKILLS, `a hero stops at ${MAX_SKILLS} skills with points still in hand (${c1.skillPoints} left over)`);
const c2 = student('cleric', 12, 30);
chooseSubclass(c2, 'pilgrim');
for (const b of TREES.cleric.branches) for (const x of b.skills.slice(0, 8)) learnSkill(c2, x.id);
ok(!canLearn(c2, 'c_intervention') && !canLearn(c2, 'c_beacon') && whyNot(c2, 'c_beacon').startsWith('Capstone') && learnSkill(c2, 'c_miracle'), 'only the capstone of the chosen subclass can be learned');
const c3 = student('cleric', 12, 30);
for (const x of TREES.cleric.branches[2].skills.slice(0, 8)) learnSkill(c3, x.id);
ok(!canLearn(c3, 'c_miracle'), 'no capstone without a subclass');

// 21. The 27-point cap: 19 levels and 8 Feats, and never more than 27 skills however many points.
const greedy = student('wizard', 20, 99);
chooseSubclass(greedy, 'diviner');
for (let pass = 0; pass < 4; pass++) for (const x of ALL_SKILLS) learnSkill(greedy, x.id);
ok(greedy.skills.length === MAX_SKILLS && MAX_SKILLS === 27 && pending(greedy).points === 0, 'a hero with 99 points still learns 27 skills of 36');
ok(full.skills + full.banked === 19 + full.feats && full.skills + full.banked <= MAX_SKILLS, `the simulated hero earned ${full.skills + full.banked} points in all (19 levels, ${full.feats} Feats) and learned ${full.skills} skills`);

// 22. Ability score increases: two points at levels 4, 8, 12, 16, and 19, banked until spent.
const ab = fresh(61, 'fighter', 'dwarf');
const ah = ab.heroes[0];
const growthEvents = advance(ab, 9 * HOUR).filter((e) => e.type === 'growth');
ok(ah.level >= 4 && ah.level < 8 && ah.abilityPoints === 2 && growthEvents.some((e) => e.waiting === 'ability') && growthEvents.some((e) => e.waiting === 'subclass'), `an absent player's hero banks the level 4 increase (level ${ah.level}, 2 ability points waiting, and the Chronicle says so)`);
ok(ah.skillPoints === ah.level - 1 + ah.feats.length && pending(ah).total === ah.skillPoints + 1 + 2, 'skill points bank too, and the Skills badge counts points, the subclass, and ability points');
const strBefore = ah.abilities.str, hpBefore = maxHp(ah), conBefore = ah.abilities.con;
ok(raiseAbility(ah, 'str') && raiseAbility(ah, 'con') && !raiseAbility(ah, 'str') && ah.abilities.str === strBefore + 1 && ah.abilities.con === conBefore + 1 && ah.abilityPoints === 0, 'two points go on two abilities (or both on one), and then there are none');
ok((conBefore % 2 === 1) === (maxHp(ah) > hpBefore), 'Constitution reaching an even score adds hit points at once');
const capped = student('rogue', 20, 0);
capped.abilityPoints = 9; capped.abilities.dex = 19;
ok(raiseAbility(capped, 'dex') && !raiseAbility(capped, 'dex') && capped.abilities.dex === ABILITY_MAX && capped.abilityPoints === 8, 'no ability score goes above 20');
ok(abilityPointsBy(20) === 10 && abilityPointsBy(3) === 0 && ABILITY_LEVELS.join() === '4,8,12,16,19', 'ten ability points by level 20');
ok(full.abilityPoints === 0, 'the simulated player spent all ten');

// 23. Respec: gold for every point back and the subclass open again.
const r1 = student('rogue', 8, 7);
ok(respecCost(r1) === null && respec(r1) === null, 'nothing to respec before anything is chosen');
chooseSubclass(r1, 'shadow');
for (const id of ['r_light_step', 'r_nimble', 'r_slip_away', 'r_uncanny', 'r_quick_draw']) learnSkill(r1, id);
const price = respecCost(r1);
const dexBefore = r1.abilities.dex;
r1.gold = price - 1;
ok(price === respecPrice(8) && respec(r1) === null && r1.skills.length === 5, `respec at level 8 costs ${price} gp and is refused a coin short`);
r1.gold = price + 5;
ok(respec(r1) === price && r1.gold === 5 && r1.skills.length === 0 && r1.skillPoints === 7 && r1.subclass === null && r1.abilities.dex === dexBefore, 'respec refunds every point, reopens the subclass, and keeps ability scores');
ok(chooseSubclass(r1, 'duelist') && learnSkill(r1, 'r_quick_draw') && r1.hp <= maxHp(r1), 'a different subclass can be chosen afterwards');
ok(respecPrice(20) > respecPrice(10) && respecPrice(10) > respecPrice(3), `the price rises with level (${respecPrice(3)} gp at 3, ${respecPrice(10)} at 10, ${respecPrice(20)} at 20)`);

// 24. A grown hero is still deterministic and tick-independent.
const grown = (seed) => { const s2 = placed(seed, 'cleric', 'elf', 12, 'peaks', 'delve'); s2.heroes[0].skillPoints = 20; grow(s2.heroes[0], 'lifebinder'); return s2; };
const gOne = grown(71); advance(gOne, 4 * HOUR);
const gMany = grown(71); for (let i = 0; i < 4 * HOUR; i++) advance(gMany, 1);
ok(gOne.heroes[0].skills.length === 20 && JSON.stringify(gOne) === JSON.stringify(gMany), 'with 20 skills learned, one 4-hour call equals 14,400 one-second calls');
const gBack = importSave(exportSave(gOne)); advance(gBack, 2 * HOUR); advance(gOne, 2 * HOUR);
ok(JSON.stringify(gBack) === JSON.stringify(gOne), 'and survives the save string mid-adventure');

// 25. A Phase 3 save (version 2) loads with every level, skill point, and Feat, and gets its ability points.
const v2 = fresh(88, 'wizard', 'goblin');
const vh = v2.heroes[0];
advance(v2, 3 * HOUR);
v2.version = 2;
vh.level = 13; vh.feats = ['mugwick', 'mumblewood', 'saltmarrow']; vh.skillPoints = 15; vh.skills = []; vh.subclass = null;
vh.xp = Math.round((PAST_CURVES[2][13] + PAST_CURVES[2][14]) / 2); // half way through level 13 on the Phase 3 curve
for (const key of ['abilityPoints', 'raised', 'cooldowns', 'fresh']) delete vh[key];
const up = migrate(JSON.parse(JSON.stringify(v2)));
const uh = up.heroes[0];
const half = (uh.xp - xpForLevel(13)) / (xpForLevel(14) - xpForLevel(13));
ok(up.version === 3 && uh.level === 13 && uh.skillPoints === 15 && uh.feats.length === 3, 'a Phase 3 save keeps its level (13), its 15 skill points, and its 3 Feats');
ok(Math.abs(half - 0.5) < 0.01, `and its place within the level on the new curve (${Math.round(half * 100)}% of the way to 14)`);
ok(uh.abilityPoints === 6 && pending(uh).total === 15 + 1 + 6, 'the three ability increases it had already passed are waiting (6 points), with the subclass choice');
const short = JSON.parse(JSON.stringify(v2)); delete short.heroes[0].skillPoints;
ok(migrate(short).heroes[0].skillPoints === 12 + 3, 'a save that lost count of its points gets what its levels and Feats are worth');
advance(up, 9 * HOUR);
grow(uh, 'evoker');
ok(uh.level >= 13 && uh.skills.length >= 15 && uh.abilityPoints === 0 && uh.subclass === 'evoker', `the old hero carries on and can spend it all (level ${uh.level}, ${uh.skills.length} skills)`);
const again = migrate(JSON.parse(JSON.stringify(up)));
ok(JSON.stringify(again) === JSON.stringify(up), 'loading a current save changes nothing');

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
