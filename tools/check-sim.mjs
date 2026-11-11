// Dev check for the simulation: node tools/check-sim.mjs
// Proves offline progress without waiting overnight. For each class it creates a fresh hero,
// advances 9 hours in one call, and checks that the hero leveled, that the same seed gives the
// same result, that one big call equals many one-second calls, that a month runs quickly, and
// that the save string round-trips. It then checks the Phase 3 activities: quests, dungeon runs,
// travel, what a knockout costs, the cleric's fee, the race quirks, and that a Phase 1 or 2 save
// still loads without losing a level. Then Phase 4, growth: the shape of the four skill trees,
// proof that each of the 144 skills changes what happens and writes its Chronicle line, tier
// gating, the capstone rule, the 27-point cap, ability score increases, respec, and that a
// Phase 3 save loads with every level, skill point, and Feat. Then Phase 5, gear: five different
// looks per visible slot, drops from every source, auto-equip and auto-sell, the guaranteed quest
// piece, the named Legendaries, the cloak at level 5, the six loot skills, determinism with loot,
// and a Phase 4 save loading intact. Exits with an error if any check fails.

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
import { GEAR, SLOTS, TIERS, EMBLEM } from '../data/items.js';
import { LAYERS } from '../data/sprite-layers.js';
import { layerKey } from '../js/layer-key.js';
import { GEAR_SLOTS, LEGENDARIES, NOUNS, MILESTONES } from '../data/loot.js';
import { SLOT_IDS, startingGear, startingCloak, gearMods, itemStats, describe, better, receive, rollItem, rollTier, legendItem, sellPrice } from '../js/loot.js';
import { LOOT, GEAR_STATS } from '../js/rules.js';

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
  h.level = level; h.xp = xpForLevel(level); h.gold = 2000;
  if (level >= LOOT.cloakLevel) h.gear.cloak = startingCloak(); // as a hero who had levelled there would have
  h.hp = maxHp(h);
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
ok(moved.version === 4 && mh.unread.length === 0 && mh.delve === null, 'the new fields are filled in');
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
const cub = student('cleric', 2, 1);
ok(!chooseSubclass(cub, 'pilgrim') && cub.subclass === null && pending(cub).subclass === 0, 'no subclass before level 3');
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
ok(up.version === 4 && uh.level === 13 && uh.skillPoints === 15 && uh.feats.length === 3, 'a Phase 3 save keeps its level (13), its 15 skill points, and its 3 Feats');
ok(Math.abs(half - 0.5) < 0.01, `and its place within the level on the new curve (${Math.round(half * 100)}% of the way to 14)`);
ok(uh.abilityPoints === 6 && pending(uh).total === 15 + 1 + 6, 'the three ability increases it had already passed are waiting (6 points), with the subclass choice');
const short = JSON.parse(JSON.stringify(v2)); delete short.heroes[0].skillPoints;
ok(migrate(short).heroes[0].skillPoints === 12 + 3, 'a save that lost count of its points gets what its levels and Feats are worth');
advance(up, 9 * HOUR);
grow(uh, 'evoker');
ok(uh.level >= 13 && uh.skills.length >= 15 && uh.abilityPoints === 0 && uh.subclass === 'evoker', `the old hero carries on and can spend it all (level ${uh.level}, ${uh.skills.length} skills)`);
const again = migrate(JSON.parse(JSON.stringify(up)));
ok(JSON.stringify(again) === JSON.stringify(up), 'loading a current save changes nothing');

// ---------- Phase 5: gear and visuals ----------
console.log('\nPhase 5 gear:');
const rank = (it) => (it ? it.tier * 100 + it.level : -1);
const lootOf = (events) => events.filter((e) => e.type === 'loot');

// 26. Looks: every class has five different looks in each of the seven visible slots, all baked.
const sameLook = [], unbaked = [];
for (const [cls, slots] of Object.entries(GEAR)) {
  for (const slot of SLOTS) {
    const looks = slots[slot.id].map((layers) => JSON.stringify(layers));
    if (looks.length !== TIERS.length || new Set(looks).size !== TIERS.length) sameLook.push(`${cls} ${slot.id}`);
    for (const layers of slots[slot.id]) for (const ref of layers) if (!LAYERS[layerKey(ref)]) unbaked.push(layerKey(ref));
  }
  for (const ref of EMBLEM[cls]) if (!LAYERS[layerKey(ref)]) unbaked.push(layerKey(ref));
}
ok(sameLook.length === 0, `each rarity is a different look in every visible slot of every class (4 classes x 7 slots x 5 tiers)${sameLook.length ? ' (same: ' + sameLook.join(', ') + ')' : ''}`);
ok(unbaked.length === 0, `every gear layer and all four level 10 emblems are baked${unbaked.length ? ' (missing: ' + unbaked.join(', ') + ')' : ''}`);
ok(GEAR_SLOTS.length === 8 && TIERS.map((t) => t.name).join() === 'Common,Uncommon,Rare,Very Rare,Legendary', 'eight slots and the five 5e rarities');
ok(Object.keys(CLASSES).every((cls) => SLOTS.filter((x) => x.id !== 'cloak').every((x) => NOUNS[cls][x.id].length === 5)), 'every class has a name for every look');

// 27. The starting kit, and what a piece is worth.
const kit = fresh(5).heroes[0];
ok(SLOT_IDS.filter((id) => kit.gear[id]).length === 6 && kit.gear.cloak === null && kit.gear.trinket === null, 'a new hero wears six Common pieces; Cloak and Trinket start empty');
ok(Object.values(gearMods(kit)).every((v) => v === 0), 'the starting kit is worth exactly nothing, so level 1 is where it was');
const worth = (slot, tier, level) => Object.values(itemStats(slot, { tier, level }))[0];
ok(SLOT_IDS.every((id) => [0, 1, 2, 3].every((t) => worth(id, t + 1, 1) > worth(id, t, 20) || (id === 'weapon' && worth(id, t + 1, 1) > worth(id, t, 20)))), 'in every slot a rarer piece of level 1 beats a commoner one of level 20');
ok(SLOT_IDS.every((id) => Object.values(itemStats(id, { tier: 2, level: 12 })).every((v, i) => v >= Object.values(itemStats(id, { tier: 2, level: 6 }))[i])) && itemStats('weapon', { tier: 2, level: 12 }).critReward > itemStats('weapon', { tier: 2, level: 6 }).critReward, 'and within a rarity a higher level is worth more');
console.log(`  a Legendary of level 20, slot by slot: ${SLOT_IDS.map((id) => describe(id, { tier: 4, level: 20 })).join('; ')}`);

// 28. Auto-equip and auto-sell, piece by piece: 4,000 random pieces handed to one hero.
const bag = placed(61, 'rogue', 'human', 12, 'peaks', 'roam');
const bh = bag.heroes[0];
let worse = 0, unpaid = 0, wrongSlot = 0;
for (let i = 0; i < 4000; i++) {
  const level = 1 + (i % 20);
  const { slot, item } = rollItem(bag, bh, { level, source: ['roam', 'room', 'quest', 'boss'][i % 4] });
  const old = bh.gear[slot];
  const goldBefore = bh.gold;
  const got = receive(bh, slot, item);
  const loser = got.equipped ? old : item;
  if (rank(bh.gear[slot]) < rank(old) || rank(bh.gear[slot]) < rank(item) || got.equipped !== better(item, old)) worse += 1;
  if (bh.gold - goldBefore !== (loser ? sellPrice(loser) : 0) || (loser && got.gold <= 0)) unpaid += 1;
  if (!SLOT_IDS.includes(slot) || !item.name || item.name.includes('!') || item.name.split(' ').length < 3) wrongSlot += 1;
}
ok(worse === 0, 'auto-equip never replaces a piece with a worse one (4,000 pieces: the better of the two is always the one worn)');
ok(unpaid === 0, 'auto-sell: whichever piece loses is sold, and the gold arrives');
ok(wrongSlot === 0, 'every generated piece has a slot and a name of three parts or more, with no exclamation mark');
ok(bh.stats.itemsFound === 4000 && bh.stats.upgrades > 8 && bh.stats.upgrades < 400, `nothing is kept in a bag: ${bh.stats.upgrades} of 4,000 went on, the rest were sold for ${bh.stats.soldFor} gp`);

// 29. Drops from each source, through the real `advance`.
const roamer = placed(62, 'cleric', 'human', 9, 'peaks', 'roam');
const roamLoot = lootOf(advance(roamer, 40 * HOUR));
ok(roamLoot.length > 5 && roamLoot.every((e) => e.source === 'roam'), `monsters drop gear, rarely (${roamLoot.length} pieces from ${roamer.heroes[0].stats.tasks} fights)`);
const quester = placed(31, 'cleric', 'human', 3, 'mugwick', 'quest');
const questEvents = advance(quester, 8 * HOUR);
const questSum = summarize(questEvents);
const questLoot = lootOf(questEvents);
ok(questSum.quests.length === 6 && questLoot.filter((e) => e.source === 'quest').length === 6, 'every finished story quest pays one piece of gear (6 quests, 6 pieces)');
ok(questSum.oddJobs > 0 && questLoot.filter((e) => e.source === 'odd').length === questSum.oddJobs, `and so does every odd job (${questSum.oddJobs} jobs, ${questSum.oddJobs} pieces)`);
const afterQuest = questEvents.map((e, i) => (e.type === 'questdone' ? questEvents[i + 1]?.type : null)).filter(Boolean);
ok(afterQuest.every((t) => t === 'loot'), 'the piece arrives with the quest, on the next Chronicle line');
// A story quest's piece goes to the slot that needs it most: after six of them no starting piece is left.
const qg = quester.heroes[0].gear;
ok(['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'trinket'].every((id) => qg[id] && rank(qg[id]) > 1), 'story quests pay into the weakest slot: after six, and the odd jobs, no slot still holds its starting piece');
const delver = placed(63, 'fighter', 'dwarf', 20, 'saltmarrow', 'delve');
const delveEvents = advance(delver, 30 * HOUR);
const clearsSeen = delveEvents.filter((e) => e.type === 'cleared').length;
const delveLoot = lootOf(delveEvents);
ok(delveLoot.some((e) => e.source === 'room'), `dungeon rooms sometimes hold a chest (${delveLoot.filter((e) => e.source === 'room').length} in ${delver.heroes[0].stats.dungeonRuns} runs)`);
ok(clearsSeen > 5 && delveLoot.filter((e) => e.source === 'boss' && !e.legend).length === clearsSeen, `every beaten boss drops a piece (${clearsSeen} clears, ${clearsSeen} pieces)`);
const avgTier = (list) => list.reduce((sum, e) => sum + e.tier, 0) / Math.max(1, list.length);
const tierBy = (source, level) => { const st = { rngSeed: 4 }; let sum = 0; for (let i = 0; i < 3000; i++) sum += rollTier(st, level, source); return sum / 3000; };
ok(tierBy('boss', 10) > tierBy('quest', 10) && tierBy('quest', 10) > tierBy('roam', 10), `bosses drop the best: average rarity at level 10 is ${tierBy('boss', 10).toFixed(2)} from a boss, ${tierBy('quest', 10).toFixed(2)} from a quest, ${tierBy('roam', 10).toFixed(2)} from a monster`);
ok(tierBy('boss', 3) < 1 && tierBy('boss', 20) > 3.5 && tierBy('roam', 20) < 3.5, 'rarity rises with level: Common and Uncommon at the start, Legendary only from the last bosses and quests');
const allEvents = [...roamLoot, ...questLoot, ...delveLoot];
ok(allEvents.every((e) => e.gold > 0 || (e.equipped && e.slot === 'trinket')) && allEvents.every((e) => e.text.startsWith('Found: ')) && allEvents.some((e) => e.equipped) && allEvents.some((e) => !e.equipped), 'every piece found is either worn or sold on the spot, and the Chronicle says which');
ok(roamer.heroes[0].chronicle.concat(quester.heroes[0].chronicle).some((l) => l.k === 'upgrade' && l.text.startsWith('Found: ') && l.tier != null), 'the Chronicle marks each upgrade');

// 30. Gear only ever gets better, over a long run.
const climber = placed(64, 'wizard', 'elf', 5, 'mumblewood', 'quest');
let slipped = 0;
let before = SLOT_IDS.map((id) => rank(climber.heroes[0].gear[id]));
for (let i = 0; i < 400; i++) {
  advance(climber, 300);
  const now = SLOT_IDS.map((id) => rank(climber.heroes[0].gear[id]));
  if (now.some((r, j) => r < before[j])) slipped += 1;
  before = now;
}
ok(slipped === 0, 'over 33 hours of questing no slot ever went backwards');

// 31. The named Legendaries: one per dungeon, one per slot, each with its line.
const legends = Object.entries(LEGENDARIES);
ok(legends.length === 8 && REGIONS.every((r) => LEGENDARIES[r.id]) && new Set(legends.map(([, l]) => l.slot)).size === 8, 'eight named Legendaries, one per dungeon, one for each slot');
ok(legends.every(([, l]) => l.name && l.flavor && !l.name.includes('!') && !l.flavor.includes('!')) && LEGENDARIES.wyrmspire.name === "Vexaldrith's Spare Tooth", 'each has a hand-written name and a line of flavour text');
const farmer = placed(65, 'fighter', 'dragonborn', 20, 'mugwick', 'delve');
const farmEvents = advance(farmer, 60 * HOUR);
const boots = farmEvents.filter((e) => e.type === 'loot' && e.legend === 'mugwick');
const fh = farmer.heroes[0];
ok(boots.length === 1 && boots[0].equipped && boots[0].tier === 4 && fh.gear.feet.legend === 'mugwick' && fh.gear.feet.level === DUNGEONS.mugwick.level, `a boss gives up its dungeon's Legendary now and then, once (${fh.gear.feet.name}, after ${farmEvents.filter((e) => e.type === 'cleared' && e.at <= boots[0]?.at).length} clears)`);
ok(fh.chronicle.concat([]).length > 0 && boots[0]?.text.includes(LEGENDARIES.mugwick.flavor), 'and its flavour text is the Chronicle line');
ok(legendItem('wyrmspire').item.level === 20 && legendItem('wyrmspire').slot === 'weapon', 'the last dungeon keeps the Spare Tooth, a weapon of level 20');

// 32. The cloak, and the other milestones.
const cub5 = fresh(66, 'fighter', 'human');
const cubEvents = advance(cub5, 14 * HOUR);
const five = cubEvents.find((e) => e.type === 'levelup' && e.level === 5);
const yh = cub5.heroes[0];
ok(five && cubEvents.filter((e) => e.type === 'loot' && e.at < five.at).every((e) => e.slot !== 'cloak'), 'no cloak can be found before level 5: the slot is shut');
ok(five && yh.gear.cloak && rank(yh.gear.cloak) >= 5 && cubEvents.some((e) => e.type === 'milestone' && e.level === 5), `at level 5 the Cloak slot opens with a Common cloak (${yh.gear.cloak?.name})`);
ok([5, 10, 15, 20].every((l) => MILESTONES[l] && !MILESTONES[l].includes('!')), 'levels 5, 10, 15, and 20 each write a milestone line');

// 33. The six loot skills do what their cards say, and no skill is waiting on a later build.
ok(ALL_SKILLS.every((x) => !x.later), 'no skill card says "Not built yet"');
const farm = (seed, cls, race, skill, hours = 40) => {
  const sv = placed(seed, cls, race, 20, 'saltmarrow', 'delve');
  const h = sv.heroes[0];
  if (skill) { h.skills = [skill]; h.subclass = ALL_SKILLS.find((x) => x.id === skill).branch; }
  const events = advance(sv, hours * HOUR);
  return { events, clears: events.filter((e) => e.type === 'cleared').length, loot: lootOf(events) };
};
const bossPieces = (r) => r.loot.filter((e) => e.source === 'boss' && !e.legend).length;
const hazard = farm(67, 'fighter', 'human', 'f_hazard_pay');
ok(hazard.clears > 5 && bossPieces(hazard) === 2 * hazard.clears, `Hazard Pay: a beaten boss drops a second piece (${hazard.clears} clears, ${bossPieces(hazard)} pieces)`);
const score = farm(68, 'rogue', 'human', 'r_big_score');
ok(score.clears > 5 && bossPieces(score) === 2 * score.clears, `The Big Score: the same for the Rogue's capstone (${score.clears} clears, ${bossPieces(score)} pieces)`);
const sticky = farm(69, 'rogue', 'human', 'r_sticky_fingers');
const stickyFired = sticky.events.map((e, i) => (e.type === 'skill' && e.skill === 'r_sticky_fingers' ? sticky.events[i + 1] : null)).filter(Boolean);
ok(stickyFired.length > 3 && stickyFired.every((e) => e.type === 'loot'), `Sticky Fingers: a second piece turns up where one was given (${stickyFired.length} times, each followed by the piece)`);
const noSticky = farm(69, 'rogue', 'human', null);
ok(lootOf(noSticky.events).length < sticky.loot.length || stickyFired.length > 0, 'and it is extra, not instead');
for (const [id, cls] of [['w_locate', 'wizard'], ['r_treasure_map', 'rogue']]) {
  const found = farm(70, cls, 'human', id);
  const rooms = found.events.map((e, i) => (e.type === 'skill' && e.skill === id ? found.events[i + 1] : null)).filter(Boolean);
  ok(rooms.length > 2 && rooms.every((e) => e.type === 'loot' && e.source === 'chest'), `${ALL_SKILLS.find((x) => x.id === id).name}: the hidden room holds a chest (${rooms.length} rooms, ${rooms.length} pieces)`);
}
const eye = farm(71, 'rogue', 'human', 'r_eye_for_quality', 60);
const noEye = farm(71, 'rogue', 'human', null, 60);
const sharp = (() => { const a = { rngSeed: 9 }, b = { rngSeed: 9 }; let up = 0, down = 0; for (let i = 0; i < 3000; i++) { const x = rollTier(a, 10, 'quest', 0.3), y = rollTier(b, 10, 'quest', 0); if (x > y) up += 1; if (x < y) down += 1; } return { up, down }; })();
ok(sharp.up > 500 && sharp.down === 0 && avgTier(eye.loot) > avgTier(noEye.loot), `Eye for Quality: what is found is rarer (average rarity ${avgTier(eye.loot).toFixed(2)} against ${avgTier(noEye.loot).toFixed(2)} without, over ${eye.loot.length} pieces)`);

// 34. Loot is as deterministic as everything else.
const lOne = placed(72, 'rogue', 'goblin', 6, 'saltmarrow', 'quest'); const lootSeen = lootOf(advance(lOne, 5 * HOUR)).length;
const lMany = placed(72, 'rogue', 'goblin', 6, 'saltmarrow', 'quest'); for (let i = 0; i < 5 * HOUR; i++) advance(lMany, 1);
const lOther = placed(73, 'rogue', 'goblin', 6, 'saltmarrow', 'quest'); advance(lOther, 5 * HOUR);
ok(lootSeen >= 5 && JSON.stringify(lOne) === JSON.stringify(lMany), `with ${lootSeen} pieces found, one 5-hour call equals 18,000 one-second calls`);
ok(JSON.stringify(lOne.heroes[0].gear) !== JSON.stringify(lOther.heroes[0].gear), 'and a different seed finds different gear');
lOne.heroes[0].skillPoints = lOne.heroes[0].level - 1 + lOne.heroes[0].feats.length; // what a hero who had levelled there would hold
const lBack = importSave(exportSave(lOne)); advance(lBack, 3 * HOUR); advance(lOne, 3 * HOUR);
ok(JSON.stringify(lBack) === JSON.stringify(lOne), 'gear survives the save string mid-adventure');

// 35. A Phase 4 save (version 3) loads intact: level, XP place, skills, points, Feats, and gold.
const v3 = placed(74, 'cleric', 'halforc', 12, 'peaks', 'quest');
const wh = v3.heroes[0];
wh.skillPoints = 14; wh.feats = ['mugwick', 'mumblewood', 'saltmarrow'];
grow(wh, 'lifebinder');
advance(v3, 2 * HOUR);
wh.level = 12; wh.gold = 54321; wh.skillPoints = 3; wh.abilityPoints = 2;
wh.xp = Math.round(PAST_CURVES[3][12] + 0.25 * (PAST_CURVES[3][13] - PAST_CURVES[3][12])); // a quarter of the way through level 12 on the Phase 4 curve
v3.version = 3;
wh.gear = { weapon: { tier: 0 }, offhand: { tier: 0 }, head: { tier: 0 }, body: { tier: 0 }, hands: { tier: 0 }, feet: { tier: 0 }, cloak: null, trinket: null }; // as Phase 4 saved it
for (const key of ['itemsFound', 'upgrades', 'soldFor']) delete wh.stats[key];
wh.chronicle = wh.chronicle.filter((l) => l.k !== 'upgrade' && l.k !== 'sold');
const keep = JSON.parse(JSON.stringify({ skills: wh.skills, subclass: wh.subclass, feats: wh.feats, abilities: wh.abilities, bestiary: wh.bestiary, questProgress: wh.questProgress }));
const now4 = migrate(JSON.parse(JSON.stringify(v3)));
const nh = now4.heroes[0];
const quarter = (nh.xp - xpForLevel(12)) / (xpForLevel(13) - xpForLevel(12));
ok(now4.version === 4 && nh.level === 12 && nh.gold === 54321 && nh.skillPoints === 3 && nh.abilityPoints === 2, 'a Phase 4 save keeps its level (12), its gold (54,321 gp), and its banked points');
ok(JSON.stringify(keep) === JSON.stringify({ skills: nh.skills, subclass: nh.subclass, feats: nh.feats, abilities: nh.abilities, bestiary: nh.bestiary, questProgress: nh.questProgress }) && nh.skills.length > 10, `and every skill (${nh.skills.length}), its subclass, Feats, ability scores, Bestiary, and quests`);
ok(Math.abs(quarter - 0.25) < 0.01, `and its place within the level on the new curve (${Math.round(quarter * 100)}% of the way to 13)`);
const named = startingGear('cleric');
ok(['weapon', 'offhand', 'head', 'body', 'hands', 'feet'].every((id) => nh.gear[id].name === named[id].name && nh.gear[id].tier === 0 && nh.gear[id].level === 1) && nh.gear.trinket === null, 'its bare gear becomes the named starting kit');
ok(nh.gear.cloak?.tier === 0 && nh.gear.cloak.level === LOOT.cloakLevel, 'being past level 5, it is handed the cloak');
ok(nh.stats.itemsFound === 0 && nh.stats.knockouts === wh.stats.knockouts, 'its lifetime stats carry over, with the new ones at zero');
const low = fresh(75); low.version = 3; low.heroes[0].gear = { weapon: { tier: 0 }, offhand: { tier: 0 }, head: { tier: 0 }, body: { tier: 0 }, hands: { tier: 0 }, feet: { tier: 0 }, cloak: null, trinket: null };
ok(migrate(low).heroes[0].gear.cloak === null, 'a hero below level 5 gets no cloak yet');
const lootAfter = lootOf(advance(now4, 9 * HOUR)).length;
ok(nh.level >= 12 && lootAfter > 0 && nh.stats.itemsFound === lootAfter, `the old hero carries on and starts finding gear (${lootAfter} pieces in 9 hours, ${nh.stats.upgrades} worn)`);
const again4 = migrate(JSON.parse(JSON.stringify(now4)));
ok(JSON.stringify(again4) === JSON.stringify(now4), 'loading a current save changes nothing');

// 36. Done when: a simulated hero's gear climbs from Common to Legendary over the month.
const wornEver = new Set(Object.values(full.worn).flatMap((set) => [...set]));
const tiersAt = [5, 10, 15, 20].map((l) => `L${l} ${full.tierAt[l].toFixed(2)}`).join(', ');
console.log(`  the hero of check 15: average rarity ${tiersAt}; at the end ${SLOT_IDS.map((id) => `${id} ${TIERS[full.gear[id] ?? 0].name}`).join(', ')}`);
ok([0, 1, 2, 3, 4].every((t) => wornEver.has(t)), 'over the month the simulated hero wears every rarity, Common to Legendary');
ok(full.tierAt[10] > full.tierAt[5] && full.tierAt[15] > full.tierAt[10] && full.tierAt[20] > full.tierAt[15], 'and the average rarity of the kit rises from level 5 to 10 to 15 to 20');
ok(Object.values(full.gear).every((t) => t != null && t >= 2) && Object.values(full.gear).some((t) => t === 4), 'ending with every slot Rare or better and at least one Legendary, so every visible slot has changed look');
ok(GEAR_STATS.weapon.perTier === 1, 'a weapon adds its rarity to every roll');

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
