// The eight regions, in road order. Phase 1 opens only the first; the rest get their monsters,
// quests, and dungeons in Phase 3.
export const REGIONS = [
  { id: 'mugwick', name: 'Mugwick Vale', levels: [1, 3], flavor: 'Farmland around The Wobbly Griffin. Rats, goblins, and an aggrieved goose.', dungeon: 'The Cellar Beneath the Cellar', open: true },
  { id: 'mumblewood', name: 'The Mumblewood', levels: [3, 5], flavor: 'Old forest that talks in its sleep.', dungeon: 'The Thornwarren', open: false },
  { id: 'saltmarrow', name: 'Saltmarrow Coast', levels: [5, 8], flavor: "Smugglers' coves and fishing towns.", dungeon: 'The Drowned Lighthouse', open: false },
  { id: 'peaks', name: 'The Grumbling Peaks', levels: [8, 10], flavor: 'Mountain passes over dwarven ruins.', dungeon: 'Hall of the Under-King', open: false },
  { id: 'gloamfen', name: 'Gloamfen', levels: [10, 12], flavor: 'A swamp with opinions.', dungeon: 'The Sunken Abbey', open: false },
  { id: 'cinder', name: 'The Cinder Wastes', levels: [12, 15], flavor: 'Desert of buried kingdoms.', dungeon: 'Tomb of the Thrice-Buried King', open: false },
  { id: 'underdeep', name: 'The Underdeep', levels: [15, 18], flavor: 'Caverns far below the Peaks.', dungeon: 'The Lightless Market', open: false },
  { id: 'wyrmspire', name: 'Wyrmspire', levels: [18, 20], flavor: 'A volcano and its landlord.', dungeon: 'The Hoard of Vexaldrith', open: false },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const START_REGION = 'mugwick';
