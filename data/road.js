// Choices on the road (after Phase 7). Now and then, between tasks out in the open, the hero meets
// something and waits for word from the tavern. Each choice has two options; if no word comes in
// time the hero takes `auto`, the one in character for a hero left to think for themselves.
// Voice: a dry chronicler; no exclamation marks. {name} is filled in by the game.
//
// What an option does (all optional; numbers in js/rules.js):
//   gold    units of gold, which grow with the hero's level (goldUnit); negative is a price to pay
//   xp      minutes of work at the hero's level (workXp)
//   boon    [boon id, hours]: a short spell of luck (BOONS)
//   loot    true: one piece of gear at the hero's level, as from a chest
//   hp      a share of maximum hit points: positive heals, negative hurts (never below 1)
//   chance  the odds that `win` happens rather than `lose`; each has its own line and effects
// `line` is the Chronicle line for the option, or for the win or loss.

export const ROAD_TEXT = {
  waiting: '{name} meets something on the road and sends word to the tavern, asking what to do.',
  auto: 'No word came from the tavern, so {name} decided.',
};

export const CHOICES = [
  {
    id: 'goblin_map', text: 'A goblin by the road is selling a map. It is, he says, genuinely of somewhere.', auto: 1,
    options: [
      { label: 'Buy the map', gold: -0.3, boon: ['swift', 8], line: 'The map is of somewhere, and the somewhere has shortcuts. {name} keeps it.' },
      { label: 'Keep walking', line: '{name} keeps walking. The goblin sells the map to the next traveller, who is not seen again, possibly because the map works.' },
    ],
  },
  {
    id: 'shrine', text: 'A wayside shrine to a minor god of second chances. There is a dish for coins.', auto: 0,
    options: [
      { label: 'Leave a coin', gold: -0.1, boon: ['luck', 6], line: '{name} leaves a coin. Somewhere, a minor god makes a note.' },
      { label: 'Walk on', line: '{name} walks on. The god of second chances will no doubt give {name} another.' },
    ],
  },
  {
    id: 'fork', text: 'The road forks. Both signposts point to the same town and disagree about how far it is.', auto: 1,
    options: [
      { label: 'Take the short way', chance: 0.5,
        win: { xp: 20, line: 'The short way is short. {name} arrives early and finds work waiting.' },
        lose: { hp: -0.3, line: 'The short way runs through a bramble thicket, and then through another.' } },
      { label: 'Take the long way', xp: 8, line: 'The long way is long and uneventful, which is what {name} wanted from it.' },
    ],
  },
  {
    id: 'cart', text: 'A merchant\'s cart is stuck to the axles in mud. The merchant is explaining this to the horse.', auto: 0,
    options: [
      { label: 'Help push', xp: 10, gold: 0.2, line: '{name} pushes. The cart moves, the mud keeps a boot for a while, and the merchant pays for the trouble.' },
      { label: 'Offer advice', xp: 3, line: '{name} offers advice about mud. The merchant thanks {name} in a voice that means the opposite.' },
    ],
  },
  {
    id: 'troll', text: 'A troll is asleep across the road with a strongbox under its arm.', auto: 1,
    options: [
      { label: 'Ease the box free', chance: 0.6,
        win: { loot: true, line: '{name} eases the box free a finger at a time. The troll turns over and says something fond about its mother.' },
        lose: { hp: -0.4, line: 'The troll wakes halfway through. It is not a morning troll.' } },
      { label: 'Let it sleep', line: '{name} goes round the troll by a wide margin and does not look back, which is the correct way to go round a troll.' },
    ],
  },
  {
    id: 'hedge_wizard', text: 'A hedge wizard offers to sharpen any blade by speaking to it firmly.', auto: 1,
    options: [
      { label: 'Pay for the spell', gold: -0.2, boon: ['keen', 6], line: 'The wizard speaks to the blade at length. It comes back noticeably keener and slightly sulky.' },
      { label: 'Decline', line: '{name} declines. The wizard speaks firmly to a turnip instead, for practice.' },
    ],
  },
  {
    id: 'sheep', text: 'A sheep is standing in the road with a label round its neck giving an address.', auto: 0,
    options: [
      { label: 'Take it home', gold: 0.3, xp: 4, line: '{name} walks the sheep home. The farmer pays a finder\'s fee and does not explain the label.' },
      { label: 'Leave it', line: '{name} leaves the sheep where it is. It follows for a mile, then finds something better to do.' },
    ],
  },
  {
    id: 'bard', text: 'A bard on a milestone asks {name} for a story worth putting to music.', auto: 0,
    options: [
      { label: 'Tell it straight', xp: 12, line: '{name} tells it straight. The bard writes it down and adds a dragon, which is at least accurate in spirit.' },
      { label: 'Improve on it', chance: 0.5,
        win: { gold: 0.5, line: 'The improved story goes down well. The bard insists on paying for the rights.' },
        lose: { xp: 2, line: 'The bard has heard the improved version before, from three other heroes, about themselves.' } },
    ],
  },
  {
    id: 'puddle', text: 'A puddle in the road is reflecting a different sky from the one above it.', auto: 1,
    options: [
      { label: 'Drink from it', chance: 0.5,
        win: { boon: ['scholar', 8], line: '{name} drinks. The other sky tastes of clear thinking and slightly of tin.' },
        lose: { boon: ['cursed', 2], line: '{name} drinks. The other sky does not agree with {name}, and says so for some hours.' } },
      { label: 'Step over it', line: '{name} steps over it. The other sky looks faintly disappointed.' },
    ],
  },
  {
    id: 'frog_toll', text: 'A frog in a waistcoat is charging a toll to cross a bridge it does not appear to own.', auto: 0,
    options: [
      { label: 'Pay the frog', gold: -0.05, xp: 2, line: '{name} pays. The frog issues a receipt, which is more than most tolls manage.' },
      { label: 'Ask to see the deeds', chance: 0.5,
        win: { xp: 10, gold: 0.1, line: 'The frog cannot produce the deeds and pays {name} to forget the matter.' },
        lose: { hp: -0.2, line: 'The frog produces the deeds, and also a cousin, who is much larger.' } },
    ],
  },
  {
    id: 'dragon_tax', text: 'A clerk with a satchel stops {name} to collect a portion of the dragon\'s due.', auto: 1,
    options: [
      { label: 'Pay the portion', gold: -0.2, boon: ['fortune', 8], line: '{name} pays. The receipt is stamped with a dragon, and turns out to be accepted everywhere as proof of good standing.' },
      { label: 'Refuse', chance: 0.7,
        win: { xp: 10, line: '{name} refuses. The clerk makes a note, and the note joins a very long list.' },
        lose: { gold: -0.3, line: '{name} refuses. The clerk produces a second form, for refusals, with a higher fee.' } },
    ],
  },
  {
    id: 'stew', text: 'An empty camp by the road, with a pot of stew still warm over the fire.', auto: 0,
    options: [
      { label: 'Have a bowl', hp: 1, boon: ['hardy', 6], line: '{name} has a bowl. It is very good stew. Whoever made it is owed an apology and a recipe.' },
      { label: 'Leave it', xp: 6, line: '{name} leaves the stew for its owner and feels improved by the decision, if no better fed.' },
    ],
  },
  {
    id: 'fortune', text: 'A fortune teller under a striped awning offers to read the hero\'s palm.', auto: 0,
    options: [
      { label: 'Cross her palm', gold: -0.2, boon: ['luck', 8], line: 'She reads a long life and a short temper, and says the dice are listening. They seem to be.' },
      { label: 'Laugh it off', chance: 0.8,
        win: { line: '{name} laughs it off. The fortune teller laughs too, which is somehow worse.' },
        lose: { boon: ['cursed', 2], line: '{name} laughs it off. The fortune teller does not, and the dice take her side.' } },
    ],
  },
  {
    id: 'arm_wrestle', text: 'A hero from the tavern across the road challenges {name} to an arm-wrestle, for money.', auto: 0,
    options: [
      { label: 'Accept', chance: 0.55,
        win: { gold: 0.4, xp: 5, line: '{name} wins, and is gracious about it, at length.' },
        lose: { gold: -0.1, hp: -0.1, line: '{name} loses, and the other hero is gracious about it, at length.' } },
      { label: 'Decline', line: '{name} declines. The other hero arm-wrestles a gatepost instead, and loses.' },
    ],
  },
  {
    id: 'not_a_mimic', text: 'A chest by the road has NOT A MIMIC painted on the lid in careful letters.', auto: 1,
    options: [
      { label: 'Open it', chance: 0.5,
        win: { loot: true, line: 'It was not a mimic. It was a chest, with something in it, and a great deal of paint on the lid.' },
        lose: { hp: -0.35, line: 'It was a mimic. Painting the lid was, on reflection, a very good idea of its own.' } },
      { label: 'Poke it with a stick', xp: 6, line: '{name} pokes it with a stick. It was a mimic, and is now a sulking one.' },
    ],
  },
  {
    id: 'pilgrim', text: 'A pilgrim with very worn boots offers to bless {name}\'s.', auto: 0,
    options: [
      { label: 'Accept the blessing', gold: -0.05, boon: ['blessed', 6], line: 'The pilgrim blesses the boots, then the laces, then, to be thorough, the hero.' },
      { label: 'Decline politely', xp: 3, line: '{name} declines politely. The pilgrim blesses a passing beetle instead.' },
    ],
  },
  {
    id: 'goose', text: 'A goose is standing in the middle of the road. It knows exactly what it is doing.', auto: 1,
    options: [
      { label: 'Stand firm', chance: 0.5,
        win: { xp: 15, line: '{name} stands firm. The goose stands firmer, then yields, and records the incident.' },
        lose: { hp: -0.25, line: 'The goose wins. Nobody who saw it will mention it, out of respect for the goose.' } },
      { label: 'Go round', line: '{name} goes round. The goose watches all the way, to make sure.' },
    ],
  },
  {
    id: 'well', text: 'An old well with a sign: WISHES, ONE COPPER. NO REFUNDS.', auto: 1,
    options: [
      { label: 'Make a wish', gold: -0.05, chance: 0.4,
        win: { gold: 0.6, line: '{name} wishes for money. A bucket comes up with somebody else\'s savings in it.' },
        lose: { line: '{name} wishes. The well keeps the copper, as the sign promised.' } },
      { label: 'Draw water', hp: 0.5, line: '{name} draws water instead. It is very good water, and it was free.' },
    ],
  },
];
export const CHOICE_BY_ID = Object.fromEntries(CHOICES.map((c) => [c.id, c]));
