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
  'Went as far as the road goes and asked for a receipt.',
  'Undone, once, by {worst}. Remembered for everything else.',
  'Feared by dragons. Avoided, on balance, by {worst}.',
];
export const LEGEND_UNBEATEN = 'Never once carried home. The good bench was kept for nobody.';
