// Dungeons and bosses, one per region (keyed by region id).
// A run is a number of rooms and then the boss. Hit points do not come back between rooms.
//   level      the level the dungeon is built for; a lower hero is outmatched (js/rules.js)
//   rooms      [min, max] rooms in a run
//   secs       [min, max] seconds per room
//   dc, dmg    the roll to meet and the damage die for every room. Rooms hit about 1.7 times as
//              hard as a monster of the same level met while roaming; tuned with the simulator so
//              a hero of the dungeon's level who has spent their skill points loses a run now and
//              then before the first clear. Phase 4 raised these from the third dungeon on, and
//              js/rules.js (GROWN) adds a little more DC and damage by level on top
//   gold       [min, max] gold for a room cleared cleanly
//   enter      Chronicle line when a run starts
//   roomTasks  rooms with their own task line and hit/miss lines. About half the rooms of a run
//              are these; the rest hold one of the region's monsters, using that monster's lines.
//   crit, fumble   lines for a natural 20 and a natural 1 in a room
//   ko         second sentence of the knockout line for a room
//   boss       fought over several rolls: the hero needs `hits` successes before running out of
//              hit points. A natural 20 counts as two.
//     tasks    task bar lines for the fight
//     win      Chronicle line for beating the boss
//     ko       second sentence of the knockout line
export const DUNGEONS = {
  mugwick: {
    id: 'cellar', name: 'The Cellar Beneath the Cellar', level: 3, rooms: [8, 9], secs: [150, 210], dc: 13, dmg: 12, gold: [8, 18],
    about: 'A second cellar under the tavern, fitted out as an office by people who did not ask.',
    enter: 'Down the stairs behind the barrels. There is lamplight, and the sound of stamping.',
    roomTasks: [
      { text: 'Squeezing between shelves of unserved notices', hit: 'The shelves hold. The hero pockets a notice with the tavern\'s name on it.', miss: 'A shelf of notices comes down. Paper is heavier than it looks.' },
      { text: 'Crossing a floor of spilled sealing wax', hit: 'Across, with both boots.', miss: 'The wax was still warm in the middle.' },
      { text: 'Interrupting a goblin clerk at its desk', hit: 'The clerk is told to take an early lunch and does.', miss: 'The clerk throws the inkwell, then the desk.' },
      { text: 'Wading through a wine cellar somebody forgot', hit: 'Through, and only slightly cheered.', miss: 'A rack gives way. It was a good year, and a sharp one.' },
      { text: 'Getting past a door marked Staff Only', hit: 'The lock is older than the door and gives up first.', miss: 'The door was trapped by someone who took the sign seriously.' },
    ],
    crit: 'The hero finds the rota and walks through at the change of shift.',
    fumble: 'The hero trod on a rubber stamp and went down the stairs the short way.',
    ko: 'The goblins carried the hero up to the bar and left a notice about trespass.',
    boss: {
      id: 'under_sheriff', name: 'Under-Sheriff Skrindle', check: 'Intimidation', hits: 3, dc: 14, dmg: 12,
      about: 'A goblin with a brass chain of office and a stamp for every occasion. Has been serving the eviction from underneath.',
      tasks: ['Contesting an eviction with the goblin who drew it up', 'Being served, repeatedly, by Under-Sheriff Skrindle'],
      win: 'Skrindle hands over his stamp, his chain, and one page of a very old lease. The notice is real. It was being served from downstairs.',
      ko: 'He stamped the hero VOID and had them taken upstairs.',
    },
  },

  mumblewood: {
    id: 'thornwarren', name: 'The Thornwarren', level: 5, rooms: [8, 10], secs: [150, 210], dc: 14, dmg: 19, gold: [10, 24],
    about: 'A warren of thorn tunnels at the heart of the wood, where the papers on every tree are kept.',
    enter: 'Into the thorns. The mumbling is louder in here, and it is reciting figures.',
    roomTasks: [
      { text: 'Crawling through a tunnel that tightens when watched', hit: 'The hero looks the other way and it loosens.', miss: 'The thorns close in to check for valuables.' },
      { text: 'Crossing a root bridge over a pit of tags', hit: 'The roots hold, grudgingly.', miss: 'A root pulls back. The pit is full of nails.' },
      { text: 'Passing a wall of sleeping saplings', hit: 'Not one of them wakes.', miss: 'One wakes, and then they all do.' },
      { text: 'Searching a hollow full of filed leaves', hit: 'The leaf for the hero\'s own boots is found and removed.', miss: 'The filing was guarded by its own index, which stings.' },
      { text: 'Following the mumbling toward its source', hit: 'The right turning, by ear.', miss: 'The wrong turning. The thorns there had not been fed.' },
    ],
    crit: 'The hero mumbles along with the wood and is taken for a tree.',
    fumble: 'The hero leaned on something for a rest. It was not asleep.',
    ko: 'The thorns passed the hero out hand over hand and left them at the treeline.',
    boss: {
      id: 'receiver', name: 'Old Bramblewick, Receiver of the Wood', check: 'Nature', hits: 3, dc: 15, dmg: 19,
      about: 'An ancient treant appointed to hold the forest for its creditor. Has not slept since the appointment and blames everyone.',
      tasks: ['Arguing a repossession with a tree that holds the papers', 'Standing up to Old Bramblewick'],
      win: 'Bramblewick lets a page fall like a leaf. The forest was repossessed, tree by tree, and it has been mumbling the terms ever since.',
      ko: 'Bramblewick tagged the hero and set them outside with the other seized goods.',
    },
  },

  saltmarrow: {
    id: 'lighthouse', name: 'The Drowned Lighthouse', level: 8, rooms: [9, 11], secs: [150, 220], dc: 14, dmg: 30, gold: [14, 34],
    about: 'A lighthouse the sea took forty years ago. The lamp is still kept, by someone who sends bills.',
    enter: 'In by the gallery door at low tide. The stairs go down, and they are wet all the way.',
    roomTasks: [
      { text: 'Going down a spiral stair with the tide coming up', hit: 'One turn ahead of the water.', miss: 'The water wins that turn.' },
      { text: 'Swimming a flooded store room', hit: 'Through, with a held breath to spare.', miss: 'Something in the store room swims better.' },
      { text: 'Crossing a floor of barnacled ledgers', hit: 'A careful crossing. One ledger comes along.', miss: 'Barnacles are sharp, and so are the eels in the binding.' },
      { text: 'Reading a signal book by the light of a jellyfish', hit: 'The signals are payment demands. The hero copies three.', miss: 'The jellyfish objects to being used as a lamp.' },
      { text: 'Forcing a hatch that the sea is leaning on', hit: 'The hatch opens inward, which helps.', miss: 'The hatch opens all at once.' },
    ],
    crit: 'The tide turns at the perfect moment and carries the hero down a whole floor.',
    fumble: 'The hero tested the depth with both feet.',
    ko: 'The tide put the hero back on the beach with the driftwood.',
    boss: {
      id: 'tide_reeve', name: 'The Tide-Reeve', check: 'Arcana', hits: 3, dc: 15, dmg: 30,
      about: 'A sea hag who keeps the lamp and takes the smugglers\' fees. She has never said on whose behalf.',
      tasks: ['Asking the Tide-Reeve who she collects for', 'Fighting a sea hag in her own lamp room, waist deep'],
      win: 'The Tide-Reeve gives up a page and a receipt book. The smugglers have paid her for forty years, and not one coin of it went to the dragon.',
      ko: 'She charged the hero for the rescue and sent them up on the next wave.',
    },
  },

  peaks: {
    id: 'underking', name: 'Hall of the Under-King', level: 10, rooms: [9, 12], secs: [160, 220], dc: 15, dmg: 38, gold: [16, 40],
    about: 'A dwarven hall sealed from the inside. The Under-King went in with the only copy of something and was not seen again.',
    enter: 'Through the sealed door. The hall beyond is cold, square, and very well made.',
    roomTasks: [
      { text: 'Crossing a hall where every tenth flagstone drops', hit: 'The hero counts to nine, repeatedly.', miss: 'The hero loses count at an unlucky moment.' },
      { text: 'Reading a wall of dwarven signatures', hit: 'Every clan signed. The hero finds the place where they did.', miss: 'The wall was load-bearing, and the reading was too close.' },
      { text: 'Walking a gallery of stone guards', hit: 'None of them turns its head.', miss: 'One was standing in for a statue and took offence.' },
      { text: 'Working a counterweight lift by hand', hit: 'Up, slowly, without incident.', miss: 'Up, then down faster.' },
      { text: 'Searching a records vault filed by weight', hit: 'The heaviest shelf holds a note: taken by the King.', miss: 'A shelf of stone tablets is filed onto the hero.' },
    ],
    crit: 'The hero finds the dwarven maintenance passage and skips a floor of traps.',
    fumble: 'The hero admired the stonework from directly beneath it.',
    ko: 'The hall delivered the hero to the door on a small cart built for the purpose.',
    boss: {
      id: 'seneschal', name: 'The Seneschal of the Under-King', check: 'History', hits: 3, dc: 16, dmg: 38,
      about: 'A stone golem told to hold the hall until the King returns. That was two hundred years ago and it has not once sat down.',
      tasks: ['Explaining to a golem that the King is not coming', 'Standing in front of the Seneschal of the Under-King'],
      win: 'The Seneschal kneels and opens its chest, which is a strongbox. The dwarves signed the lease. The Under-King kept the only copy, and then mislaid himself.',
      ko: 'It announced the hero as "one visitor, departing" and saw to it.',
    },
  },

  gloamfen: {
    id: 'abbey', name: 'The Sunken Abbey', level: 12, rooms: [10, 12], secs: [160, 220], dc: 15, dmg: 48, gold: [18, 46],
    about: 'An abbey that went under the fen with all hands. The monks kept the accounts for half the realm and are still keeping them.',
    enter: 'Down through the bell tower, the only part still above the mere.',
    roomTasks: [
      { text: 'Wading a flooded cloister in silence', hit: 'Not a ripple.', miss: 'A ripple. The brothers do not care for noise.' },
      { text: 'Passing a refectory where the dead are at supper', hit: 'The hero is taken for a lay brother and waved through.', miss: 'The hero is asked to say grace and gets it wrong.' },
      { text: 'Climbing a stair of sunken pews', hit: 'They hold, damply.', miss: 'A pew rolls. The mud beneath has hands in it.' },
      { text: 'Reading a ledger whose ink runs when breathed on', hit: 'Three pages read. Each one says paid.', miss: 'The ledger has a keeper, and he keeps it closed.' },
      { text: 'Slipping past a choir of drowned monks', hit: 'The hero waits for the loud part.', miss: 'The hero is noticed during a rest in the music.' },
    ],
    crit: 'A brother who has waited a century for someone to ask shows the hero the short way to the library.',
    fumble: 'The hero rang a bell to see if it still worked.',
    ko: 'The brothers laid the hero in the infirmary boat and pushed it out toward the shore.',
    boss: {
      id: 'abbot', name: 'Abbot Dolorous, Keeper of the Books', check: 'Religion', hits: 4, dc: 16, dmg: 46,
      about: 'Dead, drowned, and still balancing the accounts. Will not release a ledger that has not been audited, and has not found an auditor he trusts.',
      tasks: ['Asking a dead abbot for his ledgers', 'Being audited by Abbot Dolorous'],
      win: 'The Abbot closes the book and slides a page across the lectern. The monks kept the ledgers. The ledgers say the rent was paid.',
      ko: 'He marked the hero absent and had them floated to the bank.',
    },
  },

  cinder: {
    id: 'tomb', name: 'Tomb of the Thrice-Buried King', level: 15, rooms: [10, 13], secs: [160, 230], dc: 16, dmg: 67, gold: [22, 56],
    about: 'A tomb that has been buried three times, each time deeper. Whoever paid for it wanted to be sure.',
    enter: 'Through three layers of sand and three sealed doors. The third has scratches on the inside.',
    roomTasks: [
      { text: 'Crossing a corridor that fills with sand', hit: 'Out the far door at a run.', miss: 'Out the far door, eventually, by digging.' },
      { text: 'Reading curses carved in three different hands', hit: 'The hero finds the one that is only a notice about where not to leave carts.', miss: 'The second curse was current.' },
      { text: 'Passing a rank of embalmed guards', hit: 'They have orders about people leaving, not arriving.', miss: 'They have orders about both.' },
      { text: 'Weighing a heart against a feather under supervision', hit: 'Near enough.', miss: 'The scales were not in the hero\'s favour, and neither was the supervisor.' },
      { text: 'Prising the lid off the second burial', hit: 'It lifts. There is a third inside, as advertised.', miss: 'The lid had been weighted against exactly this.' },
    ],
    crit: 'The hero finds the workmen\'s tunnel, left by a burial gang who also wanted a quick way out.',
    fumble: 'The hero read a curse aloud to check the pronunciation.',
    ko: 'The guards carried the hero out and buried the door again behind them.',
    boss: {
      id: 'seal_warden', name: 'Hekmet, Warden of the Third Seal', check: 'Arcana', hits: 4, dc: 17, dmg: 63,
      about: 'A mummified vizier paid to keep the King from speaking. He has had three hundred years to regret the fee.',
      tasks: ['Breaking the third seal while its warden objects', 'Fighting Hekmet in a room with one door'],
      win: 'Hekmet falls to dust and the King sits up with a page of the lease in his hand. He was buried three times to stop him testifying. He would like to testify.',
      ko: 'He had the hero wrapped, labelled, and returned to sender.',
    },
  },

  underdeep: {
    id: 'market', name: 'The Lightless Market', level: 18, rooms: [11, 14], secs: [160, 230], dc: 17, dmg: 84, gold: [26, 66],
    about: 'A market held in the dark, where debts change hands by touch. One stall has never had a lamp.',
    enter: 'The lamp is put out at the gate, as the sign asks. After that it is voices and elbows.',
    roomTasks: [
      { text: 'Crossing an aisle of stalls by touch', hit: 'The hero touches nothing that touches back.', miss: 'Something touches back.' },
      { text: 'Haggling with a voice for directions', hit: 'A fair price, and the directions are good.', miss: 'The price was a pint of blood and the voice collects in advance.' },
      { text: 'Following a rope strung between the stalls', hit: 'The rope leads on.', miss: 'The rope was somebody\'s, and they reel it in.' },
      { text: 'Passing the pens where bad debts are kept', hit: 'They are asleep.', miss: 'One of them recognizes the hero\'s name.' },
      { text: 'Listening for the one stall that makes no sound', hit: 'There. Colder than the rest.', miss: 'The silence was something holding its breath.' },
    ],
    crit: 'The hero is mistaken for a buyer of standing and escorted two aisles on.',
    fumble: 'The hero struck a light. The market does not allow it, and enforces that.',
    ko: 'The market sold the hero back to the surface at a small loss.',
    boss: {
      id: 'brokers_voice', name: "The Broker's Voice", check: 'Insight', hits: 4, dc: 18, dmg: 80,
      about: 'What speaks for the broker nobody has seen. It has a great many eyes, all of them shut, and it keeps the stall.',
      tasks: ['Asking to see the broker and being shown the Voice', 'Fighting something in the dark that can see perfectly well'],
      win: 'The Voice opens every eye at once and then none. Under the stall is a page and a book of sales. The payments were sold on, at a markup, by a broker nobody has seen.',
      ko: 'It quoted the hero a price for the way out and took it from them directly.',
    },
  },

  wyrmspire: {
    id: 'hoard', name: 'The Hoard of Vexaldrith', level: 20, rooms: [12, 15], secs: [160, 230], dc: 17, dmg: 90, gold: [30, 76],
    about: 'The top of the volcano, where the landlord lives on three hundred years of what she is owed.',
    enter: 'Through the forty-foot door. The floor is coins from here on, and they shift.',
    roomTasks: [
      { text: 'Wading uphill through loose gold', hit: 'Slow, but upward.', miss: 'A slope of coins lets go all at once.' },
      { text: 'Crossing a gallery of former heroes\' armour', hit: 'The hero does not look at the name plates.', miss: 'One of the suits is still occupied by something.' },
      { text: 'Passing the vent where the mountain breathes', hit: 'Across between breaths.', miss: 'The mountain breathes early.' },
      { text: 'Reading the tenancy roll carved around a pillar', hit: 'The Wobbly Griffin is on it, near the bottom, marked in red.', miss: 'The pillar is hot enough to read by touch, which was the mistake.' },
      { text: 'Stepping over a tail the length of a street', hit: 'It does not twitch.', miss: 'It twitches.' },
    ],
    crit: 'The hero finds the tradesman\'s entrance, which even a dragon\'s lair must have.',
    fumble: 'The hero stopped to pick up one coin.',
    ko: 'The hero slid down the hoard, the mountain, and most of the road.',
    boss: {
      id: 'vexaldrith', name: 'Vexaldrith', check: 'Persuasion', hits: 5, dc: 18, dmg: 85,
      about: 'An ancient dragon and the landlord of everything in sight. Has been owed rent for three hundred years and has kept count of every day.',
      tasks: ['Presenting the full lease to Vexaldrith', 'Hearing a dragon dispute a document in the traditional manner', 'Standing on clause nine while the room burns'],
      win: 'Vexaldrith goes down the way heroes do: knocked out, not slain. She wakes, reads the ledgers, and concedes the point with poor grace.',
      ko: 'She returned the hero to the tavern by air, without landing.',
    },
  },
};

export const BOSS_BY_ID = Object.fromEntries(Object.values(DUNGEONS).map((d) => [d.boss.id, d.boss]));

// The Dragonborn's Breath Weapon, which opens every boss fight with a free hit.
export const BREATHS = ['fire', 'frost', 'lightning', 'something mildly acidic'];
