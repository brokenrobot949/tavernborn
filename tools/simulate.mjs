// The pacing simulator in the terminal: node tools/simulate.mjs [heroes] [road|roam|vale] [damageTimes]
// Same engine as tools/simulate.html (tools/simulate-core.js), printed as tables.
//   road   the standard run: quests, dungeons, and travel up all eight regions (judged)
//   roam   the same road, but the hero only roams between dungeon attempts
//   vale   the hero never leaves Mugwick Vale
//   unspent  the standard road, played by someone who never spends a skill or ability point
// After the standard run it also plays a second hero for the first 100: each starts in the tavern
// the first one left (the upgrades they bought) with one legend in the Hall, so +2% XP.
// Exits with an error if, on the standard run, the median hero does not reach level 20 in 28 to
// 32 days or fewer than nine in ten heroes clear the last dungeon.

import { prepareWorld, heroPlan, runHero, summarize, formatTime, subclassLabel, tavernAfter, TIER_NAMES, DAY, MAX_LEVEL } from './simulate-core.js';

const heroes = Number(process.argv[2]) || 500;
const mode = ['roam', 'vale', 'unspent'].includes(process.argv[3]) ? process.argv[3] : 'road';
const damageTimes = Number(process.argv[4]) || 1;
const options = { world: mode === 'vale' ? 'vale' : 'road', style: mode === 'roam' ? 'roam' : 'balanced', growth: mode !== 'unspent' };

prepareWorld({ damageTimes });
const t0 = performance.now();
const results = [];
for (let i = 0; i < heroes; i++) results.push(runHero(heroPlan(i), options));
const s = summarize(results);
const secs = ((performance.now() - t0) / 1000).toFixed(1);
const road = options.world === 'road';

const what = { road: 'quests, dungeons, and travel up the road', roam: 'roaming, dungeons, and travel up the road', vale: 'staying in Mugwick Vale', unspent: 'the standard road with every skill and ability point left unspent' }[mode];
console.log(`${heroes} heroes, ${what}, monster damage x${damageTimes} (${secs} s). Real monsters in every region; no stand-ins.`);
console.log('\nlevel  target      10th        median      90th        median vs target');
for (const l of s.levels) {
  const off = l.median == null ? '' : `${l.median >= l.target ? '+' : ''}${Math.round((l.median / l.target - 1) * 100)}%`;
  console.log(`${String(l.level).padStart(5)}  ${formatTime(l.target).padEnd(10)}  ${formatTime(l.p10).padEnd(10)}  ${formatTime(l.median).padEnd(10)}  ${formatTime(l.p90).padEnd(10)}  ${off}`);
}
const row = (g, label = g.id.padEnd(11)) => `  ${label} L5 ${formatTime(g.l5).padEnd(8)} L10 ${formatTime(g.l10).padEnd(10)} L20 ${formatTime(g.l20).padEnd(10)} knockouts ${g.knockouts.toFixed(1).padStart(6)}  potions ${g.potions.toFixed(1).padStart(6)}${road ? `  cleared the last dungeon ${g.clearedLast}/${g.heroes}` : ''}`;
console.log('\nBy class:'); s.byClass.forEach((g) => console.log(row(g)));
console.log('By race:'); s.byRace.forEach((g) => console.log(row(g)));
if (options.growth) { console.log('By subclass:'); s.bySubclass.forEach((g) => console.log(row(g, subclassLabel(g.id).padEnd(36)))); }

if (road) {
  console.log('\nDungeons (first clear):');
  console.log('  dungeon                          built for  cleared    median time  at level  runs lost per hero');
  for (const d of s.dungeons) console.log(`  ${d.name.padEnd(32)} ${String(d.builtFor).padStart(9)}  ${`${d.cleared}/${heroes}`.padStart(7)}    ${formatTime(d.at).padEnd(11)}  ${String(d.level ?? '-').padStart(8)}  ${d.runsLost.toFixed(1).padStart(6)}`);
}
const tierWord = (t) => (t == null ? '-' : `${t.toFixed(2)} (${TIER_NAMES[Math.min(TIER_NAMES.length - 1, Math.round(t))]})`);
console.log('\nGear: average rarity across the eight slots on reaching each level (0 Common, 1 Uncommon, 2 Rare, 3 Very Rare, 4 Legendary):');
console.log('  ' + s.gearByLevel.filter((g) => [3, 5, 8, 10, 12, 15, 18, 20].includes(g.level)).map((g) => `L${g.level} ${tierWord(g.tier)}`).join('   '));
console.log(`  At the end: ${s.endShare.map((e) => `${e.name} ${Math.round(e.share * 100)}%`).join(', ')} of slots. ${s.anyLegendary} of ${heroes} heroes wear a Legendary; ${s.allFive} wore all five rarities in one slot.`);
console.log(`  Per hero: ${s.itemsFound.toFixed(0)} pieces found, ${s.upgrades.toFixed(0)} equipped, the rest sold for ${Math.round(s.soldFor)} gp in all; ${s.legends.toFixed(2)} named Legendaries.`);
console.log(`\nPer hero: ${s.knockouts.toFixed(1)} knockouts (${s.koHours.toFixed(1)} h recovering): ${s.koBy.roam.toFixed(1)} roaming, ${s.koBy.quest.toFixed(1)} on quests, ${s.koBy.delve.toFixed(1)} in dungeon rooms, ${s.koBy.boss.toFixed(1)} to bosses.`);
console.log(`          ${s.potions.toFixed(1)} potions, ${Math.round(s.tasks)} tasks, ${s.quests.toFixed(1)} story quests, ${s.feats.toFixed(1)} feats, ${s.runs.toFixed(1)} dungeon runs. ${s.knockoutFree} of ${heroes} were never knocked out.`);
console.log(`          ${s.skills.toFixed(1)} skills learned, ${Math.round(s.moves)} signature moves fired, ${Math.round(s.gold)} gp in the purse at the end.`);
if (options.shop !== false) {
  console.log(`
Tavern upgrades bought (average rank at level 10, 15, 20): ${s.tavernRanks.map((u) => `${u.id} ${u.at.map((v) => v.toFixed(1)).join(' / ')}`).join(', ')}. ${Math.round(s.tavernSpent)} gp spent on them per hero.`);
}

// A second hero in the same tavern: the first hero's upgrades and one legend's +2% XP.
if (mode === 'road') {
  const n = Math.min(100, heroes);
  const second = [];
  for (let i = 0; i < n; i++) second.push(runHero(heroPlan(i, 2), { ...options, tavern: tavernAfter(results[i].tavern, 1) }));
  const firstMedian = summarize(results.slice(0, n)).levels.at(-1).median;
  const s2 = summarize(second);
  const m2 = s2.levels.at(-1).median;
  console.log(`
Second hero (${n} heroes, the first one's upgrades and +2% XP from one legend): level ${MAX_LEVEL} median ${formatTime(m2)}, against ${formatTime(firstMedian)} for those first heroes. ${s2.clearedLast} of ${n} clear the last dungeon; ${s2.knockouts.toFixed(1)} knockouts each.`);
}

const l20 = s.levels[s.levels.length - 1];
const days = l20.median == null ? null : l20.median / DAY;
const paceOk = days != null && days >= 28 && days <= 32;
const clearOk = s.clearedLast >= 0.9 * heroes;
console.log(`\nLevel ${MAX_LEVEL}: median ${days == null ? 'not reached' : days.toFixed(1) + ' days'}, ${s.finished} of ${heroes} heroes got there. Target 28 to 32 days: ${mode === 'vale' ? 'not judged in the Vale alone' : paceOk ? 'PASS' : 'FAIL'}`);
if (road) console.log(`The Hoard of Vexaldrith: cleared by ${s.clearedLast} of ${heroes} heroes. At least nine in ten: ${clearOk ? 'PASS' : 'FAIL'}`);
process.exit(mode === 'road' && !(paceOk && clearOk) ? 1 : 0);
