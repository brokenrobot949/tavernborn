// The Rifts' rules (after round five): each day by the device's calendar the Planar Rifts follow one of
// the rules in RIFT_RULES (data/tavern.js), the same on every device. A run keeps the rule it started
// under, and the hero keeps a best floor for each rule (`hero.riftBests`). Pure: the moment is passed in.

import { RIFT_RULES } from '../data/tavern.js';
import { RIFT } from './rules.js';
import { dayOf, mix } from './world.js';

export const RIFT_RULE_BY_ID = Object.fromEntries(RIFT_RULES.map((r) => [r.id, r]));
export { RIFT_RULES };

// The rule on a date. When a day would repeat the day before's draw it moves on, so two days running seldom share one.
export function riftRuleOn(date) {
  const day = dayOf(date);
  const at = (d) => Math.floor(mix(d, 41) * RIFT_RULES.length);
  let i = at(day);
  if (i === at(day - 1)) i = (i + 1 + Math.floor(mix(day, 43) * (RIFT_RULES.length - 1))) % RIFT_RULES.length;
  return RIFT_RULES[i];
}

// What a rule does to the numbers of a floor, with the usual ones where it says nothing.
export function riftNumbers(ruleId) {
  const r = RIFT_RULE_BY_ID[ruleId] ?? RIFT_RULES[0];
  return {
    dc: r.dc ?? 0,
    dcEvery: r.dcEvery ?? RIFT.dcEvery,
    dmg: r.dmg ?? 1,
    xp: r.xp ?? 1,
    gold: r.gold ?? 1,
    per: r.per ?? RIFT.rewardPerFloor,
    time: r.time ?? 1,
    noRest: !!r.noRest,
    potions: r.potions ?? null,
    warden: r.warden ?? RIFT.wardenEvery,
  };
}
