// The Wobbly Griffin's own content (Phase 6): the four upgrades, the trophy wall, the Planar Rifts,
// Paragon titles, and the lines retirement writes. Prices and effects are in js/rules.js
// (TAVERN, RIFT, PARAGON_XP, LEGACY). Voice: a dry chronicler; no exclamation marks.
// {name}, {rank}, {floor}, {worst}, {title}, {weapon}, and {does} are filled in by the game.

// One entry per upgrade, in the order the Tavern tab shows them. `ranks` names what each rank
// buys; `bought` is the Chronicle line.
export const UPGRADES = [
  {
    id: 'room', name: 'A better room', about: 'Knocked-out heroes recover here. A better room gets them up sooner.',
    ranks: ['A door that shuts', 'A mattress of the second quality', 'A window facing away from the goose', 'A fire of its own', 'The good room over the kitchen'],
    bought: 'The Wobbly Griffin gains {rank}. The cleric approves, in writing.',
  },
  {
    id: 'stable', name: 'A stable', about: 'Somewhere to keep a horse, and so a horse. Every journey is quicker.',
    ranks: ['A post to tie things to', 'A roof over the post', 'A pony called Margaret', "A second pony, for Margaret's sake", 'A proper stable with a stable-hand'],
    bought: 'The Wobbly Griffin gains {rank}. The road is no shorter, but it goes by faster.',
  },
  {
    id: 'notice', name: 'A notice board', about: 'Where the Vale pins its problems. A better board draws better-paid odd jobs.',
    ranks: ['A board', 'A board with nails', 'A board the mayor reads', 'A board with its own clerk', 'A board with a waiting list'],
    bought: 'The Wobbly Griffin gains {rank}. Two people are already arguing in front of it.',
  },
  {
    id: 'trophies', name: 'A trophy wall', about: 'Somewhere to hang what heroes bring back from the dungeons. It does nothing at all, beautifully.',
    ranks: ['Three hooks by the fire', 'Six hooks and a polished shield', 'The whole wall, and a brass plaque'],
    bought: 'The Wobbly Griffin gains {rank}. The regulars have started dusting it.',
  },
];
// The Tavern tab's header: one line overheard at the bar, changing every so often.
export const BAR_TALK = [
  'The barkeep is polishing the same tankard. It is the cleanest object in the Vale.',
  'Two farmers at the window table are disagreeing about the goose, quietly, in case it hears.',
  'A bard in the corner is three verses into a song about a hero who has not done it yet.',
  'Someone has carved a griffin into the bar. It also wobbles.',
  'The cleric is reading the same book as last week, from the other end.',
  'A tax collector asks whether anyone has seen a dragon. Nobody has, loudly.',
  'The cat under the stairs has been made an honorary regular. It was not consulted.',
  'The stew of the day is the stew of yesterday, served with confidence.',
  'A dwarf is explaining mountains to a fisherman, who is explaining the sea back.',
  'Somebody has pinned a drawing of the hero to the notice board. The likeness is generous.',
  'The fire has been lit since spring. The barkeep says it is a matter of principle.',
  'A traveller asks the way to Wyrmspire. The whole room points, then thinks better of it.',
  'The barkeep keeps a ledger of what the tavern owes the dragon. It is a large book.',
  'Dice are rolling at the back table. Someone has just been very lucky, and is being watched.',
];

// The bard on the Tavern tab, who sings back the chapters of The Dragon's Due the tavern has heard.
export const BARD = {
  intro: 'The bard in the corner has set the story so far to a tune, and will sing any part of it again for the price of listening.',
  none: 'The bard has a tune and no words yet. The story starts when somebody clears the cellar beneath the cellar.',
  all: 'The bard has the whole of it now, and has started on a second verse nobody asked for.',
  waiting: 'Not yet sung. The bard is waiting on news from {dungeon}.',
  someone: 'a hero of this tavern',
};

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

// What hangs on the trophy wall: one piece from each dungeon, earned the first time any hero of
// this tavern clears it, in the order they were won.
export const TROPHIES = {
  mugwick: "Under-Sheriff Skrindle's eviction notice, framed",
  mumblewood: "Old Bramblewick's receivership papers, pressed flat",
  saltmarrow: "The Tide-Reeve's ledger, dried out on the hearth",
  peaks: "The Seneschal's ring of keys to a hall nobody wants",
  gloamfen: "Abbot Dolorous's library card, eleven centuries overdue",
  cinder: 'A corner of the Third Seal, under glass, unsigned',
  underdeep: "The Broker's Voice's business card, which still talks",
  wyrmspire: "Vexaldrith's final demand, stamped PAID",
};
// The colour of each trophy's plaque on the wall behind the hero in the tavern scene.
export const TROPHY_COLORS = { mugwick: '#e9e3d0', mumblewood: '#6f9a45', saltmarrow: '#5fb8c0', peaks: '#c9a43a', gloamfen: '#7fae8f', cinder: '#d98c3a', underdeep: '#a07ad0', wyrmspire: '#d94a2a' };
export const TROPHY_HUNG = 'A new trophy for the wall at The Wobbly Griffin: {trophy}.';
export const TROPHY_WAITING = 'A new trophy waits behind the bar for a hook on the wall: {trophy}.';

// The Planar Rifts.
export const RIFT_NAME = 'The Planar Rifts';
export const RIFT_TEXT = {
  about: 'A dungeon with no bottom, behind a door in the cellar that does not lead to the cellar. Every floor is harder than the last.',
  enter: 'The Planar Rifts. The floor is a suggestion and the ceiling is somewhere else.',
  tasks: [
    'Asking a door from another plane which way it opens',
    'Fighting a reflection that has had a different week',
    'Crossing a corridor that is mostly yesterday',
    'Declining a contract offered by something with no face',
    'Waiting for gravity to settle on a direction',
    'Persuading a staircase to go down',
    'Fending off a swarm of misplaced Tuesdays',
    'Disputing a floor with its previous tenant',
    'Holding a conversation with an echo that started first',
    'Climbing down a ladder that leads up',
  ],
  check: 'the Rifts',
  hit: ['Floor {floor} gives way, in the good sense.', 'Floor {floor} is cleared and politely forgets anyone was there.', 'The way down opens. Which way is down remains open to discussion.'],
  miss: ['Floor {floor} is passed, though not tidily.', 'Floor {floor} holds. The hero, briefly, does not.'],
  crit: 'Floor {floor} surrenders before the question is finished.',
  fumble: 'Floor {floor} turns out to be a ceiling. This is established the hard way.',
  ko: 'Knocked out on floor {floor} of the Planar Rifts and returned to The Wobbly Griffin through a door that was not there before. The next run starts from floor 1.',
  warden: 'Floor {floor}: a Warden of the Rifts stands aside and leaves something on the step.',
  deepest: 'Floor {floor} is the deepest {name} has been. Nobody at The Wobbly Griffin believes it.',
};

// Paragon ranks: titles only, earned by XP after level 20. Past the last, "Paragon 11" and so on.
export const PARAGON_TITLES = [
  null,
  'Known by Name at the Griffin',
  'Recognised in Two Counties',
  'Mentioned in Dispatches',
  'Subject of a Minor Ballad',
  'Owed a Favour by a Duke',
  'Consulted on Matters of Dragons',
  'Painted, Badly, on an Inn Sign',
  'Excused the Bridge Toll',
  'Holder of the Key to Mugwick',
  'Not Asked to Pay at the Griffin',
];
export const PARAGON_LINE = 'Paragon {rank}: {title}. It changes nothing, and {name} is quietly delighted.';
export const RIFTS_OPEN = 'A door has appeared in the cellar of The Wobbly Griffin that does not lead to the cellar. The Planar Rifts are open to {name}.';

// Retirement.
export const RETIRE_OFFER = {
  title: 'Level 20',
  text: [
    '{name} has gone as far as the road goes. The barkeep has started calling them by their first name.',
    'They can retire to the Hall of Legends: their portrait goes on the wall, and every hero who comes after learns a little faster for it. Or they can keep going, into the Planar Rifts, for Paragon ranks that are titles and nothing else.',
    'There is no wrong answer and no hurry. The Retire button stays on the Hero tab. A retiring hero takes their gold with them, so the tavern upgrades are worth a look first.',
  ],
};
export const RETIRED = '{name} hangs up the {weapon} at The Wobbly Griffin and joins the Hall of Legends. The barkeep moves the portrait twice before it is straight.';
// The one-line legend under each portrait. Lines with {worst} are used only if something did
// knock the hero out; the others suit anyone.
export const LEGEND_LINES = [
  'Settled the Dragon\'s Due and was home in time for supper.',
  'Paid the rent on The Wobbly Griffin, three hundred years late, in person.',
  'Went as far as the road goes, then came back to tell the regulars about it, slowly.',
  'Undone, once, by {worst}. Remembered for everything else.',
  'Feared by dragons. Avoided, on balance, by {worst}.',
];
export const LEGEND_UNBEATEN = 'Never once carried home. The good bench was kept for nobody.';

// The sign over the door (after Phase 7): the player names the tavern and paints the sign. The
// game's text says "The Wobbly Griffin" throughout; a chosen name is swapped in as text is shown.
// {tavern} is the new name.
export const RENAMED = 'New letters go up over the door. The tavern is {tavern} now. The barkeep keeps the old sign, in case.';
export const SIGN = {
  // The board's wood or paint, and the colour of the letters, as CSS colours for the Tavern tab.
  boards: [
    { id: 'oak', name: 'Oak', wood: '#6b4a2b', grain: '#5e4025', rim: '#3a2616' },
    { id: 'walnut', name: 'Walnut', wood: '#3f2a1a', grain: '#352215', rim: '#1e130a' },
    { id: 'pine', name: 'Pine', wood: '#a77b48', grain: '#96693a', rim: '#5a3e1e' },
    { id: 'green', name: 'Painted green', wood: '#2f5a3c', grain: '#284e33', rim: '#15291b' },
    { id: 'red', name: 'Painted red', wood: '#7c2a22', grain: '#6c231c', rim: '#3a120e' },
    { id: 'blue', name: 'Painted blue', wood: '#29466b', grain: '#223c5d', rim: '#121f33' },
    { id: 'grey', name: 'Weathered', wood: '#6e6a62', grain: '#625e57', rim: '#34312c' },
    // Unlocked by a Paragon rank (PARAGON_KEEPSAKES below): `paragon` is the rank any hero of the tavern must reach.
    { id: 'lacquer', name: 'Black lacquer', wood: '#1d1a1c', grain: '#262224', rim: '#8a6a2a', paragon: 4 },
  ],
  inks: [
    { id: 'gold', name: 'Gold leaf', ink: '#f6dc8c', trim: '#c9962c' },
    { id: 'cream', name: 'Cream', ink: '#f3ead2', trim: '#cbbf9f' },
    { id: 'silver', name: 'Silver', ink: '#e1e6ea', trim: '#9aa6ae' },
    { id: 'copper', name: 'Copper', ink: '#f0a46a', trim: '#b8693a' },
    { id: 'starlight', name: 'Starlight', ink: '#e8f0ff', trim: '#8fa8e0', paragon: 7 },
  ],
  // A small picture over the name: an icon from js/ui/icons.js, or none.
  emblems: [
    { id: 'none', name: 'None' }, { id: 'mug', name: 'Tankard' }, { id: 'swords', name: 'Crossed swords' },
    { id: 'crown', name: 'Crown' }, { id: 'horse', name: 'Horse' }, { id: 'lute', name: 'Lute' },
    { id: 'star', name: 'Star' }, { id: 'lantern', name: 'Lantern' }, { id: 'trophy', name: 'Cup' }, { id: 'skull', name: 'Skull' },
    { id: 'medal', name: 'Medal', paragon: 1 }, { id: 'frame', name: 'A portrait, badly painted', paragon: 7 },
  ],
  // The small line under the name.
  mottos: [
    'Rooms, ale, and a cleric',
    'Adventurers welcome, mostly',
    'Ale of the first quality, stew of the second',
    'No geese past this point',
    'Rent paid, eventually',
    'Under the same management as ever',
    'Mind the step on the way out',
    'Credit given to heroes of good standing',
    'Est. some time ago',
    'As mentioned in dispatches',
  ],
  // Mottos unlocked by a Paragon rank, by index into `mottos`.
  mottoParagon: { 9: 2 },
};

// ----- after round five: the smith, mentors, the Rifts' rules, and Paragon keepsakes -----
// Numbers are in js/rules.js (SMITH, ENCHANTS, MENTOR) and below for the Rifts' rules.

// The smith in the yard. {name}, {item}, {slot}, {enchant}, {times} are filled in by the game.
export const SMITH_TEXT = {
  name: 'Brannoc Ashby',
  about: 'The smith in the yard, who works on anything a hero brings in and has opinions about all of it.',
  forge: 'Reforging hammers a piece into a better one of itself: it counts as one level more, three times at most. The work goes with the piece, so when something better turns up and the piece is sold, so is the work.',
  enchant: 'An enchantment belongs to the slot, not the piece, so it stays when the piece changes. There are eight, and each can be on one slot at a time; putting one on another slot moves it there.',
  forged: 'Brannoc reforges {item} for {name}, for the {times} time, and says it was a good piece to start with, mostly.',
  enchanted: 'Brannoc works {enchant} into {name}\'s {slot}. It hums, then thinks better of humming.',
  moved: 'Brannoc moves {enchant} from one piece of {name}\'s kit to another, and charges for both.',
  times: ['first', 'second', 'third'],
};
// The eight enchantments, by id (numbers in ENCHANTS, js/rules.js).
export const ENCHANT_TEXT = {
  keen: { name: 'Keen Edge', does: 'criticals on a 19 as well' },
  sure: { name: 'Sure Hand', does: '+1 to every roll' },
  warding: { name: 'Warding', does: '5% less damage taken' },
  vigour: { name: 'Vigour', does: '+5% hit points' },
  thrift: { name: 'Thrift', does: '+10% gold' },
  learning: { name: 'Learning', does: '+3% XP' },
  wayfaring: { name: 'Wayfaring', does: 'travel and knockout recovery 15% quicker' },
  mending: { name: 'Mending', does: 'rests and potions heal 15% more' },
};

// Mentors: a legend in the Hall takes a hero on the roster in hand. Once a day of the hero's adventuring the
// mentor sends word with a boon of their class's kind, and the first knockout of the day is over sooner.
// {mentor} and {name} are filled in by the game.
export const MENTOR_TEXT = {
  about: 'A legend may take one hero on the roster in hand. Once in every day the hero spends adventuring, word comes from the mentor, with a few hours of the mentor\'s own kind of luck. And the first knockout of each such day is over in half the time, because the mentor has a word with the cleric.',
  chosen: '{mentor} agrees to keep an eye on {name}, from the portrait on the wall and occasionally in person.',
  parted: '{mentor} wishes {name} well and goes back to the wall.',
  rescue: '{mentor} has a word with the cleric. {name} is back on their feet in half the time.',
  // By the mentor's class: the boon sent, and the words that come with it.
  fighter: { boon: 'hardy', lines: ['Word from {mentor}: keep the shield up, and eat something.', 'Word from {mentor}: the thing about a sword is to hold the right end.'] },
  wizard: { boon: 'scholar', lines: ['Word from {mentor}: read the footnotes. The footnotes are where they hide things.', 'Word from {mentor}: most problems are smaller than they look from the inside.'] },
  rogue: { boon: 'fortune', lines: ['Word from {mentor}: always count the exits, and then the coins.', 'Word from {mentor}: if a chest looks pleased to see you, leave it.'] },
  cleric: { boon: 'blessed', lines: ['Word from {mentor}: rest when you can, and pray when you cannot.', 'Word from {mentor}: be kind to the cleric. It is a long walk home otherwise.'] },
  barbarian: { boon: 'luck', lines: ['Word from {mentor}: hit it first. Then ask what it was.', 'Word from {mentor}: a good shout settles most things, and a good axe the rest.'] },
  ranger: { boon: 'keen', lines: ['Word from {mentor}: the wind is a better scout than a map.', 'Word from {mentor}: never camp where the ground looks comfortable.'] },
};

// The Rifts' rules: each day by the device's calendar the Rifts follow one of these. A run keeps the rule
// it started under. The numbers change the floors: `dc` (added to the DC), `dcEvery` (floors to each +1 DC,
// 3 usually), `dmg`, `xp`, `gold` (multipliers), `per` (XP and gold rise per floor, 0.04 usually),
// `time` (multiplier on how long a floor takes), `noRest` (no hit points between floors), `potions`
// (carried in, instead of the usual), and `warden` (floors to each Warden, 10 usually).
export const RIFT_RULES = [
  { id: 'still', name: 'Still Air', does: 'No rule today. The Rifts as they come.' },
  { id: 'dry', name: 'The Dry Stair', does: 'No potions may be carried in, the merchant\'s included.', potions: 0 },
  { id: 'teeming', name: 'Teeming', does: 'Every floor pays half again in gold and hits a tenth harder.', gold: 1.5, dmg: 1.1 },
  { id: 'watch', name: 'The Wardens\' Watch', does: 'A Warden on every fifth floor, not every tenth.', warden: 5 },
  { id: 'thin', name: 'Thin Walls', does: 'Floors take half the time, and no hit points come back between them.', time: 0.5, noRest: true },
  { id: 'bright', name: 'Bright Halls', does: 'Every floor is one easier to roll against, and pays a fifth less XP.', dc: -1, xp: 0.8 },
  { id: 'steep', name: 'The Steep Stair', does: 'One harder to roll against every second floor, not every third, and the pay rises twice as fast.', dcEvery: 2, per: 0.08 },
];
export const RIFT_RULE_LINE = 'The Rifts follow a rule today: {rule}. {does}';

// Paragon keepsakes: small things for the tavern, unlocked the first time any hero of it reaches the rank.
// Nothing here changes a rule.
export const PARAGON_KEEPSAKES = [
  { rank: 1, what: 'a medal for the sign over the door' },
  { rank: 2, what: 'a new motto for the sign, As mentioned in dispatches' },
  { rank: 3, what: 'a choice of colour for the wisp of any hero of level 15, on the Stats tab' },
  { rank: 4, what: 'black lacquer for the board of the sign' },
  { rank: 5, what: 'talk at the bar about the Paragons of the tavern' },
  { rank: 7, what: 'starlight letters for the sign, and a portrait of the hero on it, badly painted' },
];
export const KEEPSAKE_LINE = 'Something new at The Wobbly Griffin, in honour of {name}: {what}.';
// Lines overheard at the bar once a hero of the tavern is Paragon 5. {name} is that hero.
export const BAR_TALK_PARAGON = [
  'A traveller asks whether {name} drinks here. The barkeep says only on days ending in a y.',
  'Two regulars are arguing about which of the deeds of {name} was the biggest. Both are wrong, warmly.',
  'A child at the window table is being {name} for the afternoon. The cat is being the dragon.',
  'The bard is taking requests for the ballad of {name}. Every request is the same one.',
];
// The colours a wisp may take once that keepsake is unlocked. `class` keeps the class's own colour.
export const WISP_CHOICES = [
  { id: 'class', name: 'The class colour' },
  { id: 'gold', name: 'Gold', color: 'rgba(255, 214, 110, 0.9)' },
  { id: 'rose', name: 'Rose', color: 'rgba(255, 140, 170, 0.9)' },
  { id: 'sea', name: 'Sea green', color: 'rgba(110, 230, 200, 0.9)' },
  { id: 'violet', name: 'Violet', color: 'rgba(180, 130, 255, 0.9)' },
  { id: 'ember', name: 'Ember', color: 'rgba(255, 130, 60, 0.9)' },
];
