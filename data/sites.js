// Lesser delves (after Phase 7, round five): two small sites in every region, beside its dungeon.
// The first is built for the level the region starts at and the second for the middle of its range,
// so there is somewhere to delve from the day a hero arrives. A site is a short run (4 to 6 rooms) and
// a keeper at the end, who goes down in two blows. Sites open no roads and hold no named Legendary.
// They are written like the dungeons in data/dungeons.js, without the numbers: `site()` works those
// out from the level (a little kinder than a dungeon of the same level would be).
//   keeper   the site's own small boss; in the code it sits where a dungeon's `boss` does
// Voice: a dry chronicler; no exclamation marks.

function site(region, s) {
  const dc = 11 + Math.round(s.level / 4);
  const dmg = Math.round(3 * s.level + 2);
  const { keeper, ...rest } = s;
  return {
    ...rest, region, site: true,
    rooms: [4, 6], secs: [150, 200], dc, dmg,
    gold: [Math.round(4 + 1.3 * s.level), Math.round(8 + 3.4 * s.level)],
    boss: { ...keeper, hits: 2, dc: dc + 1, dmg },
  };
}
const pair = (region, a, b) => [site(region, a), site(region, b)];

export const SITES = {
  mugwick: pair('mugwick',
    {
      id: 'mill_loft', name: 'The Mill Loft', level: 1,
      about: 'The loft over the old mill, where the rats keep their own records. A good place to start.',
      enter: 'Up the ladder into the loft. It smells of flour and of ink.',
      roomTasks: [
        { text: 'Climbing a ladder with several rungs on loan', hit: 'Up, by the rungs that are still there.', miss: 'The missing rung was the one that mattered.' },
        { text: 'Crossing a floor of loose grain', hit: 'Across without a slip.', miss: 'The grain shifts, and there was a hatch under it.' },
        { text: 'Squeezing behind the great millstone', hit: 'Through, and only a little floury.', miss: 'The stone turns a quarter, which is a quarter too much.' },
      ],
      crit: 'The hero finds the sack hoist and rides it straight to the top.',
      fumble: 'The hero sneezed in the flour and could not see for some time.',
      ko: 'The rats rolled the hero down the grain chute and out into the yard.',
      keeper: {
        id: 'head_rat', name: 'The Head Rat, Acting', check: 'Animal Handling',
        about: 'In charge of the loft until a proper appointment is made. Nobody has come forward.',
        tasks: ['Disputing a tenancy with a rat in a paper hat', 'Being stared down by the Head Rat, Acting'],
        win: 'The Head Rat steps down, with some relief, and hands over the keys to a cupboard.',
        ko: 'The Head Rat had the hero shown out by the junior rats.',
      },
    },
    {
      id: 'toll_house', name: 'The Shuttered Toll House', level: 2,
      about: 'A toll house on the mill road, closed for years. Somebody has been collecting there after dark.',
      enter: 'In through a shutter that was meant to be nailed. There is a candle burning in the back.',
      roomTasks: [
        { text: 'Stepping over a tripwire tied to a handbell', hit: 'Over it, and the bell keeps quiet.', miss: 'The bell rings. Things come to see who is paying.' },
        { text: 'Searching a counting room by candlelight', hit: 'The cash box is where a cash box would be.', miss: 'The candle goes out, and the room is not empty.' },
        { text: 'Lifting the bar on a gate that has rusted shut', hit: 'It lifts, with a noise like a complaint.', miss: 'The bar comes down again, on a foot.' },
      ],
      crit: 'The hero finds the toll keeper\'s old pass key hanging on its nail.',
      fumble: 'The hero paid the toll out of habit, and was charged again.',
      ko: 'The hero was put out by the road with a ticket for the crossing.',
      keeper: {
        id: 'collector_grubb', name: 'Collector Grubb', check: 'Intimidation',
        about: 'A goblin who found the toll house empty and the uniform about his size.',
        tasks: ['Refusing a toll to a goblin in a borrowed coat', 'Asking Collector Grubb for sight of his warrant'],
        win: 'Grubb gives up the coat, the cash box, and the pretence. The road is free again, after dark as well.',
        ko: 'Grubb charged the hero for the damage and had them carried to the verge.',
      },
    }),

  mumblewood: pair('mumblewood',
    {
      id: 'charcoal_pits', name: 'The Charcoal Pits', level: 3,
      about: 'Old burning pits at the edge of the wood. The burners left when the smoke began answering back.',
      enter: 'Down into the pits. The ash is warm, though nobody has lit a fire here in a year.',
      roomTasks: [
        { text: 'Crossing a crust of ash over something hot', hit: 'Light feet, and the crust holds.', miss: 'The crust does not hold.' },
        { text: 'Feeling along a tunnel full of smoke', hit: 'The smoke thins the right way.', miss: 'The smoke has hands in it.' },
        { text: 'Climbing a stack of half-burned logs', hit: 'Up and over before it settles.', miss: 'The stack settles.' },
      ],
      crit: 'The hero finds the burners\' own path, marked with white stones.',
      fumble: 'The hero sat on a log to rest. It was still alight inside.',
      ko: 'The hero was found at the edge of the pits, black to the eyebrows.',
      keeper: {
        id: 'foremans_wolf', name: 'The Foreman\'s Wolf', check: 'Survival',
        about: 'Was left to guard the pits when the burners went, and was never told it could stop.',
        tasks: ['Relieving a wolf of a duty it takes seriously', 'Standing off the Foreman\'s Wolf across a pit'],
        win: 'The wolf is shown the foreman\'s old cap and understands that the shift is over. It leaves what it was guarding.',
        ko: 'The wolf dragged the hero to the boundary and went back to its post.',
      },
    },
    {
      id: 'hollow_archive', name: 'The Hollow Archive', level: 4,
      about: 'A dead beech as wide as a barn, shelved inside from root to crown. The owls keep it, after a fashion.',
      enter: 'In through a split in the trunk. Shelves go up into the dark, and something up there turns a page.',
      roomTasks: [
        { text: 'Climbing shelves that were not built for boots', hit: 'Up three shelves, and nothing falls.', miss: 'A shelf of bound complaints comes down.' },
        { text: 'Looking for one paper among a great many', hit: 'It was filed under the obvious heading, for once.', miss: 'The index bites.' },
        { text: 'Keeping quiet under a rafter of sleeping owls', hit: 'Not one eye opens.', miss: 'All the eyes open.' },
      ],
      crit: 'The hero asks politely at the desk and is simply handed what they came for.',
      fumble: 'The hero dropped a book in a place where silence is kept.',
      ko: 'The owls lowered the hero to the roots and stamped them as returned.',
      keeper: {
        id: 'archivist_owl', name: 'The Archivist Owl', check: 'History',
        about: 'Has read everything in the tree and lends nothing. Wears a ribbon for a bookmark.',
        tasks: ['Asking an owl for a paper it will not lend', 'Arguing shelf marks with the Archivist Owl'],
        win: 'The Archivist lends one volume, on terms, and looks away while a second is taken.',
        ko: 'The Archivist fined the hero for noise and had them removed.',
      },
    }),

  saltmarrow: pair('saltmarrow',
    {
      id: 'fenwicks_hole', name: 'Fenwick\'s Hole', level: 5,
      about: 'A sea cave the smugglers use at low water. They are behind on a number of payments and touchy about it.',
      enter: 'In along the wet sand under the cliff. There are barrels, and a lantern with a shutter on it.',
      roomTasks: [
        { text: 'Wading a channel between stacked barrels', hit: 'Through, with the powder dry.', miss: 'A barrel comes loose and the tide lends a hand.' },
        { text: 'Edging past a sleeping lookout', hit: 'He snores on.', miss: 'He was not asleep. It is a thing they practise.' },
        { text: 'Working out which crate is the real cargo', hit: 'The plain one, as ever.', miss: 'The marked one was marked for a reason.' },
      ],
      crit: 'The hero gives last week\'s password, and it has not been changed.',
      fumble: 'The hero answered the lookout\'s whistle with the wrong tune.',
      ko: 'The smugglers rowed the hero round the point and left them on the shingle.',
      keeper: {
        id: 'fenwick', name: 'Fenwick the Unpaid', check: 'Persuasion',
        about: 'Has run the cave for twenty years on promises. Is owed by everybody and owes the rest.',
        tasks: ['Talking terms with a smuggler who is owed money', 'Standing between Fenwick and the way out'],
        win: 'Fenwick settles for a share and a handshake, and throws in something off the last boat.',
        ko: 'Fenwick added the hero to the list of people who owe him.',
      },
    },
    {
      id: 'prompt_payment', name: 'The Wreck of the Prompt Payment', level: 7,
      about: 'A collector\'s brig, aground on the bar with her hold still full. The crew stayed aboard, in a manner of speaking.',
      enter: 'Aboard over the broken rail. She lists to port, and something below is still keeping the log.',
      roomTasks: [
        { text: 'Crossing a deck at the angle of a roof', hit: 'Across on the high side.', miss: 'Down the low side, into the scuppers.' },
        { text: 'Going below by a ladder with weed on it', hit: 'Down, hand over hand.', miss: 'Down, all at once.' },
        { text: 'Opening a strong room the sea has swollen shut', hit: 'It gives, and the water inside stays inside.', miss: 'It gives, and the water inside comes out.' },
      ],
      crit: 'The hero finds the ship\'s manifest, which says exactly where everything is.',
      fumble: 'The hero rang the ship\'s bell, to see if it still worked.',
      ko: 'The hero went over the side on the ebb and was washed up with the rest of the cargo.',
      keeper: {
        id: 'the_purser', name: 'The Purser, Still Aboard', check: 'Intimidation',
        about: 'Went down with the cash box rather than sign it over. Has not changed his mind.',
        tasks: ['Asking a drowned purser to open the cash box', 'Fighting the Purser for the keys to the hold'],
        win: 'The Purser is shown the date and accepts that the voyage is over. He signs the box across in a hand like seaweed.',
        ko: 'The Purser entered the hero in the log as lost overboard and saw to it.',
      },
    }),

  peaks: pair('peaks',
    {
      id: 'toll_tunnel', name: 'The Old Toll Tunnel', level: 8,
      about: 'A dwarf-cut tunnel under the first pass. The dwarves stopped collecting there; the ogres did not.',
      enter: 'Into the tunnel mouth. The rails are still down, and something heavy is walking on them.',
      roomTasks: [
        { text: 'Riding an ore cart with no brake to speak of', hit: 'It stops where the track does.', miss: 'It stops where the wall does.' },
        { text: 'Passing a turnstile built for something wider', hit: 'Through, on the second push.', miss: 'It turns the other way, hard.' },
        { text: 'Crossing a trestle with planks out', hit: 'A long stride at the right moment.', miss: 'A long stride at the wrong one.' },
      ],
      crit: 'The hero finds a season ticket on a hook and is waved through three gates.',
      fumble: 'The hero shouted to test the echo, and the echo brought company.',
      ko: 'The hero was sent back down the line in an ore cart, with a bill of lading.',
      keeper: {
        id: 'gatekeeper_brund', name: 'Ogre Gatekeeper Brund', check: 'Athletics',
        about: 'Holds the far gate. Charges by weight and does the weighing himself, by hand.',
        tasks: ['Being weighed by an ogre for the purposes of a toll', 'Forcing the far gate past Gatekeeper Brund'],
        win: 'Brund is out-pushed at his own gate and takes it well. He hands over the day\'s takings as a matter of form.',
        ko: 'Brund weighed the hero, found them light, and threw them back.',
      },
    },
    {
      id: 'criers_eyrie', name: 'The Criers\' Eyrie', level: 9,
      about: 'A ledge of nests where the harpy criers learn their notices by heart. The noise carries for miles.',
      enter: 'Up the goat track to the ledge. Every nest has a notice pinned in it, and every notice is being read aloud.',
      roomTasks: [
        { text: 'Climbing past a rehearsal of forty harpies', hit: 'They do not miss a word, or notice the hero.', miss: 'They stop. That is worse.' },
        { text: 'Crossing a ledge about a boot and a half wide', hit: 'A boot and a half is enough.', miss: 'The wind takes an interest.' },
        { text: 'Taking a notice out of a nest with an egg in it', hit: 'The notice comes away and the egg stays asleep.', miss: 'The egg has a mother.' },
      ],
      crit: 'The hero joins in the reading, word for word, and is taken for a new crier.',
      fumble: 'The hero looked down.',
      ko: 'The harpies carried the hero down to the road and read the charges over them.',
      keeper: {
        id: 'head_crier', name: 'Harpy Head Crier', check: 'Performance',
        about: 'Has the loudest voice in the Peaks and the say over what is cried. Starts landslides when she is annoyed.',
        tasks: ['Out-shouting a harpy on her own ledge', 'Correcting the Head Crier on a point of fact'],
        win: 'The Head Crier is shouted down for the first time in her career. She goes hoarse and gives up the day\'s notices.',
        ko: 'The Head Crier announced the hero\'s defeat to three valleys.',
      },
    }),

  gloamfen: pair('gloamfen',
    {
      id: 'ferry_house', name: 'The Ferry House', level: 10,
      about: 'A ferry house on the dead channel. The ferry still runs, though nobody alive has seen it leave.',
      enter: 'In by the landing stage. The bell rope is wet, and the bell has just been rung.',
      roomTasks: [
        { text: 'Walking a jetty that is mostly intention', hit: 'The sound planks, in the right order.', miss: 'The fen was only waiting.' },
        { text: 'Poling a punt through a flooded parlour', hit: 'Round the piano and out by the window.', miss: 'The pole sticks. The punt does not.' },
        { text: 'Reading a fare table by marsh light', hit: 'The hero has the right money, and pays it.', miss: 'The fare has gone up. The difference is taken.' },
      ],
      crit: 'The hero finds a return ticket on the mantelpiece, still valid.',
      fumble: 'The hero rang the bell for service.',
      ko: 'The hero was ferried back to the near bank, face down, at no charge.',
      keeper: {
        id: 'drowned_ferryman', name: 'The Ferryman, Drowned', check: 'Religion',
        about: 'Keeps to the timetable. Takes the fare from the living and the dead alike and gives change to neither.',
        tasks: ['Disputing a fare with a drowned ferryman', 'Crossing the dead channel against the Ferryman\'s wishes'],
        win: 'The Ferryman is paid in full, with a coin for each eye, and rows the hero back in silence. He leaves the fare box on the landing.',
        ko: 'The Ferryman put the hero ashore before the crossing was finished.',
      },
    },
    {
      id: 'leaning_chapel', name: 'The Leaning Chapel', level: 11,
      about: 'A chapel that has been sinking at one corner for a century. The congregation never left, and is not what it was.',
      enter: 'In at the low door, which is lower every year. The pews slope, and they are full.',
      roomTasks: [
        { text: 'Walking up an aisle that tilts like a deck', hit: 'Up the aisle with a hand on each pew.', miss: 'The pews are occupied, and the occupants reach out.' },
        { text: 'Climbing a bell tower that leans over the fen', hit: 'Up on the side away from the lean.', miss: 'The tower leans a little more.' },
        { text: 'Sitting through a sermon given by nobody', hit: 'The hero stays awake, and is let go at the end.', miss: 'The collection plate comes round, and it insists.' },
      ],
      crit: 'The hero knows the responses, and the whole congregation sits down again.',
      fumble: 'The hero sat in a pew that belonged to somebody.',
      ko: 'The congregation carried the hero out feet first, singing.',
      keeper: {
        id: 'the_verger', name: 'The Verger Who Stayed', check: 'Religion',
        about: 'Locks up every night, as he has since the water came in. Does not like the plate to go out light.',
        tasks: ['Explaining to a dead verger why the plate is short', 'Being shown out of a chapel with great firmness'],
        win: 'The Verger is given the keys to a drier chapel, in a manner of speaking, and goes. The plate is left on the step.',
        ko: 'The Verger locked up with the hero on the outside.',
      },
    }),

  cinder: pair('cinder',
    {
      id: 'caravanserai', name: 'The Buried Caravanserai', level: 12,
      about: 'An inn the sand covered in one night, guests and all. The stables are still full, and the bill is still running.',
      enter: 'Down through the roof, where the sand has blown clear. Below there are lamps lit, and a table laid.',
      roomTasks: [
        { text: 'Crossing a courtyard filled to the arches with sand', hit: 'Over the top, crouching.', miss: 'The sand runs, and takes the hero with it.' },
        { text: 'Passing a stable of camels that died waiting', hit: 'They do not turn their heads.', miss: 'They turn their heads.' },
        { text: 'Signing a guest book held open by a dry hand', hit: 'A false name, neatly written. It is accepted.', miss: 'The hand closes the book on the hero\'s own.' },
      ],
      crit: 'The hero is taken for a guest who paid in advance, and is shown through.',
      fumble: 'The hero asked for the bill.',
      ko: 'The hero was put out through the roof with the rest of the sweepings.',
      keeper: {
        id: 'sand_innkeeper', name: 'The Innkeeper of the Sands', check: 'Persuasion',
        about: 'Has kept the house open for nine hundred years on the strength of one unpaid account. Still hopes.',
        tasks: ['Settling a bill that is nine centuries old', 'Leaving an inn whose keeper would rather one stayed'],
        win: 'The Innkeeper is paid one copper on account, and weeps dust. He returns what the last guests left in the strongroom.',
        ko: 'The Innkeeper added a night to the bill and put the hero in the street.',
      },
    },
    {
      id: 'obelisk_vaults', name: 'The Obelisk Vaults', level: 14,
      about: 'Under the great obelisk are the vaults where the buried kingdoms lodged their deeds. A sphinx was left in charge of the catalogue.',
      enter: 'Down the stair inside the obelisk. Every step has a question carved on it, and the hero is not sure of all of them.',
      roomTasks: [
        { text: 'Answering a riddle set into a door', hit: 'The door thinks about it and opens.', miss: 'The door marks the answer wrong, with darts.' },
        { text: 'Walking a gallery of statues that keep count', hit: 'Counted in, and counted out again.', miss: 'The count comes out one over, and they correct it.' },
        { text: 'Lifting a deed from a shelf that is weighed', hit: 'A bag of sand, of the right weight, left in its place.', miss: 'The shelf knows the difference.' },
      ],
      crit: 'The hero reads a question twice and finds the answer carved on the step above.',
      fumble: 'The hero answered a riddle with a question of their own.',
      ko: 'The statues bore the hero up the stair and stood them outside in the sun.',
      keeper: {
        id: 'under_registrar', name: 'Sphinx Under-Registrar', check: 'Investigation',
        about: 'Second in the registry and tired of it. Asks the same three riddles, and has begun to dislike the answers.',
        tasks: ['Sitting an examination set by a sphinx', 'Asking the Under-Registrar a riddle in return'],
        win: 'The Under-Registrar cannot answer, and is delighted. It stamps the hero\'s papers and opens a drawer it is not meant to open.',
        ko: 'The Under-Registrar marked the hero as failed and had them filed outside.',
      },
    }),

  underdeep: pair('underdeep',
    {
      id: 'mushroom_cellars', name: 'The Mushroom Cellars', level: 15,
      about: 'Terraced caverns where the myconids lay things down to age. Some of what is laid down was not asked first.',
      enter: 'Down between racks of pale caps. The air is thick, and it is hard to say whose idea it was to come.',
      roomTasks: [
        { text: 'Holding a breath the whole length of a spore gallery', hit: 'One breath, and it lasts.', miss: 'It does not last, and the hero has ideas that are not their own.' },
        { text: 'Stepping between sleepers planted to the knees', hit: 'Nobody wakes, and nobody is trodden on.', miss: 'One of them takes hold of an ankle.' },
        { text: 'Turning a rack of casks to find the door behind', hit: 'The right cask, on the third try.', miss: 'The wrong cask, and it has been fermenting a long time.' },
      ],
      crit: 'The hero is taken for a taster and is led straight through to the back.',
      fumble: 'The hero took a deep breath to steady themselves.',
      ko: 'The hero was laid down in the outer cellar to recover, and labelled.',
      keeper: {
        id: 'cellarmaster', name: 'Myconid Cellarmaster', check: 'Nature',
        about: 'Decides what is ready and what needs another century. Has had its eye on the surface for some time.',
        tasks: ['Declining to be laid down by a large mushroom', 'Arguing vintages with the Myconid Cellarmaster'],
        win: 'The Cellarmaster is persuaded that the hero is not yet ready and would only spoil. It gives up a bottle of something old instead.',
        ko: 'The Cellarmaster judged the hero unripe and had them put out.',
      },
    },
    {
      id: 'counting_shaft', name: 'The Counting Shaft', level: 17,
      about: 'A shaft the deep dwarves sank to hold what they collect. It is counted every shift, from the bottom up.',
      enter: 'Down the first ladder. There is the sound of coin being counted, a long way below, and it does not stop.',
      roomTasks: [
        { text: 'Riding a counterweight down a shaft with no bottom', hit: 'It stops at a gallery, as it was meant to.', miss: 'It was the weight, not the cage.' },
        { text: 'Passing a tally clerk without being tallied', hit: 'The clerk carries one and does not look up.', miss: 'The clerk looks up.' },
        { text: 'Crossing a floor of coin three feet deep', hit: 'Slowly, and without a sound.', miss: 'It slides like scree and rings like an alarm.' },
      ],
      crit: 'The hero arrives at the change of shift and walks down with the new one.',
      fumble: 'The hero dropped a coin of their own into the shaft, and it was counted.',
      ko: 'The hero was hauled up in the spoil bucket and tipped out at the top.',
      keeper: {
        id: 'shaft_reeve', name: 'Shaft-Reeve Dorrun', check: 'Insight',
        about: 'Answers for every coin in the shaft and knows each one by sight. Has not seen daylight since his appointment.',
        tasks: ['Being searched by a dwarf who knows every coin', 'Standing up to Shaft-Reeve Dorrun on the bottom gallery'],
        win: 'Dorrun is shown that his own count is one short, and it breaks him. While he recounts, the hero is free to leave by the ladder, not empty-handed.',
        ko: 'Dorrun counted the hero out of the shaft, to the last coin.',
      },
    }),

  wyrmspire: pair('wyrmspire',
    {
      id: 'final_demand', name: 'The Chapel of Final Demand', level: 18,
      about: 'Where the cult holds its services, all of them reminders. The collection is taken before, during, and after.',
      enter: 'In at the back, during the second reminder. The congregation is robed, and each of them holds a bill.',
      roomTasks: [
        { text: 'Joining a procession without knowing the steps', hit: 'Left, right, pause, and nobody turns round.', miss: 'Everybody turns round.' },
        { text: 'Passing a font of something that is not water', hit: 'The hero is not asked to dip a hand.', miss: 'The hero is asked.' },
        { text: 'Sitting out a hymn of nine verses on a hot floor', hit: 'Nine verses, standing first on one foot and then the other.', miss: 'At verse six the floor wins.' },
      ],
      crit: 'The hero is mistaken for the visiting preacher and is led to the front.',
      fumble: 'The hero put a brass washer in the collection.',
      ko: 'The cult laid the hero outside the doors with a final reminder pinned on.',
      keeper: {
        id: 'bursar_venn', name: 'Cult Bursar Venn', check: 'Deception',
        about: 'Keeps the chapel\'s accounts and preaches from them. Has never forgiven a debt, and is proud of the record.',
        tasks: ['Hearing a sermon on arrears from the man who wrote it', 'Contesting a collection with Cult Bursar Venn'],
        win: 'Venn is shown an error in his own favour and cannot bear it. He makes the difference good on the spot, out of the plate.',
        ko: 'Venn read the hero out of the congregation, with costs.',
      },
    },
    {
      id: 'clerks_roost', name: 'The Clerks\' Roost', level: 19,
      about: 'A honeycomb of warm ledges under the crater, where the drake clerks do the dragon\'s copying. Nothing leaves it unsigned.',
      enter: 'Up through a vent into the roost. A hundred pens are scratching, and each is held in a claw.',
      roomTasks: [
        { text: 'Crossing a copying floor between rows of drakes', hit: 'Head down, like a messenger. Nobody looks up.', miss: 'A drake looks up, and blots, and blames the hero.' },
        { text: 'Climbing a chute meant for scrolls going down', hit: 'Up, between deliveries.', miss: 'A delivery arrives.' },
        { text: 'Drying wet ink over a vent without scorching it', hit: 'Dry, and legible, and not the hero\'s problem any longer.', miss: 'The vent breathes out.' },
      ],
      crit: 'The hero picks up a tray of scrolls and is taken for staff the whole way through.',
      fumble: 'The hero knocked over an inkwell the size of a bath.',
      ko: 'The drakes passed the hero down the scroll chute, stamped and dated.',
      keeper: {
        id: 'clerk_ossa', name: 'Senior Drake Clerk Ossa', check: 'Arcana',
        about: 'Checks every copy against the original by breathing on it. A true copy does not burn. Most do.',
        tasks: ['Having one\'s papers checked by a drake, with fire', 'Getting past Senior Drake Clerk Ossa and her desk'],
        win: 'Ossa is handed a copy so true that she cannot fault it, and has to let the hero pass. She keeps the copy, and the hero keeps what was in her desk.',
        ko: 'Ossa found the hero to be a poor copy and had them struck out.',
      },
    }),
};

export const SITE_LIST = Object.values(SITES).flat();
export const SITE_BY_ID = Object.fromEntries(SITE_LIST.map((s) => [s.id, s]));
export const KEEPER_BY_ID = Object.fromEntries(SITE_LIST.map((s) => [s.boss.id, s.boss]));

export const SITE_TEXT = {
  cleared: [
    '{dungeon} is cleared. A small place, and the hero knows every corner of it now.',
    '{dungeon} is cleared again.',
  ],
  confidence: 'Three defeats running in {dungeon}. {name} will roam for a while to rebuild confidence.',
};
