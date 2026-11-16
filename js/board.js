// The notice board's bounties (after Phase 7, round five). Pure logic: no page. The board follows
// the device's calendar, so `postingsOn` and `takeBounty` take the date as an argument.
//
// Three bounties are posted each day (data/board.js): the first is always a hunt for one of the
// monsters of the hero's region, the second a matter of luck or work, the third something harder
// that pays a piece of gear. A hero may take one a day. It stays with them until it is done, however
// long that takes, or until another is taken in its place. `noteBounty` (called by sim.js after
// every task) counts what the task did toward it and pays out when it is done.

import { BOUNTIES, BOARD_TEXT } from '../data/board.js';
import { MONSTERS, MONSTER_BY_ID } from '../data/monsters.js';
import { REGION_BY_ID } from '../data/regions.js';
import { goldUnit, workXp } from './rules.js';
import { dayOf, mix } from './world.js';
import { chronicle } from './hero.js';
import { restedXp } from './tavern.js';
import { giveLoot, giveXp } from './tasks.js';

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const SECOND = ['crits', 'jobs', 'unbeaten', 'hunt'];
const THIRD = ['rare', 'delve'];

// What a bounty of a kind pays a hero of a level: { gold, xp, piece }.
export function bountyReward(kind, level) {
  const b = BOUNTIES[kind];
  return { gold: Math.max(5, Math.round((b.gold * goldUnit(level)) / 5) * 5), xp: workXp(level, b.xp), piece: b.piece };
}

// Today's three postings for a hero, where they stand: [{ kind, title, about, monster, need }].
export function postingsOn(date, hero) {
  const day = dayOf(date);
  const region = hero.region;
  const from = (list, salt) => list[Math.floor(mix(day * 17 + salt, 31) * list.length)];
  const near = MONSTERS[region].filter((m) => m.level <= hero.level + 1);
  const quarry = near.length ? near : MONSTERS[region];
  const make = (kind, salt, not = null) => {
    const spec = BOUNTIES[kind];
    const pool = quarry.length > 1 ? quarry.filter((m) => m.id !== not) : quarry;
    const m = kind === 'hunt' ? from(pool, salt + 5) : null;
    const need = from(spec.need, salt + 9);
    const values = { monster: m?.name, place: REGION_BY_ID[region].name, count: need };
    return { kind, title: fill(spec.title, values), about: fill(spec.about, values), monster: m?.id ?? null, region, need };
  };
  const first = make('hunt', 1);
  return [first, make(from(SECOND, 2), 3, first.monster), make(from(THIRD, 4), 6)];
}

// Whether a bounty can be taken today: one a day.
export const canTake = (hero, date) => hero.bountyDay !== dayOf(date);

// Take posting `index` from today's board. Returns the bounty, or null.
export function takeBounty(state, hero, index, date) {
  const p = postingsOn(date, hero)[index];
  if (!p || !canTake(hero, date)) return null;
  if (hero.bounty) chronicle(hero, 'story', fill(BOARD_TEXT.dropped, { title: hero.bounty.title }));
  hero.bountyDay = dayOf(date);
  hero.bounty = { ...p, day: hero.bountyDay, have: 0, level: hero.level };
  chronicle(hero, 'story', fill(BOARD_TEXT.taken, { title: p.title, notice: p.about }));
  return hero.bounty;
}

// Count what the events from `from` on did toward the bounty, and pay out if that finishes it.
export function noteBounty(state, hero, events, from = 0) {
  const b = hero.bounty;
  if (!b || !BOUNTIES[b.kind]) return;
  const won = (e) => e.outcome === 'hit' || e.outcome === 'crit';
  for (let i = from; i < events.length; i++) {
    const e = events[i];
    if (e.type === 'knockout' && b.kind === 'unbeaten') b.have = 0;
    else if (e.type === 'task') {
      if (b.kind === 'hunt' && e.monster === b.monster && won(e)) b.have += 1;
      else if (b.kind === 'crits' && e.roll?.die === 20) b.have += 1;
      else if (b.kind === 'rare' && e.rare && won(e)) b.have += 1;
      else if (b.kind === 'unbeaten') b.have += 1;
    } else if (e.type === 'questdone' && b.kind === 'jobs') b.have += 1;
    else if ((e.type === 'cleared' || e.type === 'sitecleared') && b.kind === 'delve') b.have += 1;
  }
  if (b.have < b.need) return;
  hero.bounty = null;
  hero.stats.bounties = (hero.stats.bounties ?? 0) + 1;
  const pay = bountyReward(b.kind, b.level);
  const xp = Math.round(pay.xp * (1 + restedXp(hero)));
  hero.gold += pay.gold;
  const text = fill(BOARD_TEXT.done, { title: b.title });
  events.push({ type: 'bounty', at: hero.age, text, kind: b.kind, xp, gold: pay.gold });
  chronicle(hero, 'bounty', text, { roll: b.about, gain: `+${xp.toLocaleString('en-US')} XP, ${pay.gold.toLocaleString('en-US')} gp` });
  if (pay.piece) giveLoot(state, hero, events, { level: hero.level, source: 'chest' });
  giveXp(state, hero, xp, events);
}

// The bounty's monster by name, for the page.
export const quarryName = (bounty) => MONSTER_BY_ID[bounty?.monster]?.name ?? null;
