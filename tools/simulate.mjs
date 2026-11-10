// The pacing simulator in the terminal: node tools/simulate.mjs [heroes] [road|vale] [damageTimes]
// Same engine as tools/simulate.html (tools/simulate-core.js), printed as a table. Exits with an
// error if the median hero does not reach level 20 in 28 to 32 days on the road.

import { prepareWorld, heroPlan, runHero, summarize, formatTime, DAY, MAX_LEVEL } from './simulate-core.js';

const heroes = Number(process.argv[2]) || 500;
const world = process.argv[3] === 'vale' ? 'vale' : 'road';
const damageTimes = Number(process.argv[4]) || 1;

const regions = prepareWorld({ damageTimes });
const t0 = performance.now();
const results = [];
for (let i = 0; i < heroes; i++) results.push(runHero(heroPlan(i), { world }));
const s = summarize(results);
const secs = ((performance.now() - t0) / 1000).toFixed(1);

console.log(`${heroes} heroes, ${world === 'road' ? 'moving up the road' : 'staying in Mugwick Vale'}, monster damage x${damageTimes} (${secs} s)`);
if (world === 'road') console.log(`Stand-in monsters: ${regions.filter((r) => r.standIn).map((r) => r.name).join(', ') || 'none'}`);
console.log('\nlevel  target      10th        median      90th        median vs target');
for (const l of s.levels) {
  const off = l.median == null ? '' : `${l.median >= l.target ? '+' : ''}${Math.round((l.median / l.target - 1) * 100)}%`;
  console.log(`${String(l.level).padStart(5)}  ${formatTime(l.target).padEnd(10)}  ${formatTime(l.p10).padEnd(10)}  ${formatTime(l.median).padEnd(10)}  ${formatTime(l.p90).padEnd(10)}  ${off}`);
}
const row = (g) => `  ${g.id.padEnd(11)} L5 ${formatTime(g.l5).padEnd(8)} L10 ${formatTime(g.l10).padEnd(10)} L20 ${formatTime(g.l20).padEnd(10)} knockouts ${g.knockouts.toFixed(1).padStart(6)}  potions ${g.potions.toFixed(1).padStart(6)}`;
console.log('\nBy class:'); s.byClass.forEach((g) => console.log(row(g)));
console.log('By race:'); s.byRace.forEach((g) => console.log(row(g)));
console.log(`\nPer hero: ${s.knockouts.toFixed(1)} knockouts (${s.koHours.toFixed(1)} h recovering), ${s.potions.toFixed(1)} potions, ${Math.round(s.tasks)} tasks. ${s.knockoutFree} of ${heroes} were never knocked out.`);

const l20 = s.levels[s.levels.length - 1];
const days = l20.median == null ? null : l20.median / DAY;
const pass = days != null && days >= 28 && days <= 32;
console.log(`\nLevel ${MAX_LEVEL}: median ${days == null ? 'not reached' : days.toFixed(1) + ' days'}, ${s.finished} of ${heroes} heroes got there. Target 28 to 32 days: ${world === 'road' ? (pass ? 'PASS' : 'FAIL') : 'not judged in the Vale alone'}`);
process.exit(world === 'road' && !pass ? 1 : 0);
