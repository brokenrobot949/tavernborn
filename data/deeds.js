// Deeds and titles (after Phase 7). A deed is done once, by one hero, and writes a Chronicle line.
// Each comes with a title the hero may wear after their name, chosen on the Gear tab.
// `test(hero)` reads only the hero; js/deeds.js checks the deeds not yet done after every task and
// after anything the player does. Voice: a dry chronicler; no exclamation marks.

import { MONSTERS, COMMON_COUNT } from './monsters.js';
import { RARE_LIST } from './rares.js';
import { SITE_LIST } from './sites.js';

const all = (hero) => Object.values(hero.gear).filter(Boolean);
const COMMON = Object.values(MONSTERS).flat();
const commonsMet = (hero) => COMMON.filter((m) => hero.bestiary[m.id]).length;
const raresMet = (hero) => RARE_LIST.filter((m) => hero.bestiary[m.id]).length;
// (These are asked after every task, so each test starts with a count that is cheap to read.)
const storyDone = (hero) => Object.values(hero.questProgress).reduce((n, q) => n + (q?.done ?? 0), 0);

export const DEED_TEXT = {
  done: 'A deed for the record: {deed}. {name} may now be called {name} {title}.',
  none: 'No title',
};

export const DEEDS = [
  { id: 'first_clear', name: 'Beneath the Cellar', about: 'Clear the cellar beneath the cellar.', title: 'of the Cellar', test: (h) => (h.dungeonClears.mugwick ?? 0) > 0 },
  { id: 'lucky', name: 'Rolled Well', about: 'Roll 100 natural 20s.', title: 'the Lucky', test: (h) => h.stats.natural20s >= 100 },
  { id: 'luckier', name: 'Favoured of the Dice', about: 'Roll 2,500 natural 20s.', title: 'Favoured of the Dice', test: (h) => h.stats.natural20s >= 2500 },
  { id: 'clumsy', name: 'Rolled Badly', about: 'Roll 1,000 natural 1s.', title: 'the Unfortunate', test: (h) => h.stats.natural1s >= 1000 },
  { id: 'goosed', name: 'Goosed', about: 'Be knocked out by the goose.', title: 'the Goose-Bitten', test: (h) => !!h.grudges.goose },
  { id: 'regular', name: 'A Regular', about: 'Be carried back to the tavern 10 times.', title: 'of the Good Bench', test: (h) => h.stats.knockouts >= 10 },
  { id: 'unbruised', name: 'Not a Scratch', about: 'Reach level 10 without a single knockout.', title: 'the Unbruised', test: (h) => h.level >= 10 && h.stats.knockouts === 0 },
  { id: 'naturalist', name: 'Field Notes', about: 'Defeat 25 different monsters.', title: 'the Naturalist', test: (h) => Object.keys(h.bestiary).length >= 25 },
  { id: 'everything', name: 'The Whole Bestiary', about: 'Defeat every monster on the road, all 51.', title: 'Who Has Seen Everything', test: (h) => Object.keys(h.bestiary).length >= COMMON_COUNT && commonsMet(h) >= COMMON_COUNT },
  { id: 'odd_jobs', name: 'Handy', about: 'Finish 25 odd jobs.', title: 'of All Trades', test: (h) => h.stats.oddJobs >= 25 },
  { id: 'dependable', name: 'Every Notice Answered', about: 'Finish all 48 story quests.', title: 'the Dependable', test: (h) => storyDone(h) >= 48 },
  { id: 'delver', name: 'Down Again', about: 'Clear dungeons 25 times.', title: 'the Delver', test: (h) => h.stats.dungeonClears >= 25 },
  { id: 'dragon', name: 'The Account Settled', about: 'Clear The Hoard of Vexaldrith.', title: 'Who Settled the Account', test: (h) => (h.dungeonClears.wyrmspire ?? 0) > 0 },
  { id: 'pedlar', name: 'A Good Eye for Resale', about: 'Sell 50,000 gp of gear.', title: 'the Pedlar', test: (h) => h.stats.soldFor >= 50000 },
  { id: 'resplendent', name: 'Something Legendary', about: 'Wear a Legendary piece of gear.', title: 'the Resplendent', test: (h) => all(h).some((it) => it.tier >= 4) },
  { id: 'regalia', name: 'Head to Toe', about: 'Wear Legendary gear in all eight slots at once.', title: 'in Full Regalia', test: (h) => all(h).filter((it) => it.tier >= 4).length >= 8 },
  { id: 'comfortable', name: 'Comfortable', about: 'Hold 100,000 gp at once.', title: 'the Comfortable', test: (h) => h.gold >= 100000 },
  { id: 'solvent', name: 'Very Comfortable', about: 'Hold 1,000,000 gp at once.', title: 'the Remarkably Solvent', test: (h) => h.gold >= 1000000 },
  { id: 'decisive', name: 'Word from the Tavern', about: 'Answer 20 choices on the road.', title: 'the Decisive', test: (h) => (h.stats.choices ?? 0) >= 20 },
  { id: 'self_reliant', name: 'Left to Think', about: 'Decide 10 choices on the road with no word from the tavern.', title: 'the Self-Reliant', test: (h) => (h.stats.choicesAlone ?? 0) >= 10 },
  { id: 'customer', name: 'A Valued Customer', about: 'Buy 10 things from the travelling merchant.', title: 'the Valued Customer', test: (h) => (h.stats.bought ?? 0) >= 10 },
  { id: 'festive', name: 'Joined In', about: 'Join in with a festival of the Vale.', title: 'the Festive', test: (h) => (h.stats.festivals ?? 0) >= 1 },
  { id: 'deep', name: 'Further Down', about: 'Reach floor 25 of the Planar Rifts.', title: 'of the Deep Floors', test: (h) => (h.stats.riftBest ?? 0) >= 25 },
  { id: 'paragon', name: 'Past Twenty', about: 'Reach the first Paragon rank.', title: 'Beyond Measure', test: (h) => (h.paragon ?? 0) >= 1 },
  { id: 'sharp_eyed', name: 'Not the Usual Run', about: 'Defeat a rare monster.', title: 'the Sharp-Eyed', test: (h) => (h.stats.rares ?? 0) >= 1 },
  { id: 'rarities', name: 'A Cabinet of Rarities', about: 'Defeat every rare monster on the road, all 24.', title: 'Keeper of Rarities', test: (h) => (h.stats.rares ?? 0) >= RARE_LIST.length && raresMet(h) >= RARE_LIST.length },
  { id: 'authority', name: 'The Last Word', about: 'Become An Authority on 10 different monsters.', title: 'the Authority', test: (h) => (h.stats.authorities ?? 0) >= 10 },
  { id: 'small_doors', name: 'Every Small Door', about: 'Clear every lesser delve on the road, all 16.', title: 'of the Small Doors', test: (h) => (h.stats.siteClears ?? 0) >= SITE_LIST.length && SITE_LIST.every((s) => h.siteClears?.[s.id]) },
  { id: 'bounties', name: 'Paid on Completion', about: 'Finish 10 bounties from the notice board.', title: 'the Bounty-Taker', test: (h) => (h.stats.bounties ?? 0) >= 10 },
  { id: 'obliging', name: 'A Friend of the Family', about: 'See a regular client\'s story through to the end.', title: 'the Obliging', test: (h) => (h.stats.regulars ?? 0) >= 1 },
  { id: 'timely', name: 'On the Spot', about: 'Run 10 errands for the day\'s happenings.', title: 'the Timely', test: (h) => (h.stats.errands ?? 0) >= 10 },
];
export const DEED_BY_ID = Object.fromEntries(DEEDS.map((d) => [d.id, d]));
