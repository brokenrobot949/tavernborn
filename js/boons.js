// Boons (after Phase 7): short spells of luck from a choice on the road, the travelling merchant,
// or a festival. A boon is { id, until }, where `until` is a time on the hero's own clock
// (`hero.age`), so time away counts down a boon exactly as time watched does. What each one adds is
// BOONS in js/rules.js, in the same numbers skills and gear change; tasks.js adds them in `modsOf`.

import { BOONS } from './rules.js';

export const activeBoons = (hero) => (hero.boons ?? []).filter((b) => BOONS[b.id] && b.until > hero.age);

// Give a boon for `hours`. The same boon again runs from now or from when the old one ends,
// whichever is later, so buying a second rabbit's foot is not wasted.
export function giveBoon(hero, id, hours) {
  if (!BOONS[id] || !(hours > 0)) return null;
  hero.boons = activeBoons(hero);
  const old = hero.boons.find((b) => b.id === id);
  const seconds = Math.round(hours * 3600);
  if (old) { old.until = Math.max(old.until, hero.age) + seconds; return old; }
  const boon = { id, until: hero.age + seconds };
  hero.boons.push(boon);
  return boon;
}

// Everything the active boons add, summed: { roll: 1, xp: 0.1, ... }, or null when there are none.
export function boonMods(hero) {
  if (!hero.boons?.length) return null;
  let out = null;
  for (const b of hero.boons) {
    if (!(b.until > hero.age) || !BOONS[b.id]) continue;
    out ??= {};
    for (const [k, v] of Object.entries(BOONS[b.id])) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

// Drop boons that have run out, so the save does not keep them.
export function pruneBoons(hero) {
  if (hero.boons?.length) hero.boons = activeBoons(hero);
}
