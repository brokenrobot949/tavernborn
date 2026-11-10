// Picks the hero's next task and resolves a finished one. Pure logic.
// Phase 1 knows two kinds of task: 'roam' (one monster) and 'tavern' (recovering from a knockout).

import { MONSTERS, MONSTER_BY_ID } from '../data/monsters.js';
import { CLASSES } from '../data/classes.js';
import { LEVEL_UP, TAVERN_TASKS, RECOVERED, POTION, BESTIARY_NEW } from '../data/chronicle.js';
import {
  check, mod, pick, pickWeighted, proficiency, randInt, taskDamage, recoverySeconds,
  REWARD, POTION_BELOW, POTION_HEAL, potionPrice,
} from './rules.js';
import { chronicle, gainXp, maxHp } from './hero.js';

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const article = (name) => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;

// Record something that happened: it goes in the list `advance` returns and in the Chronicle.
function emit(hero, events, type, text, data = {}, lineExtra = {}) {
  events.push({ type, at: hero.age, text, ...data });
  chronicle(hero, data.outcome ?? type, text, lineExtra);
}

export function nextTask(state, hero) {
  if (hero.knockedOutUntil != null) {
    const left = hero.knockedOutUntil - hero.age;
    return { kind: 'tavern', text: pick(state, TAVERN_TASKS), duration: Math.max(1, Math.min(left, randInt(state, 150, 330))), elapsed: 0 };
  }
  // Roam: mostly monsters at or below the hero's level, with the odd tougher one.
  const monster = pickWeighted(state, MONSTERS[hero.region], (m) => {
    const above = m.level - hero.level;
    return above <= 0 ? 3 : above === 1 ? 1.2 : 0.3;
  });
  return { kind: 'roam', monster: monster.id, text: pick(state, monster.tasks), duration: randInt(state, monster.secs[0], monster.secs[1]), elapsed: 0 };
}

export function resolveTask(state, hero, task, events) {
  if (task.kind === 'tavern') {
    if (hero.age >= hero.knockedOutUntil) {
      hero.knockedOutUntil = null;
      hero.hp = maxHp(hero);
      emit(hero, events, 'recovered', pick(state, RECOVERED));
    }
    return;
  }
  resolveRoam(state, hero, MONSTER_BY_ID[task.monster], events);
}

function resolveRoam(state, hero, m, events) {
  const cls = CLASSES[hero.class];
  const bonus = mod(hero.abilities[cls.main]) + proficiency(hero.level);
  const r = check(state, bonus, m.dc, { rerollOne: hero.race === 'goblin' });
  hero.stats.tasks += 1;
  if (r.outcome === 'crit') hero.stats.natural20s += 1;
  if (r.outcome === 'fumble') hero.stats.natural1s += 1;

  // Rewards. Humans learn 5% faster, Intelligence adds a little XP, Charisma adds gold, and
  // retired legends (Phase 6) add their bonus.
  const share = REWARD[r.outcome];
  const xpBonus = 1 + (hero.race === 'human' ? 0.05 : 0) + 0.02 * Math.max(0, mod(hero.abilities.int)) + (state.tavern.legacyBonus ?? 0);
  const xp = Math.max(1, Math.round(m.xp * share * xpBonus));
  const gold = Math.max(0, Math.round(randInt(state, m.gold[0], m.gold[1]) * share * (1 + 0.05 * mod(hero.abilities.cha))));
  hero.gold += gold;

  const won = r.outcome === 'crit' || r.outcome === 'hit';
  const firstWin = won && !hero.bestiary[m.id];
  if (won) hero.bestiary[m.id] = (hero.bestiary[m.id] ?? 0) + 1;

  const dodge = Math.min(0.25, 0.05 * Math.max(0, mod(hero.abilities.dex)));
  const damage = Math.min(hero.hp, taskDamage(state, r.outcome, m.dmg, dodge));
  hero.hp -= damage;

  const line = r.outcome === 'crit' ? `Natural 20 on ${m.check}. ${m.crit}`
    : r.outcome === 'fumble' ? `Natural 1 on ${m.check}. ${m.fumble}`
    : pick(state, r.outcome === 'hit' ? m.hit : m.miss);
  const rollText = `${m.name}: d20 ${r.die}${r.rerolled ? ' (rerolled a 1)' : ''} + ${r.bonus} = ${r.total} vs DC ${r.dc}`;
  const gain = `+${xp} XP` + (gold ? `, ${gold} gp` : '') + (damage ? `, -${damage} HP` : '');
  emit(hero, events, 'task', line, { outcome: r.outcome, monster: m.id, roll: r, xp, gold, damage }, { roll: rollText, gain });
  if (firstWin) emit(hero, events, 'bestiary', fill(BESTIARY_NEW, { monster: m.name }), { monster: m.id });

  if (hero.hp <= 0) knockOut(state, hero, m, events);

  for (const level of gainXp(hero, xp)) {
    emit(hero, events, 'levelup', fill(pick(state, LEVEL_UP), { level, name: hero.name }), { level });
  }

  if (hero.knockedOutUntil == null) recoverBetweenTasks(state, hero, events);
}

// At 0 HP the hero is carried back to The Wobbly Griffin. Only time is lost.
function knockOut(state, hero, m, events) {
  hero.hp = 0;
  hero.stats.knockouts += 1;
  const worst = hero.stats.mostEmbarrassingDefeat && MONSTER_BY_ID[hero.stats.mostEmbarrassingDefeat];
  if (!worst || m.level < worst.level || (m.level === worst.level && m.dc < worst.dc)) hero.stats.mostEmbarrassingDefeat = m.id;
  // Constitution and the Elf quirk shorten the stay.
  let seconds = recoverySeconds(hero.level) * (1 - 0.03 * Math.max(0, mod(hero.abilities.con)));
  if (hero.race === 'elf') seconds *= 0.8;
  hero.knockedOutUntil = hero.age + Math.round(seconds);
  emit(hero, events, 'knockout', `Defeated by ${article(m.name)}. ${m.ko}`, { monster: m.id, seconds: Math.round(seconds) });
}

// A little HP comes back after every Roam task, and a potion is drunk if things look thin.
function recoverBetweenTasks(state, hero, events) {
  const max = maxHp(hero);
  hero.hp = Math.min(max, hero.hp + Math.max(1, Math.ceil(max * 0.15)));
  const cost = potionPrice(hero.level);
  if (hero.hp < max * POTION_BELOW && hero.gold >= cost) {
    hero.gold -= cost;
    hero.hp = Math.min(max, hero.hp + Math.ceil(max * POTION_HEAL));
    emit(hero, events, 'potion', fill(pick(state, POTION), { cost }), { cost });
  }
}
