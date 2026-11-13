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
//   rift     one floor of the Planar Rifts (level 20 only), one roll
//
// The player's standing orders (focus, travel, paying the cleric) are the three functions at the
// bottom. They only change the save; the simulator calls the same ones.
//
// Skills (Phase 4) and gear (Phase 5) reach in here through `modsOf(hero)`: `sk.n` holds the passive
// numbers from learned skills (`skillMods`, skills.js) and worn gear (`gearMods`, loot.js), already
// added up, and `sk.sigs` the signature moves by type. A move that fires writes
// its own Chronicle line through `fire`. Moves that can only be used so often keep count in the
// dungeon run (`hero.delve.used`), the quest (`used` in its progress), the boss fight, or a
// cooldown clock (`hero.cooldowns`).
//
// Loot (Phase 5): `loot()` below is the one place gear arrives. A monster beaten on the road
// drops a piece rarely, a dungeon room cleared cleanly sometimes, every finished quest and every
// beaten boss always. The piece equips itself if it is better and is sold if it is not.
//
// The tavern (Phase 6) reaches in through `tavernMods(state)` (js/tavern.js): the room adds to
// knockout recovery and the stable to travel, the same numbers boots and skills use, and the
// notice board makes odd jobs pay better. A dungeon's first clear by any hero earns a trophy.
// After level 20 the Planar Rifts open (focus 'rift') and XP keeps counting toward Paragon ranks.

import { MONSTERS, MONSTER_BY_ID } from '../data/monsters.js';
import { CLASSES } from '../data/classes.js';
import { REGIONS, REGION_BY_ID, REGION_INDEX, START_REGION } from '../data/regions.js';
import { QUESTS, ODD_JOBS, QUEST_LINES } from '../data/quests.js';
import { DUNGEONS, BOSS_BY_ID, BREATHS } from '../data/dungeons.js';
import { CHAPTERS } from '../data/story.js';
import {
  LEVEL_UP, TAVERN_TASKS, RECOVERED, POTION, BESTIARY_NEW, TRAVEL_TASKS, RETURN_TASK, CAMP_TASKS,
  QUEST_TAKEN, ODD_JOB_TAKEN, QUEST_DONE, FEAT, RUN_LOST, STEP_LOST, DUNGEON_CLEARED, REGION_OPEN,
  CONFIDENCE, STUBBORN, BREATH, CLERIC_PAID, SUBCLASS_READY, ABILITY_READY,
} from '../data/chronicle.js';
import {
  ABILITY_LEVELS, INT_XP, random,
  check, mod, pick, pickWeighted, proficiency, randInt, taskDamage, recoverySeconds, levelGapXp, restHeal,
  REWARD, POTION_BELOW, POTION_HEAL, potionPrice, skipFee, baseDc, baseDamage, baseGold,
  OUTMATCHED_DC, OUTMATCHED_DAMAGE, GRUDGE_BONUS, WHAT_IF, grownDc, grownDamage,
  QUEST_STEP_SECONDS, QUEST_XP_PER_SECOND, QUEST_DONE_XP, QUEST_DAMAGE, QUEST_GOLD, questDoneGold, STORY_QUESTS,
  DELVE_XP_PER_SECOND, DELVE_GOLD, BOSS_SECONDS, BOSS_XP, BOSS_LOSS_SHARE, bossGold, DUNGEON_POTIONS, CONFIDENCE_LIMIT,
  TRAVEL_SECONDS_PER_REGION, RETURN_SECONDS_PER_REGION, LOOT, MAX_LEVEL, RIFT, sellPrice,
} from './rules.js';
import { chronicle, gainXp, maxHp, regionOpen } from './hero.js';
import { skillMods, SUBCLASS_LEVEL } from './skills.js';
import { gearMods, rollItem, weakestSlot, legendItem, wearsLegend, receive, dropChance, startingCloak, describe, rarityName, flavorOf, SLOT_BY_ID } from './loot.js';
import { displayLegend } from './tavern.js';
import { LOOT_LINES, LEGENDARIES, MILESTONES, TITLES } from '../data/loot.js';
import { RIFT_TEXT, TROPHIES, TROPHY_HUNG, TROPHY_WAITING, PARAGON_LINE, RIFTS_OPEN } from '../data/tavern.js';
import { tavernMods, recordTrophy, paragonRank, paragonTitle } from './tavern.js';

export const FOCUSES = ['roam', 'quest', 'delve', 'rift'];

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const article = (name) => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;
const midSentence = (name) => name.replace(/^The /, 'the ');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Record something that happened: it goes in the list `advance` returns and in the Chronicle.
function emit(hero, events, type, text, data = {}, lineExtra = {}) {
  events.push({ type, at: hero.age, text, ...data });
  chronicle(hero, data.outcome ?? type, text, lineExtra);
}

// Skills and gear change the same numbers, so the rules read them together: `sk.n` is every
// passive number from learned skills plus whatever the hero is wearing, and `sk.sigs` the
// signature moves. Rebuilt only when a skill is learned or a slot's piece changes.
const modsCache = new WeakMap();
function modsOf(hero) {
  const sk = skillMods(hero);
  const g = gearMods(hero);
  const hit = modsCache.get(hero);
  if (hit && hit.sk === sk && hit.g === g) return hit.mods;
  const n = { ...sk.n };
  for (const [k, v] of Object.entries(g)) n[k] += v;
  const mods = { n, sigs: sk.sigs };
  modsCache.set(hero, { sk, g, mods });
  return mods;
}

// ---------- loot: something was found ----------

// Make a piece (or take the dungeon's named Legendary), hand it over, and write it down. A better
// piece goes on at once; whichever piece loses is sold. Sticky Fingers and its kind may turn up
// a second piece wherever one was given (never from a monster on the road, and never a third).
//   opts: { level, source ('roam' | 'room' | 'chest' | 'quest' | 'odd' | 'boss'), slot, legend, second,
//           quality (added to the skills' own), legendLevel (a named Legendary found away from its dungeon) }
function loot(state, hero, events, opts) {
  const sk = modsOf(hero);
  const { slot, item } = opts.legend ? legendItem(opts.legend, opts.legendLevel) : rollItem(state, hero, { ...opts, quality: sk.n.quality + (opts.quality ?? 0) });
  const before = maxHp(hero);
  const got = receive(hero, slot, item);
  // A named Legendary that lost its place goes into the tavern's glass case, unless the case has one
  // as good already: then it is sold like anything else.
  const shelved = got.kept ? displayLegend(state, hero, got.kept) : false;
  if (got.kept && !shelved) { got.gold = sellPrice(got.kept); hero.gold += got.gold; hero.stats.soldFor += got.gold; }
  const gained = maxHp(hero) - before; // a better helm adds its hit points at once
  if (gained > 0 && hero.knockedOutUntil == null) hero.hp += gained;
  const values = { item: item.name, old: got.old?.name, gold: got.gold, slot: SLOT_BY_ID[slot].name, name: hero.name, flavor: flavorOf(item) };
  values.gold = got.gold;
  const oldShelved = got.equipped && got.old?.legend && shelved;
  const text = item.legend && !got.equipped ? fill(shelved ? LOOT_LINES.legendShelved : LOOT_LINES.legendSpare, values)
    : item.legend ? fill(LOOT_LINES.legend, values) + (got.old ? ' ' + fill(oldShelved ? LOOT_LINES.shelved : LOOT_LINES.legendOver, values) : '')
    : !got.equipped ? fill(pick(state, LOOT_LINES.sold), values)
    : oldShelved ? fill(LOOT_LINES.upgradeShelved, values)
    : got.old ? fill(pick(state, LOOT_LINES.upgrade), values)
    : fill(pick(state, LOOT_LINES.first), values);
  const does = describe(slot, item);
  events.push({ type: 'loot', at: hero.age, text, slot, tier: item.tier, level: item.level, name: item.name, equipped: got.equipped, gold: got.gold, source: opts.source, legend: item.legend });
  chronicle(hero, got.equipped ? 'upgrade' : 'sold', text, { roll: `${rarityName(item)}, level ${item.level}. ${does[0].toUpperCase() + does.slice(1)}`, gain: got.gold ? `+${got.gold} gp` : undefined, tier: item.tier });
  if (opts.second || opts.legend || opts.source === 'roam') return;
  for (const s of sk.sigs.bonusLoot ?? []) {
    if (random(state) >= s.chance) continue;
    fire(hero, events, s);
    loot(state, hero, events, { ...opts, slot: null, second: true });
  }
}

// Humans learn 5% faster, Intelligence adds a little XP, retired legends (Phase 6) add theirs, and
// skills add theirs: `source` is 'roam', 'quest', 'delve', or 'boss'.
const KEY = { roam: 'Roam', quest: 'Quest', delve: 'Delve', boss: 'Boss', rift: 'Delve' }; // the Rifts count as a dungeon
const xpBonus = (state, hero, sk, source) => 1 + (hero.race === 'human' ? 0.05 : 0) + INT_XP * Math.max(0, mod(hero.abilities.int)) + (state.tavern.legacyBonus ?? 0) + sk.n.xp + sk.n['xp' + KEY[source]];
const goldBonus = (hero, sk, source) => (1 + 0.05 * mod(hero.abilities.cha)) * (1 + sk.n.gold + sk.n['gold' + KEY[source]]);
const quicker = (seconds, share, least = 5) => Math.max(least, Math.round(seconds * (1 - Math.min(0.75, share))));

// ---------- signature moves: how often, and the line they write ----------

const MOVE_SCOPE = { clearRoom: 'run', skipRoom: 'run', roomHeal: 'run' }; // moves that are always per dungeon run
const MAX_DAMAGE_CUT = 0.6; // skills and wards together never turn aside more than this share of a hit
const MIN_ROOMS = 4;

// `ctx` says what the hero is in the middle of: { source, qp (quest progress), fight (per boss fight counts) }.
function ready(hero, s, ctx) {
  const uses = s.uses ?? 1;
  switch (s.scope ?? MOVE_SCOPE[s.type]) {
    case 'run': return !!hero.delve && (hero.delve.used?.[s.id] ?? 0) < uses;
    case 'boss': return !!ctx.fight && (ctx.fight[s.id] ?? 0) < uses;
    case 'quest': return !!ctx.qp && (ctx.qp.used?.[s.id] ?? 0) < uses;
    case 'cooldown': return (hero.cooldowns[s.id] ?? 0) <= hero.age;
    default: return true;
  }
}
function spend(hero, s, ctx) {
  const bump = (counts) => { counts[s.id] = (counts[s.id] ?? 0) + 1; };
  switch (s.scope ?? MOVE_SCOPE[s.type]) {
    case 'run': bump(hero.delve.used ??= {}); break;
    case 'boss': bump(ctx.fight); break;
    case 'quest': bump(ctx.qp.used ??= {}); break;
    case 'cooldown': hero.cooldowns[s.id] = hero.age + s.seconds; break;
    default:
  }
}
// A signature move fired: its own Chronicle line, and an event the summary can count.
function fire(hero, events, s, data = {}, gain) {
  emit(hero, events, 'skill', fill(s.fire, { name: hero.name }), { skill: s.id, ...data }, gain ? { gain } : {});
}
const failed = (r) => r.outcome === 'miss' || r.outcome === 'fumble';

// One d20 roll with everything skills can do to it: advantage, a second try, a failure overruled.
function rollCheck(state, hero, sk, ctx, bonus, dc, events, rerollOne) {
  const critFrom = 20 - sk.n.crit;
  const adv = (sk.sigs.advantage ?? []).find((s) => (s.scope === 'arrive' ? hero.fresh : s.scope === 'quest' ? ctx.qp?.step === 0 && ready(hero, s, ctx) : ready(hero, s, ctx)));
  hero.fresh = false;
  if (adv) {
    if (adv.scope !== 'arrive') spend(hero, adv, ctx);
    fire(hero, events, adv);
  }
  let r = check(state, bonus, dc, { rerollOne, critFrom, advantage: !!adv });
  if (failed(r)) {
    const again = (sk.sigs.reroll ?? []).find((s) => (s.on !== 'fumble' || r.outcome === 'fumble') && ready(hero, s, ctx));
    if (again) {
      spend(hero, again, ctx);
      fire(hero, events, again);
      const first = r.die;
      r = check(state, bonus, dc, { critFrom });
      r.first = first;
    }
  }
  if (failed(r)) {
    const turn = (sk.sigs.turn ?? []).find((s) => random(state) < s.chance);
    if (turn) {
      r.outcome = 'hit';
      r.turned = true;
      fire(hero, events, turn);
    }
  }
  return r;
}
const rollNotes = (r) => (r.rerolled ? ' (rerolled a 1)' : '') + (r.dropped != null ? ` (advantage, over a ${r.dropped})` : '') + (r.first != null ? ` (second try, after a ${r.first})` : '') + (r.turned ? ' (overruled)' : '');

// Wards and skills turn aside a share of a hit. `trap` marks a dungeon room with no monster in it.
function soften(cls, sk, source, trap, damage) {
  const cut = Math.min(MAX_DAMAGE_CUT, (cls.ward ?? 0) + sk.n.dr + sk.n['dr' + KEY[source]] + (trap ? sk.n.drTrap : 0));
  return cut ? Math.round(damage * (1 - cut)) : damage;
}
// The move, if any, that makes a failed roll cost no hit points.
const negated = (state, sk, r) => (sk.sigs.negate ?? []).find((s) => (s.on !== 'fumble' || r.outcome === 'fumble') && (s.chance >= 1 || random(state) < s.chance)) ?? null;
const dodgeChance = (hero, sk) => Math.min(0.5, Math.min(0.25, 0.05 * Math.max(0, mod(hero.abilities.dex))) + sk.n.dodge);

// Second Wind and its kind: hit points back in a dungeon when things look thin.
function secondWinds(hero, sk, ctx, events) {
  const max = maxHp(hero);
  for (const s of sk.sigs.secondWind ?? []) {
    if (hero.hp >= max * s.below || !ready(hero, s, ctx)) continue;
    spend(hero, s, ctx);
    const before = hero.hp;
    hero.hp = Math.min(max, hero.hp + Math.ceil(max * s.heal));
    fire(hero, events, s, { heal: hero.hp - before }, `+${hero.hp - before} HP`);
  }
}

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
    return { kind: 'travel', to: hero.travelTo, text: fill(pick(state, TRAVEL_TASKS), { place: REGION_BY_ID[hero.travelTo].name }), duration: quicker(hops * TRAVEL_SECONDS_PER_REGION, travelShare(state, hero), 30), elapsed: 0 };
  }
  hero.travelTo = null;

  if (hero.returning) {
    const far = REGION_INDEX[hero.region];
    if (far === 0) hero.returning = false;
    else return { kind: 'return', text: fill(RETURN_TASK, { place: REGION_BY_ID[hero.region].name }), duration: quicker(Math.min(600, far * RETURN_SECONDS_PER_REGION), travelShare(state, hero), 30), elapsed: 0 };
  }

  if (hero.focus !== 'delve' || hero.delve?.region !== hero.region) hero.delve = null;
  if (hero.focus !== 'rift' || hero.level < MAX_LEVEL) hero.rift = null;
  if (hero.focus === 'rift' && hero.level >= MAX_LEVEL) return riftTask(state, hero, events);
  if (hero.focus === 'delve') return delveTask(state, hero, events);
  if (hero.focus === 'quest') return questTask(state, hero, events);
  return roamTask(state, hero);
}

// Boots, skills, and the tavern's stable all shorten the road.
const travelShare = (state, hero) => modsOf(hero).n.travel + tavernMods(state).travel;

// Roam: mostly monsters at or below the hero's level, with the odd tougher one.
function roamTask(state, hero) {
  const monster = pickWeighted(state, MONSTERS[hero.region], (m) => {
    const above = m.level - hero.level;
    return above <= 0 ? 3 : above === 1 ? 1.2 : 0.3;
  });
  return { kind: 'roam', monster: monster.id, text: pick(state, monster.tasks), duration: quicker(randInt(state, monster.secs[0], monster.secs[1]), modsOf(hero).n.speedRoam), elapsed: 0 };
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
    qp.used = {};
    const text = quest.story ? fill(QUEST_TAKEN, { quest: quest.title, notice: quest.notice }) : fill(ODD_JOB_TAKEN, { quest: quest.title });
    emit(hero, events, 'story', text);
  }
  const text = quest.story ? quest.q.steps[qp.step] : pick(state, ODD_JOBS.steps);
  // `worth` is the step's full length: XP is paid on it, so a faster step pays the same.
  const worth = randInt(state, QUEST_STEP_SECONDS[0], QUEST_STEP_SECONDS[1]);
  return { kind: 'quest', text, worth, duration: quicker(worth, modsOf(hero).n.speedQuest), elapsed: 0 };
}

function delveTask(state, hero, events) {
  const d = DUNGEONS[hero.region];
  const sk = modsOf(hero);
  if (!hero.delve) {
    // A run starts at full hit points: a hurt hero makes camp at the door first.
    const max = maxHp(hero);
    if (hero.hp < max) {
      const missing = (max - hero.hp) / max;
      return { kind: 'camp', text: fill(pick(state, CAMP_TASKS), { dungeon: d.name }), duration: Math.round(60 + 240 * missing), elapsed: 0 };
    }
    const cut = sk.sigs.shortcut?.[0];
    const rooms = Math.max(MIN_ROOMS, randInt(state, d.rooms[0], d.rooms[1]) - sk.n.rooms - (cut?.rooms ?? 0));
    hero.delve = { region: hero.region, room: 0, rooms, potions: DUNGEON_POTIONS + sk.n.potions, stubborn: false, used: {}, hidden: null };
    // A hidden room, if a skill finds one this run, is paid out when the hero reaches it.
    const finder = (sk.sigs.hiddenRoom ?? []).find((s) => random(state) < s.chance);
    if (finder) hero.delve.hidden = { room: randInt(state, 0, rooms - 1), by: finder.id };
    hero.fresh = true;
    hero.stats.dungeonRuns += 1;
    emit(hero, events, 'story', `${d.name}. ${d.enter}`);
    if (cut) fire(hero, events, cut);
  }
  if (hero.delve.room >= hero.delve.rooms) {
    return { kind: 'boss', text: pick(state, d.boss.tasks), duration: randInt(state, BOSS_SECONDS[0], BOSS_SECONDS[1]), elapsed: 0 };
  }
  const worth = randInt(state, d.secs[0], d.secs[1]);
  const duration = quicker(worth, sk.n.speedDelve);
  if (random50(state)) {
    const m = pick(state, MONSTERS[hero.region]);
    return { kind: 'delve', monster: m.id, text: pick(state, m.tasks), worth, duration, elapsed: 0 };
  }
  const i = randInt(state, 0, d.roomTasks.length - 1);
  return { kind: 'delve', roomTask: i, text: d.roomTasks[i].text, worth, duration, elapsed: 0 };
}
const random50 = (state) => randInt(state, 0, 1) === 1;

// The Planar Rifts: one floor per task, wherever the hero happens to be standing.
function riftTask(state, hero, events) {
  if (!hero.rift) {
    hero.rift = { floor: 1, potions: DUNGEON_POTIONS + modsOf(hero).n.potions }; // potions are carried in, as into a dungeon
    hero.fresh = true;
    hero.stats.riftRuns = (hero.stats.riftRuns ?? 0) + 1;
    emit(hero, events, 'story', RIFT_TEXT.enter);
  }
  const worth = randInt(state, RIFT.secs[0], RIFT.secs[1]);
  return { kind: 'rift', floor: hero.rift.floor, text: pick(state, RIFT_TEXT.tasks), worth, duration: quicker(worth, modsOf(hero).n.speedDelve), elapsed: 0 };
}

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
      hero.fresh = true;
      emit(hero, events, 'arrive', REGION_BY_ID[task.to].arrive, { region: task.to });
      return;
    }
    case 'return':
      hero.returning = false;
      hero.fresh = true;
      return;
    case 'camp':
      hero.hp = maxHp(hero);
      return;
    case 'quest': return resolveQuestStep(state, hero, task, events);
    case 'delve': return resolveRoom(state, hero, task, events);
    case 'boss': return resolveBoss(state, hero, task, events);
    case 'rift': return resolveRiftFloor(state, hero, task, events);
    default: return resolveRoam(state, hero, MONSTER_BY_ID[task.monster], events);
  }
}

function getUp(state, hero, events, text, data = {}) {
  hero.knockedOutUntil = null;
  hero.hp = maxHp(hero);
  hero.returning = hero.region !== START_REGION;
  hero.fresh = !hero.returning;
  emit(hero, events, 'recovered', text, data);
}

// One roll against one thing. `foe` carries the numbers and the lines:
//   { id, name, level, dc, dmg, xp, gold: [min, max], check, hit[], miss[], crit, fumble,
//     monster (counts for the Bestiary), trap (a dungeon room with no monster), defeat (the knockout line) }
// Returns { ok: the hero is still standing, outcome: 'crit' | 'hit' | 'miss' | 'fumble' }.
function encounter(state, hero, foe, events, source, ctx = { source }) {
  const cls = CLASSES[hero.class];
  const sk = modsOf(hero);
  const gap = Math.max(0, foe.level - hero.level);
  const grudge = hero.race === 'dwarf' && foe.id && hero.grudges[foe.id] ? GRUDGE_BONUS : 0;
  const wisdom = source === 'quest' ? Math.floor(Math.max(0, mod(hero.abilities.wis)) / 2) : 0; // Wisdom: quest checks
  const bonus = mod(hero.abilities[cls.main]) + proficiency(hero.level) + grudge + wisdom + sk.n.roll + sk.n['roll' + KEY[source]];
  const dc = foe.dc + grownDc(foe.level) + gap * OUTMATCHED_DC;

  // The roll, unless a move settles the matter first.
  let r;
  let unhurt = false;
  const auto = (sk.sigs.autoWin ?? []).find((s) => s.source === source && random(state) < s.chance);
  if (auto) {
    r = { die: null, bonus, total: null, dc, outcome: 'hit', auto: true };
    unhurt = true;
    fire(hero, events, auto);
  } else {
    r = rollCheck(state, hero, sk, ctx, bonus, dc, events, hero.race === 'goblin');
    if (failed(r) && source === 'delve') {
      const blast = (sk.sigs.clearRoom ?? []).find((s) => ready(hero, s, ctx));
      if (blast) {
        spend(hero, blast, ctx);
        r.outcome = 'hit';
        r.cleared = true;
        unhurt = true;
        fire(hero, events, blast);
      }
    }
  }
  hero.stats.tasks += 1;
  if (r.die === 20) hero.stats.natural20s += 1;
  if (r.die === 1) hero.stats.natural1s += 1;

  const after = []; // moves that fire on the result; their lines follow the task's own
  const share = REWARD[r.outcome] + (r.outcome === 'crit' ? sk.n.critReward : failed(r) ? sk.n.missReward : 0);
  let xp = Math.max(1, Math.round(foe.xp * share * levelGapXp(foe.level - hero.level) * xpBonus(state, hero, sk, source)));
  let gold = Math.max(0, Math.round(randInt(state, foe.gold[0], foe.gold[1]) * share * goldBonus(hero, sk, source)));
  let mend = 0;
  if (r.outcome === 'crit') {
    for (const s of sk.sigs.onCrit ?? []) {
      xp += Math.round(xp * (s.xp ?? 0));
      gold += Math.round(gold * (s.gold ?? 0));
      mend += s.heal ?? 0;
      after.push(s);
    }
  }
  hero.gold += gold;

  const won = r.outcome === 'crit' || r.outcome === 'hit';
  const firstWin = foe.monster && won && !hero.bestiary[foe.id];
  if (foe.monster && won) hero.bestiary[foe.id] = (hero.bestiary[foe.id] ?? 0) + 1;

  let dealt = 0;
  if (!unhurt) {
    const die = Math.max(1, Math.round(foe.dmg * grownDamage(foe.level) * (1 + gap * OUTMATCHED_DAMAGE) * WHAT_IF.damage));
    dealt = soften(cls, sk, source, !!foe.trap, taskDamage(state, r.outcome, die, dodgeChance(hero, sk)));
    if (dealt > 0 && failed(r)) {
      const block = negated(state, sk, r);
      if (block) { dealt = 0; after.push(block); }
    }
  }
  const hurt = takeDamage(hero, dealt, sk, ctx);
  if (hurt.saved) after.push(hurt.saved);
  if (mend && hero.hp > 0) hero.hp = Math.min(maxHp(hero), hero.hp + Math.ceil(maxHp(hero) * mend));

  const line = r.outcome === 'crit' ? `Natural ${r.die} on ${foe.check}. ${foe.crit}`
    : r.outcome === 'fumble' ? `Natural 1 on ${foe.check}. ${foe.fumble}`
    : pick(state, r.outcome === 'hit' ? foe.hit : foe.miss);
  const rollText = r.auto ? `${foe.name}: no roll needed`
    : `${foe.name}: d20 ${r.die}${rollNotes(r)} + ${r.bonus}${grudge ? ' (grudge)' : ''} = ${r.total} vs DC ${r.dc}${gap ? ` (outmatched by ${gap})` : ''}${r.cleared ? ' (cleared anyway)' : ''}`;
  const gain = `+${xp} XP` + (gold ? `, ${gold} gp` : '') + (hurt.damage ? `, -${hurt.damage} HP` : '');
  emit(hero, events, 'task', line, { outcome: r.outcome, source, monster: foe.monster ? foe.id : undefined, roll: r, xp, gold, damage: hurt.damage }, { roll: rollText, gain });
  if (firstWin) emit(hero, events, 'bestiary', fill(BESTIARY_NEW, { monster: foe.name }), { monster: foe.id });
  if (hurt.stubborn) emit(hero, events, 'story', fill(STUBBORN, { name: hero.name }));
  for (const s of after) fire(hero, events, s);

  if (hero.hp <= 0) knockOut(state, hero, foe, events, source);
  levelUps(state, hero, xp, events);
  return { ok: hero.knockedOutUntil == null, outcome: r.outcome };
}

// Take damage. Two things can keep a hero up at the last moment: the Half-Orc quirk (once per
// dungeon run, 1 HP instead of 0) and a skill of the same kind, which may leave more than 1.
function takeDamage(hero, amount, sk, ctx) {
  let damage = Math.min(hero.hp, amount);
  let stubborn = false;
  let saved = null;
  if (damage >= hero.hp && damage > 0) {
    if (hero.race === 'halforc' && hero.delve && !hero.delve.stubborn) {
      hero.delve.stubborn = true;
      stubborn = true;
      damage = hero.hp - 1;
    } else {
      saved = (sk.sigs.cheatDeath ?? []).find((s) => ready(hero, s, ctx)) ?? null;
      if (saved) {
        spend(hero, saved, ctx);
        damage = hero.hp - Math.max(1, Math.ceil(maxHp(hero) * (saved.heal ?? 0))); // may be negative: the move leaves the hero better off
      }
    }
  }
  hero.hp -= damage;
  return { damage: Math.max(0, damage), stubborn, saved };
}

function levelUps(state, hero, xp, events) {
  for (const level of gainXp(hero, xp)) {
    emit(hero, events, 'levelup', fill(pick(state, LEVEL_UP), { level, name: hero.name }), { level });
    if (level === SUBCLASS_LEVEL && !hero.subclass) emit(hero, events, 'growth', SUBCLASS_READY, { waiting: 'subclass' });
    if (ABILITY_LEVELS.includes(level)) emit(hero, events, 'growth', ABILITY_READY, { waiting: 'ability' });
    // Milestones on the sprite: a cloak at 5, the class emblem at 10, a wisp at 15, a glow at 20.
    if (level === LOOT.cloakLevel && !hero.gear.cloak) hero.gear.cloak = startingCloak();
    if (MILESTONES[level]) emit(hero, events, 'milestone', fill(MILESTONES[level], { name: hero.name, title: TITLES[hero.class] }), { level });
    if (level === MAX_LEVEL) emit(hero, events, 'story', fill(RIFTS_OPEN, { name: hero.name }), { rifts: true });
  }
  // Past level 20, XP keeps counting toward Paragon ranks: titles and nothing else.
  if (hero.level >= MAX_LEVEL) {
    const rank = paragonRank(hero);
    while ((hero.paragon ?? 0) < rank) {
      hero.paragon = (hero.paragon ?? 0) + 1;
      emit(hero, events, 'paragon', fill(PARAGON_LINE, { rank: hero.paragon, title: paragonTitle(hero.paragon), name: hero.name }), { rank: hero.paragon });
    }
  }
}

function resolveRoam(state, hero, m, events) {
  const foe = { ...m, monster: true, defeat: `Defeated by ${article(m.name)}. ${m.ko}` };
  const result = encounter(state, hero, foe, events, 'roam');
  if (!result.ok) return;
  // Monsters drop gear rarely. Wisdom spots more of it, and a natural 20 shakes more loose.
  if (!failed(result) && random(state) < dropChance(hero, 'roam', result.outcome === 'crit')) loot(state, hero, events, { level: m.level, source: 'roam' });
  rest(state, hero, events);
}

function resolveQuestStep(state, hero, task, events) {
  const qp = questState(hero);
  const quest = currentQuest(hero);
  if (!quest) return; // the board changed under the task (an old save); the next task sorts it out
  const [lo, hi] = baseGold(quest.level);
  const board = quest.story ? 1 : 1 + tavernMods(state).odd; // the notice board: better-paid odd jobs
  const foe = {
    name: quest.title, level: quest.level, check: quest.check,
    dc: baseDc(quest.level), dmg: Math.round(baseDamage(quest.level) * QUEST_DAMAGE),
    xp: Math.round((task.worth ?? task.duration) * QUEST_XP_PER_SECOND * board), gold: [Math.round(lo * QUEST_GOLD * board), Math.round(hi * QUEST_GOLD * board)],
    hit: QUEST_LINES.hit, miss: QUEST_LINES.miss, crit: pick(state, QUEST_LINES.crit), fumble: pick(state, QUEST_LINES.fumble),
    defeat: `Knocked out on a job, ${quest.title}. ${pick(state, QUEST_LINES.ko)}`,
  };
  if (!encounter(state, hero, foe, events, 'quest', { source: 'quest', qp }).ok) return; // knocked out: the step is lost
  qp.step += 1;
  if (qp.step >= quest.steps) finishQuest(state, hero, qp, quest, events);
  if (hero.knockedOutUntil == null) rest(state, hero, events);
}

function finishQuest(state, hero, qp, quest, events) {
  const sk = modsOf(hero);
  const tav = tavernMods(state);
  const board = quest.story ? 1 : 1 + tav.odd; // the notice board: better-paid odd jobs
  const xp = Math.round(QUEST_DONE_XP * board * levelGapXp(quest.level - hero.level) * xpBonus(state, hero, sk, 'quest'));
  const gold = Math.round(questDoneGold(quest.level) * board * goldBonus(hero, sk, 'quest') * (1 + 0.05 * Math.max(0, mod(hero.abilities.cha)))); // Charisma: better quest rewards
  hero.gold += gold;
  const done = quest.story ? quest.q.done : pick(state, ODD_JOBS.done);
  emit(hero, events, 'questdone', fill(QUEST_DONE, { quest: quest.title, done }), { quest: quest.title, story: quest.story, xp, gold }, { gain: `+${xp} XP, ${gold} gp` });
  // Every finished quest pays one piece of gear. A story quest's is chosen for the slot that
  // needs it most; an odd job pays whatever the client had lying about.
  loot(state, hero, events, quest.story ? { level: quest.level, source: 'quest', slot: weakestSlot(hero) } : { level: quest.level, source: 'odd', quality: tav.oddQuality });
  // A windfall pays the fee again.
  for (const s of sk.sigs.windfall ?? []) {
    if (random(state) >= s.chance) continue;
    hero.gold += gold;
    fire(hero, events, s, { gold }, `+${gold} gp`);
  }
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
  const sk = modsOf(hero);
  const ctx = { source: 'delve' };
  const purse = () => Math.round(randInt(state, d.gold[0], d.gold[1]) * DELVE_GOLD * goldBonus(hero, sk, 'delve'));

  // Slip Away and its kind: a hurt hero goes round a room instead of through it.
  const slip = (sk.sigs.skipRoom ?? []).find((s) => hero.hp < maxHp(hero) * s.below && ready(hero, s, ctx));
  let won = false;
  let crit = false;
  if (slip) {
    spend(hero, slip, ctx);
    fire(hero, events, slip);
  } else {
    const m = task.monster ? MONSTER_BY_ID[task.monster] : null;
    const room = m ? null : d.roomTasks[task.roomTask];
    const numbers = { level: d.level, dc: d.dc, dmg: d.dmg, xp: Math.round((task.worth ?? task.duration) * DELVE_XP_PER_SECOND), gold: [d.gold[0] * DELVE_GOLD, d.gold[1] * DELVE_GOLD] };
    const foe = m
      ? { ...m, ...numbers, monster: true, defeat: `Defeated by ${article(m.name)} in ${d.name}. ${m.ko}` }
      : { name: d.name, check: 'the dungeon', ...numbers, trap: true, hit: [room.hit], miss: [room.miss], crit: d.crit, fumble: d.fumble, defeat: `Knocked out in ${d.name}. ${d.ko}` };
    const result = encounter(state, hero, foe, events, 'delve', ctx);
    if (!result.ok) return; // knocked out: the run is lost
    won = !failed(result);
    crit = result.outcome === 'crit';
  }

  if (run.hidden && run.hidden.room === run.room) {
    const finder = (sk.sigs.hiddenRoom ?? []).find((s) => s.id === run.hidden.by);
    if (finder) {
      const gold = purse() * finder.purses;
      hero.gold += gold;
      fire(hero, events, finder, { gold }, `+${gold} gp`);
      loot(state, hero, events, { level: d.level, source: 'chest' }); // and the chest that was in it
    }
  }
  // A room cleared cleanly sometimes has a chest in it.
  if (won && random(state) < dropChance(hero, 'room', crit)) loot(state, hero, events, { level: d.level, source: 'room' });
  run.room += 1;

  // Between rooms: free healing from skills first, then a potion if it is still needed.
  secondWinds(hero, sk, ctx, events);
  const max = maxHp(hero);
  for (const s of sk.sigs.roomHeal ?? []) {
    if (hero.hp >= max * s.below || !ready(hero, s, ctx)) continue;
    spend(hero, s, ctx);
    const before = hero.hp;
    hero.hp = Math.min(max, hero.hp + Math.ceil(max * s.heal));
    fire(hero, events, s, { heal: hero.hp - before }, `+${hero.hp - before} HP`);
  }
  drinkPotion(state, hero, events);
}

// The boss: roll until the hero has landed `hits` blows or has no hit points left.
function resolveBoss(state, hero, task, events) {
  const run = hero.delve;
  if (!run) return;
  const d = DUNGEONS[run.region];
  const b = d.boss;
  const cls = CLASSES[hero.class];
  const sk = modsOf(hero);
  const ctx = { source: 'boss', fight: {} };
  const gap = Math.max(0, d.level - hero.level);
  const grudge = hero.race === 'dwarf' && hero.grudges[b.id] ? GRUDGE_BONUS : 0;
  const bonus = mod(hero.abilities[cls.main]) + proficiency(hero.level) + grudge + sk.n.roll + sk.n.rollBoss;
  const dc = b.dc + grownDc(d.level) + gap * OUTMATCHED_DC;
  const die = Math.max(1, Math.round(b.dmg * grownDamage(d.level) * (1 + gap * OUTMATCHED_DAMAGE) * WHAT_IF.damage));
  const dodge = dodgeChance(hero, sk);

  let landed = 0;
  let damage = 0;
  let stubborn = false;
  const dice = [];
  let rerolled = false; // the Goblin quirk covers the first natural 1 of the task
  if (hero.race === 'dragonborn') {
    landed = 1; // Breath Weapon: a free hit to open
    emit(hero, events, 'story', fill(BREATH, { name: hero.name, breath: pick(state, BREATHS) }));
  }
  for (const s of sk.sigs.freeBossHit ?? []) {
    if (landed >= b.hits - 1) break; // the last blow is always fought for
    landed += 1;
    fire(hero, events, s);
  }
  const globe = sk.sigs.bossShield?.[0];
  let shielded = globe?.rolls ?? 0;
  if (globe) fire(hero, events, globe);
  const smite = sk.sigs.smite?.[0];

  while (landed < b.hits && hero.hp > 0) {
    const r = rollCheck(state, hero, sk, ctx, bonus, dc, events, hero.race === 'goblin' && !rerolled);
    rerolled ||= r.rerolled;
    dice.push(r.die);
    if (r.die === 20) hero.stats.natural20s += 1;
    if (r.die === 1) hero.stats.natural1s += 1;
    if (r.outcome === 'crit') {
      landed += smite?.crit ?? 2;
      if (smite) fire(hero, events, smite);
    } else if (r.outcome === 'hit') landed += 1;
    let dealt = 0;
    if (shielded > 0) shielded -= 1;
    else {
      dealt = soften(cls, sk, 'boss', false, taskDamage(state, r.outcome, die, dodge));
      if (dealt > 0 && failed(r)) {
        const block = negated(state, sk, r);
        if (block) { dealt = 0; fire(hero, events, block); }
      }
    }
    if (landed >= b.hits) dealt = Math.min(dealt, hero.hp - 1); // the winning blow is never also the losing one
    const hurt = takeDamage(hero, dealt, sk, ctx);
    damage += hurt.damage;
    stubborn ||= hurt.stubborn;
    if (hurt.saved) fire(hero, events, hurt.saved);
    if (hero.hp > 0 && landed < b.hits) {
      secondWinds(hero, sk, ctx, events);
      drinkPotion(state, hero, events);
    }
  }
  hero.stats.tasks += 1;
  const won = landed >= b.hits;
  let xp = Math.max(1, Math.round(BOSS_XP * (won ? 1 : BOSS_LOSS_SHARE) * levelGapXp(d.level - hero.level) * xpBonus(state, hero, sk, 'boss')));
  const gold = won ? Math.round(bossGold(d.level) * goldBonus(hero, sk, 'boss')) : 0;
  const purses = won ? sk.sigs.bossPurse ?? [] : []; // Hazard Pay and its kind
  for (const s of purses) xp += Math.round(xp * (s.xp ?? 0));
  hero.gold += gold;
  const rollText = `${b.name}: ${dice.length} roll${dice.length === 1 ? '' : 's'} (${dice.join(', ')}) + ${bonus}${grudge ? ' (grudge)' : ''} vs DC ${dc}${gap ? ` (outmatched by ${gap})` : ''}, ${Math.min(landed, b.hits)} of ${b.hits} blows landed`;
  const gain = `+${xp} XP` + (gold ? `, ${gold} gp` : '') + (damage ? `, -${damage} HP` : '');
  const line = won ? b.win : `${midSentence(b.name)[0].toUpperCase() + midSentence(b.name).slice(1)} is still standing, and the hero is not.`;
  emit(hero, events, 'task', line, { outcome: won ? 'boss' : 'miss', source: 'boss', boss: b.id, won, xp, gold, damage }, { roll: rollText, gain });
  if (stubborn) emit(hero, events, 'story', fill(STUBBORN, { name: hero.name }));
  for (const s of purses) {
    const extra = gold * s.gold;
    hero.gold += extra;
    fire(hero, events, s, { gold: extra }, `+${extra} gp`);
  }
  if (won) {
    // A beaten boss drops the best gear there is at its level, one more piece for each move like
    // Hazard Pay, and now and then the dungeon's own named Legendary.
    loot(state, hero, events, { level: d.level, source: 'boss' });
    for (const s of purses) for (let i = 0; i < (s.items ?? 0); i++) loot(state, hero, events, { level: d.level, source: 'boss', second: true });
    const open = LEGENDARIES[run.region].slot !== 'cloak' || hero.level >= LOOT.cloakLevel;
    if (open && !wearsLegend(hero, run.region) && random(state) < LOOT.legend) loot(state, hero, events, { legend: run.region, source: 'boss' });
  }

  if (won) {
    const first = !(hero.dungeonClears[run.region] > 0);
    hero.dungeonClears[run.region] = (hero.dungeonClears[run.region] ?? 0) + 1;
    hero.stats.dungeonClears += 1;
    hero.delveFails[run.region] = 0;
    hero.delve = null;
    emit(hero, events, 'cleared', fill(DUNGEON_CLEARED[first ? 0 : 1], { dungeon: d.name }), { region: run.region, first });
    if (first) {
      if (recordTrophy(state, run.region)) {
        const hung = state.tavern.trophies.length <= tavernMods(state).hooks;
        emit(hero, events, 'trophy', fill(hung ? TROPHY_HUNG : TROPHY_WAITING, { trophy: TROPHIES[run.region] }), { region: run.region });
      }
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

// One floor of the Planar Rifts. Floor 1 is about as hard as a room of the last dungeon; each
// floor after it hits harder and pays more, and every third is one harder to roll against. A
// Warden on every tenth floor leaves a piece of gear and, now and then, a named Legendary the
// hero is not wearing. Hit points come back a little between floors, as on the road, but only
// the potions carried in can be drunk.
function resolveRiftFloor(state, hero, task, events) {
  const run = hero.rift;
  if (!run) return;
  const floor = run.floor;
  const d = DUNGEONS[REGIONS[REGIONS.length - 1].id];
  const up = 1 + RIFT.rewardPerFloor * (floor - 1);
  const f = (text) => fill(text, { floor, name: hero.name });
  const foe = {
    name: `Floor ${floor}`, level: MAX_LEVEL, check: RIFT_TEXT.check, trap: true,
    dc: d.dc + Math.floor((floor - 1) / RIFT.dcEvery),
    dmg: Math.round(d.dmg * (1 + RIFT.damagePerFloor * (floor - 1))),
    xp: Math.round((task.worth ?? task.duration) * DELVE_XP_PER_SECOND * up),
    gold: [Math.round(d.gold[0] * up), Math.round(d.gold[1] * up)],
    hit: RIFT_TEXT.hit.map(f), miss: RIFT_TEXT.miss.map(f), crit: f(RIFT_TEXT.crit), fumble: f(RIFT_TEXT.fumble),
    defeat: f(RIFT_TEXT.ko),
  };
  const result = encounter(state, hero, foe, events, 'rift');
  if (!result.ok) return; // knocked out: the run is over
  hero.stats.riftFloors = (hero.stats.riftFloors ?? 0) + 1;
  if (floor % RIFT.wardenEvery === 0) {
    emit(hero, events, 'story', f(RIFT_TEXT.warden), { warden: floor });
    loot(state, hero, events, { level: MAX_LEVEL, source: 'boss' });
    const missing = Object.keys(LEGENDARIES).filter((r) => !wearsLegend(hero, r));
    if (missing.length && random(state) < RIFT.legend) loot(state, hero, events, { legend: pick(state, missing), legendLevel: MAX_LEVEL, source: 'boss' });
  } else if (!failed(result) && random(state) < dropChance(hero, 'room', result.outcome === 'crit')) {
    loot(state, hero, events, { level: MAX_LEVEL, source: 'room' });
  }
  if (floor > (hero.stats.riftBest ?? 0)) {
    hero.stats.riftBest = floor;
    if (floor % 5 === 0) emit(hero, events, 'story', f(RIFT_TEXT.deepest), { deepest: floor });
  }
  run.floor += 1;
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
  // Constitution, the Elf quirk, and skills shorten the stay.
  let seconds = recoverySeconds(hero.level) * (1 - 0.03 * Math.max(0, mod(hero.abilities.con)));
  if (hero.race === 'elf') seconds *= 0.8;
  seconds *= 1 - Math.min(0.6, modsOf(hero).n.recovery + tavernMods(state).recovery); // boots, skills, and the tavern's room
  hero.knockedOutUntil = hero.age + Math.round(seconds);

  const inDungeon = source === 'delve' || source === 'boss';
  const lost = inDungeon ? 'run' : source === 'quest' ? 'step' : source === 'rift' ? 'rift' : null;
  if (source === 'rift') hero.rift = null; // the next run starts from floor 1
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
  const sk = modsOf(hero);
  const max = maxHp(hero);
  hero.hp = Math.min(max, hero.hp + Math.ceil(restHeal(max, hero.hp) * (1 + sk.n.rest)));
  for (const s of sk.sigs.shortRest ?? []) {
    if (hero.hp >= max * s.below || (hero.cooldowns[s.id] ?? 0) > hero.age) continue;
    hero.cooldowns[s.id] = hero.age + s.seconds;
    const before = hero.hp;
    hero.hp = Math.min(max, hero.hp + Math.ceil(max * s.heal));
    fire(hero, events, s, { heal: hero.hp - before }, `+${hero.hp - before} HP`);
  }
  drinkPotion(state, hero, events);
}

// Potions are bought and drunk on the spot when gold allows. A dungeon or Rifts run carries a fixed number.
function drinkPotion(state, hero, events) {
  const sk = modsOf(hero);
  const max = maxHp(hero);
  const cost = Math.max(1, Math.round(potionPrice(hero.level) * (1 - Math.min(0.75, sk.n.potionPrice))));
  if (hero.hp >= max * POTION_BELOW || hero.gold < cost) return;
  const run = hero.delve ?? hero.rift; // a dungeon or Rifts run carries a fixed number
  if (run) {
    if (!(run.potions > 0)) return;
    run.potions -= 1;
  }
  hero.gold -= cost;
  hero.hp = Math.min(max, hero.hp + Math.ceil(max * POTION_HEAL * (1 + sk.n.potion)));
  emit(hero, events, 'potion', fill(pick(state, POTION), { cost }), { cost });
}

// ---------- standing orders: the only things the player changes ----------

// Roam, Quest, Delve, or (at level 20) the Rifts. Takes effect when the current task ends.
// Choosing Delve again after the confidence safeguard gives the hero a fresh three attempts.
export function setFocus(hero, focus) {
  if (!FOCUSES.includes(focus) || (focus === 'rift' && hero.level < MAX_LEVEL)) return false;
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
