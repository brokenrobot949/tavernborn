// The road, the merchant, and the festivals (after Phase 7). Pure logic: no page. The merchant and
// the festivals follow the device's calendar, so those functions take the date as an argument and
// never read the clock themselves.
//
// Choices on the road: now and then, between tasks out in the open, the hero meets something
// (data/road.js) and the choice waits in `hero.choice` for word from the player. The hero carries on
// working meanwhile. If no word comes within ROAD.wait, the hero takes the option in character for
// them. `afterTask` (called by sim.js after every task) raises and settles choices and lets old
// boons go; `answerChoice` is the player's word. Both write the Chronicle and return events.
//
// The travelling merchant (data/market.js) is in the tavern yard on about six days in ten, with
// four wares a visit, one of each. `buyWare` spends the active hero's gold.
//
// Festivals run on fixed dates each year. While one runs, each hero may join in once that year
// (`joinFestival`), for a day of festive spirits.

import { CHOICES, CHOICE_BY_ID, ROAD_TEXT } from '../data/road.js';
import { WARES, WARE_BY_ID, MERCHANT_TEXT, FESTIVALS, FESTIVAL_BY_ID } from '../data/market.js';
import { ROAD, MERCHANT, workXp, goldUnit, random, randInt, pick } from './rules.js';
import { chronicle, maxHp } from './hero.js';
import { giveBoon, pruneBoons } from './boons.js';
import { giveLoot, giveXp } from './tasks.js';

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const OPEN_ROAD = new Set(['roam', 'quest', 'travel', 'return']); // tasks after which a choice can turn up

// ---------- choices on the road ----------

// What an option costs up front, in gold (0 if nothing).
export const optionCost = (hero, opt) => (opt.gold < 0 ? Math.round(-opt.gold * goldUnit(hero.level)) : 0);
export const canAfford = (hero, opt) => hero.gold >= optionCost(hero, opt);

// Apply one set of effects. Returns the gain text for the Chronicle line, e.g. '+120 XP, -40 gp'.
function apply(state, hero, eff, events) {
  const parts = [];
  if (eff.gold) {
    const gold = Math.round(eff.gold * goldUnit(hero.level));
    const paid = gold < 0 ? Math.max(gold, -hero.gold) : gold;
    hero.gold += paid;
    if (paid) parts.push(`${paid > 0 ? '+' : ''}${paid.toLocaleString('en-US')} gp`);
  }
  if (eff.hp) {
    const max = maxHp(hero);
    const before = hero.hp;
    hero.hp = Math.max(1, Math.min(max, hero.hp + Math.round(max * eff.hp)));
    const d = hero.hp - before;
    if (d) parts.push(`${d > 0 ? '+' : ''}${d} HP`);
  }
  if (eff.boon) {
    giveBoon(hero, eff.boon[0], eff.boon[1]);
    parts.push(`${eff.boon[1]} h boon`);
  }
  const xp = eff.xp ? workXp(hero.level, eff.xp) : 0;
  if (xp) parts.unshift(`+${xp.toLocaleString('en-US')} XP`);
  return { gain: parts.join(', '), xp, after: () => { if (eff.loot) giveLoot(state, hero, events, { level: hero.level, source: 'chest' }); if (xp) giveXp(state, hero, xp, events); } };
}

// Settle a choice with option `index`. `alone` is true when the hero decided without word.
function settle(state, hero, index, alone, events) {
  const c = CHOICE_BY_ID[hero.choice?.id];
  hero.choice = null;
  if (!c) return null;
  const opt = c.options[index];
  const outcome = opt.chance == null ? opt : random(state) < opt.chance ? opt.win : opt.lose;
  const top = apply(state, hero, opt.chance == null ? opt : { gold: opt.gold }, events);
  const res = opt.chance == null ? { gain: '', xp: 0, after: () => {} } : apply(state, hero, outcome, events);
  const gain = [top.gain, res.gain].filter(Boolean).join(', ');
  const text = (alone ? fill(ROAD_TEXT.auto, { name: hero.name }) + ' ' : '') + fill(outcome.line, { name: hero.name });
  if (alone) hero.stats.choicesAlone = (hero.stats.choicesAlone ?? 0) + 1;
  else hero.stats.choices = (hero.stats.choices ?? 0) + 1;
  events.push({ type: 'choice', at: hero.age, text, id: c.id, option: index, alone, xp: top.xp + res.xp, boon: outcome.boon?.[0] ?? opt.boon?.[0] });
  chronicle(hero, 'choice', text, { roll: `${opt.label}${opt.chance != null ? (outcome === opt.win ? ', and it went well' : ', and it did not go well') : ''}`, gain: gain || undefined });
  top.after();
  res.after();
  return outcome;
}

// After every task (sim.js): boons that have run out go, a choice left too long is decided by the
// hero, and out on the open road a new one may turn up.
export function afterTask(state, hero, task, events) {
  pruneBoons(hero);
  if (hero.choice && hero.age >= hero.choice.until) {
    const c = CHOICE_BY_ID[hero.choice.id];
    if (!c) { hero.choice = null; return; }
    // In character, unless the hero cannot pay for it.
    const order = [c.auto ?? 0, 1 - (c.auto ?? 0)];
    const index = order.find((i) => canAfford(hero, c.options[i])) ?? order[1];
    settle(state, hero, index, true, events);
    return;
  }
  if (hero.choice || hero.level < ROAD.fromLevel || hero.knockedOutUntil != null || !OPEN_ROAD.has(task.kind)) return;
  if (hero.nextChoiceAt == null) { hero.nextChoiceAt = hero.age + randInt(state, ROAD.first[0], ROAD.first[1]); return; }
  if (hero.age < hero.nextChoiceAt) return;
  hero.nextChoiceAt = hero.age + randInt(state, ROAD.every[0], ROAD.every[1]);
  // Not the same meeting twice running.
  const c = pick(state, CHOICES.filter((x) => x.id !== hero.lastChoice));
  hero.lastChoice = c.id;
  hero.choice = { id: c.id, at: hero.age, until: hero.age + ROAD.wait };
  const text = fill(ROAD_TEXT.waiting, { name: hero.name });
  events.push({ type: 'meeting', at: hero.age, text, id: c.id });
  chronicle(hero, 'choice', text, { roll: fill(c.text, { name: hero.name }) });
}

// The player's word: take option `index` of the choice waiting. Returns the outcome, or null.
export function answerChoice(state, hero, index, events = []) {
  const c = CHOICE_BY_ID[hero.choice?.id];
  const opt = c?.options[index];
  if (!opt || !canAfford(hero, opt)) return null;
  return settle(state, hero, index, false, events);
}

// ---------- the travelling merchant ----------

// The day number of a date by the device's calendar (days since 1 January 1970 in local time).
export const dayOf = (date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
// A steady number in [0, 1) for a day and a salt, the same on every device.
const hash = (n, salt) => ((Math.imul(n ^ (salt * 0x9e3779b1), 2654435761) >>> 0) % 100000) / 100000;

// Whether the merchant is in on a day, and what is on the cart: { here, day, wares: [ware] }.
export function merchantOn(date) {
  const day = dayOf(date);
  const here = hash(day, 7) < MERCHANT.chance;
  const wares = WARES.map((w, i) => ({ w, k: hash(day * 31 + i, 11) })).sort((a, b) => a.k - b.k).slice(0, MERCHANT.wares).map((x) => x.w);
  return { here, day, wares, greeting: MERCHANT_TEXT.greetings[day % MERCHANT_TEXT.greetings.length] };
}
// Days until the merchant is next in (1 for tomorrow), looking up to a fortnight ahead.
export function nextVisit(date) {
  for (let i = 1; i <= 14; i++) if (merchantOn(new Date(date.getFullYear(), date.getMonth(), date.getDate() + i)).here) return i;
  return null;
}
export const warePrice = (hero, ware) => Math.max(5, Math.round((ware.price * goldUnit(hero.level)) / 5) * 5);
// What has been bought on today's visit (shared by the whole tavern).
export function boughtToday(state, date) {
  const m = state.tavern.merchant;
  return m && m.day === dayOf(date) ? m.bought : [];
}

// Buy a ware with the active hero's gold. Returns { price, events } or null.
export function buyWare(state, hero, id, date) {
  const visit = merchantOn(date);
  const ware = WARE_BY_ID[id];
  if (!visit.here || !ware || !visit.wares.includes(ware) || boughtToday(state, date).includes(id)) return null;
  const price = warePrice(hero, ware);
  if (hero.gold < price) return null;
  hero.gold -= price;
  if (state.tavern.merchant?.day !== visit.day) state.tavern.merchant = { day: visit.day, bought: [] };
  state.tavern.merchant.bought.push(id);
  hero.stats.bought = (hero.stats.bought ?? 0) + 1;
  const events = [];
  const item = ware.name[0].toLowerCase() + ware.name.slice(1);
  chronicle(hero, 'tavern', fill(MERCHANT_TEXT.bought, { name: hero.name, item }), { gain: `-${price.toLocaleString('en-US')} gp` });
  if (ware.boon) giveBoon(hero, ware.boon[0], ware.boon[1]);
  if (ware.potions) { hero.supplies ??= { potions: 0 }; hero.supplies.potions = (hero.supplies.potions ?? 0) + ware.potions; }
  if (ware.crate) giveLoot(state, hero, events, { level: hero.level, source: 'chest' });
  return { price, events };
}

// ---------- festivals ----------

// The festival running on a date, or null. A festival may run over the new year (Midwinter).
export function festivalOn(date) {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  for (const f of FESTIVALS) {
    const from = f.from[0] * 100 + f.from[1];
    const to = f.to[0] * 100 + f.to[1];
    if (from <= to ? md >= from && md <= to : md >= from || md <= to) return f;
  }
  return null;
}
// Which year's festival this is: Midwinter in early January belongs to the December before.
const festivalKey = (f, date) => `${f.id}-${date.getMonth() + 1 < f.from[0] ? date.getFullYear() - 1 : date.getFullYear()}`;
export const hasJoined = (hero, f, date) => (hero.joined ?? []).includes(festivalKey(f, date));

// Join in with the festival running on `date`, once per hero per year. Returns the festival or null.
export function joinFestival(state, hero, date) {
  const f = festivalOn(date);
  if (!f || hasJoined(hero, f, date)) return null;
  hero.joined = [...(hero.joined ?? []), festivalKey(f, date)].slice(-12);
  hero.stats.festivals = (hero.stats.festivals ?? 0) + 1;
  giveBoon(hero, 'festive', 24);
  chronicle(hero, 'festival', fill(f.joined, { name: hero.name }), { gain: '24 h of festive spirits' });
  return FESTIVAL_BY_ID[f.id];
}
