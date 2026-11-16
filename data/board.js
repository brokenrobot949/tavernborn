// The notice board and the day's news (after Phase 7, round five).
//   BOUNTIES    the kinds of bounty the board posts, three a day, by the device's calendar
//   REGULARS    one regular client per region, whose small story moves on with every fourth odd job
//   HAPPENINGS  two things that can be going on in each region; three regions have one on any day.
//               Each changes the region a little for the day (`kind`) and brings an errand: a short job
//               at the hero's own level, whatever the region's, done once per hero per day
// Voice: a dry chronicler; no exclamation marks.

// A bounty's `title` and `about` take {monster}, {place}, and {count}. `need` is the choice of counts,
// `gold` the reward in level-scaled units, `xp` in minutes of work, `piece` whether gear comes with it.
export const BOUNTIES = {
  hunt: { title: 'Wanted: {monster}', about: 'Defeat {count} of them in {place}.', need: [12, 16, 20], gold: 1, xp: 30, piece: false },
  crits: { title: 'Show Them How', about: 'Roll {count} natural 20s.', need: [3, 4, 5], gold: 1, xp: 30, piece: false },
  jobs: { title: 'Hands Wanted', about: 'Finish {count} quests or odd jobs.', need: [3, 4], gold: 1.5, xp: 30, piece: false },
  rare: { title: 'Something Seen on the Road', about: 'Defeat a rare monster, in any region.', need: [1], gold: 2, xp: 45, piece: true },
  delve: { title: 'Somebody Should Go Down There', about: 'Clear a dungeon or a lesser delve.', need: [1], gold: 2, xp: 45, piece: true },
  unbeaten: { title: 'In One Piece', about: 'Finish {count} tasks without a knockout between them.', need: [60, 80], gold: 1.5, xp: 30, piece: false },
};

export const BOARD_TEXT = {
  taken: 'Took a bounty from the board. {title}: {notice}',
  done: 'Bounty done: {title}. The board pays up, and the notice comes down.',
  dropped: 'The old bounty, {title}, is left for somebody else.',
  empty: 'Nothing taken from the board today.',
  errandTaken: 'Word in {place}: {quest}. {notice}',
  regularTaken: 'Took a job from a regular. {quest}.',
  regularGift: '{name} has become something of a fixture with {title}, who sends a parting gift.',
  happening: 'Today in {place}: {title}. {notice}',
};

// Regulars: `beats` are the jobs, in order; each is taken like an odd job and finishes with its own line.
export const REGULARS = {
  mugwick: {
    id: 'widow_pelk', name: 'Widow Pelk',
    beats: [
      { job: 'Counting Widow Pelk\'s spoons, again', done: 'All the spoons are there. The widow says that is exactly what a thief would arrange.' },
      { job: 'Fitting a lock to Widow Pelk\'s dresser', done: 'The lock is on. The widow has hidden the key and already forgotten where.' },
      { job: 'Finding the key to Widow Pelk\'s dresser', done: 'The key was in the teapot. The widow says she knew that.' },
      { job: 'Taking tea with Widow Pelk, by request', done: 'There was no job. There was cake, and a long account of the late Mr Pelk, who also never counted the spoons.' },
    ],
  },
  mumblewood: {
    id: 'woodcutter_hob', name: 'Hob the woodcutter',
    beats: [
      { job: 'Sitting up with Hob\'s trees, for his nerves', done: 'The trees said nothing all night. Hob finds that worse.' },
      { job: 'Asking Hob\'s beech what it wants', done: 'The beech wants to be left alone. Hob has taken it personally.' },
      { job: 'Carrying Hob\'s apology to a beech', done: 'The apology is delivered. The beech drops one leaf, which Hob has had framed.' },
      { job: 'Witnessing an agreement between Hob and his wood', done: 'Hob will cut only what falls. The wood will keep its voice down after dark. Both have signed, in their way.' },
    ],
  },
  saltmarrow: {
    id: 'captain_merrow', name: 'Captain Merrow',
    beats: [
      { job: 'Scraping the hull of Captain Merrow\'s boat', done: 'The hull is clean. The captain says she will float any day now.' },
      { job: 'Finding a crew for Captain Merrow', done: 'A crew of two is found: a boy and a man who owes the captain money.' },
      { job: 'Buying a chart for Captain Merrow', done: 'The chart is bought. The captain looks at it for a long time and asks which way up it goes.' },
      { job: 'Seeing Captain Merrow off from the quay', done: 'The boat leaves the harbour, turns twice, and comes back in. The captain calls it a successful voyage, and it was.' },
    ],
  },
  peaks: {
    id: 'surveyor_tamsin', name: 'Tamsin the surveyor',
    beats: [
      { job: 'Holding the far end of Tamsin\'s chain', done: 'The mountain is forty feet taller than last year. Tamsin has written to complain.' },
      { job: 'Measuring a mountain that will not keep still', done: 'It moved during the measuring. Tamsin has drawn the map with a note in the margin.' },
      { job: 'Delivering Tamsin\'s complaint to the summit', done: 'The complaint is left under a stone at the top. The grumbling stops for a whole afternoon.' },
      { job: 'Helping Tamsin finish the map of the Peaks', done: 'The map is done. In the corner Tamsin has written: correct at time of drawing.' },
    ],
  },
  gloamfen: {
    id: 'eel_wife', name: 'Marda the eel-wife',
    beats: [
      { job: 'Minding Marda\'s eel traps overnight', done: 'The traps are full by morning. One eel had a letter for Marda, which she will not discuss.' },
      { job: 'Carrying Marda\'s reply out into the fen', done: 'The reply is posted in a hollow post. Something takes it in before the hero has turned round.' },
      { job: 'Waiting at a hollow post for an answer', done: 'The answer comes at dusk, tied to an eel. Marda reads it twice and puts on her good shawl.' },
      { job: 'Rowing Marda out to meet a correspondent', done: 'Marda is rowed to the old ferry stage and asks to be left. She comes home at dawn, smiling, and pays double.' },
    ],
  },
  cinder: {
    id: 'digger_fennimore', name: 'Fennimore the digger',
    beats: [
      { job: 'Digging where Fennimore says there is a kingdom', done: 'There is sand. Fennimore says that is what a kingdom would want people to think.' },
      { job: 'Digging a little to the left for Fennimore', done: 'One brick is found. Fennimore has given it a name.' },
      { job: 'Guarding Fennimore\'s brick from rivals', done: 'No rivals come. Fennimore puts this down to the guard.' },
      { job: 'Digging under Fennimore\'s brick', done: 'Under the brick is a second brick, and under that a stair. Fennimore sits down in the sand and says nothing for an hour.' },
    ],
  },
  underdeep: {
    id: 'lampwright_ysolde', name: 'Ysolde the lampwright',
    beats: [
      { job: 'Carrying lamp oil down to Ysolde', done: 'The oil arrives unspilt. Ysolde lights one lamp and the dark moves back a yard.' },
      { job: 'Hanging Ysolde\'s lamps along a gallery', done: 'Twelve lamps are up. Something at the end of the gallery puts one out, as a matter of principle.' },
      { job: 'Asking the dark to leave Ysolde\'s lamps alone', done: 'Terms are reached. Every second lamp may stay.' },
      { job: 'Lighting the last of Ysolde\'s lamps', done: 'The gallery is lit from end to end, every second lamp. Ysolde says it is the first time she has seen her own shop.' },
    ],
  },
  wyrmspire: {
    id: 'brother_cinder', name: 'Brother Aldous, lapsed',
    beats: [
      { job: 'Hiding Brother Aldous from the cult\'s collectors', done: 'The collectors go past. Brother Aldous breathes out, and owes the hero one.' },
      { job: 'Returning Brother Aldous\'s robe, with a note', done: 'The robe is left on the chapel step. The note says he has thought it over.' },
      { job: 'Finding honest work for a lapsed cultist', done: 'A baker in the lower village takes him on. He is good with ovens, which surprises nobody.' },
      { job: 'Buying the first loaf from Brother Aldous', done: 'The loaf is slightly burnt and shaped like a ledger. He is working on it. It is the best bread on the mountain.' },
    ],
  },
};
export const REGULAR_LIST = Object.values(REGULARS);

// Happenings. `kind`: 'gold' (everything in the region pays a quarter more gold), 'rare' (rare monsters
// three times as common), 'loot' (monsters and rooms drop gear twice as often), 'jobs' (odd jobs pay
// half again in gold, and their gear is better). `text` says what is going on; `effect` what it does.
export const HAPPENING_EFFECT = {
  gold: 'Everything here pays a quarter more gold today.',
  rare: 'Rare monsters are three times as common here today.',
  loot: 'Monsters and dungeon rooms here drop gear twice as often today.',
  jobs: 'Odd jobs here pay half as much gold again today, with better gear.',
};

const errand = (title, check, notice, steps, done) => ({ title, check, notice, steps, done });

export const HAPPENINGS = {
  mugwick: [
    {
      id: 'market_day', name: 'Market Day', kind: 'gold',
      text: 'Every stall in the Vale is out, and everybody has something to sell that somebody else lost.',
      errand: errand('The Prize Marrow', 'Investigation', 'The prize marrow has gone from its table an hour before the judging.',
        ['Taking statements from three growers who all look pleased', 'Following a trail of very large seeds', 'Finding a marrow in a pram under a blanket', 'Carrying a marrow back through a crowd'],
        'The marrow is on its table for the judging. It comes second, and nobody is satisfied.'),
    },
    {
      id: 'goose_fair', name: 'The Goose Fair', kind: 'rare',
      text: 'The geese are driven to the fair, and everything that lives in the hedges has come out to watch.',
      errand: errand('Stewarding the Goose Fair', 'Animal Handling', 'The fair needs a steward. The last one has been chased up the oak.',
        ['Getting the old steward down from the oak', 'Counting geese that will not stand to be counted', 'Standing between two ganders with a rope', 'Leading the parade from a safe distance in front'],
        'The fair goes off with only two people bitten, which is a record.'),
    },
  ],
  mumblewood: [
    {
      id: 'mushroom_flush', name: 'The Mushroom Flush', kind: 'loot',
      text: 'It rained in the night and the whole wood is up in mushrooms. Things are turning up under them.',
      errand: errand('A Basket for the Apothecary', 'Nature', 'The apothecary wants a basket of the spotted ones, and none of the others.',
        ['Telling the spotted ones from the ones that only look it', 'Picking mushrooms under the eye of a toadstool', 'Being followed by the basket\'s contents', 'Delivering a basket that has got heavier on the way'],
        'The apothecary has her basket. Two of them were not mushrooms, and have been let go.'),
    },
    {
      id: 'tree_moot', name: 'The Tree Moot', kind: 'jobs',
      text: 'The old trees are holding a moot, and the whole wood wants errands run while they are busy.',
      errand: errand('Minutes of the Moot', 'Insight', 'The trees want their moot written down by somebody with hands.',
        ['Finding a stump at the back to sit on', 'Taking down a speech that lasts from noon to dusk', 'Asking an elm to spell a word', 'Reading the minutes back to an audience of oaks'],
        'The minutes are agreed. The moot has resolved to meet again in forty years.'),
    },
  ],
  saltmarrow: [
    {
      id: 'wreck_ashore', name: 'A Wreck Ashore', kind: 'gold',
      text: 'A merchantman has broken up on the bar, and the whole coast is on the sands with sacks.',
      errand: errand('Salvage Rights', 'Athletics', 'The owners will pay for whatever is brought up the beach before the tide has it.',
        ['Racing the tide to a crate with a name on it', 'Carrying a crate past forty helpful strangers', 'Arguing salvage law with a gull', 'Signing a crate over at the harbour office'],
        'One crate is saved, and it is the right one. The owners pay, and the coast keeps the rest.'),
    },
    {
      id: 'herring_run', name: 'The Herring Run', kind: 'rare',
      text: 'The herring are in, and behind the herring comes everything that eats herring.',
      errand: errand('A Hand With the Nets', 'Survival', 'The boats are short of hands, and the nets will not haul themselves.',
        ['Hauling a net that is hauling back', 'Sorting herring from things that are not herring', 'Throwing back something that asked nicely', 'Carrying the catch up a quay slick with scales'],
        'The catch is landed. The hero will smell of it until the next region.'),
    },
  ],
  peaks: [
    {
      id: 'rockfall', name: 'A Rockfall on the Pass', kind: 'loot',
      text: 'Half a hillside came down in the night and uncovered a stretch of the old dwarf road.',
      errand: errand('Clearing the Pass', 'Athletics', 'The carters will pay to have the road open by nightfall.',
        ['Rolling a boulder that has opinions about downhill', 'Levering a slab with a borrowed cart pole', 'Digging out a milestone and reading it', 'Waving the first cart through and stepping well back'],
        'The pass is open. Under the last boulder there was a dwarf strongbox, and the carters agree the hero should have it.'),
    },
    {
      id: 'giants_wedding', name: 'A Giants\' Wedding', kind: 'jobs',
      text: 'Two hill giants are to be married, and every village for miles has been asked to help or else.',
      errand: errand('The Wedding Cake', 'Performance', 'The giants want a cake the size of a mill, by sundown, and somebody to carry it in.',
        ['Stirring a bowl with an oar', 'Icing a cake from a ladder', 'Walking a cake up a mountain on eight carts', 'Giving a short speech to very tall guests'],
        'The cake is eaten in two bites. The bride weeps, the mountains shake, and the hero is asked to stay for the dancing.'),
    },
  ],
  gloamfen: [
    {
      id: 'low_water', name: 'Low Water', kind: 'loot',
      text: 'The fen has dropped a foot overnight, and things lost in it for years are standing in the mud.',
      errand: errand('What the Fen Gave Back', 'Investigation', 'A carriage has surfaced by the causeway, and the family wants what was in it.',
        ['Wading out to a carriage with the blinds still drawn', 'Opening a door the mud would prefer shut', 'Lifting a trunk past a coachman who never left', 'Hauling a trunk along a causeway on a hurdle'],
        'The trunk is home. The family counts the silver and finds one spoon more than they lost.'),
    },
    {
      id: 'frog_chorus', name: 'The Frog Chorus', kind: 'rare',
      text: 'Every frog in the fen is singing at once, and the things that hunt by sound are all abroad.',
      errand: errand('A Night of Peace', 'Persuasion', 'The fen villages have not slept for three nights and will pay anyone who can make it stop.',
        ['Finding the frog that started it', 'Putting a case for quiet to a bull frog', 'Offering a pond of their own on the far side', 'Leading a procession of frogs by lantern'],
        'The chorus moves a mile east. The villages sleep, and the next parish writes to complain.'),
    },
  ],
  cinder: [
    {
      id: 'caravan_in', name: 'The Caravan Is In', kind: 'gold',
      text: 'The great caravan has made the wells, and for one day there is more money in the Wastes than sand.',
      errand: errand('Guarding the Wells', 'Perception', 'The caravan master wants the water watched while four hundred camels drink.',
        ['Counting camels in at the well', 'Watching a water skin that somebody else is watching', 'Stopping a quarrel over whose turn it is', 'Counting camels out again and getting a different number'],
        'The wells hold, and the caravan moves off at dusk. The extra camel is still unexplained.'),
    },
    {
      id: 'sands_shift', name: 'The Sands Have Shifted', kind: 'loot',
      text: 'A wind in the night has uncovered a street nobody knew was there. It will be gone again by tomorrow.',
      errand: errand('A Street for One Day', 'History', 'A scholar wants one doorway of the uncovered street drawn before the sand returns.',
        ['Finding the scholar a doorway worth the ink', 'Holding a parasol over a drawing', 'Brushing sand off a lintel faster than it lands', 'Reading the inscription out for the scholar'],
        'The drawing is finished as the sand comes back. The inscription said: no hawkers.'),
    },
  ],
  underdeep: [
    {
      id: 'glow_tide', name: 'The Glow Tide', kind: 'rare',
      text: 'The lake below has turned bright, as it does some nights, and everything in the caverns has come down to look.',
      errand: errand('A Jar of the Tide', 'Arcana', 'A lampwright will pay for one jar of the bright water, taken at its brightest.',
        ['Climbing down to a shore with too many eyes on it', 'Filling a jar without filling a boot', 'Carrying light through a place that prefers the dark', 'Handing over a jar that hums'],
        'The jar lights the lampwright\'s whole shop for an evening, and then, by agreement, is poured back.'),
    },
    {
      id: 'market_below', name: 'A Market Below', kind: 'jobs',
      text: 'The deep traders have set out their stalls in the long gallery, and every one of them wants something carried.',
      errand: errand('A Parcel, No Questions', 'Stealth', 'A hooded trader wants a parcel taken across the gallery and wants nothing asked about it.',
        ['Accepting a parcel that is warm', 'Crossing a market without catching an eye', 'Not looking in the parcel, on a point of honour', 'Handing a parcel to a gloved hand through a curtain'],
        'The parcel is delivered. Whatever it was, it has been heard purring.'),
    },
  ],
  wyrmspire: [
    {
      id: 'audit_week', name: 'Audit on the Mountain', kind: 'gold',
      text: 'The dragon\'s auditors are in, and the whole mountain is paying its debts in a hurry before they are found.',
      errand: errand('Books in Order', 'Deception', 'A cult bookkeeper will pay well to have his second set of books somewhere else by evening.',
        ['Carrying a ledger under a robe', 'Walking past an auditor with a clear conscience, nearly', 'Hiding a ledger among forty that look the same', 'Forgetting, as agreed, which one it was'],
        'The audit finds nothing. The bookkeeper pays in full, from which set of books it is better not to ask.'),
    },
    {
      id: 'ash_fall', name: 'An Ash Fall', kind: 'loot',
      text: 'The mountain coughed in the night. Everything is under a hand of warm ash, and people are finding things in it.',
      errand: errand('Sweeping the Chapel Steps', 'Athletics', 'The cult wants its steps swept before the evening reminder, and its own sweepers have gone home.',
        ['Sweeping one hundred steps from the top down', 'Sweeping them again after the mountain clears its throat', 'Finding what the ash had covered on the ninetieth step', 'Returning the broom and keeping quiet about the rest'],
        'The steps are clean for almost an hour. What was under the ash on the ninetieth is the hero\'s business.'),
    },
  ],
};
export const HAPPENING_LIST = Object.entries(HAPPENINGS).flatMap(([region, list]) => list.map((h) => ({ ...h, region })));
export const HAPPENING_BY_ID = Object.fromEntries(HAPPENING_LIST.map((h) => [h.id, h]));
