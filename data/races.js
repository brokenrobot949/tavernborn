// Races and appearance options. Layer picks come from the "Sprite looks" tab of the design doc.
// Each layer ref names an LPC sheet definition (file name without .json) and a colour.
// '$skin' and '$hair' are filled in from the hero's appearance.
// After editing, rerun: node tools/sprites.mjs bake

export const BODY_TYPES = ['male', 'female', 'muscular'];

const HUMAN_SKINS = ['light', 'amber', 'olive', 'taupe', 'bronze', 'brown', 'black'];

export const RACES = {
  human: {
    name: 'Human',
    builds: [
      { id: 'male', label: 'Male', body: 'male', head: 'heads_human_male' },
      { id: 'female', label: 'Female', body: 'female', head: 'heads_human_female' },
    ],
    extras: [],
    skins: HUMAN_SKINS,
    hair: 'parted',
  },
  elf: {
    name: 'Elf',
    builds: [
      { id: 'male', label: 'Male', body: 'male', head: 'heads_human_male' },
      { id: 'female', label: 'Female', body: 'female', head: 'heads_human_female' },
    ],
    extras: [{ def: 'head_ears_elven', color: '$skin' }],
    skins: HUMAN_SKINS,
    hair: 'long',
  },
  dwarf: {
    name: 'Dwarf',
    builds: [
      { id: 'muscular', label: 'Male', body: 'muscular', head: 'heads_human_male_plump', beard: true },
      { id: 'female', label: 'Female', body: 'female', head: 'heads_human_female', beard: false },
    ],
    extras: [],
    beard: [
      { def: 'beards_winter', color: '$hair' },
      { def: 'beards_walrus', color: '$hair' },
    ],
    skins: HUMAN_SKINS,
    hair: 'bedhead',
  },
  goblin: {
    name: 'Goblin',
    builds: [
      { id: 'male', label: 'Male', body: 'male', head: 'heads_goblin' },
      { id: 'female', label: 'Female', body: 'female', head: 'heads_goblin' },
    ],
    extras: [],
    skins: ['bright_green', 'green', 'pale_green'],
    hair: 'none',
  },
  halforc: {
    name: 'Half-Orc',
    builds: [
      { id: 'male', label: 'Male', body: 'male', head: 'heads_orc_male' },
      { id: 'muscular', label: 'Male, muscular', body: 'muscular', head: 'heads_orc_male' },
      { id: 'female', label: 'Female', body: 'female', head: 'heads_orc_female' },
    ],
    extras: [],
    skins: ['dark_green', 'green', 'taupe'],
    hair: 'shorthawk',
  },
  dragonborn: {
    name: 'Dragonborn',
    builds: [
      { id: 'male', label: 'Male', body: 'male', head: 'heads_lizard_male' },
      { id: 'female', label: 'Female', body: 'female', head: 'heads_lizard_female' },
    ],
    extras: [
      { def: 'tail_lizard', color: '$skin' },
      { def: 'head_horns_backwards', color: '$skin' },
    ],
    skins: ['bright_green', 'dark_green', 'blue', 'lavender', 'bronze'],
    hair: 'none',
  },
};

export const HAIR_STYLES = [
  'plain', 'bedhead', 'messy1', 'buzzcut', 'parted', 'long', 'long_tied', 'ponytail',
  'braid', 'curly_short', 'curly_long', 'bob', 'bangs_bun', 'shorthawk', 'balding',
].map((id) => ({ id, def: 'hair_' + id }));

// Phase 0 bakes a spread of the LPC hair palette. The full palette has 26 colours;
// add names here (from palette_definitions/hair/hair_ulpc.json) and rebake to offer more.
export const HAIR_COLORS = ['black', 'dark_brown', 'chestnut', 'redhead', 'blonde', 'gray', 'white', 'raven'];

// Rules side of each race: ability bonuses and the quirk. `built` is false while a quirk waits
// on a later phase; all six work as of Phase 3. A task is one roll, so the Dwarf's grudge is a
// bonus to that roll rather than to damage.
export const RACE_TRAITS = {
  human: { bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, quirk: 'Jack of Most Trades', effect: '+5% XP', built: true },
  elf: { bonus: { dex: 2, int: 1 }, quirk: "Hasn't Slept Since the Third Age", effect: 'Recovers from knockouts 20% faster', built: true },
  dwarf: { bonus: { con: 2, str: 1 }, quirk: 'Holds a Grudge', effect: '+2 on rolls against any monster or boss that has knocked them out', built: true },
  goblin: { bonus: { dex: 2, con: 1 }, quirk: 'Somehow Still Alive', effect: 'Rerolls the first natural 1 of each task', built: true },
  halforc: { bonus: { str: 2, con: 1 }, quirk: 'Too Stubborn to Fall', effect: 'Once per dungeon run, drops to 1 HP instead of 0', built: true },
  dragonborn: { bonus: { str: 2, cha: 1 }, quirk: 'Breath Weapon', effect: 'Opens every boss fight with a free hit', built: true },
};
