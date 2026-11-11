// The eight regions, in road order. A region opens when the dungeon of the one before it has
// been cleared once; Mugwick Vale is always open.
//   levels   the level range the region is built for
//   dungeon  the dungeon's name (its rooms and boss are in data/dungeons.js)
//   arrive   Chronicle line on arriving
export const REGIONS = [
  { id: 'mugwick', name: 'Mugwick Vale', levels: [1, 3], flavor: 'Farmland around The Wobbly Griffin. Rats, goblins, and an aggrieved goose.', dungeon: 'The Cellar Beneath the Cellar', arrive: 'Back in Mugwick Vale. The goose has been told.' },
  { id: 'mumblewood', name: 'The Mumblewood', levels: [3, 5], flavor: 'Old forest that talks in its sleep. Wolves, sprites, and an owlbear.', dungeon: 'The Thornwarren', arrive: 'Under the first trees of the Mumblewood. Something overhead is muttering about fees.' },
  { id: 'saltmarrow', name: 'Saltmarrow Coast', levels: [5, 8], flavor: "Smugglers' coves and fishing towns. Giant crabs, pirates, and sea hags.", dungeon: 'The Drowned Lighthouse', arrive: 'The Saltmarrow Coast. It smells of fish and of people minding their own business.' },
  { id: 'peaks', name: 'The Grumbling Peaks', levels: [8, 10], flavor: 'Mountain passes over dwarven ruins. Ogres, harpies, and hill giants.', dungeon: 'Hall of the Under-King', arrive: 'The foot of the Grumbling Peaks. The mountains are doing it now.' },
  { id: 'gloamfen', name: 'Gloamfen', levels: [10, 12], flavor: "A swamp with opinions. Will-o'-wisps, trolls, and the restless dead.", dungeon: 'The Sunken Abbey', arrive: 'The edge of Gloamfen. The ground has already expressed a view on the boots.' },
  { id: 'cinder', name: 'The Cinder Wastes', levels: [12, 15], flavor: 'Desert of buried kingdoms. Scorpions, mummies, and fire elementals.', dungeon: 'Tomb of the Thrice-Buried King', arrive: 'The Cinder Wastes. There is a great deal of it, and all of it is hot.' },
  { id: 'underdeep', name: 'The Underdeep', levels: [15, 18], flavor: 'Caverns far below the Peaks. Oozes, giant spiders, and things with too many eyes.', dungeon: 'The Lightless Market', arrive: 'Down into the Underdeep. The last of the daylight stays at the top of the stair.' },
  { id: 'wyrmspire', name: 'Wyrmspire', levels: [18, 20], flavor: 'A volcano and its landlord. Drakes, cultists, and one ancient dragon.', dungeon: 'The Hoard of Vexaldrith', arrive: 'Wyrmspire. The mountain is smoking, and there are signs asking visitors to keep off the lava.' },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const REGION_INDEX = Object.fromEntries(REGIONS.map((r, i) => [r.id, i]));
export const START_REGION = 'mugwick';
