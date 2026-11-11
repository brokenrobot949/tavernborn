// Picks the hero's next task and resolves a finished one. Pure logic: no page, no clock.
//
// Task kinds:
//   roam     one of the region's monsters, one roll
//   quest    one step of the region's current quest, one roll
//   delve    one room of the region's dungeon, one roll; hit points do not come back between rooms
//   boss     the end of a dungeon run: several rolls in one task
//   camp     resting to full before a dungeon run
//   travel   walking to another region
//   return   walking back out after a knockout
//   tavern   recovering from a knockout at The Wobbly Griffin
//
// The player's standing orders (focus, travel, paying the cleric) are the three functions at the
// bottom. They only change the save; the simulator calls the same ones.

import { MONSTERS, MONSTER_BY_ID } from '../data/monsters.js';
import { CLASSES } from '../data/classes.js';
import { REGIONS, REGION_BY_ID, REGION_INDEX, START_REGION } from '../data/regions.js';
import { QUESTS, ODD_JOBS, QUEST_LINES } from '../data/quests.js';
import { DUNGEONS, BOSS_BY_ID, BREATHS } from '../data/dungeons.js';
import { CHAPTERS } from '../data/story.js';
import {
  LEVEL_UP, TAVERN_TASKS, RECOVERED, POTION, BESTIARY_NEW, TRAVEL_TASKS, RETURN_TASK, CAMP_TASKS,
  QUEST_TAKEN, ODD_JOB_TAKEN, QUEST_DONE, FEAT, RUN_LOST, STEP_LOST, DUNGEON_CLEARED, REGION_OPEN,
  CONFIDENCE, STUBBORN, BREATH, CLERIC_PAID,
} from '../data/chronicle.js';
import {
  check, mod, pick, pickWeighted, proficiency, randInt, taskDamage, recoverySeconds, levelGapXp, restHeal,
  REWARD, POTION_BELOW, POTION_HEAL, potionPrice, skipFee, baseDc, baseDamage, baseGold,
  OUTMATCHED_DC, OUTMATCHED_DAMAGE, GRUDGE_BONUS, WHAT_IF,
  QUEST_STEP_SECONDS, QUEST_XP_PER_SECOND, QUEST_DONE_XP, QUEST_DAMAGE, QUEST_GOLD, questDoneGold, STORY_QUESTS,
  DELVE_XP_PER_SECOND, DELVE_GOLD, BOSS_SECONDS, BOSS_XP, BOSS_LOSS_SHARE, bossGold, DUNGEON_POTIONS, CONFIDENCE_LIMIT,
  TRAVEL_SECONDS_PER_REGION, RETURN_SECONDS_PER_REGION,
} from './rules.js';
import { chronicle, gainXp, maxHp, regionOpen } from './hero.js';

export const FOCUSES = ['roam', 'quest', 'delve'];

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const article = (name) => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;
const midSentence = (name) => name.replace(/^The /, 'the ');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Record something that happened: it goes in the list `advance` returns and in the Chronicle.
function emit(hero, events, type, text, data = {}, lineExtra = {}) {
  events.push({ type, at: hero.age, text, ...data });
  chronicle(hero, data.outcome ?? type, text, lineExtra);
}

// Humans learn 5% faster, Intelligence adds a little XP, and retired legends (Phase 6) add theirs.
const xpBonus = (state, hero) => 1 + (hero.race === 'human' ? 0.05 : 0) + 0.02 * Math.max(0, mod(hero.abilities.int)) + (state.tavern.legacyBonus ?? 0);
const goldBonus = (hero) => 1 + 0.05 * mod(hero.abilities.cha);

// ---------- quests: where the hero is on the region's board ----------

const questState = (hero) => (hero.questProgress[hero.region] ??= { done: 0, step: 0, started: false, odd: 0, job: null });

// The quest the hero is on in their current region: the next story quest, or an odd job.
export function currentQuest(hero) {
  const qp = hero.questProgress[hero.region];
  const [lo, hi] = REGION_BY_ID[hero.region].levels;
  const list = QUESTS[hero.region];
  const done = qp?.done ?? 0;
  if (done < list.length) {
    const q = list[done];
    return { story: true, id: q.id, title: q.title, check: q.check, notice: q.notice, steps: q.steps.length, level: lo + Math.round((done * (hi - lo)) / (list.length - 1)), q };
  }
  if (!qp?.job) return null; // an odd job is drawn when the hero next looks at the board
  return { story: false, title: qp.job.title, check: 'Odd Jobs', steps: qp.job.steps, level: clamp(hero.level, lo, hi) };
}

// ---------- choosing the next task ----------

export function nextTask(state, hero, events = []) {
  if (hero.knockedOutUntil != null) {
    const left = hero.knockedOutUntil - hero.age;
    return { kind: 'tavern', text: pick(state, TAVERN_TASKS), duration: Math.max(1, Math.min(left, randInt(state, 150, 330))), elapsed: 0 };
  }

  // Travel comes before everything else. Leaving abandons a dungeon run.
  if (hero.travelTo && (hero.travelTo !== hero.region || hero.returning) && regionOpen(hero, hero.travelTo)) {
    const from = hero.returning ? 0 : REGION_INDEX[hero.region];
    const hops = Math.max(1, Math.abs(REGION_INDEX[hero.travelTo] - from));
    hero.delve = null;
    return { kind: 'travel', to: hero.travelTo, text: fill(pick(state, TRAVEL_TASKS), { place: REGION_BY_ID[hero.travelTo].name }), duration: hops * TRAVEL_SECONDS_PER_REGION, elapsed: 0 };
  }
  hero.travelTo = null;

  if (hero.returning) {
    const far = REGION_INDEX[hero.region];
    if (far === 0) hero.returning = false;
    else return { kind: 'return', text: fill(RETURN_TASK, { place: REGION_BY_ID[hero.region].name }), duration: Math.min(600, far * RETURN_SECONDS_PER_REGION), elapsed: 0 };
  }

  if (hero.focus !== 'delve' || hero.delve?.region !== hero.region) hero.delve = null;
  if (hero.focus === 'delve') return delveTask(state, hero, events);
  if (hero.focus === 'quest') return questTask(state, hero, events);
  return roamTask(state, hero);
}

// Roam: mostly monsters at or below the hero's level, with the odd tougher one.
function roamTask(state, hero) {
  const monster = pickWeighted(state, MONSTERS[hero.region], (m) => {
    const above = m.level - hero.level;
    return above <= 0 ? 3 : above === 1 ? 1.2 : 0.3;
  });
  return { kind: 'roam', monster: monster.id, text: pick(state, monster.tasks), duration: randInt(state, monster.secs[0], monster.secs[1]), elapsed: 0 };
}

function questTask(state, hero, events) {
  const qp = questState(hero);
  if (qp.done >= QUESTS[hero.region].length && !qp.job) {
    qp.job = { title: `${pick(state, ODD_JOBS.jobs)} for ${pick(state, ODD_JOBS.clients)}`, steps: randInt(state, 5, 8) };
  }
  const quest = currentQuest(hero);
  if (!qp.started) {
    qp.started = true;
    qp.step = 0;
    const text = quest.story ? fill(QUEST_TAKEN, { quest: quest.title, notice: quest.notice }) : fill(ODD_JOB_TAKEN, { quest: quest.title });
    emit(hero, events, 'story', text);
  }
  const text = quest.story ? quest.q.steps[qp.step] : pick(state, ODD_JOBS.steps);
  return { kind: 'quest', text, duration: randInt(state, QUEST_STEP_SECONDS[0], QUEST_STEP_SECONDS[1]), elapsed: 0 };
}

function delveTask(state, hero, events) {
  const d = DUNGEONS[hero.region];
  if (!hero.delve) {
    // A run starts at full hit points: a hurt hero makes camp at the door first.
    const max = maxHp(hero);
    if (hero.hp < max) {
      const missing = (max - hero.hp) / max;
      return { kind: 'camp', text: fill(pick(state, CAMP_TASKS), { dungeon: d.name }), duration: Math.round(60 + 240 * missing), elapsed: 0 };
    }
    hero.delve = { region: hero.region, room: 0, rooms: randInt(state, d.rooms[0], d.rooms[1]), potions: DUNGEON_POTIONS, stubborn: false };
    hero.stats.dungeonRuns += 1;
    emit(hero, events, 'story', `${d.name}. ${d.enter}`);
  }
  if (hero.delve.room >= hero.delve.rooms) {
    return { kind: 'boss', text: pick(state, d.boss.tasks), duration: randInt(state, BOSS_SECONDS[0], BOSS_SECONDS[1]), elapsed: 0 };
  }
  const duration = randInt(state, d.secs[0], d.secs[1]);
  if (random50(state)) {
    const m = pick(state, MONSTERS[hero.region]);
    return { kind: 'delve', monster: m.id, text: pick(state, m.tasks), duration, elapsed: 0 };
  }
  const i = randInt(state, 0, d.roomTasks.length - 1);
  return { kind: 'delve', roomTask: i, text: d.roomTasks[i].text, duration, elapsed: 0 };
}
const random50 = (state) => randInt(state, 0, 1) === 1;

// ---------- resolving a finished task ----------

export function resolveTask(state, hero, task, events) {
  switch (task.kind) {
    case 'tavern':
      if (hero.age >= hero.knockedOutUntil) getUp(state, hero, events, pick(state, RECOVERED));
      return;
    case 'travel': {
      hero.region = task.to;
      hero.travelTo = null;
      hero.returning = false;
      hero.delve = null;
      emit(hero, events, 'arrive', REGION_BY_ID[task.to].arrive, { region: task.to });
      return;
    }
    case 'return':
      hero.returning = false;
      return;
    case 'camp':
      hero.hp = maxHp(hero);
      return;
    case 'quest': return resolveQuestStep(state, hero, task, events);
    case 'delve': return resolveRoom(state, hero, task, events);
    case 'boss': return resolveBoss(state, hero, task, events);
    default: return resolveRoam(state, hero, MONSTER_BY_ID[task.monster], events);
  }
}

function getUp(state, hero, events, text, data = {}) {
  hero.knockedOutUntil = null;
  hero.hp = maxHp(hero);
  hero.returning = hero.region !== START_REGION;
  emit(hero, events, 'recovered', text, data);
}

// One roll against one thing. `foe` carries the numbers and the lines:
//   { id, name, level, dc, dmg, xp, gold: [min, max], check, hit[], miss[], crit, fumble,
//     monster (counts for the Bestiary), defeat (the knockout line) }
// Returns true if the hero is still standing.
function encounter(state, hero, foe, events, source) {
  const cls = CLASSES[hero.class];
  const gap = Math.max(0, foe.level - hero.level);
  const grudge = hero.race === 'dwarf' && foe.id && hero.grudges[foe.id] ? GRUDGE_BONUS : 0;
  const wisdom = source === 'quest' ? Math.floor(Math.max(0, mod(hero.abilities.wis)) / 2) : 0; // Wisdom: quest checks
  const bonus = mod(hero.abilities[cls.main]) + proficiency(hero.level) + grudge + wisdom;
  const r = check(state, bonus, foe.dc + gap * OUTMATCHED_DC, { rerollOne: hero.race === 'goblin' });
  hero.stats.tasks += 1;
  if (r.outcome === 'crit') hero.stats.natural20s += 1;
  if (r.outcome === 'fumble') hero.stats.natural1s += 1;

  const share = REWARD[r.outcome];
  const xp = Math.max(1, Math.round(foe.xp * share * levelGapXp(foe.level - hero.level) * xpBonus(state, hero)));
  const gold = Math.max(0, Math.round(randInt(state, foe.gold[0], foe.gold[1]) * share * goldBonus(hero)));
  hero.gold += gold;

  const won = r.outcome === 'crit' || r.outcome === 'hit';
  const firstWin = foe.monster && won && !hero.bestiary[foe.id];
  if (foe.monster && won) hero.bestiary[foe.id] = (hero.bestiary[foe.id] ?? 0) + 1;

  const dodge = Math.min(0.25, 0.05 * Math.max(0, mod(hero.abilities.dex)));
  const die = Math.max(1, Math.round(foe.dmg * (1 + gap * OUTMATCHED_DAMAGE) * WHAT_IF.damage));
  const hurt = takeDamage(hero, warded(cls, taskDamage(state, r.outcome, die, dodge)));

  const line = r.outcome === 'crit' ? `Natural 20 on ${foe.check}. ${foe.crit}`
    : r.outcome === 'fumble' ? `Natural 1 on ${foe.check}. ${foe.fumble}`
    : pick(state, r.outcome === 'hit' ? foe.hit : foe.miss);
  const notes = (r.rerolled ? ' (rerolled a 1)' : '');
  const rollText = `${foe.name}: d20 ${r.die}${notes} + ${r.bonus}${grudge ? ' (grudge)' : ''} = ${r.total} vs DC ${r.dc}${gap ? ` (outmatched by ${gap})` : ''}`;
  const gain = `+${xp} XP` + (gold ? `, ${gold} gp` : '') + (hurt.damage ? `, -${hurt.damage} HP` : '');
  emit(hero, events, 'task', line, { outcome: r.outcome, source, monster: foe.monster ? foe.id : undefined, roll: r, xp, gold, damage: hurt.damage }, { roll: rollText, gain });
  if (firstWin) emit(hero, events, 'bestiary', fill(BESTIARY_NEW, { monster: foe.name }), { monster: foe.id });
  if (hurt.stubborn) emit(hero, events, 'story', fill(STUBBORN, { name: hero.name }));

  if (hero.hp <= 0) knockOut(state, hero, foe, events, source);
  levelUps(state, hero, xp, events);
  return hero.knockedOutUntil == null;
}

// A class ward (the Wizard's) turns aside a share of every hit.
const warded = (cls, damage) => (cls.ward ? Math.round(damage * (1 - cls.ward)) : damage);

// Take damage. The Half-Orc quirk: once per dungeon run, drop to 1 HP instead of 0.
function takeDamage(hero, amount) {
  let damage = Math.min(hero.hp, amount);
  let stubborn = false;
  if (damage >= hero.hp && damage > 0 && hero.race === 'halforc' && hero.delve && !hero.delve.stubborn) {
    hero.delve.stubborn = true;
    stubborn = true;
    damage = hero.hp - 1;
  }
  hero.hp -= damage;
  return { damage, stubborn };
}

function levelUps(state, hero, xp, events) {
  for (const level of gainXp(hero, xp)) {
    emit(hero, events, 'levelup', fill(pick(state, LEVEL_UP), { level, name: hero.name }), { level });
  }
}

function resolveRoam(state, hero, m, events) {
  const foe = { ...m, monster: true, defeat: `Defeated by ${article(m.name)}. ${m.ko}` };
  if (encounter(state, hero, foe, events, 'roam')) rest(state, hero, events);
}

function resolveQuestStep(state, hero, task, events) {
  const qp = questState(hero);
  const quest = currentQuest(hero);
  if (!quest) return; // the board changed under the task (an old save); the next task sorts it out
  const [lo, hi] = baseGold(quest.level);
  const foe = {
    name: quest.title, level: quest.level, check: quest.check,
    dc: baseDc(quest.level), dmg: Math.round(baseDamage(quest.level) * QUEST_DAMAGE),
    xp: Math.round(task.duration * QUEST_XP_PER_SECOND), gold: [lo * QUEST_GOLD, hi * QUEST_GOLD],
    hit: QUEST_LINES.hit, miss: QUEST_LINES.miss, crit: pick(state, QUEST_LINES.crit), fumble: pick(state, QUEST_LINES.fumble),
    defeat: `Knocked out on a job, ${quest.title}. ${pick(state, QUEST_LINES.ko)}`,
  };
  if (!encounter(state, hero, foe, events, 'quest')) return; // knocked out: the step is lost
  qp.step += 1;
  if (qp.step >= quest.steps) finishQuest(state, hero, qp, quest, events);
  if (hero.knockedOutUntil == null) rest(state, hero, events);
}

function finishQuest(state, hero, qp, quest, events) {
  const xp = Math.round(QUEST_DONE_XP * levelGapXp(quest.level - hero.level) * xpBonus(state, hero));
  const gold = Math.round(questDoneGold(quest.level) * goldBonus(hero) * (1 + 0.05 * Math.max(0, mod(hero.abilities.cha)))); // Charisma: better quest rewards
  hero.gold += gold;
  const done = quest.story ? quest.q.done : pick(state, ODD_JOBS.done);
  emit(hero, events, 'questdone', fill(QUEST_DONE, { quest: quest.title, done }), { quest: quest.title, story: quest.story, xp, gold }, { gain: `+${xp} XP, ${gold} gp` });
  qp.step = 0;
  qp.started = false;
  if (quest.story) {
    qp.done += 1;
    hero.stats.quests += 1;
    if (qp.done === STORY_QUESTS && !hero.feats.includes(hero.region)) {
      hero.feats.push(hero.region);
      hero.skillPoints += 1;
      emit(hero, events, 'feat', fill(FEAT, { place: REGION_BY_ID[hero.region].name }), { region: hero.region });
    }
  } else {
    qp.odd += 1;
    qp.job = null;
    hero.stats.oddJobs += 1;
  }
  levelUps(state, hero, xp, events);
}

function resolveRoom(state, hero, task, events) {
  const run = hero.delve;
  if (!run) return;
  const d = DUNGEONS[run.region];
  const m = task.monster ? MONSTER_BY_ID[task.monster] : null;
  const room = m ? null : d.roomTasks[task.roomTask];
  const numbers = { level: d.level, dc: d.dc, dmg: d.dmg, xp: Math.round(task.duration * DELVE_XP_PER_SECOND), gold: [d.gold[0] * DELVE_GOLD, d.gold[1] * DELVE_GOLD] };
  const foe = m
    ? { ...m, ...numbers, monster: true, defeat: `Defeated by ${article(m.name)} in ${d.name}. ${m.ko}` }
    : { name: d.name, check: 'the dungeon', ...numbers, hit: [room.hit], miss: [room.miss], crit: d.crit, fumble: d.fumble, defeat: `Knocked out in ${d.name}. ${d.ko}` };
  if (!encounter(state, hero, foe, events, 'delve')) return; // knocked out: the run is lost
  run.room += 1;
  drinkPotion(state, hero, events);
}

// The boss: roll until the hero has landed `hits` blows or has no hit points left.
function resolveBoss(state, hero, task, events) {
  const run = hero.delve;
  if (!run) return;
  const d = DUNGEONS[run.region];
  const b = d.boss;
  const cls = CLASSES[hero.class];
  const gap = Math.max(0, d.level - hero.level);
  const grudge = hero.race === 'dwarf' && hero.grudges[b.id] ? GRUDGE_BONUS : 0;
  const bonus = mod(hero.abilities[cls.main]) + proficiency(hero.level) + grudge;
  const dc = b.dc + gap * OUTMATCHED_DC;
  const die = Math.max(1, Math.round(b.dmg * (1 + gap * OUTMATCHED_DAMAGE) * WHAT_IF.damage));
  const dodge = Math.min(0.25, 0.05 * Math.max(0, mod(hero.abilities.dex)));

  let landed = 0;
  let damage = 0;
  let stubborn = false;
  const dice = [];
  let rerolled = false; // the Goblin quirk covers the first natural 1 of the task
  if (hero.race === 'dragonborn') {
    landed = 1; // Breath Weapon: a free hit to open
    emit(hero, events, 'story', fill(BREATH, { name: hero.name, breath: pick(state, BREATHS) }));
  }
  while (landed < b.hits && hero.hp > 0) {
    const r = check(state, bonus, dc, { rerollOne: hero.race === 'goblin' && !rerolled });
    rerolled ||= r.rerolled;
    dice.push(r.die);
    if (r.outcome === 'crit') hero.stats.natural20s += 1;
    if (r.outcome === 'fumble') hero.stats.natural1s += 1;
    landed += r.outcome === 'crit' ? 2 : r.outcome === 'hit' ? 1 : 0;
    let dealt = warded(cls, taskDamage(state, r.outcome, die, dodge));
    if (landed >= b.hits) dealt = Math.min(dealt, hero.hp - 1); // the winning blow is never also the losing one
    const hurt = takeDamage(hero, dealt);
    damage += hurt.damage;
    stubborn ||= hurt.stubborn;
    if (hero.hp > 0 && landed < b.hits) drinkPotion(state, hero, events);
  }
  hero.stats.tasks += 1;
  const won = landed >= b.hits;
  const xp = Math.max(1, Math.round(BOSS_XP * (won ? 1 : BOSS_LOSS_SHARE) * levelGapXp(d.level - hero.level) * xpBonus(state, hero)));
  const gold = won ? Math.round(bossGold(d.level) * goldBonus(hero)) : 0;
  hero.gold += gold;
  const rollText = `${b.name}: ${dice.length} roll${dice.length === 1 ? '' : 's'} (${dice.join(', ')}) + ${bonus}${grudge ? ' (grudge)' : ''} vs DC ${dc}${gap ? ` (outmatched by ${gap})` : ''}, ${Math.min(landed, b.hits)} of ${b.hits} blows landed`;
  const gain = `+${xp} XP` + (gold ? `, ${gold} gp` : '') + (damage ? `, -${damage} HP` : '');
  const line = won ? b.win : `${midSentence(b.name)[0].toUpperCase() + midSentence(b.name).slice(1)} is still standing, and the hero is not.`;
  emit(hero, events, 'task', line, { outcome: won ? 'boss' : 'miss', source: 'boss', boss: b.id, won, xp, gold, damage }, { roll: rollText, gain });
  if (stubborn) emit(hero, events, 'story', fill(STUBBORN, { name: hero.name }));

  if (won) {
    const first = !(hero.dungeonClears[run.region] > 0);
    hero.dungeonClears[run.region] = (hero.dungeonClears[run.region] ?? 0) + 1;
    hero.stats.dungeonClears += 1;
    hero.delveFails[run.region] = 0;
    hero.delve = null;
    emit(hero, events, 'cleared', fill(DUNGEON_CLEARED[first ? 0 : 1], { dungeon: d.name }), { region: run.region, first });
    if (first) {
      const chapter = CHAPTERS[run.region];
      hero.unread.push(run.region);
      emit(hero, events, 'chapter', `Chapter ${chapter.n}, ${chapter.title}. ${chapter.page} is recovered.`, { region: run.region, chapter: chapter.n });
      const next = REGIONS[REGION_INDEX[run.region] + 1];
      if (next) emit(hero, events, 'unlock', fill(REGION_OPEN, { place: next.name }), { region: next.id });
    }
  } else {
    knockOut(state, hero, { id: b.id, level: d.level, dc: b.dc, defeat: `Defeated by ${midSentence(b.name)}. ${b.ko}` }, events, 'boss');
  }
  levelUps(state, hero, xp, events);
  if (hero.knockedOutUntil == null) rest(state, hero, events);
}

// How embarrassing it is to lose to something: lower level first, then lower DC.
function foeRank(id) {
  const m = MONSTER_BY_ID[id];
  if (m) return [m.level, m.dc];
  const d = Object.values(DUNGEONS).find((x) => x.boss.id === id);
  return d ? [d.level + 1, d.boss.dc] : null;
}

// At 0 HP the hero is carried back to The Wobbly Griffin. A dungeon run or a quest step is lost,
// and time. Nothing else: XP, gold, and gear are untouched.
function knockOut(state, hero, foe, events, source) {
  hero.hp = 0;
  hero.stats.knockouts += 1;
  if (foe.id) {
    hero.grudges[foe.id] = true;
    const mine = foeRank(foe.id);
    const worst = hero.stats.mostEmbarrassingDefeat && foeRank(hero.stats.mostEmbarrassingDefeat);
    if (mine && (!worst || mine[0] < worst[0] || (mine[0] === worst[0] && mine[1] < worst[1]))) hero.stats.mostEmbarrassingDefeat = foe.id;
  }
  // Constitution and the Elf quirk shorten the stay.
  let seconds = recoverySeconds(hero.level) * (1 - 0.03 * Math.max(0, mod(hero.abilities.con)));
  if (hero.race === 'elf') seconds *= 0.8;
  hero.knockedOutUntil = hero.age + Math.round(seconds);

  const inDungeon = source === 'delve' || source === 'boss';
  const lost = inDungeon ? 'run' : source === 'quest' ? 'step' : null;
  const region = hero.region;
  let text = foe.defeat + (lost === 'run' ? ' ' + RUN_LOST : lost === 'step' ? ' ' + STEP_LOST : '');
  emit(hero, events, 'knockout', text, { monster: foe.id, source, lost, region, seconds: Math.round(seconds) });

  if (inDungeon) {
    hero.delve = null;
    const fails = (hero.delveFails[region] ?? 0) + 1;
    hero.delveFails[region] = fails;
    // Confidence safeguard: three in a row in one dungeon and the hero roams instead.
    if (fails >= CONFIDENCE_LIMIT && hero.focus === 'delve') {
      hero.focus = 'roam';
      hero.delveFails[region] = 0;
      emit(hero, events, 'confidence', fill(CONFIDENCE, { dungeon: DUNGEONS[region].name, name: hero.name }), { region });
    }
  }
}

// A little HP comes back after every Roam or Quest task, and a potion is drunk if things look thin.
function rest(state, hero, events) {
  const max = maxHp(hero);
  hero.hp = Math.min(max, hero.hp + restHeal(max, hero.hp));
  drinkPotion(state, hero, events);
}

// Potions are bought and drunk on the spot when gold allows. A dungeon run carries a fixed number.
function drinkPotion(state, hero, events) {
  const max = maxHp(hero);
  const cost = potionPrice(hero.level);
  if (hero.hp >= max * POTION_BELOW || hero.gold < cost) return;
  if (hero.delve) {
    if (hero.delve.potions <= 0) return;
    hero.delve.potions -= 1;
  }
  hero.gold -= cost;
  hero.hp = Math.min(max, hero.hp + Math.ceil(max * POTION_HEAL));
  emit(hero, events, 'potion', fill(pick(state, POTION), { cost }), { cost });
}

// ---------- standing orders: the only things the player changes ----------

// Roam, Quest, or Delve. Takes effect when the current task ends. Choosing Delve again after the
// confidence safeguard gives the hero a fresh three attempts.
export function setFocus(hero, focus) {
  if (!FOCUSES.includes(focus)) return false;
  hero.focus = focus;
  if (focus === 'delve') hero.delveFails[hero.region] = 0;
  return true;
}

// Walk to an open region when the current task ends. Ordering the region the hero is already in
// cancels a journey that has not started.
export function orderTravel(hero, regionId) {
  if (!regionOpen(hero, regionId)) return false;
  hero.travelTo = regionId === hero.region ? null : regionId;
  return true;
}

export function clericFee(hero) {
  return hero.knockedOutUntil == null ? null : skipFee(hero.level, Math.max(0, hero.knockedOutUntil - hero.age));
}

// Pay the tavern cleric to end a knockout now. Returns the fee paid, or null if the hero is not
// knocked out or cannot afford it.
export function payCleric(state, hero) {
  const fee = clericFee(hero);
  if (fee == null || hero.gold < fee) return null;
  hero.gold -= fee;
  getUp(state, hero, [], fill(pick(state, CLERIC_PAID), { cost: fee }), { cost: fee });
  hero.currentTask = null;
  return fee;
}

// Display name for whatever a knockout or Bestiary entry refers to.
export const foeName = (id) => MONSTER_BY_ID[id]?.name ?? BOSS_BY_ID[id]?.name ?? null;
