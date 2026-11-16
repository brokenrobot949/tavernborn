// Rare monsters, by region (after Phase 7, round five). Each region has two rare monsters, met now and
// then while roaming, and one elusive beast that only comes out under a condition the world already
// keeps: the time of day on the device's clock, or the region's weather.
// They are written like the monsters in data/monsters.js, without the numbers: `rare()` works those out
// from the level, so a rare is always a step harder than the ordinary monsters beside it and pays for it.
//   rare   1 for a rare monster, 2 for the elusive beast
//   when   (elusive only) 'night', 'dusk', 'dawn', or 'weather' (the region's own: leaves, rain, snow, sand)
//   sign   (elusive only) what the Bestiary says about when to look
// Voice: a dry chronicler; no exclamation marks.

const dcFor = (level) => 13 + Math.round(level / 4);
const dmgFor = (level) => Math.round(2 + 1.7 * level);
const goldFor = (level, times) => [Math.round((1 + 0.5 * level) * times), Math.round((3 + 1.4 * level) * times)];

function rare(m) {
  const elusive = !!m.when;
  return {
    ...m,
    rare: elusive ? 2 : 1,
    dc: dcFor(m.level) + (elusive ? 1 : 0),
    dmg: Math.round(dmgFor(m.level) * (elusive ? 1.7 : 1.5)),
    xp: elusive ? 100 : 72,
    gold: goldFor(m.level, elusive ? 8 : 5),
    secs: elusive ? [120, 180] : [90, 150],
  };
}

const list = (...ms) => ms.map(rare);

export const RARES = {
  mugwick: list(
    {
      id: 'standing_hen', name: 'Hen of Considerable Standing', level: 2, check: 'Animal Handling',
      about: 'Owns, on paper, most of the lower pasture. The paper is kept under the hen.',
      tasks: ['Asking a hen to move off a deed of title', 'Negotiating with a hen through a third party', 'Being looked at by a hen for a long time'],
      hit: ['The hen rises, and the deed is recovered, warm.', 'The hen is persuaded that the pasture was only ever leased.'],
      miss: ['The hen stays put and pecks with real authority.', 'The hen has friends, and they were behind the hero the whole time.'],
      crit: 'The hen signs the pasture over and seems relieved to be rid of it.',
      fumble: 'The hero is now a tenant of the hen.',
      ko: 'The hen settled back on its paperwork and did not watch them go.',
    },
    {
      id: 'goblin_auditor', name: 'Goblin Auditor-in-Chief', level: 3, check: 'Deception',
      about: 'Checks the other goblins\' sums. Has never once found them correct and is paid by the error.',
      tasks: ['Being audited at the roadside by a goblin with a lectern', 'Producing receipts that were never issued', 'Disputing a column of figures with its author'],
      hit: ['The auditor finds an error of its own and leaves to report itself.', 'The sums are settled in the hero\'s favour, under protest.'],
      miss: ['The auditor finds the hero in arrears and collects on the spot.', 'A lectern is a heavier thing than it looks.'],
      crit: 'The auditor is handed its own ledger upside down and audits that instead.',
      fumble: 'The hero admitted to a hat that had not been declared.',
      ko: 'The auditor noted the hero down as a loss and carried it forward.',
    },
    {
      id: 'night_badger', name: 'Badger Who Works Nights', level: 3, check: 'Stealth', when: 'night',
      sign: 'Seen only at night.',
      about: 'Digs up boundary stones by moonlight and puts them back somewhere better. Nobody has asked it to stop twice.',
      tasks: ['Following a badger that is carrying a boundary stone', 'Waiting by a hole with a lantern turned low', 'Asking a badger where the parish used to end'],
      hit: ['The badger drops the stone and goes to ground with a grunt.', 'The stone is put back, and the badger watches from a hedge to see that it is done properly.'],
      miss: ['The badger does not care for lanterns and says so with its claws.', 'The hero steps in one of its earlier holes.'],
      crit: 'The badger shows the hero where three lost stones are, and wants nothing for it.',
      fumble: 'The hero is now on the wrong side of the parish boundary, and it is a long way round.',
      ko: 'It was gone before the lantern was found again.',
    },
  ),

  mumblewood: list(
    {
      id: 'white_stag', name: 'White Stag, Uncollected', level: 4, check: 'Survival',
      about: 'Carries a notice on each antler that nobody has got near enough to read. The wood is fond of it.',
      tasks: ['Tracking a white stag by the notices it sheds', 'Standing very still while a stag reconsiders', 'Reading an antler from as close as is wise'],
      hit: ['The stag allows one notice to be taken down and walks on.', 'The stag is turned back toward the deep wood, where it is safer.'],
      miss: ['The stag lowers its head, notices and all.', 'The stag goes through a thicket and the hero follows, which was the mistake.'],
      crit: 'The stag bows, sheds an antler at the hero\'s feet, and is gone between two trees.',
      fumble: 'The hero is carried some distance on the antlers, between the notices.',
      ko: 'It stepped over the hero with great care.',
    },
    {
      id: 'hollow_oak', name: 'Hollow Oak of Record', level: 5, check: 'History',
      about: 'The wood keeps its oldest papers inside it. The oak has read them all and has views.',
      tasks: ['Asking an oak for a document it is standing on', 'Reaching into a hollow that is not empty', 'Listening to an oak recite a lease from memory'],
      hit: ['The oak gives up the paper and a good deal of advice.', 'A root lifts, slowly, and the document is drawn out.'],
      miss: ['The oak closes the hollow with the hero\'s arm still in it.', 'A branch comes down that had been waiting for years.'],
      crit: 'The oak recites the one clause that matters and then goes back to sleep.',
      fumble: 'The hero is filed under H.',
      ko: 'The oak kept the hat, as a record.',
    },
    {
      id: 'leaf_walker', name: 'Walker in the Leaf-Fall', level: 5, check: 'Perception', when: 'weather',
      sign: 'Seen only while the leaves are falling.',
      about: 'A shape that the falling leaves make when the wind is right. It has business in the wood and keeps to it.',
      tasks: ['Watching the leaves fall in the shape of someone', 'Following footprints that fill in behind themselves', 'Asking the falling leaves to stop for a word'],
      hit: ['The shape comes apart, and something small and old is left on the path.', 'The leaves settle. The hero is let through.'],
      miss: ['The leaves go through the hero like a bill through a letterbox.', 'The wind turns, and all of it arrives at once.'],
      crit: 'The walker stops, inclines what would be its head, and leaves a gift in the drift.',
      fumble: 'The hero raked at it with both arms and has pulled something.',
      ko: 'By morning it was only leaves.',
    },
  ),

  saltmarrow: list(
    {
      id: 'pearl_crab', name: 'Crab With a Pearl', level: 6, check: 'Sleight of Hand',
      about: 'Found the pearl years ago and has been unable to put it down since, in case.',
      tasks: ['Offering a crab a fair price for a pearl', 'Circling a crab that is circling back', 'Reaching for a pearl that a claw is attached to'],
      hit: ['The crab lets go at last and looks ten years younger.', 'A swap is agreed: the pearl for a good round pebble.'],
      miss: ['The crab keeps the pearl and takes a finger\'s worth of interest.', 'The claw that is not holding the pearl is the quick one.'],
      crit: 'The crab hands over the pearl and walks into the sea without a backward look.',
      fumble: 'The crab now holds the pearl and the hero\'s purse.',
      ko: 'It took the hero for driftwood and climbed over.',
    },
    {
      id: 'sunk_bosun', name: 'Bosun of a Ship Long Sunk', level: 8, check: 'Intimidation',
      about: 'Still calls the watches on a beach where there is no ship. The tide turns out for him all the same.',
      tasks: ['Being piped aboard a ship that is not there', 'Standing a watch for a drowned bosun', 'Explaining to a ghost that the crew has been paid off'],
      hit: ['The bosun stands the hero down and goes back to his rounds.', 'He is shown the wreck from the cliff, and is quiet for a while.'],
      miss: ['The bosun finds the hero slack and uses the rope\'s end.', 'The tide comes in on his word, and quickly.'],
      crit: 'The bosun signs the hero off with full pay, in coin that has been under water.',
      fumble: 'The hero saluted with the wrong hand and is on a charge.',
      ko: 'He logged it as a man overboard and carried on.',
    },
    {
      id: 'storm_gull', name: 'Storm Gull, Senior Grade', level: 8, check: 'Acrobatics', when: 'weather',
      sign: 'Seen only in the rain.',
      about: 'Inspects the coast in bad weather, when it can be sure of not being followed. Outranks the customs gulls and lets them know.',
      tasks: ['Being inspected by a very large gull in the rain', 'Holding on to a hat in front of a gull that wants it', 'Declaring nothing, loudly, into a headwind'],
      hit: ['The gull passes the hero as fit to proceed and goes up into the weather.', 'The gull is driven off the catch it had impounded.'],
      miss: ['The gull comes down with the wind behind it.', 'The hero is searched, beak first.'],
      crit: 'The gull drops what it was carrying. It was somebody\'s strongbox.',
      fumble: 'The hat is now evidence.',
      ko: 'It circled twice, for the look of the thing.',
    },
  ),

  peaks: list(
    {
      id: 'retired_ogre', name: 'Ogre in Semi-Retirement', level: 9, check: 'Persuasion',
      about: 'Gave up the toll bridge for his knees. Still collects on fine days, to keep his hand in.',
      tasks: ['Paying a toll on a path with no bridge on it', 'Admiring an ogre\'s vegetable garden under instruction', 'Being told how tolls were done in the old days'],
      hit: ['The ogre waves the hero through and presses a marrow on them.', 'He is talked out of it, and into a sit down.'],
      miss: ['His knees are bad. His arms are as they ever were.', 'The hero is charged for the path, the view, and the conversation.'],
      crit: 'The ogre hands over a tin of old toll money he has no use for.',
      fumble: 'The hero trod on the seedlings.',
      ko: 'He put the hero by the path with a blanket over, which was decent of him.',
    },
    {
      id: 'milestone_mimic', name: 'Mimic Posing as a Milestone', level: 10, check: 'Investigation',
      about: 'Gives the distance to the next town as whatever keeps a traveller reading. Several people have been reading it for years.',
      tasks: ['Reading a milestone that has changed its mind', 'Sitting down on a stone to rest, then standing up quickly', 'Checking a milestone against the map'],
      hit: ['The milestone is turned over. It kept everything it ever ate underneath.', 'It gives the true distance, sulkily, and shuts.'],
      miss: ['The stone opens along a seam that was not there.', 'It said two miles. It was not two miles, and it had teeth.'],
      crit: 'The mimic is so startled at being read correctly that it coughs up a purse.',
      fumble: 'The hero leaned on it to take a stone out of a boot.',
      ko: 'It went back to saying three miles and waited.',
    },
    {
      id: 'snow_giant', name: 'Giant Seen Only in Snow', level: 10, check: 'Athletics', when: 'weather',
      sign: 'Seen only while it snows.',
      about: 'Comes down from the high passes when the snow covers its tracks. Surveys the lower slopes and disapproves of what has been built there.',
      tasks: ['Following footprints the size of a cart in fresh snow', 'Standing in the lee of something that turns out to be a leg', 'Asking a giant what it is measuring'],
      hit: ['The giant is turned back up the pass, grumbling like the mountain.', 'It lets the hero by and drops something from a pocket the size of a barn.'],
      miss: ['A hand comes out of the white and it is not a small hand.', 'The giant brushes the snow off its shoulder. The hero was under it.'],
      crit: 'The giant takes the hero for a surveyor and hands over its measuring chain, which is gold.',
      fumble: 'The hero threw a snowball, to see.',
      ko: 'The snow had covered the hero nicely by the time help came.',
    },
  ),

  gloamfen: list(
    {
      id: 'heron_magistrate', name: 'Heron Magistrate', level: 11, check: 'Persuasion',
      about: 'Sits one day in seven on a post in the middle channel. Hears cases between frogs and finds for itself.',
      tasks: ['Appearing before a heron on a matter of trespass', 'Waiting to be called while a heron stares at the water', 'Entering a plea from a punt'],
      hit: ['The case is dismissed, and the heron adjourns for lunch.', 'The heron finds for the hero, to its own surprise.'],
      miss: ['The heron passes sentence with its beak.', 'Costs are awarded against the hero, and collected.'],
      crit: 'The heron awards damages. They are in old silver, and wet.',
      fumble: 'The hero spoke out of turn and is held in contempt.',
      ko: 'The court rose, and flew off.',
    },
    {
      id: 'second_troll', name: 'Troll With a Second Opinion', level: 12, check: 'Medicine',
      about: 'Was told by one troll it was under review and by another that it was not. Has taken to asking passers-by.',
      tasks: ['Giving a troll an opinion it did not want', 'Examining the paperwork of a troll, at arm\'s length', 'Being consulted by a troll under a causeway'],
      hit: ['The troll is told it is in the clear, and is so pleased it lets the hero go.', 'The review is found to have lapsed. The troll goes back under the causeway.'],
      miss: ['The troll does not like the opinion and seeks a third, with its fists.', 'The hero is held upside down while the troll thinks it over.'],
      crit: 'The troll pays for the consultation out of a boot full of coin.',
      fumble: 'The hero said what the first troll said.',
      ko: 'It went to ask somebody else.',
    },
    {
      id: 'lamplighter_wisp', name: 'The Last Lamplighter\'s Wisp', level: 12, check: 'Religion', when: 'dusk',
      sign: 'Seen only at dusk.',
      about: 'Goes along the old causeway at dusk lighting lamps that sank long ago. It is the only wisp in the fen that leads people the right way.',
      tasks: ['Following a small light that keeps to the causeway', 'Watching a wisp light a lamp that is not there', 'Asking a wisp what it is owed for the lighting'],
      hit: ['The wisp finishes its round and leaves one lamp burning for the hero.', 'It is settled with: the old lamp money, found at last, is handed over.'],
      miss: ['The wisp takes offence and goes out. The fen is very dark without it.', 'It burns hotter than the ordinary sort.'],
      crit: 'The wisp leads the hero to where the lamplighter left his wages, forty years back.',
      fumble: 'The hero tried to catch it in a jar.',
      ko: 'It lit one lamp over the hero, so they could be found.',
    },
  ),

  cinder: list(
    {
      id: 'glass_scorpion', name: 'Glass Scorpion', level: 13, check: 'Perception',
      about: 'Made where lightning struck the sand. It cannot be seen at noon, which is when it hunts.',
      tasks: ['Looking for something clear on something bright', 'Following a shadow with nothing casting it', 'Listening for the sound of glass on sand'],
      hit: ['The scorpion is caught against the sun and breaks like a window.', 'It is driven into the shade, where it shows, and where it sulks.'],
      miss: ['The sting is seen only afterwards.', 'The hero puts a hand down on it. It was there all along.'],
      crit: 'It shatters into something a jeweller would pay for.',
      fumble: 'The hero held it up to the light for a better look.',
      ko: 'It was never seen leaving, either.',
    },
    {
      id: 'chief_accountant', name: 'Mummy of the Chief Accountant', level: 15, check: 'History',
      about: 'Was buried with the books of three kingdoms and has been trying to make them agree ever since.',
      tasks: ['Helping a mummy find an error of one copper piece', 'Being added to a column by a dead accountant', 'Holding the abacus for a mummy'],
      hit: ['The copper piece is found. The accountant lies down, at peace, for now.', 'The mummy is shown a sum it cannot fault and retires to check it.'],
      miss: ['The hero is written off, with force.', 'The accountant carries the hero forward into next year.'],
      crit: 'The books balance for the first time in an age, and the accountant tips.',
      fumble: 'The hero sneezed on the abacus.',
      ko: 'It entered the hero under sundries.',
    },
    {
      id: 'deep_dust_devil', name: 'Dust Devil of the Deep Desert', level: 15, check: 'Survival', when: 'weather',
      sign: 'Seen only while the sand blows.',
      about: 'The old one, that the lesser dust devils report to. Carries a buried kingdom about inside it, a piece at a time.',
      tasks: ['Walking into a wind that has furniture in it', 'Standing fast while a kingdom goes past', 'Asking a dust devil to put something down'],
      hit: ['The wind drops, and what it was carrying falls at the hero\'s feet.', 'It is turned aside and goes on toward the horizon, rattling.'],
      miss: ['The hero is struck by a small palace.', 'It picks the hero up, considers them, and puts them down hard.'],
      crit: 'The dust devil sets down a king\'s travelling chest, unopened, and moves on.',
      fumble: 'The hero opened their mouth to shout at it.',
      ko: 'It left the hero neatly buried to the neck.',
    },
  ),

  underdeep: list(
    {
      id: 'vintage_ooze', name: 'Ooze of Some Vintage', level: 16, check: 'Nature',
      about: 'Has sat at the bottom of the same cavern since before the dwarves. Everything that was ever dropped down there is still in it.',
      tasks: ['Fishing in an ooze with a long hook', 'Reading the dates on coins inside an ooze', 'Asking an ooze to give something back'],
      hit: ['The ooze gives up a helmet, a ladle, and something better.', 'It is persuaded to roll over. There was a good deal underneath.'],
      miss: ['The ooze takes the hook, the line, and the sleeve.', 'It moves faster than a thing that old has any right to.'],
      crit: 'The ooze parts down the middle and lets the hero take their pick.',
      fumble: 'The hero reached in after the hook.',
      ko: 'It kept a boot, to go with the others.',
    },
    {
      id: 'lost_cartographer', name: 'Deep Dwarf Cartographer, Lost', level: 18, check: 'Insight',
      about: 'Set out to map the Underdeep and will not admit how it is going. Attacks anyone who asks the way, in case they find out.',
      tasks: ['Asking directions of a dwarf holding a map upside down', 'Being told the way with great confidence', 'Comparing maps with a dwarf who has drawn his own'],
      hit: ['The dwarf is shown the way out and pretends he was going there.', 'He trades a look at his map for a look at the hero\'s, and is quiet for a time.'],
      miss: ['The dwarf marks the hero on the map as a hazard, with a pick.', 'The hero is led confidently into a wall.'],
      crit: 'The dwarf hands over his finished sheets. They are wrong, and worth a fortune as art.',
      fumble: 'The hero said the word lost.',
      ko: 'He drew a small cross where the hero fell and walked off the wrong way.',
    },
    {
      id: 'pale_spider', name: 'Pale Spider That Keeps Hours', level: 18, check: 'Stealth', when: 'night',
      sign: 'Seen only at night, by the clock above ground.',
      about: 'Nobody below can say how it knows when night has fallen up top. It comes out then, winds its web like a clock, and goes in at dawn.',
      tasks: ['Crossing a web that is ticking', 'Waiting for a pale spider to finish winding', 'Asking a spider the time, from a safe ledge'],
      hit: ['The spider strikes the hour and withdraws. Something bright is left in the web.', 'The web is cut at the right strand and the whole of it runs down.'],
      miss: ['The spider is punctual.', 'A strand catches the hero like the hand of a clock, and sweeps.'],
      crit: 'The spider stops, as if the hero had been expected, and leaves a wrapped parcel behind.',
      fumble: 'The hero set the web swinging and has lost count of the legs.',
      ko: 'At dawn it went in, and left the hero hanging there to be found.',
    },
  ),

  wyrmspire: list(
    {
      id: 'probation_drake', name: 'Drake on Probation', level: 19, check: 'Intimidation',
      about: 'Burned a ledger by accident and has been on the outer slopes ever since, being careful. It is not good at careful.',
      tasks: ['Startling a drake that is trying to be good', 'Being reported to a superior by a nervous drake', 'Standing near a drake while it counts to ten'],
      hit: ['The drake counts to ten, lets the hero by, and looks proud of itself.', 'It is frightened off its post and drops what it was guarding.'],
      miss: ['The drake loses count at six.', 'It sneezes. It had been holding that in.'],
      crit: 'The drake surrenders its whole post to the hero and asks them not to tell anyone.',
      fumble: 'The hero asked what happened to the ledger.',
      ko: 'It wrote the hero up as an accident, the second this year.',
    },
    {
      id: 'cult_treasurer', name: 'Treasurer of the Overdue', level: 20, check: 'Deception',
      about: 'Keeps the cult\'s subscriptions in a chest chained to her wrist. Has not slept since the last audit.',
      tasks: ['Asking a cult treasurer for a receipt', 'Offering to carry a chest for a tired woman', 'Paying a subscription to a cult under false pretences'],
      hit: ['The treasurer accepts the forged dues and waves the hero up the path.', 'The chain is the weak part. The chest changes hands.'],
      miss: ['The treasurer swings the chest. It is very full.', 'The hero is enrolled, and billed for the robe.'],
      crit: 'The treasurer falls asleep on her feet at last, and the chest is lighter when she wakes.',
      fumble: 'The hero asked what the money was for.',
      ko: 'She took the hero\'s purse as a first instalment.',
    },
    {
      id: 'dawn_salamander', name: 'Salamander of the First Light', level: 20, check: 'Arcana', when: 'dawn',
      sign: 'Seen only at dawn.',
      about: 'Comes out of the lava at first light to warm itself, which says a good deal about it. The cult leaves it offerings and keeps well back.',
      tasks: ['Watching something climb out of the lava at sunrise', 'Approaching a salamander with the sun behind it', 'Standing in the one patch of shade on a hot slope'],
      hit: ['The salamander goes back under, and what was left for it is left for the hero.', 'It is held off until the sun is fully up, and then it loses interest.'],
      miss: ['It looks at the hero, and that is enough.', 'The rock the hero was standing on was not rock an hour ago.'],
      crit: 'The salamander sheds a scale the size of a shield and sinks, satisfied.',
      fumble: 'The hero went to warm their hands.',
      ko: 'It did not notice. That was the mercy of it.',
    },
  ),
};

export const RARE_LIST = Object.values(RARES).flat();

// Mastery: every monster keeps a count of its defeats, and the count earns ranks.
export const MASTERY_TEXT = {
  ranks: ['Acquainted', 'Familiar', 'An Authority'],
  line: '{monster}: {rank}.',
  lines: [
    ['{name} is beginning to know the signs.', 'It no longer comes as a surprise.', 'A page of notes has been started.'],
    ['{name} could draw one from memory, and has, on a tavern table.', 'The notes now run to a small book.', 'There is not much it can do that {name} has not seen it do.'],
    ['{name} is now consulted on the subject by people who should know better.', 'The book is finished. The barkeep has asked for a copy.', 'Nothing more is to be learned here, and both parties know it.'],
  ],
  rare: 'A rare one, seldom seen on the road.',
  elusive: 'An elusive beast.',
  spotted: ['Something uncommon is about: {monster}.', 'Not the usual run of things on this road: {monster}.'],
};
