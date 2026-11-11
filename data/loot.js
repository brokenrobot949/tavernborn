// Loot: what gear is called. The numbers (drop chances, what a piece does) are in js/rules.js
// and the logic in js/loot.js. The sprite look of each class, slot, and rarity is in data/items.js;
// the nouns below are written to match those looks, tier by tier.
// Voice: a dry chronicler. No exclamation marks.

// The eight slots, in the order the Gear tab lists them. `does` is the slot's one job.
export const GEAR_SLOTS = [
  { id: 'weapon', name: 'Weapon', does: 'Rolls, and what a critical pays' },
  { id: 'offhand', name: 'Off-hand', does: 'The chance to halve a hit' },
  { id: 'head', name: 'Head', does: 'Hit points' },
  { id: 'body', name: 'Body', does: 'Damage taken' },
  { id: 'hands', name: 'Hands', does: 'Gold earned' },
  { id: 'feet', name: 'Feet', does: 'Travel and knockout recovery' },
  { id: 'cloak', name: 'Cloak', does: 'Healing from rests and potions' },
  { id: 'trinket', name: 'Trinket', does: 'XP earned' },
];

// NOUNS[class][slot][tier] = [noun, kind]. The kind picks the adjectives that suit it.
const n = (kind, ...names) => names.map((name) => [name, kind]);
const CLOAKS = n('cloth', 'Cloak', 'Cloak', 'Cape', 'Mantle', 'Mantle');
export const NOUNS = {
  fighter: {
    weapon: n('blade', 'Shortsword', 'Arming Sword', 'Longsword', 'War Sword', 'Runeblade'),
    offhand: n('shield', 'Round Shield', 'Kite Shield', 'Heater Shield', 'Bronze Shield', 'Blazoned Shield'),
    head: n('armour', 'Leather Cap', 'Kettle Helm', 'Barbute', 'Armet', 'Plumed Helm'),
    body: n('armour', 'Leather Jerkin', 'Mail Shirt', 'Plate Harness', 'Silvered Plate', 'Golden Plate'),
    hands: n('armour', 'Bracers', 'Gloves', 'Gauntlets', 'Gauntlets', 'Gauntlets'),
    feet: n('boots', 'Boots', 'Riding Boots', 'Sabatons', 'Sabatons', 'Sabatons'),
    cloak: CLOAKS,
  },
  wizard: {
    weapon: n('staff', 'Walking Staff', 'Gnarled Staff', 'Looped Staff', 'Diamond Staff', 'Crystal Staff'),
    offhand: n('jewel', 'Charm', 'Star Amulet', 'Pendant', 'Emerald', 'Amethyst'),
    head: n('cloth', 'Hood', 'Pointed Hat', 'Wide Hat', 'Celestial Hat', 'Moon Hat'),
    body: n('cloth', 'Robe', 'Grey Robe', 'Blue Robe', 'Mantled Robe', 'White Robe'),
    hands: n('cloth', 'Cuffs', 'Cuffs', 'Gloves', 'Gloves', 'Gloves'),
    feet: n('boots', 'Slippers', 'Shoes', 'Shoes', 'Boots', 'Boots'),
    cloak: CLOAKS,
  },
  rogue: {
    weapon: n('blade', 'Dagger', 'Scimitar', 'Rapier', 'Katana', 'Saber'),
    offhand: n('cloth', 'Belt', 'Belt', 'Sword Belt', 'Double Belt', 'Buckled Belt'),
    head: n('cloth', 'Bandana', 'Kerchief', 'Hood', 'Hood and Mask', 'Cavalier Hat'),
    body: n('cloth', 'Vest', 'Leather Jerkin', 'Leathers', 'Black Leathers', 'Night Leathers'),
    hands: n('cloth', 'Cuffs', 'Bracers', 'Gloves', 'Gloves', 'Gloves'),
    feet: n('boots', 'Shoes', 'Boots', 'Boots', 'Boots', 'Boots'),
    cloak: CLOAKS,
  },
  cleric: {
    weapon: n('blunt', 'Cane', 'Bronze Mace', 'Mace', 'Flail', 'War Axe'),
    offhand: n('shield', 'Round Shield', 'Heater Shield', 'Kite Shield', 'Crusader Shield', 'Sun Shield'),
    head: n('armour', 'Headband', 'Mail Coif', 'Spangenhelm', 'Bascinet', 'Circlet'),
    body: n('armour', 'Shirt and Sash', 'Tabard', 'Tabard', 'Mantled Tabard', 'Golden Mail'),
    hands: n('armour', 'Cuffs', 'Bracers', 'Gloves', 'Gauntlets', 'Gauntlets'),
    feet: n('boots', 'Sandals', 'Boots', 'Boots', 'Boots', 'Sabatons'),
    cloak: CLOAKS,
  },
};
// The trinket never shows on the sprite, so every class draws from the same drawer.
export const TRINKETS = [
  n('trinket', 'Button', 'Bent Coin', "Rabbit's Foot"),
  n('trinket', 'Whistle', 'Thimble', 'Pocket Knife'),
  n('trinket', 'Compass', 'Spyglass', 'Hourglass'),
  n('trinket', 'Astrolabe', 'Music Box', 'Signet'),
  n('trinket', 'Orb', 'Reliquary', 'Lodestone'),
];

// What every hero starts in: Common, level 1, and no help at all.
export const STARTING_NAMES = {
  fighter: { weapon: 'Second-Hand Shortsword', offhand: 'Borrowed Round Shield', head: 'Leather Cap', body: 'Leather Jerkin', hands: 'Plain Bracers', feet: 'Walking Boots' },
  wizard: { weapon: 'Walking Staff', offhand: 'Oval Charm', head: 'Travelling Hood', body: 'Brown Robe', hands: 'Plain Cuffs', feet: 'House Slippers' },
  rogue: { weapon: 'Kitchen Dagger', offhand: 'Plain Belt', head: 'Bandana', body: 'Brown Vest', hands: 'Plain Cuffs', feet: 'Soft Shoes' },
  cleric: { weapon: 'Walking Cane', offhand: 'Borrowed Round Shield', head: 'White Headband', body: 'Shirt and Sash', hands: 'Plain Cuffs', feet: 'Sandals' },
};
export const STARTING_CLOAK = 'Tattered Cloak';

// Generated names come in three parts, one of three ways:
//   "Reasonably Sharp Longsword"     adverb (by rarity) + adjective (by kind) + noun
//   "Boots of Mild Urgency"          noun + degree (by rarity) + quality
//   "Helm of the Second Opinion"     noun + which + what
export const ADVERBS = [
  ['Barely', 'Technically', 'Nominally'],
  ['Reasonably', 'Fairly', 'Adequately'],
  ['Notably', 'Decidedly', 'Properly'],
  ['Alarmingly', 'Exceptionally', 'Seriously'],
  ['Indisputably', 'Unreasonably', 'Historically'],
];
export const ADJECTIVES = {
  blade: ['Sharp', 'Pointed', 'Balanced', 'Polished'],
  blunt: ['Heavy', 'Persuasive', 'Solid', 'Convincing'],
  staff: ['Straight', 'Learned', 'Resonant', 'Well-Read'],
  shield: ['Sturdy', 'Dependable', 'Broad', 'Reassuring'],
  armour: ['Sturdy', 'Dependable', 'Well-Fitted', 'Polished'],
  cloth: ['Clean', 'Well-Cut', 'Warm', 'Respectable'],
  jewel: ['Shiny', 'Genuine', 'Tasteful', 'Lucky'],
  boots: ['Comfortable', 'Waterproof', 'Quiet', 'Broken-In'],
  trinket: ['Lucky', 'Genuine', 'Useful', 'Curious'],
};
export const DEGREES = [
  ['Faint', 'Slight', 'Passing'],
  ['Mild', 'Modest', 'Moderate'],
  ['Considerable', 'Marked', 'Steady'],
  ['Serious', 'Grave', 'Remarkable'],
  ['Unreasonable', 'Total', 'Lasting'],
];
export const QUALITIES = ['Urgency', 'Concern', 'Optimism', 'Resolve', 'Competence', 'Reluctance', 'Conviction', 'Punctuality', 'Composure', 'Suspicion', 'Enthusiasm', 'Regret'];
export const WHICH = ['Second', 'Third', 'Last', 'Previous', 'Other', 'Late'];
export const WHAT = ['Opinion', 'Attempt', 'Owner', 'Draft', 'Warning', 'Committee', 'Tuesday', 'Apprentice', 'Landlord', 'Resort'];

// One named Legendary per dungeon, keyed by region id. Each is for one slot, so the eight of them
// make a full set. The name has to suit every class: a Fighter's off-hand is a shield and a
// Wizard's is an amulet, and both may end up carrying The Abbot's Last Word.
export const LEGENDARIES = {
  mugwick: { slot: 'feet', name: "The Under-Sheriff's Boots of Office", flavor: 'Issued for the serving of notices. They have never once been late.' },
  mumblewood: { slot: 'cloak', name: "Old Bramblewick's Mantle", flavor: 'It is still growing. The wood has been informed and has raised no objection.' },
  saltmarrow: { slot: 'hands', name: "The Tide-Reeve's Counting Gloves", flavor: 'Everything they touch is counted. The sea is still owed for most of it.' },
  peaks: { slot: 'head', name: "The Under-King's Second-Best Crown", flavor: 'The best one was buried with him. This one did most of the work.' },
  gloamfen: { slot: 'offhand', name: "The Abbot's Last Word", flavor: 'Nobody has read it. Blows aimed at the bearer tend to lose their place.' },
  cinder: { slot: 'trinket', name: 'The Third Seal', flavor: 'Hekmet guarded it for nine hundred years. It was holding a door shut, and the door has not been found.' },
  underdeep: { slot: 'body', name: "The Broker's Guarantee", flavor: 'Fully binding. The small print covers most blows and all refunds.' },
  wyrmspire: { slot: 'weapon', name: "Vexaldrith's Spare Tooth", flavor: 'She has others. She would still like it back.' },
};

// Chronicle lines. {item} is the piece found, {old} the one it is measured against, {gold} what
// the loser fetches, {slot} the slot's name, {name} the hero.
export const LOOT_LINES = {
  upgrade: [
    'Found: {item}. It replaces {old}, which fetches {gold} gp.',
    'Found: {item}. {old} is retired with thanks and sold for {gold} gp.',
    'Found: {item}. It goes on at once. {old} goes to a pedlar for {gold} gp.',
  ],
  first: ['Found: {item}. The {slot} slot had been empty. It is not now.'],
  sold: [
    'Found: {item}. No better than {old}. Sold for {gold} gp.',
    'Found: {item}. {name} already owns better. Sold for {gold} gp.',
    'Found: {item}. It is weighed against {old}, loses, and is sold for {gold} gp.',
  ],
  legend: 'Found: {item}. {flavor}',
  legendOver: ' {old} is sold for {gold} gp and not missed.',
};

// Level milestones on the sprite (design doc, "Hero visuals"). {name} is the hero, {title} the
// title that comes with the emblem.
export const TITLES = { fighter: 'Knight of the Taproom', wizard: 'Magister', rogue: 'Person of Interest', cleric: 'Canon of the Griffin' };
export const MILESTONES = {
  5: 'A cloak comes with level 5. It is tattered, it is warm, and it is {name}\'s.',
  10: 'A clasp arrives from the guild, in the proper colours, with a title: {title}. The postage was owing.',
  15: 'A small light has started following {name} about. It does not explain itself.',
  20: 'There is a faint golden light about {name} now. Nobody at The Wobbly Griffin mentions it, out of respect.',
};
