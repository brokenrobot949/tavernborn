// Dev check for the simulation: node tools/check-sim.mjs
// Proves offline progress without waiting overnight. For each class it creates a fresh hero,
// advances 9 hours in one call, and checks that the hero leveled, that the same seed gives the
// same result, that one big call equals many one-second calls, that a month runs quickly, and
// that the save string round-trips. It then checks the Phase 3 activities: quests, dungeon runs,
// travel, what a knockout costs, the cleric's fee, the race quirks, and that a Phase 1 or 2 save
// still loads without losing a level. Then Phase 4, growth: the shape of the six skill trees,
// proof that each of the 216 skills changes what happens and writes its Chronicle line, tier
// gating, the capstone rule, the 27-point cap, ability score increases, respec, and that a
// Phase 3 save loads with every level, skill point, and Feat. Then Phase 5, gear: five different
// looks per visible slot, drops from every source, auto-equip and auto-sell, the guaranteed quest
// piece, the named Legendaries, the cloak at level 5, the six loot skills, determinism with loot,
// and a Phase 4 save loading intact. Then Phase 6, the tavern and legacy: each upgrade's price and
// effect, upgrades shared across heroes, the trophy wall, the roster of three, retirement (only at
// level 20, freeing the slot, keeping the portrait look and record), the legacy bonus on a new
// hero's XP and its 10% cap, the Planar Rifts and Paragon ranks, determinism, and a Phase 5 save
// loading intact. Then Phase 7: every line of game text against the Humor and voice rules
// (tools/check-text.mjs), which sound plays for what, the tavern tune, the default sound settings,
// and the credits data. Then round five: rare monsters and mastery, lesser delves, story quests by
// level, the regular, happenings and their errands, and the notice board. Then after round five: the career
// kept for the charts, the smith, mentors, the Rifts' rules, and Paragon keepsakes. Exits with an error if any check fails.

import { advance, summarize } from '../js/sim.js';
import { newSave, exportSave, importSave, migrate, SAVE_VERSION } from '../js/state.js';
import { createHero, assignScores, defaultAppearance, maxHp, regionOpen, raiseAbility, abilityPointsBy, STANDARD_ARRAY, chronicle, isHighlight, KEPT_MAX } from '../js/hero.js';
import {
  TREES, ALL_SKILLS, FX_KEYS, SIG_TYPES, MAX_SKILLS, canLearn, whyNot, learnSkill, chooseSubclass, respec, respecCost, pending,
} from '../js/skills.js';
import { setFocus, orderTravel, payCleric, clericFee, orderDelve, delveTarget, storyReady, storyOpensAt, foeName } from '../js/tasks.js';
import { RARES, RARE_LIST } from '../data/rares.js';
import { SITES, SITE_LIST, SITE_BY_ID } from '../data/sites.js';
import { BOUNTIES, REGULARS, HAPPENINGS, HAPPENING_EFFECT } from '../data/board.js';
import { MASTERY, masteryRank } from '../js/rules.js';
import { happeningsOn, conditionHolds, timeOfDay } from '../js/world.js';
import { postingsOn, takeBounty, canTake, bountyReward } from '../js/board.js';
import { DEEDS } from '../data/deeds.js';
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
import { LOOT, GEAR_STATS, gearPower } from '../js/rules.js';
import { TAVERN, MAX_HEROES, PARAGON_XP, TRAVEL_SECONDS_PER_REGION, legacyFor, paragonRankFor, paragonXpFor } from '../js/rules.js';
import {
  UPGRADE_IDS, buyUpgrade, upgradeRank, upgradePrice, maxRank, tavernMods, trophyWall, recordTrophy, canRecruit, switchHero,
  dismissHero, retire, canRetire, portraitOf, paragonRank, paragonTitle,
  displayLegend,
} from '../js/tavern.js';
import { activeHero } from '../js/hero.js';
import { nextTask } from '../js/tasks.js';
import { heroLook } from '../js/sprite.js';
import { MONSTER_BY_ID } from '../data/monsters.js';
import { reforge, enchant, SMITH, enchantPrice } from '../js/smith.js';
import { goldUnit, MENTOR } from '../js/rules.js';
import { chooseMentor, mentorRescue, tavernParagon, unlockedAt, chooseWisp, signOpen } from '../js/tavern.js';
import { riftRuleOn, RIFT_RULES } from '../js/rifts.js';
import { WISP_CHOICES, SIGN } from '../data/tavern.js';
const num = (n) => Math.round(n).toLocaleString('en-US');

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
{
  // Highlights are trimmed last: after a busy stretch the level-ups are still there, up to KEPT_MAX.
  const h = fresh(77).heroes[0];
  h.chronicle = []; h.lines = 0;
  for (let i = 0; i < 100; i++) chronicle(h, 'levelup', `Level ${i}.`);
  for (let i = 0; i < 500; i++) chronicle(h, 'hit', `Hit ${i}.`);
  const kept = h.chronicle.filter(isHighlight);
  ok(h.chronicle.length === 200 && kept.length === KEPT_MAX && kept.at(-1).text === 'Level 99.' && h.chronicle.at(-1).text === 'Hit 499.',
    `the Chronicle keeps the newest ${KEPT_MAX} highlights through 500 ordinary lines, and still at most 200 lines`);
  ok(h.chronicle.every((l, i) => i === 0 || l.n > h.chronicle[i - 1].n), 'the Chronicle stays in the order it was written');
}

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
ok(moved.version === SAVE_VERSION && mh.unread.length === 0 && mh.delve === null, 'the new fields are filled in');
advance(moved, 9 * HOUR);
ok(mh.level >= 9 && mh.stats.tasks > 0, `an old save carries on (level ${mh.level} after 9 more hours)`);
const top = fresh(98); top.version = 1; top.heroes[0].level = MAX_LEVEL; top.heroes[0].xp = 100;
ok(migrate(top).heroes[0].level === MAX_LEVEL && top.heroes[0].xp >= xpForLevel(MAX_LEVEL), 'a level 20 hero stays level 20');

// 15. The whole road, played by the simulator's stand-in player: travel, quests, dungeons.
const t1 = performance.now();
// (Seed base 2 since round four: choices on the road draw from the same dice, which moved the old
// seed's hero to an all Very Rare finish, one of the 1 in 70 or so that end without a Legendary.)
const full = runHero(heroPlan(7, 2));
console.log(`  one hero up the whole road in ${(performance.now() - t1).toFixed(0)} ms: level ${full.level} after ${(full.age / 86400).toFixed(1)} days, ${full.knockouts} knockouts, ${full.quests} story quests, ${full.runs} dungeon runs`);
ok(REGIONS.every((r) => full.clears[r.id]), 'a simulated hero clears all eight dungeons, Wyrmspire included');
ok(full.level === MAX_LEVEL, 'and reaches level 20');

// ---------- Phase 4: growth ----------
console.log('\nPhase 4 growth:');

// 17. The shape of the trees: six classes, three branches of twelve, one capstone each.
const branches = Object.values(TREES).flatMap((t) => t.branches);
ok(Object.keys(TREES).length === 6 && branches.length === 18 && branches.every((b) => b.skills.length === 12) && ALL_SKILLS.length === 216, 'six trees, three branches of twelve skills each: 216 skills, every id unique');
ok(Object.values(TREES).every((t) => ['might', 'guard', 'fortune'].every((k) => t.branches.filter((b) => b.kind === k).length === 1)), 'every class has one Might, one Guard, and one Fortune branch');
ok(ALL_SKILLS.filter((x) => x.capstone).length === 18 && ALL_SKILLS.filter((x) => x.capstone).every((x) => x.tier === 4), 'eighteen capstones, each the last skill of its branch');
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

// 18. Every skill does something. For each of the 216: one hero has only that skill, a twin has
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
ok(noEffect.length === 0, `each of the 216 skills changes what happens to the hero${noEffect.length ? ' (no effect: ' + noEffect.join(', ') + ')' : ''}`);
ok(noLine.length === 0, `each of the ${moves.length} signature moves fires and writes its own Chronicle line (${firedTotal} firings seen)${noLine.length ? ' (never fired: ' + noLine.join(', ') + ')' : ''}`);

// A hero with points to spend, for the rules of the tree.
function student(cls, level, points) {
  const save = placed(51, cls, 'human', level, 'mugwick', 'roam');
  const h = save.heroes[0];
  h.skillPoints = points;
  return h;
}
// Learning writes the skill's own line, for all 216.
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
ok(learnedLines === 216, `learning a skill costs one point and writes that skill's Chronicle line (${learnedLines} of 216)`);

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
ok(up.version === SAVE_VERSION && uh.level === 13 && uh.skillPoints === 15 && uh.feats.length === 3, 'a Phase 3 save keeps its level (13), its 15 skill points, and its 3 Feats');
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
const rank = (it) => gearPower(it);
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
ok(sameLook.length === 0, `each rarity is a different look in every visible slot of every class (6 classes x 7 slots x 5 tiers)${sameLook.length ? ' (same: ' + sameLook.join(', ') + ')' : ''}`);
ok(unbaked.length === 0, `every gear layer and all six level 10 emblems are baked${unbaked.length ? ' (missing: ' + unbaked.join(', ') + ')' : ''}`);
ok(GEAR_SLOTS.length === 8 && TIERS.map((t) => t.name).join() === 'Common,Uncommon,Rare,Very Rare,Legendary', 'eight slots and the five 5e rarities');
ok(Object.keys(CLASSES).every((cls) => SLOTS.filter((x) => x.id !== 'cloak').every((x) => NOUNS[cls][x.id].length === 5)), 'every class has a name for every look');

// 27. The starting kit, and what a piece is worth.
const kit = fresh(5).heroes[0];
ok(SLOT_IDS.filter((id) => kit.gear[id]).length === 6 && kit.gear.cloak === null && kit.gear.trinket === null, 'a new hero wears six Common pieces; Cloak and Trinket start empty');
ok(Object.values(gearMods(kit)).every((v) => v === 0), 'the starting kit is worth exactly nothing, so level 1 is where it was');
const worth = (slot, tier, level) => Object.values(itemStats(slot, { tier, level }))[0];
// Seven levels are worth one rarity step: a piece one rarity lower and eight levels higher wins,
// six levels higher does not.
const steps = [];
for (let t = 0; t < 4; t++) for (let l = 1; l <= 12; l++) steps.push([t, l]);
ok(steps.every(([t, l]) => better({ tier: t, level: l + 8 }, { tier: t + 1, level: l }) && !better({ tier: t, level: l + 6 }, { tier: t + 1, level: l })),
  'a piece one rarity lower wins at eight levels higher and loses at six: seven levels are worth one rarity step');
ok(SLOT_IDS.every((id) => steps.every(([t, l]) => worth(id, t, l + 8) >= worth(id, t + 1, l) && worth(id, t + 1, l + 1) >= worth(id, t + 1, l))),
  'and in every slot the better piece is worth at least as much, and a level more is never worth less');
ok(better({ tier: 3, level: 11 }, { tier: 4, level: 3, legend: 'mugwick' }) && !better({ tier: 3, level: 10 }, { tier: 4, level: 3, legend: 'mugwick' }),
  'the Boots of Office (Legendary, level 3) give way to a Very Rare of level 11, not 10');
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

// 28b. The glass case: a named Legendary that loses its place is kept, not sold.
{
  const cs = placed(62, 'fighter', 'human', 12, 'peaks', 'roam');
  const ch = cs.heroes[0];
  ch.gear.feet = legendItem('mugwick').item; // the Boots of Office, level 3
  const gold0 = ch.gold;
  const swap = receive(ch, 'feet', { tier: 3, level: 12, name: 'Test Boots of the Later Road' });
  const placedIn = swap.kept ? displayLegend(cs, ch, swap.kept) : false;
  ok(swap.equipped && swap.kept?.legend === 'mugwick' && swap.gold === 0 && ch.gold === gold0 && placedIn && cs.tavern.relics.length === 1,
    'a Very Rare of level 12 replaces the Boots of Office, which go into the glass case unsold');
  const again = receive(ch, 'feet', legendItem('mugwick').item);
  ok(!again.equipped && again.kept?.legend === 'mugwick' && !displayLegend(cs, ch, again.kept) && cs.tavern.relics.length === 1,
    'a second copy, no better than the one in the case, is not shelved twice (the game sells it)');
  ok(displayLegend(cs, ch, legendItem('mugwick', 20).item) && cs.tavern.relics[0].level === 20 && cs.tavern.relics.length === 1,
    'a higher-level copy takes its place in the case');
  const back = importSave(exportSave(cs));
  ok(back.tavern.relics.length === 1 && back.tavern.relics[0].legend === 'mugwick' && back.tavern.relics[0].hero === ch.name, 'the glass case travels in the save string');
}

// 29. Drops from each source, through the real `advance`.
const roamer = placed(62, 'cleric', 'human', 9, 'peaks', 'roam');
const roamLoot = lootOf(advance(roamer, 40 * HOUR));
const fromCommon = roamLoot.filter((e) => e.source === 'roam');
ok(fromCommon.length > 5 && fromCommon.length < 0.03 * roamer.heroes[0].stats.tasks && roamLoot.every((e) => ['roam', 'rare', 'elusive'].includes(e.source)), `monsters drop gear, rarely (${fromCommon.length} pieces from ${roamer.heroes[0].stats.tasks} fights, and ${roamLoot.length - fromCommon.length} more from rare ones)`);
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
const clericKit = startingGear('cleric');
ok(['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'trinket'].every((id) => qg[id] && qg[id].name !== clericKit[id]?.name), 'story quests pay into the weakest slot: after six, and the odd jobs, no slot still holds its starting piece');
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
ok(five && yh.gear.cloak && cubEvents.some((e) => e.type === 'milestone' && e.level === 5), `at level 5 the Cloak slot opens with a Common cloak (${yh.gear.cloak?.name})`);
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
ok(now4.version === SAVE_VERSION && nh.level === 12 && nh.gold === 54321 && nh.skillPoints === 3 && nh.abilityPoints === 2, 'a Phase 4 save keeps its level (12), its gold (54,321 gp), and its banked points');
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
ok(itemStats('weapon', { tier: 4, level: 20 }).roll === 4 && steps.every(([t, l]) => Number.isInteger(itemStats('weapon', { tier: t, level: l }).roll ?? 0)),
  'a weapon adds a whole number to every roll: +4 for a Legendary of level 20');

// ---------- Phase 6: the tavern and legacy ----------
{ // its own scope, so its names do not collide with the checks above
  console.log('\nPhase 6 tavern and legacy:');
  const firstOf = (events, type, pred = () => true) => events.find((e) => e.type === type && pred(e));

  // 37. Upgrade prices: four upgrades, each rank dearer than the last, and a real sink for gold.
  const allPrices = UPGRADE_IDS.flatMap((id) => TAVERN[id].price);
  ok(UPGRADE_IDS.join() === 'room,stable,notice,trophies' && UPGRADE_IDS.every((id) => TAVERN[id].price.every((p, i, a) => i === 0 || p > a[i - 1])), 'four upgrades (room, stable, notice board, trophy wall), every rank dearer than the one before');
  const totalPrice = allPrices.reduce((x, y) => x + y, 0);
  ok(totalPrice > 2000000 && TAVERN.room.price.at(-1) >= 500000, `buying everything costs ${num(totalPrice)} gp, more than one hero's whole career earns (about 1.6 million)`);
  const shopSave = fresh(81);
  const sh = shopSave.heroes[0];
  sh.gold = TAVERN.room.price[0] - 1;
  ok(buyUpgrade(shopSave, sh, 'room') === null && upgradeRank(shopSave, 'room') === 0 && sh.gold === TAVERN.room.price[0] - 1, 'an upgrade cannot be bought one gold piece short, and nothing is taken');
  sh.gold = 10000000;
  const lines0 = sh.lines;
  ok(buyUpgrade(shopSave, sh, 'room') === TAVERN.room.price[0] && upgradeRank(shopSave, 'room') === 1 && sh.gold === 10000000 - TAVERN.room.price[0] && sh.lines === lines0 + 1 && sh.chronicle.at(-1).k === 'tavern', 'buying pays the exact price, adds a rank, and writes a Chronicle line');
  for (const id of UPGRADE_IDS) while (upgradePrice(shopSave, id) != null) buyUpgrade(shopSave, sh, id);
  ok(UPGRADE_IDS.every((id) => upgradeRank(shopSave, id) === maxRank(id) && buyUpgrade(shopSave, sh, id) === null), 'every upgrade stops at its last rank');
  ok(sh.gold === 10000000 - totalPrice, `and the purse is down by exactly the total (${num(totalPrice)} gp)`);
  ok(buyUpgrade(shopSave, sh, 'jacuzzi') === null, 'an upgrade that does not exist cannot be bought');

  // 38. The room: knockout recovery 8% quicker per rank, added to boots and skills, 60% off at most.
  const koSeconds = (setup) => {
    const s = placed(33, 'wizard', 'elf', 4, 'gloamfen', 'delve');
    setup(s);
    for (let i = 0; i < 400; i++) { const e = firstOf(advance(s, 60), 'knockout'); if (e) return e.seconds; }
    return null;
  };
  const koBase = koSeconds(() => {});
  const koRoom = koSeconds((s) => { s.tavern.upgrades.room = 5; });
  const koCapped = koSeconds((s) => { s.tavern.upgrades.room = 5; s.heroes[0].gear.feet = { tier: 4, level: 20, name: 'Test Boots' }; });
  ok(koBase && Math.abs(koRoom / koBase - 0.6) < 0.01, `the best room (rank 5) cuts recovery by 40% (${fmt(koBase)} to ${fmt(koRoom)})`);
  ok(Math.abs(koCapped / koBase - 0.4) < 0.01, `with Legendary boots on top it stops at 60% off (${fmt(koCapped)})`);

  // 39. The stable: travel 8% quicker per rank, added to boots.
  const travelSecs = (rank) => {
    const s = placed(82, 'fighter', 'human', 9, 'peaks', 'roam');
    s.tavern.upgrades.stable = rank;
    const h = s.heroes[0];
    h.currentTask = null;
    orderTravel(h, 'mugwick');
    return nextTask(s, h).duration;
  };
  ok(travelSecs(0) === 3 * TRAVEL_SECONDS_PER_REGION && travelSecs(5) === Math.round(3 * TRAVEL_SECONDS_PER_REGION * 0.6) && travelSecs(2) < travelSecs(0), `a stable shortens the road (three regions: ${fmt(travelSecs(0))}, ${fmt(travelSecs(2))} at rank 2, ${fmt(travelSecs(5))} at rank 5)`);

  // 40. The notice board: odd jobs pay 10% more XP and gold per rank, and their gear is rarer.
  const oddJob = (rank) => {
    const s = placed(83, 'cleric', 'human', 10, 'mugwick', 'quest');
    s.heroes[0].questProgress.mugwick = { done: 6, step: 0, started: false, odd: 0, job: null };
    s.tavern.upgrades.notice = rank;
    return firstOf(advance(s, 2 * HOUR), 'questdone', (e) => !e.story && !e.errand);
  };
  const job0 = oddJob(0), job5 = oddJob(5);
  ok(job0 && job5 && Math.abs(job5.xp / job0.xp - 1.5) < 0.02 && Math.abs(job5.gold / job0.gold - 1.5) < 0.02, `the best notice board (rank 5) makes an odd job pay half as much again (${job0.xp} XP and ${job0.gold} gp, then ${job5.xp} XP and ${job5.gold} gp)`);
  const storyJob = (rank) => { const s = placed(84, 'cleric', 'human', 3, 'mugwick', 'quest'); s.tavern.upgrades.notice = rank; return firstOf(advance(s, 3 * HOUR), 'questdone'); };
  ok(storyJob(0).xp === storyJob(5).xp && storyJob(0).gold === storyJob(5).gold, 'and story quests pay what they always did');
  const oddTiers = (rank) => {
    const s = fresh(85, 'rogue');
    s.tavern.upgrades.notice = rank;
    let sum = 0;
    for (let i = 0; i < 2000; i++) sum += rollTier(s, 12, 'odd', tavernMods(s).oddQuality);
    return sum / 2000;
  };
  ok(oddTiers(5) - oddTiers(0) > 0.4, `an odd job's gear is about half a rarity step better at rank 5 (level 12: ${oddTiers(0).toFixed(2)} to ${oddTiers(5).toFixed(2)})`);

  // 41. The trophy wall: a trophy for each dungeon's first clear by any hero; it hangs if there is a hook.
  const tw = placed(86, 'fighter', 'dwarf', 4, 'mugwick', 'delve');
  const twEvents = advance(tw, 12 * HOUR);
  const firstTrophy = firstOf(twEvents, 'trophy');
  ok(firstTrophy?.region === 'mugwick' && tw.tavern.trophies.join() === 'mugwick' && twEvents.filter((e) => e.type === 'trophy').length === 1, 'the first clear of a dungeon wins its trophy, once');
  ok(trophyWall(tw).hooks === 0 && trophyWall(tw).waiting.length === 1 && firstTrophy.text.includes('behind the bar'), 'with no hooks bought it waits behind the bar');
  tw.heroes[0].gold = 100000;
  buyUpgrade(tw, tw.heroes[0], 'trophies');
  ok(trophyWall(tw).hung.join() === 'mugwick' && trophyWall(tw).hooks === 3, 'and goes up when the wall is built');
  const recordedTwice = recordTrophy(tw, 'mugwick');
  ok(!recordedTwice && tw.tavern.trophies.length === 1, 'a later clear, by this hero or another, wins nothing more');
  const twRolls = (rank) => { const s = placed(87, 'rogue', 'human', 6, 'saltmarrow', 'roam'); s.tavern.upgrades.trophies = rank; advance(s, 6 * HOUR); return JSON.stringify(s.heroes[0]); };
  ok(twRolls(0) === twRolls(3), 'the trophy wall changes nothing else at all');

  // 42. The roster: three heroes, one active, the others wait exactly as they were.
  const ro = fresh(88, 'fighter', 'human');
  const newHero = (s, cls, race) => createHero(s, { name: 'Recruit', race, cls, appearance: defaultAppearance(race), baseScores: assignScores(cls, STANDARD_ARRAY) });
  advance(ro, 2 * HOUR);
  const first = ro.heroes[0];
  ok(canRecruit(ro), 'with one hero there is room for another');
  const second = newHero(ro, 'wizard', 'elf'); ro.heroes.push(second);
  const third = newHero(ro, 'rogue', 'goblin'); ro.heroes.push(third);
  ok(!canRecruit(ro) && MAX_HEROES === 3, 'three heroes fill the roster');
  ok(new Set(ro.heroes.map((h) => h.id)).size === 3, 'and each has their own id');
  ok(switchHero(ro, second.id) && activeHero(ro) === second && !switchHero(ro, 'nobody') && activeHero(ro) === second, 'switching makes another hero the active one (and an unknown id changes nothing)');
  const asWas = (h) => JSON.stringify({ ...h, rested: 0 });
  const waitingBefore = asWas(first);
  advance(ro, 3 * HOUR);
  ok(asWas(first) === waitingBefore && second.age === 3 * HOUR && third.age === 0, 'only the active hero moves; the others wait exactly as they were (but for Well Rested)');
  switchHero(ro, first.id);
  advance(ro, HOUR);
  ok(first.age === 3 * HOUR && second.age === 3 * HOUR, 'a hero sent out again picks up where they left off');
  ok(dismissHero(ro, third.id) && ro.heroes.length === 2 && canRecruit(ro) && activeHero(ro) === first, 'dismissing a hero frees the slot');
  ok(dismissHero(ro, first.id) && activeHero(ro) === second, 'dismissing the active hero sends the next one out');
  const tooMany = fresh(89); tooMany.heroes.push(newHero(tooMany, 'wizard', 'elf'), newHero(tooMany, 'rogue', 'elf'), newHero(tooMany, 'cleric', 'elf'));
  let refused = false;
  try { migrate(JSON.parse(JSON.stringify(tooMany))); } catch { refused = true; }
  ok(refused, 'a save with four heroes is refused rather than loaded');

  // 43. Upgrades are shared: bought by one hero, they work for every hero.
  const sharedKo = (buy) => {
    const s = placed(33, 'wizard', 'elf', 4, 'gloamfen', 'delve');
    const buyer = newHero(s, 'fighter', 'human'); buyer.gold = 1000000; s.heroes.push(buyer);
    switchHero(s, buyer.id);
    if (buy) for (let i = 0; i < 5; i++) buyUpgrade(s, buyer, 'room');
    switchHero(s, s.heroes[0].id);
    const goldBefore = s.heroes[0].gold;
    let e = null;
    for (let i = 0; i < 400 && !e; i++) e = firstOf(advance(s, 60), 'knockout');
    return { seconds: e?.seconds, rank: upgradeRank(s, 'room'), paid: 1000000 - buyer.gold, goldBefore };
  };
  const notBought = sharedKo(false), bought = sharedKo(true);
  ok(bought.rank === 5 && Math.abs(bought.seconds / notBought.seconds - 0.6) < 0.01, `a room bought with one hero's gold shortens another hero's recovery (${fmt(notBought.seconds)} to ${fmt(bought.seconds)})`);
  ok(bought.paid === TAVERN.room.price.reduce((x, y) => x + y, 0) && bought.goldBefore === 2000, 'and only the buyer paid');

  // 44. Retirement: only at level 20; frees the slot; keeps the portrait look and the record.
  const rt = placed(90, 'cleric', 'dwarf', 19, 'wyrmspire', 'roam');
  const rh = rt.heroes[0];
  const waitingHero = newHero(rt, 'rogue', 'human'); rt.heroes.push(waitingHero);
  advance(rt, 2 * HOUR);
  ok(!canRetire(rh) && retire(rt, rh.id) === null && rt.heroes.length === 2, 'a level 19 hero cannot retire');
  rh.level = MAX_LEVEL; rh.xp = xpForLevel(MAX_LEVEL);
  rh.gear.weapon = { tier: 4, level: 18, name: 'Mace of the Test' }; rh.gear.trinket = { tier: 4, level: 20, name: 'The Third Seal', legend: 'cinder' };
  rh.stats.mostEmbarrassingDefeat = 'goose'; rh.stats.knockouts = 7;
  const lookThen = JSON.stringify(heroLook(portraitOf(rh)));
  const statsThen = JSON.stringify(rh.stats);
  const legend = retire(rt, rh.id);
  ok(!!legend && rt.tavern.legends.length === 1 && !rt.heroes.includes(rh) && rt.heroes.length === 1 && canRecruit(rt), 'a level 20 hero retires: into the Hall, and the slot is free');
  ok(activeHero(rt) === waitingHero, 'the hero waiting at the tavern is sent out in their place');
  ok(JSON.stringify(heroLook(legend.look)) === lookThen && legend.look.fx?.glow && legend.look.emblem && Object.keys(legend.look.tiers).length >= 7, 'the portrait keeps the look data, and it redraws exactly as the sprite was: gear, emblem, wisp, and glow');
  ok(legend.name === rh.name && legend.class === 'cleric' && legend.race === 'dwarf' && legend.level === MAX_LEVEL && JSON.stringify(legend.stats) === statsThen, 'the record keeps the name, class, and lifetime stats');
  ok(legend.worst === MONSTER_BY_ID.goose.name && legend.stats.knockouts === 7 && legend.best?.name === 'The Third Seal' && legend.line.length > 10, `and the knockout tally, the Most Embarrassing Defeat (${legend.worst}), the best item, and a one-line legend: "${legend.line}"`);
  ok(rh.chronicle.at(-1).text.includes('Hall of Legends'), 'retiring writes the hero\'s last Chronicle line');
  ok(retire(rt, rh.id) === null && rt.tavern.legends.length === 1, 'a hero cannot retire twice');
  ok(Math.abs(rt.tavern.legacyBonus - 0.02) < 1e-9, 'one legend: +2% XP for every hero');

  // 45. Done when: a hero can retire and a new one gets the bonus.
  const career = (legends) => {
    const s = fresh(91, 'fighter', 'human');
    s.heroes = [];
    s.activeHeroId = null;
    for (let i = 0; i < legends; i++) {
      const old = newHero(s, 'wizard', 'elf'); old.level = MAX_LEVEL; old.xp = xpForLevel(MAX_LEVEL); s.heroes.push(old); retire(s, old.id);
    }
    const h = newHero(s, 'fighter', 'human');
    s.heroes.push(h); s.activeHeroId = h.id;
    return s;
  };
  const plainCareer = career(0), oneLegend = career(1);
  plainCareer.rngSeed = oneLegend.rngSeed = 4242; // the same dice from here on
  const qStep = (s) => { s.heroes[0].level = 3; s.heroes[0].xp = xpForLevel(3); s.heroes[0].hp = maxHp(s.heroes[0]); setFocus(s.heroes[0], 'quest'); return firstOf(advance(s, HOUR), 'task', (e) => e.source === 'quest').xp; };
  const xpPlain = qStep(plainCareer), xpLegend = qStep(oneLegend);
  ok(oneLegend.tavern.legends.length === 1 && Math.abs(xpLegend / xpPlain - 1.07 / 1.05) < 0.006, `a new hero after one retirement earns 2% more XP (a human's quest step: ${xpPlain} XP, then ${xpLegend})`);
  ok(legacyFor(0) === 0 && legacyFor(3) === 0.06 && legacyFor(5) === 0.1 && legacyFor(9) === 0.1, 'the bonus is 2% a legend: 6% for three, 10% for five, and no more after that');
  const six = career(6);
  ok(six.tavern.legends.length === 6 && six.tavern.legacyBonus === 0.1, 'six legends in the Hall still give 10%');

  // 46. Planar Rifts and Paragon ranks.
  for (let r = 0; r <= 30; r++) if (paragonRankFor(paragonXpFor(r)) !== r || (r > 0 && paragonRankFor(paragonXpFor(r) - 1) !== r - 1)) failed += 1;
  ok(paragonRankFor(-5) === 0 && paragonRankFor(PARAGON_XP) === 1 && paragonRankFor(3 * PARAGON_XP) === 2, `Paragon ranks need ${num(PARAGON_XP)} XP past level 20 for the first, ${num(paragonXpFor(2))} in all for the second, and so on`);
  const young = placed(92, 'rogue', 'human', 19, 'wyrmspire', 'roam');
  ok(!setFocus(young.heroes[0], 'rift') && young.heroes[0].focus === 'roam', 'the Rifts are closed below level 20');
  const rift = placed(92, 'rogue', 'human', 20, 'wyrmspire', 'roam');
  const rfh = rift.heroes[0];
  for (const id of SLOT_IDS) rfh.gear[id] = { tier: 3, level: 18, name: 'Test Kit' };
  rfh.skillPoints = 27; rfh.abilityPoints = 10; grow(rfh, 'shadow');
  rfh.hp = maxHp(rfh); rfh.gold = 100000;
  ok(setFocus(rfh, 'rift'), 'at level 20 the Rifts are a standing order');
  const riftEvents = advance(rift, 24 * HOUR);
  const floorDc = riftEvents.filter((e) => e.type === 'task' && e.source === 'rift').map((e) => e.roll.dc);
  const riftKo = riftEvents.findIndex((e) => e.type === 'knockout' && e.source === 'rift');
  ok(rfh.stats.riftBest >= 10 && floorDc.length > 20, `a geared level 20 hero goes down ${rfh.stats.riftBest} floors at best in a day (${rfh.stats.riftRuns} runs)`);
  ok(Math.max(...floorDc) > Math.min(...floorDc) + 2, `and the floors get harder (DC ${Math.min(...floorDc)} at the top, ${Math.max(...floorDc)} at the deepest)`);
  const afterKo = riftEvents.slice(riftKo + 1).find((e) => e.type === 'task' && e.source === 'rift');
  ok(riftKo >= 0 && riftEvents[riftKo].lost === 'rift' && afterKo?.roll.dc === floorDc[0], 'a knockout in the Rifts ends the run, and the next starts again at floor 1');
  ok(riftEvents.some((e) => e.warden === 10) && riftEvents.some((e) => e.type === 'loot' && e.source === 'boss'), 'the Warden of floor 10 leaves a piece of gear');
  const riftParagon = riftEvents.filter((e) => e.type === 'paragon').map((e) => e.rank);
  ok(rfh.paragon === paragonRank(rfh) && riftParagon.length === rfh.paragon && rfh.paragon >= 1 && riftParagon.every((r, i) => r === i + 1), `XP past level 20 earns Paragon ranks, each announced once (rank ${rfh.paragon} after a day: ${paragonTitle(rfh.paragon)})`);
  const legendFind = (seed) => { const s = placed(seed, 'fighter', 'human', 20, 'wyrmspire', 'rift'); const h = s.heroes[0]; for (const id of SLOT_IDS) h.gear[id] = { tier: 4, level: 20, name: 'Test' }; h.skillPoints = 27; h.abilityPoints = 10; grow(h, 'vanguard'); h.hp = maxHp(h); setFocus(h, 'rift'); return advance(s, 5 * 24 * HOUR).filter((e) => e.type === 'loot' && e.legend); };
  const riftLegends = legendFind(93);
  ok(riftLegends.length > 0 && riftLegends.every((e) => e.level === MAX_LEVEL), `Wardens sometimes give up one of the eight named Legendaries, at level 20 (${riftLegends.length} in five days)`);
  const titleOnly = (extra) => { const s = placed(94, 'wizard', 'elf', 20, 'wyrmspire', 'rift'); const h = s.heroes[0]; h.xp += extra; h.paragon = paragonRank(h); setFocus(h, 'rift'); return advance(s, 6 * HOUR).filter((e) => e.type === 'task').map((e) => [e.roll?.die, e.roll?.dc, e.xp, e.gold, e.damage]); };
  ok(JSON.stringify(titleOnly(0)) === JSON.stringify(titleOnly(paragonXpFor(6))), 'Paragon ranks are titles only: a Paragon 6 rolls, earns, and is hurt exactly like a Paragon 0');
  const leaving = placed(95, 'fighter', 'human', 20, 'wyrmspire', 'rift');
  for (const id of SLOT_IDS) leaving.heroes[0].gear[id] = { tier: 4, level: 20, name: 'Test' };
  leaving.heroes[0].hp = maxHp(leaving.heroes[0]);
  advance(leaving, 5 * 60);
  const hadRun = !!leaving.heroes[0].rift;
  setFocus(leaving.heroes[0], 'roam'); advance(leaving, 10 * 60);
  ok(hadRun && leaving.heroes[0].rift === null, 'leaving the Rifts for another order ends the run');

  // 47. Determinism with the tavern, the roster, and the Rifts.
  const busy = (seed) => {
    const s = placed(seed, 'fighter', 'halforc', 20, 'wyrmspire', 'rift');
    s.tavern.upgrades = { room: 3, stable: 2, notice: 4, trophies: 1 };
    s.heroes.push(newHero(s, 'cleric', 'elf'));
    s.heroes[0].skillPoints = MAX_LEVEL - 1; // what a hero who had levelled there would hold
    return s;
  };
  const bOne = busy(96); advance(bOne, 3 * HOUR);
  const bMany = busy(96); for (let i = 0; i < 3 * HOUR; i++) advance(bMany, 1);
  ok(JSON.stringify(bOne) === JSON.stringify(bMany), 'with upgrades, two heroes, and the Rifts, one 3-hour call equals 10,800 one-second calls');
  const bBack = importSave(exportSave(bOne)); advance(bBack, HOUR); advance(bOne, HOUR);
  ok(JSON.stringify(bBack) === JSON.stringify(bOne), 'and the whole tavern survives the save string mid-run');

  // 48. A Phase 5 save (version 4) loads intact.
  const v4 = placed(97, 'rogue', 'elf', 20, 'wyrmspire', 'delve');
  const fh = v4.heroes[0];
  advance(v4, 2 * HOUR);
  fh.xp = PAST_CURVES[4][MAX_LEVEL] + paragonXpFor(2) + 10; fh.gold = 1234567; fh.skillPoints = MAX_LEVEL - 1 + fh.feats.length - fh.skills.length;
  v4.version = 4;
  v4.tavern = { upgrades: {}, legends: [], legacyBonus: 0 }; // as Phase 5 saved it
  for (const key of ['rift', 'paragon', 'retireOffered']) delete fh[key];
  for (const key of ['riftRuns', 'riftFloors', 'riftBest']) delete fh.stats[key];
  // Version 4 XP was on the month-long curve; the XP past level 20 carries over whole.
  const keep5 = JSON.parse(JSON.stringify({ level: fh.level, xp: xpForLevel(MAX_LEVEL) + paragonXpFor(2) + 10, gold: fh.gold, gear: fh.gear, skills: fh.skills, skillPoints: fh.skillPoints, feats: fh.feats, abilities: fh.abilities, chronicle: fh.chronicle }));
  const now5 = migrate(JSON.parse(JSON.stringify(v4)));
  const n5 = now5.heroes[0];
  ok(now5.version === SAVE_VERSION && SAVE_VERSION >= 5, 'a version 4 save becomes the current version');
  ok(JSON.stringify(keep5) === JSON.stringify({ level: n5.level, xp: n5.xp, gold: n5.gold, gear: n5.gear, skills: n5.skills, skillPoints: n5.skillPoints, feats: n5.feats, abilities: n5.abilities, chronicle: n5.chronicle }), 'and keeps its level, XP, gold, gear, skills, points, Feats, ability scores, and Chronicle');
  ok(n5.paragon === 2 && n5.rift === null && n5.retireOffered === false && n5.stats.riftBest === 0, 'a hero already past level 20 has Paragon 2 counted quietly, and will be offered retirement once');
  ok(now5.tavern.trophies.length === 7 && now5.tavern.legacyBonus === 0 && JSON.stringify(now5.tavern.upgrades) === '{}', 'the trophy wall is filled from the seven dungeons already cleared');
  const p5 = advance(now5, HOUR).filter((e) => e.type === 'paragon');
  ok(p5.length === 0 || p5[0].rank === 3, 'no Paragon rank is announced twice');
  const again5 = migrate(JSON.parse(JSON.stringify(now5)));
  ok(JSON.stringify(again5) === JSON.stringify(now5), 'loading a current save changes nothing');
  const odd5 = JSON.parse(JSON.stringify(v4)); odd5.tavern.upgrades = { room: 99, stable: 'two', ballroom: 3 }; odd5.tavern.legends = [{ name: 'A' }, { name: 'B' }];
  const fixed5 = migrate(odd5);
  ok(fixed5.tavern.upgrades.room === 5 && fixed5.tavern.upgrades.stable === undefined && fixed5.tavern.upgrades.ballroom === undefined && fixed5.tavern.legacyBonus === 0.04, 'odd upgrade numbers are put right, and the legacy bonus is worked out from the Hall');
}

// ---------- Phase 7: polish ----------
{ // its own scope, like Phase 6
  console.log('\nPhase 7 polish:');
  const { checkText } = await import('./check-text.mjs');
  const text = await checkText();
  ok(text.lines.length > 2500 && text.problems.length === 0, `all ${text.lines.length} lines of game text keep to the Humor and voice rules (tools/check-text.mjs)${text.problems.length ? ': ' + text.problems.slice(0, 3).join('; ') : ''}`);
  const audio = await import('../js/audio.js');
  const pick = (events) => audio.pickSound(events)?.name ?? null;
  ok(pick([{ type: 'task', outcome: 'hit' }, { type: 'potion' }]) === 'potion' && pick([{ type: 'task', outcome: 'hit' }]) === null, 'an ordinary task makes no sound; a potion does');
  ok(pick([{ type: 'loot', equipped: true, tier: 1 }, { type: 'task', outcome: 'crit' }, { type: 'levelup', level: 4 }]) === 'levelup', 'when several things happen at once, only the one that matters most is heard (a level-up)');
  ok(pick([{ type: 'knockout' }, { type: 'loot', equipped: true, tier: 2 }]) === 'knockout' && pick([{ type: 'loot', equipped: false, tier: 3 }]) === null, 'a knockout outranks a find, and a piece that is only sold is not announced');
  const legendSound = audio.pickSound([{ type: 'loot', equipped: true, tier: 4 }, { type: 'questdone' }]);
  ok(legendSound.name === 'loot' && legendSound.arg === 4, 'a Legendary going on outranks a finished quest, and gets the long chime');
  ok(['levelup', 'clear', 'crit', 'fumble', 'knockout', 'quest', 'coins', 'potion', 'paragon', 'away', 'retire', 'loot'].every((n) => typeof audio.EFFECTS[n] === 'function'), 'every sound the game asks for exists');
  ok(audio.TUNE.every((pass) => pass.reduce((n, [, beats]) => n + beats, 0) === 24), 'each pass of the tavern tune is eight bars of three beats');
  ok(audio.DEFAULTS.muted === false && audio.DEFAULTS.effects === true && audio.DEFAULTS.music === false, 'out of the box: effects on, music off, not muted');
  const { CREDITS, LPC_COMMIT } = await import('../data/credits.js');
  const creditFiles = CREDITS.flatMap((c) => c.credits);
  ok(/^[0-9a-f]{40}$/.test(LPC_COMMIT) && creditFiles.length > 50 && creditFiles.every((f) => f.authors.length && f.licenses.length), `the credits screen has ${CREDITS.length} layers and ${creditFiles.length} art files, each with its artists and licences`);
}

// Round four (after Phase 7): choices on the road, boons, the merchant, festivals, and deeds.
console.log('\nRound four: the road, the merchant, festivals, deeds:');
{
  const road = await import('../js/road.js');
  const { activeBoons, giveBoon, boonMods } = await import('../js/boons.js');
  const { CHOICES } = await import('../data/road.js');
  const { WARES, FESTIVALS } = await import('../data/market.js');
  const { DEEDS } = await import('../data/deeds.js');
  const { BOONS, ROAD, goldUnit } = await import('../js/rules.js');
  // Every choice is whole: two options, an `auto`, a line for every outcome, and only boons that exist.
  const outcomes = CHOICES.flatMap((c) => c.options.flatMap((o) => (o.chance == null ? [o] : [o.win, o.lose])));
  ok(CHOICES.length >= 15 && CHOICES.every((c) => c.options.length === 2 && [0, 1].includes(c.auto ?? 0)) && outcomes.every((o) => o && typeof o.line === 'string' && (!o.boon || BOONS[o.boon[0]])),
    `${CHOICES.length} choices on the road, each with two options, a choice the hero makes alone, and a line for every outcome`);
  // A day out on the road: meetings turn up, wait, and are decided alone when nobody answers.
  const rs = fresh(91, 'rogue', 'goblin');
  const rh = rs.heroes[0];
  const rev = advance(rs, 30 * HOUR);
  const meets = rev.filter((e) => e.type === 'meeting').length;
  const alone = rev.filter((e) => e.type === 'choice' && e.alone).length;
  ok(meets >= 4 && alone >= meets - 1 && rh.stats.choicesAlone === alone, `in 30 hours ${meets} meetings on the road, ${alone} decided alone with no word from the tavern`);
  ok(rev.filter((e) => e.type === 'meeting').every((e, i, all) => i === 0 || e.at - all[i - 1].at >= ROAD.every[0]), 'never more than one meeting every three hours');
  // Answering: the choice is settled at once, written down, and counted.
  const as = fresh(92, 'fighter', 'human');
  const ah = as.heroes[0];
  for (let i = 0; i < 40 && !ah.choice; i++) advance(as, HOUR);
  const waiting = ah.choice?.id;
  const lines = ah.lines;
  const answered = waiting ? road.answerChoice(as, ah, CHOICES.find((c) => c.id === waiting).options.findIndex((o) => road.canAfford(ah, o))) : null;
  ok(waiting && answered && ah.choice === null && ah.lines > lines && ah.stats.choices === 1 && ah.chronicle.some((l) => l.k === 'choice'), `a meeting waits for word (${waiting}), and the answer settles it and goes in the Chronicle`);
  ok(road.answerChoice(as, ah, 0) === null, 'with no meeting waiting, there is nothing to answer');
  // Boons: on the hero's own clock, extended rather than stacked, and gone when they run out.
  const bh = fresh(93).heroes[0];
  giveBoon(bh, 'luck', 2); giveBoon(bh, 'luck', 2);
  ok(activeBoons(bh).length === 1 && activeBoons(bh)[0].until === bh.age + 4 * 3600 && boonMods(bh).roll === 1, 'the same boon twice runs twice as long, and adds once');
  bh.age += 4 * 3600 + 1;
  ok(activeBoons(bh).length === 0 && boonMods(bh) === null, 'and runs out on the hero\'s clock');
  // The merchant: on the calendar, four wares, one of each per visit, prices rising with level.
  let inDays = 0;
  for (let d = 0; d < 100; d++) if (road.merchantOn(new Date(2026, 0, 1 + d)).here) inDays += 1;
  ok(inDays >= 45 && inDays <= 75, `the merchant is in on ${inDays} days of 100`);
  const md = [...Array(30).keys()].map((d) => new Date(2026, 0, 1 + d)).find((d) => road.merchantOn(d).here);
  const ms = fresh(94, 'wizard', 'elf');
  const mh = ms.heroes[0];
  mh.level = 10; mh.gold = 1e6;
  const visit = road.merchantOn(md);
  const potionsWare = visit.wares.find((w) => w.potions);
  const first = road.buyWare(ms, mh, visit.wares[0].id, md);
  ok(visit.wares.length === 4 && first && first.price === road.warePrice(mh, visit.wares[0]) && road.buyWare(ms, mh, visit.wares[0].id, md) === null, 'four wares a visit, and one of each');
  ok(road.warePrice({ level: 20 }, WARES[0]) > 10 * road.warePrice({ level: 5 }, WARES[0]) && goldUnit(10) > 4000, 'prices rise with level');
  const notHere = [...Array(30).keys()].map((d) => new Date(2026, 0, 1 + d)).find((d) => !road.merchantOn(d).here);
  ok(road.buyWare(ms, mh, road.merchantOn(notHere).wares[0].id, notHere) === null, 'nothing can be bought while the cart is away');
  const before = mh.stats.itemsFound;
  for (const w of visit.wares.slice(1)) road.buyWare(ms, mh, w.id, md);
  ok(mh.stats.bought === 4 && (visit.wares.some((w) => w.crate) ? mh.stats.itemsFound === before + 1 : true) && (potionsWare ? mh.supplies.potions === 3 : true), 'a crate is a piece of gear, and a crate of potions waits for the next run');
  // Festivals: the calendar, the new year, and once a year per hero.
  ok(FESTIVALS.every((f) => road.festivalOn(new Date(2026, f.from[0] - 1, f.from[1]))?.id === f.id) && road.festivalOn(new Date(2027, 0, 3))?.id === 'midwinter' && road.festivalOn(new Date(2026, 7, 1)) === null,
    'each festival runs on its dates, Midwinter over the new year, and none in August');
  const fh = fresh(95).heroes[0];
  const nov = new Date(2026, 10, 10);
  ok(road.joinFestival({}, fh, nov)?.id === 'lanterns' && road.joinFestival({}, fh, nov) === null && road.joinFestival({}, fh, new Date(2027, 10, 10))?.id === 'lanterns' && fh.stats.festivals === 2,
    'a hero joins Lantern Night once a year, and again the next year');
  // Deeds: done once each, with a line, and titles only from deeds done.
  const { checkDeeds, wearTitle, titled } = await import('../js/deeds.js');
  const dh = fresh(96).heroes[0];
  dh.stats.natural20s = 100;
  const got = checkDeeds(dh, []);
  ok(got.length === 1 && got[0].deed === 'lucky' && checkDeeds(dh, []).length === 0 && dh.chronicle.at(-1).k === 'deed', 'a deed is done once, with its Chronicle line');
  ok(!wearTitle(dh, 'dragon') && wearTitle(dh, 'lucky') && titled(dh) === 'Test the Lucky' && wearTitle(dh, null) && titled(dh) === 'Test', 'only a deed done gives a title, and the title can be taken off');
  ok(new Set(DEEDS.map((d) => d.id)).size === DEEDS.length && DEEDS.every((d) => typeof d.test === 'function' && d.title && d.about), `${DEEDS.length} deeds, each with a test, a title, and what it asks`);
  // The save keeps it all, and an older save gains the new fields.
  const sv = importSave(exportSave(rs));
  ok(JSON.stringify(sv.heroes[0].boons) === JSON.stringify(rh.boons) && sv.heroes[0].stats.choicesAlone === rh.stats.choicesAlone && JSON.stringify(sv.heroes[0].choice) === JSON.stringify(rh.choice), 'boons, the meeting waiting, and the counts travel in the save string');
  const old = JSON.parse(JSON.stringify(rs));
  old.version = 5;
  for (const k of ['choice', 'nextChoiceAt', 'lastChoice', 'boons', 'supplies', 'joined', 'deeds', 'title']) delete old.heroes[0][k];
  delete old.tavern.merchant;
  const up = migrate(old);
  ok(up.version === SAVE_VERSION && SAVE_VERSION >= 6 && Array.isArray(up.heroes[0].boons) && up.heroes[0].supplies.potions === 0 && up.heroes[0].choice === null && up.heroes[0].level === rh.level, 'a version 5 save becomes the current version, with nothing lost');
}

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


// ---------- The tavern's name and sign ----------
{
  console.log('\nThe tavern name and sign:');
  const { cleanTavernName, nameTavern, tavernName, signOf, paintSign } = await import('../js/tavern.js');
  ok(cleanTavernName('  The   Rusty  Anchor ') === 'The Rusty Anchor' && cleanTavernName('') === null && cleanTavernName('The Wobbly Griffin') === null && cleanTavernName('x'.repeat(40)).length === 28,
    'a tavern name is trimmed, single-spaced, at most 28 characters, and empty means the old name');
  const ns = fresh(5);
  const nh = ns.heroes[0];
  const lines0 = nh.lines;
  ok(tavernName(ns) === 'The Wobbly Griffin' && nameTavern(ns, 'The Rusty Anchor', nh) && tavernName(ns) === 'The Rusty Anchor' && nh.lines === lines0 + 1 && nh.chronicle.at(-1).text.includes('The Rusty Anchor') && !nameTavern(ns, 'The Rusty Anchor', nh),
    'renaming changes the name once and writes one Chronicle line');
  paintSign(ns, { board: 'red', emblem: 'mug', motto: 3 });
  const nb = importSave(exportSave(ns));
  ok(nb.tavern.name === 'The Rusty Anchor' && signOf(nb).board === 'red' && signOf(nb).emblem === 'mug' && signOf(nb).motto === 3 && signOf(nb).ink === 'gold', 'the name and sign travel in the save string');
  const bad = JSON.parse(JSON.stringify(ns));
  bad.tavern.name = 42; bad.tavern.sign = { board: 'plaid', motto: 99 };
  const fixed = migrate(bad);
  ok(fixed.tavern.name === null && fixed.tavern.sign.board === 'oak' && fixed.tavern.sign.motto === 0, 'an unreadable name or sign falls back to the old one');
}

// ---------- Well Rested ----------
{
  console.log('\nWell Rested:');
  const { REST } = await import('../js/rules.js');
  const { restedOf, restedXp } = await import('../js/tavern.js');
  const ws = fresh(7);
  const a = ws.heroes[0];
  const b = createHero(ws, { name: 'Napper', race: 'human', cls: 'fighter', appearance: defaultAppearance('human'), baseScores: assignScores('fighter', STANDARD_ARRAY) });
  ws.heroes.push(b);
  advance(ws, 3 * HOUR);
  ok(restedOf(b) === HOUR && restedOf(a) === 0 && b.age === 0, 'three hours waiting banks one hour of rest; the hero out banks none');
  advance(ws, 30 * 24 * HOUR);
  ok(restedOf(b) === REST.cap, 'rest stops at a full day');
  // Two identical heroes side by side: one rested, one not. The rested one earns half again the XP.
  const twin = (rest) => { const s = fresh(11); s.heroes[0].rested = rest * REST.every; advance(s, 20 * 60); return s.heroes[0]; };
  const plain = twin(0), keen = twin(REST.cap);
  ok(keen.xp > plain.xp * 1.3 && restedXp(keen) === REST.xp && restedOf(keen) === REST.cap - 20 * 60, 'a rested hero earns more XP and uses up rest second for second');
  const used = fresh(12);
  used.heroes[0].rested = 600 * REST.every;
  advance(used, 3600);
  ok(restedOf(used.heroes[0]) === 0 && restedXp(used.heroes[0]) === 0, 'rest runs out, and with it the bonus');
  const ko = fresh(13);
  const kh = ko.heroes[0];
  kh.rested = 3600 * REST.every; kh.knockedOutUntil = kh.age + 1800; kh.hp = 0; kh.currentTask = null;
  advance(ko, 600);
  ok(restedOf(kh) === 3600, 'recovering on the good bench does not use up rest');
  switchHero(ws, b.id);
  const back = importSave(exportSave(ws));
  ok(restedOf(back.heroes[1]) === REST.cap && back.heroes[0].rested === 0, 'rest travels in the save string');
  const odd = JSON.parse(JSON.stringify(ws));
  odd.heroes[1].rested = 'lots'; odd.heroes[0].rested = 1e12;
  const m = migrate(odd);
  ok(m.heroes[1].rested === 0 && restedOf(m.heroes[0]) === REST.cap, 'an unreadable or too-large bank is mended');
}

// Round five: rare monsters and mastery, lesser delves, the notice board, and happenings.
console.log('\nRound five: rare monsters, lesser delves, the notice board, happenings:');
{
  const DAY_MS = 86400000;
  // The world's clock.
  const w = fresh(501);
  advance(w, 5000);
  ok(w.lastSavedAt === 5000 * 1000, 'the world\'s clock moves on by exactly the seconds advanced');

  // The content is whole.
  const commonIds = new Set(Object.values(MONSTERS).flat().map((m) => m.id));
  ok(REGIONS.every((r) => RARES[r.id].length === 3 && RARES[r.id].filter((m) => m.rare === 1).length === 2 && RARES[r.id][2].rare === 2 && RARES[r.id][2].when
    && RARES[r.id].every((m) => !commonIds.has(m.id) && m.level >= r.levels[0] && m.level <= r.levels[1] && m.tasks.length >= 2 && m.hit.length && m.miss.length && m.crit && m.fumble && m.ko && MONSTER_BY_ID[m.id] === m))
    && new Set(RARE_LIST.map((m) => m.id)).size === 24, 'every region has two rare monsters and one elusive beast, each whole (24 in all)');
  ok(REGIONS.every((r) => SITES[r.id].length === 2 && SITES[r.id][0].level === r.levels[0] && SITES[r.id][1].level > r.levels[0] && SITES[r.id][1].level < r.levels[1] + (r.id === 'mugwick' ? 1 : 0)
    && SITES[r.id].every((s) => s.site && s.region === r.id && s.roomTasks.length >= 3 && s.boss.hits === 2 && s.boss.tasks.length && s.dc < DUNGEONS[r.id].dc + 1 && s.dmg < DUNGEONS[r.id].dmg))
    && new Set(SITE_LIST.map((s) => s.id)).size === 16, 'every region has two lesser delves, the first at its opening level and the second part-way up, each kinder than the dungeon');
  ok(REGIONS.every((r) => HAPPENINGS[r.id].length === 2 && HAPPENINGS[r.id].every((h) => HAPPENING_EFFECT[h.kind] && h.errand.steps.length === 4 && h.errand.done)
    && REGULARS[r.id].beats.length === 4), 'every region has two happenings, each with an errand, and a regular with four jobs');

  // Rare monsters turn up while roaming, and always leave a piece.
  const rs = placed(503, 'fighter', 'human', 10, 'peaks', 'roam');
  const rh = rs.heroes[0];
  const re = advance(rs, 60 * HOUR);
  const rareWins = re.filter((e) => e.type === 'task' && e.rare && (e.outcome === 'hit' || e.outcome === 'crit'));
  const rareLoot = re.filter((e) => e.type === 'loot' && (e.source === 'rare' || e.source === 'elusive'));
  const share = re.filter((e) => e.type === 'rare').length / rh.stats.tasks;
  ok(rareWins.length > 5 && rh.stats.rares === rareWins.length && share > 0.01 && share < 0.08, `rare monsters turn up now and then while roaming (${re.filter((e) => e.type === 'rare').length} in ${rh.stats.tasks} fights)`);
  ok(rareLoot.length >= rareWins.length && rareWins.every((e) => rh.bestiary[e.monster] > 0), 'a rare one beaten always leaves a piece of gear, and goes in the Bestiary');
  // The elusive beast only while its condition holds on the world's clock (the Peaks: snow).
  const beasts = re.filter((e) => e.type === 'rare' && e.rare === 2);
  ok(beasts.length > 0 && beasts.every((e) => conditionHolds('weather', 'peaks', new Date(e.at * 1000))), `the elusive beast of the Peaks is met only while it snows (${beasts.length} times)`);
  const vale = placed(504, 'fighter', 'human', 3, 'mugwick', 'roam');
  const ve = advance(vale, 72 * HOUR).filter((e) => e.type === 'rare' && e.rare === 2);
  ok(ve.length > 0 && ve.every((e) => timeOfDay(new Date(e.at * 1000)) === 'night'), `and the Vale's badger only at night (${ve.length} times)`);
  const low = placed(505, 'fighter', 'human', 1, 'mugwick', 'roam');
  low.heroes[0].xp = 0;
  const le = advance(low, 9 * 60);
  ok(le.filter((e) => e.type === 'rare').every((e) => MONSTER_BY_ID[e.monster].level <= 2), 'a rare one more than a level above the hero keeps away');

  // Mastery.
  ok(masteryRank(9) === 0 && masteryRank(MASTERY.at[0]) === 1 && masteryRank(MASTERY.at[2]) === 3 && masteryRank(MASTERY.rareAt[0], 1) === 1 && masteryRank(MASTERY.rareAt[0] - 1, 1) === 0, 'defeats earn three mastery ranks, a rare monster\'s sooner');
  const ranks = re.filter((e) => e.type === 'mastery');
  ok(ranks.length > 3 && ranks.every((e) => masteryRank(rh.bestiary[e.monster], MONSTER_BY_ID[e.monster].rare) >= e.rank) && rh.chronicle.some((l) => l.k === 'mastery'), `each rank is announced once, in the Chronicle (${ranks.length} ranks in 60 hours)`);
  {
    // The same fights with and without mastery: less damage taken, more gold, the same XP.
    const run = (count) => { const s = placed(506, 'fighter', 'human', 9, 'peaks', 'roam'); const h = s.heroes[0]; for (const m of [...MONSTERS.peaks, ...RARES.peaks]) h.bestiary[m.id] = count; const ev = advance(s, 2 * HOUR).filter((e) => e.type === 'task'); return { dmg: ev.reduce((n, e) => n + e.damage, 0), n: ev.length }; };
    const green = run(0), old = run(100000);
    ok(old.dmg < green.dmg * 0.85, `an Authority takes less damage from what it knows (${old.dmg} against ${green.dmg} in two hours)`);
  }

  // Lesser delves.
  const ds = placed(507, 'fighter', 'dwarf', 6, 'saltmarrow', 'roam');
  const dh = ds.heroes[0];
  ok(!orderDelve(dh, 'mill_loft') && dh.focus === 'roam', 'a lesser delve in another region cannot be ordered');
  ok(orderDelve(dh, 'fenwicks_hole') && dh.focus === 'delve' && delveTarget(dh) === SITE_BY_ID.fenwicks_hole, 'Delve can be sent to a lesser delve');
  const de = advance(ds, 3 * HOUR);
  const cleared = de.filter((e) => e.type === 'sitecleared');
  const firstClear = de.indexOf(cleared[0]);
  const roomsBefore = de.slice(0, firstClear).filter((e) => e.type === 'task' && e.source === 'delve').length;
  ok(cleared.length >= 2 && cleared[0].first && !cleared[1].first && dh.siteClears.fenwicks_hole === cleared.length && dh.stats.siteClears === cleared.length, `a lesser delve is cleared, and can be cleared again (${cleared.length} times in three hours)`);
  ok(roomsBefore >= 4 && roomsBefore <= 6 + 6 && de.some((e) => e.type === 'task' && e.boss === 'fenwick' && e.won), 'a run is a few rooms and then the keeper');
  ok(!de.some((e) => ['cleared', 'unlock', 'chapter', 'trophy'].includes(e.type)) && !dh.dungeonClears.saltmarrow && !regionOpen(dh, 'peaks') && dh.stats.dungeonRuns === 0 && dh.stats.siteRuns >= cleared.length,
    'it opens no road, earns no chapter or trophy, and is counted apart from the dungeons');
  const keeperLoot = de.filter((e) => e.type === 'loot' && (e.source === 'boss' || e.source === 'keeper'));
  ok(keeperLoot[0]?.source === 'boss' && keeperLoot.slice(1).every((e) => e.source === 'keeper') && !de.some((e) => e.type === 'loot' && e.legend), 'the keeper gives a boss\'s piece the first time, a chest\'s after, and no named Legendary');
  ok(foeName('fenwick') === 'Fenwick the Unpaid', 'a keeper has a name for the Bestiary and the knockout line');
  orderDelve(dh, null);
  advance(ds, 600);
  ok(dh.delve?.site == null && delveTarget(dh) === DUNGEONS.saltmarrow && (dh.currentTask.kind === 'delve' || dh.currentTask.kind === 'camp' || dh.currentTask.kind === 'tavern'), 'ordering the dungeon again leaves the lesser delve');
  {
    // Losing three times in a lesser delve sends the hero roaming, and keeps its own count.
    const s = placed(508, 'wizard', 'human', 12, 'underdeep', 'roam');
    const h = s.heroes[0];
    orderDelve(h, 'counting_shaft');
    const ev = advance(s, 12 * HOUR);
    const conf = ev.find((e) => e.type === 'confidence');
    ok(conf && conf.site === 'counting_shaft' && conf.region === undefined && h.focus === 'roam' && ev.filter((e) => e.type === 'knockout' && e.site === 'counting_shaft').length >= 3, 'three defeats running in a lesser delve and the hero roams instead');
  }

  // Story quests open by level, with odd jobs between.
  ok(REGIONS.every((r) => storyOpensAt(r.id, 0) === r.levels[0] && storyOpensAt(r.id, 5) === Math.max(r.levels[0], r.levels[1] - 1) && [1, 2, 3, 4, 5].every((i) => storyOpensAt(r.id, i) >= storyOpensAt(r.id, i - 1))),
    'story quests open in order across a region, the last a level before the dungeon is due');
  const qs5 = placed(509, 'cleric', 'human', 12, 'cinder', 'quest');
  const qh5 = qs5.heroes[0];
  const qe = advance(qs5, 10 * HOUR);
  const doneStory = qe.filter((e) => e.type === 'questdone' && e.story).length;
  const expected = [0, 1, 2, 3, 4, 5].filter((i) => storyOpensAt('cinder', i) <= qh5.level).length;
  ok(doneStory === expected && doneStory < 6 && !storyReady(qh5) && qe.some((e) => e.type === 'questdone' && !e.story), `a level ${qh5.level} hero does the ${doneStory} story quests open to them in the Wastes, then odd jobs`);
  qh5.level = 14; qh5.xp = xpForLevel(14);
  ok(storyReady(qh5), 'and the next opens when they reach its level');
  // The regular: every fourth odd job, four times, then a gift.
  const reg = placed(510, 'cleric', 'human', 3, 'mugwick', 'quest');
  const gh = reg.heroes[0];
  gh.questProgress.mugwick = { done: 6, step: 0, started: false, odd: 0, job: null };
  const ge = advance(reg, 60 * HOUR);
  const regJobs = ge.filter((e) => e.type === 'questdone' && e.regular);
  ok(regJobs.length === 4 && regJobs.every((e, i) => e.quest === REGULARS.mugwick.beats[i].job) && ge.filter((e) => e.type === 'regular').length === 1 && gh.stats.regulars === 1 && gh.questProgress.mugwick.reg === 4,
    `every fourth odd job is for the regular until her story is told, and then she sends a gift (${regJobs.length} jobs for Widow Pelk in ${gh.stats.oddJobs})`);

  // Happenings follow the calendar.
  const d1 = new Date(2026, 10, 16), d2 = new Date(2026, 10, 17);
  const on1 = happeningsOn(d1);
  ok(Object.keys(on1).length === 3 && Object.entries(on1).every(([r, h]) => HAPPENINGS[r].some((x) => x.id === h.id)) && JSON.stringify(happeningsOn(new Date(2026, 10, 16, 23, 59))) === JSON.stringify(on1), 'three regions have something going on each day, the same all day');
  let differ = 0;
  for (let i = 0; i < 30; i++) if (JSON.stringify(Object.keys(happeningsOn(new Date(2026, 0, 1 + i))).sort()) !== JSON.stringify(Object.keys(happeningsOn(new Date(2026, 0, 2 + i))).sort())) differ += 1;
  ok(differ > 20 && JSON.stringify(happeningsOn(d2)) !== JSON.stringify(on1), `and it changes from day to day (${differ} of 30 days differ from the day before)`);
  {
    // A hero questing where something is on takes the errand first, once, at their own level.
    const [region, hap] = Object.entries(on1)[0];
    const s = placed(511, 'fighter', 'human', 20, region, 'quest');
    const h = s.heroes[0];
    s.lastSavedAt = d1.getTime() + 3600 * 1000;
    const ev = advance(s, 6 * HOUR);
    const errands = ev.filter((e) => e.type === 'questdone' && e.errand);
    ok(errands.length === 1 && errands[0].quest === hap.errand.title && h.errands.length === 1 && h.stats.errands === 1 && ev.find((e) => e.type === 'happening')?.happening === hap.id,
      `a happening is written down once and its errand done once (${hap.name}, in ${region})`);
    const first = ev.find((e) => e.type === 'task' && e.source === 'quest');
    ok(first.roll.dc >= 15 && ev[ev.indexOf(errands[0]) + 1]?.type === 'loot' && ev[ev.indexOf(errands[0]) + 1].source === 'chest' && ev[ev.indexOf(errands[0]) + 1].level === 20, 'the errand is set at the hero\'s own level and pays a piece of gear');
  }
  {
    // What a happening does: gold, rare monsters, gear.
    const find = (kind) => { for (let i = 0; i < 400; i++) { const d = new Date(2026, 0, 1 + i); const e = Object.entries(happeningsOn(d)).find(([, h]) => h.kind === kind); if (e) return { date: d, region: e[0] }; } return null; };
    const run = (kind, focus, hours, seed) => {
      const f = find(kind);
      const level = REGIONS.find((r) => r.id === f.region).levels[1];
      const play = (ms) => { const s = placed(seed, 'fighter', 'human', level, f.region, focus); s.lastSavedAt = ms; return { ev: advance(s, hours * HOUR), h: s.heroes[0] }; };
      const plainDay = (() => { for (let i = 1; i < 60; i++) { const d = new Date(f.date.getTime() + i * DAY_MS); if (!happeningsOn(d)[f.region]) return d; } return null; })();
      return { on: play(f.date.getTime() + 1000), off: play(plainDay.getTime() + 1000) };
    };
    const g = run('gold', 'roam', 10, 512);
    const goldOf = (x) => x.ev.filter((e) => e.type === 'task').reduce((n, e) => n + e.gold, 0) / x.ev.filter((e) => e.type === 'task').length;
    ok(goldOf(g.on) > goldOf(g.off) * 1.12, `a day of plenty pays more gold (${goldOf(g.on).toFixed(1)} gp a fight against ${goldOf(g.off).toFixed(1)})`);
    const r = run('rare', 'roam', 20, 513);
    const rareOf = (x) => x.ev.filter((e) => e.type === 'rare' && e.rare === 1).length;
    ok(rareOf(r.on) > rareOf(r.off) * 1.6, `rare monsters come out for some happenings (${rareOf(r.on)} met against ${rareOf(r.off)})`);
    const l = run('loot', 'roam', 20, 514);
    const dropOf = (x) => x.ev.filter((e) => e.type === 'loot' && e.source === 'roam').length;
    ok(dropOf(l.on) > dropOf(l.off) * 1.3, `and on others the monsters drop more gear (${dropOf(l.on)} pieces against ${dropOf(l.off)})`);
  }

  // The notice board.
  const bs = placed(515, 'fighter', 'human', 9, 'peaks', 'roam');
  const bh = bs.heroes[0];
  const today = new Date(2026, 10, 16);
  const posts = postingsOn(today, bh);
  ok(posts.length === 3 && posts[0].kind === 'hunt' && MONSTERS.peaks.some((m) => m.id === posts[0].monster) && ['rare', 'delve'].includes(posts[2].kind) && posts.every((p) => BOUNTIES[p.kind] && p.need > 0 && p.title && !/\{/.test(p.title + p.about))
    && JSON.stringify(postingsOn(new Date(2026, 10, 16, 18), bh)) === JSON.stringify(posts), 'the board posts three bounties a day: a hunt in the hero\'s region first, something harder last');
  let boards = new Set();
  for (let i = 0; i < 20; i++) boards.add(JSON.stringify(postingsOn(new Date(2026, 10, 1 + i), bh)));
  ok(boards.size > 15, `and they change from day to day (${boards.size} different boards in 20 days)`);
  const taken = takeBounty(bs, bh, 0, today);
  ok(taken && bh.bounty.kind === 'hunt' && bh.bounty.have === 0 && !canTake(bh, today) && takeBounty(bs, bh, 1, today) === null && canTake(bh, new Date(2026, 10, 17)), 'a hero takes one bounty a day');
  const gold0 = bh.gold;
  const be = advance(bs, 30 * HOUR);
  const paid = be.find((e) => e.type === 'bounty');
  const pay = bountyReward('hunt', 9);
  ok(paid && bh.bounty === null && bh.stats.bounties === 1 && paid.gold === pay.gold && paid.xp === pay.xp && bh.chronicle.some((l) => l.k === 'bounty') && bh.gold > gold0, `a hunt is counted fight by fight and pays on the spot (${pay.gold} gp and ${pay.xp} XP)`);
  const beforePay = be.slice(0, be.indexOf(paid)).filter((e) => e.type === 'task' && e.monster === taken.monster && (e.outcome === 'hit' || e.outcome === 'crit')).length;
  ok(beforePay === taken.need, `after exactly the number asked (${taken.need})`);
  {
    // A bounty travels in the save string; an unreadable one is dropped; an older save gets empty fields.
    const s = placed(516, 'rogue', 'elf', 6, 'saltmarrow', 'roam');
    const h = s.heroes[0];
    takeBounty(s, h, 2, today);
    orderDelve(h, 'fenwicks_hole');
    advance(s, HOUR);
    const back = importSave(exportSave(s)).heroes[0];
    ok(JSON.stringify(back.bounty) === JSON.stringify(h.bounty) && back.bountyDay === h.bountyDay && back.site === 'fenwicks_hole' && JSON.stringify(back.siteClears) === JSON.stringify(h.siteClears), 'the bounty and the lesser delve travel in the save string');
    const odd = JSON.parse(JSON.stringify(s));
    odd.heroes[0].bounty = { kind: 'nonsense' }; odd.heroes[0].site = 'nowhere'; odd.heroes[0].siteClears = { nowhere: 3, fenwicks_hole: 2 }; odd.heroes[0].errands = 'x';
    const mended = migrate(odd).heroes[0];
    ok(mended.bounty === null && mended.site === null && JSON.stringify(mended.siteClears) === '{"fenwicks_hole":2}' && Array.isArray(mended.errands), 'unreadable round five fields are mended');
    const older = JSON.parse(JSON.stringify(s));
    for (const key of ['site', 'siteClears', 'bounty', 'bountyDay', 'errands', 'seen']) delete older.heroes[0][key];
    older.heroes[0].delve = null;
    const up = migrate(older);
    advance(up, HOUR);
    ok(up.heroes[0].site === null && up.heroes[0].bounty === null && up.heroes[0].level >= 6 && up.version === SAVE_VERSION, 'a save from before round five loads and plays on');
  }
  // New deeds.
  ok(['sharp_eyed', 'rarities', 'authority', 'small_doors', 'bounties', 'obliging', 'timely'].every((id) => DEEDS.some((d) => d.id === id)) && rh.deeds.includes('sharp_eyed') && gh.deeds.includes('obliging') && bh.deeds.includes('naturalist') === false,
    'round five has seven deeds of its own, earned in play');
  // Determinism with everything on: one long call equals many short ones, across midnight.
  const one = placed(517, 'fighter', 'human', 10, 'peaks', 'roam'); one.lastSavedAt = new Date(2026, 10, 16, 20).getTime(); takeBounty(one, one.heroes[0], 0, new Date(one.lastSavedAt)); advance(one, 8 * HOUR);
  const many = placed(517, 'fighter', 'human', 10, 'peaks', 'roam'); many.lastSavedAt = new Date(2026, 10, 16, 20).getTime(); takeBounty(many, many.heroes[0], 0, new Date(many.lastSavedAt)); for (let i = 0; i < 8 * 60; i++) advance(many, 60);
  ok(JSON.stringify(one) === JSON.stringify(many), 'eight hours across midnight in one call equals 480 one-minute calls');
}

// ---------- After round five: the career charts, the smith, mentors, the Rifts' rules, Paragon keepsakes ----------
console.log('\nAfter round five: career, smith, mentors, the Rifts\' rules, keepsakes:');
{
  const recruit = (s, cls, race, name = 'Recruit') => createHero(s, { name, race, cls, appearance: defaultAppearance(race), baseScores: assignScores(cls, STANDARD_ARRAY) });

  // The career, for the Stats tab's charts.
  const cs = fresh(601, 'wizard', 'elf');
  const ch = cs.heroes[0];
  advance(cs, 2.5 * 24 * HOUR);
  const days = ch.career.days.filter(Boolean);
  ok(days.length === 3 && days.every((d) => d.length === 4) && days[2][0] === Math.round(ch.xp) && days[2][3] === ch.level && days[0][0] < days[1][0],
    `the career keeps how each day ended: XP, gold, knockouts, and level (${days.length} days)`);
  const lv = Object.keys(ch.career.levelAt).map(Number);
  ok(lv.length === ch.level && ch.career.levelAt[1] === 0 && Object.values(ch.career.levelAt).every((t, i, all) => i === 0 || t >= all[i - 1]), `and the moment each level came (${lv.length} levels)`);
  const koCount = Object.values(ch.career.ko).reduce((a, b) => a + b, 0);
  ok(koCount === ch.stats.knockouts, `and knockouts by place (${koCount}, the same as the Lifetime count)`);
  const cBack = importSave(exportSave(cs)).heroes[0];
  ok(JSON.stringify(cBack.career) === JSON.stringify(ch.career), 'the career travels in the save string');

  // The smith: reforging.
  const sm = placed(602, 'fighter', 'human', 10, 'peaks', 'roam');
  const sh = sm.heroes[0];
  sh.gold = 10 ** 7;
  sh.gear.weapon = { tier: 2, level: 10, name: 'Test Blade' };
  const p0 = gearPower(sh.gear.weapon), crit0 = itemStats('weapon', sh.gear.weapon).critReward;
  const paid = [reforge(sm, sh, 'weapon'), reforge(sm, sh, 'weapon'), reforge(sm, sh, 'weapon'), reforge(sm, sh, 'weapon')];
  ok(paid[0] === 2 * goldUnit(10) && paid[1] === 4 * goldUnit(10) && paid[2] === 6 * goldUnit(10) && paid[3] === null && sh.gear.weapon.forge === 3,
    `reforging costs 2, 4, then 6 gold units of the piece's level (${num(2 * goldUnit(10))} gp first at 10), three times at most`);
  ok(Math.abs(gearPower(sh.gear.weapon) - p0 - 3 / 7) < 1e-9 && itemStats('weapon', sh.gear.weapon).critReward > crit0 && sh.stats.forged === 3 && sh.chronicle.filter((l) => l.k === 'smith').length === 3,
    'each reforging counts as a level of the piece, and writes a Chronicle line');
  receive(sh, 'weapon', { tier: 3, level: 10, name: 'Better Blade' });
  ok(sh.gear.weapon.name === 'Better Blade' && !sh.gear.weapon.forge, 'the work goes with the piece: a better piece goes on without it');
  // Enchanting.
  const hp0 = maxHp(sh), gold0 = sh.gold, roll0 = gearMods(sh).roll ?? 0;
  const e1 = enchant(sm, sh, 'head', 'vigour');
  const e2 = enchant(sm, sh, 'weapon', 'sure');
  ok(e1 === enchantPrice(10) && e2 === enchantPrice(10) && sh.gold === gold0 - 2 * enchantPrice(10) && maxHp(sh) > hp0 && gearMods(sh).roll === roll0 + 1,
    `an enchantment costs ${SMITH.enchantUnits} gold units of the hero's level and adds its numbers (+1 to rolls, +5% hit points)`);
  enchant(sm, sh, 'body', 'sure');
  ok(sh.enchants.body === 'sure' && !sh.enchants.weapon && gearMods(sh).roll === roll0 + 1 && enchant(sm, sh, 'body', 'sure') === null, 'each enchantment is on one slot at a time: another slot moves it');
  receive(sh, 'head', { tier: 4, level: 12, name: 'Better Helm' });
  ok(sh.enchants.head === 'vigour' && maxHp(sh) > hp0, 'an enchantment belongs to the slot, so it stays when the piece changes');
  const poor = placed(603, 'rogue', 'human', 10, 'peaks', 'roam');
  poor.heroes[0].gold = 10;
  ok(reforge(poor, poor.heroes[0], 'weapon') === null && enchant(poor, poor.heroes[0], 'weapon', 'keen') === null && poor.heroes[0].gold === 10, 'nothing is done without the gold');
  const sBack = importSave(exportSave(sm)).heroes[0];
  ok(JSON.stringify(sBack.enchants) === JSON.stringify(sh.enchants), 'enchantments travel in the save string');
  const odd = JSON.parse(JSON.stringify(sm));
  odd.heroes[0].enchants = { head: 'vigour', feet: 'vigour', hands: 'nonsense' };
  odd.heroes[0].gear.body.forge = 99;
  const mended = migrate(odd).heroes[0];
  ok(JSON.stringify(mended.enchants) === '{"head":"vigour"}' && mended.gear.body.forge === SMITH.forgeMax, 'an unreadable or doubled enchantment is dropped, and the smith\'s work is kept within three');
  const forged = placed(604, 'fighter', 'human', 10, 'peaks', 'roam');
  forged.heroes[0].gear.weapon = { tier: 2, level: 10, name: 'Kept Blade', forge: 2 };
  ok(importSave(exportSave(forged)).heroes[0].gear.weapon.forge === 2, 'a reforged piece keeps its work in the save string');

  // Mentors.
  const ms = fresh(605, 'fighter', 'human');
  ms.heroes = []; ms.activeHeroId = null;
  const old = recruit(ms, 'cleric', 'dwarf', 'Old Hand'); old.level = MAX_LEVEL; old.xp = xpForLevel(MAX_LEVEL); ms.heroes.push(old);
  const legend = retire(ms, old.id);
  const pupil = recruit(ms, 'wizard', 'elf', 'Pupil'); ms.heroes.push(pupil); ms.activeHeroId = pupil.id;
  // Out of their depth, so there are knockouts to shorten.
  pupil.level = 4; pupil.xp = xpForLevel(4); pupil.hp = maxHp(pupil);
  for (const r of REGIONS) { if (r.id === 'gloamfen') break; pupil.dungeonClears[r.id] = 1; }
  pupil.region = 'gloamfen'; setFocus(pupil, 'delve');
  const other = recruit(ms, 'rogue', 'human', 'Other'); ms.heroes.push(other);
  ok(chooseMentor(ms, pupil, legend.id) && pupil.mentor === legend.id && !chooseMentor(ms, other, legend.id) && other.mentor === null, 'a legend takes one hero in hand at a time');
  const me = advance(ms, 3.5 * 24 * HOUR);
  const words = me.filter((e) => e.type === 'mentor' && e.boon);
  ok(words.length >= 3 && words.every((e) => e.boon === 'blessed') && pupil.stats.mentorWords === words.length && new Set(words.map((e) => Math.floor(e.at / 86400))).size === words.length, `word comes once in each of the hero's days, with a boon of the mentor's kind (${words.length} in 3.5 days, none while on the good bench; from a Cleric, Blessed)`);
  const kos = me.filter((e) => e.type === 'knockout');
  const rescues = me.filter((e) => e.type === 'mentor' && !e.boon);
  const rescuedDays = new Set(kos.filter((e, i) => me[me.indexOf(e) + 1]?.type === 'mentor').map((e) => Math.floor(e.at / 86400)));
  const day0 = kos.filter((e) => Math.floor(e.at / 86400) === Math.floor(kos[0].at / 86400) && e.seconds);
  ok(day0.length >= 2 && Math.abs(day0[0].seconds / day0[1].seconds - MENTOR.rescue) < 0.02, `in half the time (${Math.round(day0[0].seconds / 60)} min, then ${Math.round(day0[1].seconds / 60)} min for the next that day)`);
  ok(kos.length > 0 && rescues.length === rescuedDays.size && rescues.length === new Set(kos.map((e) => Math.floor(e.at / 86400))).size, `the first knockout of each day is shortened by the mentor (${rescues.length} of ${kos.length} knockouts)`);
  const twin = fresh(606, 'wizard', 'elf'); const th = twin.heroes[0]; th.level = 5; th.xp = xpForLevel(5);
  twin.tavern.legends.push({ ...legend }); th.mentor = legend.id;
  ok(mentorRescue(twin, th)?.id === legend.id && mentorRescue(twin, th) === null, 'and only the first');
  ok(chooseMentor(ms, pupil, null) && pupil.mentor === null && chooseMentor(ms, other, legend.id), 'parting ways frees the legend for another hero');
  const lost = JSON.parse(JSON.stringify(ms));
  lost.tavern.legends = [];
  ok(migrate(lost).heroes.every((h) => h.mentor === null), 'a mentor who is not in the Hall is dropped from the save');

  // The Rifts' rules.
  const rules = new Set();
  let repeats = 0;
  for (let d = 0; d < 60; d++) {
    const a = riftRuleOn(new Date(2026, 0, 1 + d)).id;
    rules.add(a);
    if (d && a === riftRuleOn(new Date(2026, 0, d)).id) repeats += 1;
  }
  ok(rules.size === RIFT_RULES.length && repeats <= 6 && riftRuleOn(new Date(2026, 3, 4, 1)).id === riftRuleOn(new Date(2026, 3, 4, 23)).id, `the Rifts follow one of ${RIFT_RULES.length} rules each day, all seen in 60 days, seldom the same two days running (${repeats} times)`);
  const dayOfRule = (id) => { for (let d = 0; d < 400; d++) { const t = new Date(2026, 0, 1 + d, 9); if (riftRuleOn(t).id === id) return t; } return null; };
  const riftUnder = (id, seed, hours) => {
    const s = placed(seed, 'fighter', 'human', 20, 'wyrmspire', 'rift');
    const h = s.heroes[0];
    for (const slot of SLOT_IDS) h.gear[slot] = { tier: 4, level: 20, name: 'Test' };
    h.skillPoints = 27; h.abilityPoints = 10; grow(h, 'vanguard'); h.hp = maxHp(h); h.supplies.potions = 3;
    s.lastSavedAt = dayOfRule(id).getTime();
    const ev = advance(s, hours * HOUR);
    return { s, h, ev };
  };
  const dry = riftUnder('dry', 607, 0.05);
  ok(dry.h.rift?.rule === 'dry' && dry.h.rift.potions === 0 && dry.h.supplies.potions === 3, 'under the Dry Stair no potions go in, and the merchant\'s wait for another run');
  const watch = riftUnder('watch', 608, 12);
  ok(watch.ev.some((e) => e.warden === 5) && watch.h.riftBests.watch === watch.h.stats.riftBest, `under the Wardens' Watch a Warden waits on floor 5, and the best floor is kept for the rule (floor ${watch.h.riftBests.watch})`);
  const steep = riftUnder('steep', 609, 12), still = riftUnder('still', 609, 12);
  const dcAt = (r, floor) => r.ev.find((e) => e.type === 'task' && e.source === 'rift' && e.roll && e.text && r.ev.indexOf(e) >= 0 && e.roll.dc != null && e.floor === floor)?.roll.dc;
  const floorsOf = (r) => r.ev.filter((e) => e.type === 'task' && e.source === 'rift').map((e) => e.roll.dc);
  ok(Math.max(...floorsOf(steep)) - Math.min(...floorsOf(steep)) >= Math.max(...floorsOf(still)) - Math.min(...floorsOf(still)) - 1 && steep.h.riftBests.steep > 0, `the Steep Stair climbs faster (DC ${Math.min(...floorsOf(steep))} to ${Math.max(...floorsOf(steep))}, against ${Math.min(...floorsOf(still))} to ${Math.max(...floorsOf(still))} on a still day)`);
  const midnight = placed(610, 'fighter', 'human', 20, 'wyrmspire', 'rift');
  const mh = midnight.heroes[0];
  for (const slot of SLOT_IDS) mh.gear[slot] = { tier: 4, level: 20, name: 'Test' };
  mh.hp = maxHp(mh);
  const eve = dayOfRule('teeming'); eve.setHours(23, 50);
  midnight.lastSavedAt = eve.getTime();
  advance(midnight, 5 * 60);
  const ruleThen = mh.rift?.rule;
  advance(midnight, 20 * 60);
  ok(ruleThen === 'teeming' && (mh.rift === null || mh.rift.rule === 'teeming'), 'a run keeps the rule it began under past midnight');
  ok(importSave(exportSave(watch.s)).heroes[0].riftBests.watch === watch.h.riftBests.watch, 'the best floor under each rule travels in the save string');

  // Paragon keepsakes.
  const ps = placed(611, 'rogue', 'human', 20, 'wyrmspire', 'roam');
  const ph = ps.heroes[0];
  ok(!chooseWisp(ps, ph, 'rose') && ph.wisp === null, 'the wisp keeps its class colour until the tavern has a Paragon 3');
  ph.xp = xpForLevel(MAX_LEVEL) + paragonXpFor(3) - 10;
  ph.hp = maxHp(ph);
  const pe = advance(ps, HOUR);
  const keeps = pe.filter((e) => e.type === 'tavern' && e.keepsake);
  ok(ph.paragon === 3 && keeps.map((e) => e.keepsake).join() === '1,2,3' && tavernParagon(ps) === 3 && unlockedAt(ps, 3) && !unlockedAt(ps, 4), 'reaching a Paragon rank first unlocks its keepsakes, each with a Chronicle line');
  const second = recruit(ps, 'fighter', 'dwarf', 'Second'); second.level = MAX_LEVEL; second.xp = xpForLevel(MAX_LEVEL) + paragonXpFor(1) - 10; second.hp = maxHp(second);
  ps.heroes.push(second); ps.activeHeroId = second.id;
  const se = advance(ps, HOUR);
  ok(second.paragon >= 1 && !se.some((e) => e.keepsake), 'a second hero reaching a rank already reached unlocks nothing new');
  ok(chooseWisp(ps, ph, 'rose') && portraitOf(ph).fx.wisp === WISP_CHOICES.find((w) => w.id === 'rose').color && chooseWisp(ps, ph, 'class') && ph.wisp === null, 'then a hero\'s wisp may take another colour, and go back');
  ok(!signOpen(ps, SIGN.boards.find((b) => b.id === 'lacquer')) && signOpen(ps, SIGN.emblems.find((b) => b.id === 'medal')) && signOpen(ps, null, 9) && signOpen(ps, SIGN.boards[0]), 'the sign\'s Paragon choices open with their ranks');

  // The three-week curve (version 7): levels 12 to 20 cost less, and an older hero keeps their place.
  ok(xpForLevel(11) === PAST_CURVES[6][11] && xpForLevel(12) < PAST_CURVES[6][12] && xpForLevel(MAX_LEVEL) < 0.75 * PAST_CURVES[6][MAX_LEVEL], `levels 1 to 11 cost what they did; level 20 now needs ${num(xpForLevel(MAX_LEVEL))} XP (was ${num(PAST_CURVES[6][MAX_LEVEL])})`);
  const v6 = placed(707, 'ranger', 'elf', 15, 'wyrmspire', 'roam');
  const sixHero = JSON.parse(JSON.stringify(v6.heroes[0]));
  sixHero.level = 15; sixHero.xp = Math.round((PAST_CURVES[6][15] + PAST_CURVES[6][16]) / 2);
  const top6 = JSON.parse(JSON.stringify(v6.heroes[0]));
  top6.id = 'top6'; top6.level = MAX_LEVEL; top6.xp = PAST_CURVES[6][MAX_LEVEL] + paragonXpFor(3) + 5;
  const six = { ...JSON.parse(JSON.stringify(v6)), version: 6, heroes: [sixHero, top6] };
  const seven = migrate(six);
  const [m15, m20] = seven.heroes;
  const half = (m15.xp - xpForLevel(15)) / (xpForLevel(16) - xpForLevel(15));
  ok(seven.version === 7 && m15.level === 15 && Math.abs(half - 0.5) < 0.01, `a version 6 hero halfway through level 15 is still halfway through it (${(100 * half).toFixed(1)}%)`);
  ok(m20.level === MAX_LEVEL && m20.xp - xpForLevel(MAX_LEVEL) === paragonXpFor(3) + 5 && paragonRankFor(m20.xp - xpForLevel(MAX_LEVEL)) === 3, 'a level 20 hero keeps every point of XP past level 20, and their Paragon rank');
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
