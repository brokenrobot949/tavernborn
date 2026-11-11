// The Wobbly Griffin (Phase 6): upgrades, the trophy wall, the roster of heroes, retirement, the
// Hall of Legends, and Paragon ranks. Pure logic: no page, no clock.
//
// What belongs to the tavern lives in `state.tavern` and is shared by every hero:
//   upgrades   { room, stable, notice, trophies }: the rank bought of each (missing = 0)
//   trophies   region ids, in the order their dungeons were first cleared by any hero here
//   legends    retired heroes, oldest first (see `retire` for the record kept)
//   legacyBonus  XP share every hero gets: 2% per legend, at most 10% (read by `xpBonus` in tasks.js)
//
// The player's tavern choices are the functions below that change the save: `buyUpgrade`,
// `switchHero`, `retire`, and `dismissHero`. Each returns null or false when it cannot be done.
// The simulator calls the same ones.

import { UPGRADES, UPGRADE_BY_ID, TROPHIES, PARAGON_TITLES, RETIRED, LEGEND_LINES, LEGEND_UNBEATEN } from '../data/tavern.js';
import { SLOTS, EMBLEM_LEVEL, WISP_LEVEL, GLOW_LEVEL, WISP_COLOR } from '../data/items.js';
import { MONSTER_BY_ID } from '../data/monsters.js';
import { BOSS_BY_ID } from '../data/dungeons.js';
import { TAVERN, MAX_HEROES, MAX_LEVEL, legacyFor, paragonRankFor, paragonXpFor, xpForLevel, pick } from './rules.js';
import { chronicle } from './hero.js';
import { SLOT_IDS, better } from './loot.js';

export const UPGRADE_IDS = UPGRADES.map((u) => u.id);
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

// ---------- upgrades ----------

export const upgradeRank = (state, id) => state.tavern.upgrades[id] ?? 0;
export const maxRank = (id) => TAVERN[id].price.length;
// The price of the next rank, or null once every rank is bought.
export const upgradePrice = (state, id) => TAVERN[id]?.price[upgradeRank(state, id)] ?? null;

// What the upgrades bought so far do, as shares: { recovery, travel, odd, oddQuality, hooks }.
export function tavernMods(state) {
  const r = (id) => upgradeRank(state, id);
  return {
    recovery: r('room') * TAVERN.room.per,
    travel: r('stable') * TAVERN.stable.per,
    odd: r('notice') * TAVERN.notice.per,
    oddQuality: r('notice') * TAVERN.notice.quality,
    hooks: r('trophies') ? TAVERN.trophies.hooks[r('trophies') - 1] : 0,
  };
}

// The effect of an upgrade at a given rank, in words, for the Tavern tab.
export function upgradeEffect(id, rank) {
  const pct = (v) => `${Math.round(v * 100)}%`;
  if (!rank) return 'Nothing yet.';
  if (id === 'room') return `Knockout recovery ${pct(rank * TAVERN.room.per)} quicker.`;
  if (id === 'stable') return `Travel ${pct(rank * TAVERN.stable.per)} quicker.`;
  if (id === 'notice') return `Odd jobs pay ${pct(rank * TAVERN.notice.per)} more XP and gold, and their gear is a little rarer.`;
  return `Room for ${TAVERN.trophies.hooks[rank - 1]} trophies.`;
}

// Buy the next rank of an upgrade with the hero's gold. Returns the price paid, or null.
export function buyUpgrade(state, hero, id) {
  const u = UPGRADE_BY_ID[id];
  const price = u ? upgradePrice(state, id) : null;
  if (price == null || !hero || hero.gold < price) return null;
  hero.gold -= price;
  const rank = upgradeRank(state, id) + 1;
  state.tavern.upgrades[id] = rank;
  const name = u.ranks[rank - 1];
  chronicle(hero, 'tavern', fill(u.bought, { rank: name[0].toLowerCase() + name.slice(1) }), { gain: `-${price.toLocaleString('en-US')} gp`, upgrade: id, rank });
  return price;
}

// ---------- the trophy wall ----------

// A dungeon cleared for the first time by any hero of this tavern earns its trophy. Returns true
// if it is new. Whether it hangs depends on the hooks bought; it waits behind the bar until then.
export function recordTrophy(state, regionId) {
  const list = (state.tavern.trophies ??= []);
  if (!TROPHIES[regionId] || list.includes(regionId)) return false;
  list.push(regionId);
  return true;
}
export function trophyWall(state) {
  const all = state.tavern.trophies ?? [];
  const hooks = tavernMods(state).hooks;
  return { hung: all.slice(0, hooks), waiting: all.slice(hooks), hooks };
}

// ---------- the roster ----------

export const canRecruit = (state) => state.heroes.length < MAX_HEROES;

// Make another hero the one adventuring. The one stepping back waits at the tavern exactly as
// they are: nothing happens to an inactive hero, and they pick up where they left off.
export function switchHero(state, id) {
  if (!state.heroes.some((h) => h.id === id)) return false;
  state.activeHeroId = id;
  return true;
}

// Send a hero away for good: no legend, no portrait, no bonus. The slot is freed.
export function dismissHero(state, id) {
  const i = state.heroes.findIndex((h) => h.id === id);
  if (i < 0) return false;
  state.heroes.splice(i, 1);
  if (state.activeHeroId === id) state.activeHeroId = state.heroes[0]?.id ?? null;
  return true;
}

// ---------- the look, kept for a portrait ----------

// Everything `heroLook` (js/sprite.js) needs to draw this hero as they are now: appearance, the
// rarity worn in each slot, and the milestones their level has earned. The Hero tab draws from
// it, and a retired hero's portrait keeps a copy, so the portrait redraws exactly.
export function portraitOf(hero) {
  const tiers = Object.fromEntries(SLOTS.map((s) => [s.id, hero.gear[s.id]?.tier ?? null]));
  const fx = hero.level >= WISP_LEVEL ? { wisp: WISP_COLOR[hero.class], glow: hero.level >= GLOW_LEVEL } : null;
  return { race: hero.race, cls: hero.class, ...hero.appearance, tiers, emblem: hero.level >= EMBLEM_LEVEL, fx };
}

// ---------- Paragon ranks ----------

// XP earned past level 20, and the Paragon rank it is worth. Titles only.
export const paragonXp = (hero) => (hero.level >= MAX_LEVEL ? Math.max(0, hero.xp - xpForLevel(MAX_LEVEL)) : 0);
export const paragonRank = (hero) => paragonRankFor(paragonXp(hero));
export const paragonTitle = (rank) => (rank <= 0 ? null : PARAGON_TITLES[rank] ?? `Paragon ${rank}`);
export const nextParagonAt = (hero) => paragonXpFor(paragonRank(hero) + 1);

// ---------- retirement and the Hall of Legends ----------

export const canRetire = (hero) => !!hero && hero.level >= MAX_LEVEL;
const foeName = (id) => MONSTER_BY_ID[id]?.name ?? BOSS_BY_ID[id]?.name ?? null;

// The best piece the hero wears: rarity first, then level, as everywhere else.
export function bestItem(hero) {
  let best = null;
  for (const slot of SLOT_IDS) {
    const it = hero.gear[slot];
    if (it && (!best || better(it, best.item))) best = { slot, item: it };
  }
  return best ? { slot: best.slot, ...best.item } : null;
}

// Retire a level 20 hero to the Hall of Legends. The slot is freed, the portrait and record are
// kept, and every hero gets the legacy bonus: 2% XP per legend, 10% at most. If the retiring hero
// was the active one, the next hero on the roster (if any) takes over. Returns the legend, or null.
export function retire(state, id) {
  const i = state.heroes.findIndex((h) => h.id === id);
  const hero = state.heroes[i];
  if (!canRetire(hero)) return null;
  const worstId = hero.stats.mostEmbarrassingDefeat;
  const worst = worstId ? foeName(worstId) : null;
  const lines = worst ? LEGEND_LINES : LEGEND_LINES.filter((l) => !l.includes('{worst}'));
  const line = worst || hero.stats.knockouts ? fill(pick(state, lines), { worst: worst ? worst.replace(/^The /, 'the ') : '' }) : LEGEND_UNBEATEN;
  const weapon = hero.gear.weapon?.name ?? 'sword';
  chronicle(hero, 'story', fill(RETIRED, { name: hero.name, weapon }));
  const rank = paragonRank(hero);
  const legend = {
    id: hero.id,
    name: hero.name,
    race: hero.race,
    class: hero.class,
    subclass: hero.subclass,
    level: hero.level,
    look: portraitOf(hero),
    line,
    days: hero.age / 86400,
    gold: hero.gold,
    paragon: rank,
    riftBest: hero.stats.riftBest ?? 0,
    best: bestItem(hero),
    worst,
    stats: { ...hero.stats },
    monsters: Object.keys(hero.bestiary).length,
    dungeons: Object.values(hero.dungeonClears).filter((n) => n > 0).length,
    feats: hero.feats.length,
    retiredAt: state.lastSavedAt,
  };
  state.tavern.legends.push(legend);
  state.tavern.legacyBonus = legacyFor(state.tavern.legends.length);
  state.heroes.splice(i, 1);
  if (state.activeHeroId === id) state.activeHeroId = state.heroes[0]?.id ?? null;
  return legend;
}
