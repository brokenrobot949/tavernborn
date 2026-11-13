// The travelling merchant, the festivals of the Vale, and the names of boons (after Phase 7).
// Numbers are in js/rules.js (BOONS, MERCHANT, goldUnit). Voice: a dry chronicler; no
// exclamation marks. {name} and {item} are filled in by the game.

// What each boon is called and what it does, in words, for the Hero tab and the Chronicle.
export const BOON_TEXT = {
  luck: { title: 'Lucky', does: '+1 to every roll' },
  scholar: { title: 'Clear-headed', does: '10% more XP' },
  fortune: { title: 'In good standing', does: '15% more gold' },
  swift: { title: 'Knows the shortcuts', does: 'travel 30% quicker' },
  hardy: { title: 'Well fed', does: '10% less damage taken' },
  keen: { title: 'Keen-edged', does: 'criticals on a 19 as well' },
  blessed: { title: 'Blessed', does: '+1 to every roll and better rests' },
  festive: { title: 'In festive spirits', does: '10% more XP and gold' },
  cursed: { title: 'Out of sorts', does: '-1 to every roll' },
};

// The merchant. `price` is in gold units (goldUnit in js/rules.js, which grows with level).
//   boon     [boon id, hours]
//   potions  extra potions carried into the next dungeon or Rifts run
//   crate    one piece of gear at the hero's level, as from a chest
export const MERCHANT_TEXT = {
  name: 'Odlin Farthingale',
  about: 'A travelling merchant with a cart, a mule, and a ledger in which every customer is a friend and every friend owes something.',
  here: 'The cart is in the yard today, until midnight.',
  away: 'The cart is out on the road. Odlin is due back {when}.',
  bought: '{name} buys {item} from the travelling merchant.',
  soldOut: 'Sold out for this visit. Odlin apologizes, and does not mean it.',
  greetings: [
    'Odlin says the prices are the same as last time, which is true of the numbers.',
    'Odlin is in the yard, explaining to the mule that this is a very good spot.',
    'Odlin has a new cart. The old one is in the new one, for sale.',
    'Odlin has brought things from the coast, the mountains, and somewhere he will not name.',
  ],
};
export const WARES = [
  { id: 'charm', name: "A rabbit's foot", about: 'Lucky, says Odlin. The rabbit disagreed.', price: 1, boon: ['luck', 12] },
  { id: 'candle', name: "A scholar's candle", about: 'Burns all night and makes everything read easier, including monsters.', price: 1.2, boon: ['scholar', 12] },
  { id: 'purse', name: 'An eager purse', about: 'Coins seem to find their way into it, and it does not ask where from.', price: 1, boon: ['fortune', 12] },
  { id: 'map', name: 'A carter\'s map', about: 'Every shortcut in the realm, marked by people who used them.', price: 0.5, boon: ['swift', 24] },
  { id: 'salve', name: 'Troll-fat salve', about: 'Rub it in before a fight. Nothing will want to hit {name} very hard, or at all, or come near.', price: 0.8, boon: ['hardy', 12] },
  { id: 'whetstone', name: 'A dwarven whetstone', about: 'Puts an edge on anything, including conversations.', price: 1.5, boon: ['keen', 8] },
  { id: 'potions', name: 'A crate of potions', about: 'Three potions, for the next dungeon or Rifts run, on top of the usual.', price: 0.6, potions: 3 },
  { id: 'crate', name: 'A mystery crate', about: 'Contents not guaranteed. Odlin guarantees that.', price: 2, crate: true },
];
export const WARE_BY_ID = Object.fromEntries(WARES.map((w) => [w.id, w]));

// Festivals by the device's calendar: each runs from `from` to `to` (month and day, inclusive).
// While one runs the Vale is dressed for it, the bar talks of nothing else, and every hero may
// join in once a year, for a day of festive spirits.
export const FESTIVALS = [
  {
    id: 'lanterns', name: 'Lantern Night', from: [11, 5], to: [11, 25], deco: 'lanterns',
    about: 'Every window in the Vale has a lantern in it, so the dragon can see from the mountain that there is nothing here worth the trip.',
    join: 'Hang a lantern',
    joined: '{name} hangs a lantern in the tavern window, next to everyone else\'s. The dragon is not expected.',
    talk: [
      'The barkeep has hung so many lanterns that the moths have formed a committee.',
      'A child asks why the lanterns are for the dragon. Nobody gives the same answer twice.',
      'Someone has painted a dragon on their lantern, which is felt to be missing the point.',
    ],
  },
  {
    id: 'midwinter', name: 'Midwinter', from: [12, 18], to: [1, 6], deco: 'holly',
    about: 'The longest night, kept with holly, a pudding, and a great deal of singing about the pudding.',
    join: 'Have some pudding',
    joined: '{name} has some of the Midwinter pudding. There is a coin in it. There is always a coin in it, and it is always the same coin.',
    talk: [
      'The Midwinter pudding has been soaking since the summer. It is said to be stable.',
      'The bard has written a carol. It has eleven verses and they are all about the goose.',
      'There is holly over the door, and someone has been standing under it hopefully all evening.',
    ],
  },
  {
    id: 'blossom', name: 'The Blossom Fair', from: [4, 10], to: [4, 30], deco: 'blossom',
    about: 'The orchards flower, the Vale holds a fair, and the prize marrow is judged, eventually, after the arguments.',
    join: 'Visit the fair',
    joined: '{name} visits the Blossom Fair, judges a marrow, and has to be escorted from the tent afterwards for their own safety.',
    talk: [
      'The marrow judges have been locked in the barn until they agree. It may be some time.',
      'There are petals in the ale. The barkeep says it is a seasonal feature.',
      'A farmer is selling blossom honey and the bees are following him round to check the price.',
    ],
  },
  {
    id: 'midsummer', name: 'Midsummer', from: [6, 14], to: [7, 4], deco: 'sun',
    about: 'The longest day, which the Vale spends outdoors complaining about the heat, around a bonfire.',
    join: 'Jump the bonfire',
    joined: '{name} jumps the Midsummer bonfire, for luck, and lands on the far side with most of their eyebrows.',
    talk: [
      'The bonfire has been built taller than the tavern. The tavern is nervous.',
      'Somebody is selling fans made of goose feathers. The goose has been informed.',
      'It is still light at ten. Several regulars are refusing to go home on principle.',
    ],
  },
  {
    id: 'harvest', name: 'The Harvest Fair', from: [9, 20], to: [10, 10], deco: 'harvest',
    about: 'The harvest is in, the cider is pressed, and the Vale pays its debts for the year, except the large one.',
    join: 'Drink the new cider',
    joined: '{name} drinks the new cider and agrees that it is a good year, several times, to several people.',
    talk: [
      'The new cider is out. The barkeep has hidden the old cider, in case it is needed for cleaning.',
      'A farmer has brought a pumpkin to show the room. It has its own chair.',
      'The tithe barn is full. The dragon\'s share is set aside, as usual, and is not discussed.',
    ],
  },
];
export const FESTIVAL_BY_ID = Object.fromEntries(FESTIVALS.map((f) => [f.id, f]));
