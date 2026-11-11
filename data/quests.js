// Story quests and odd jobs.
// Each region's board has six written story quests, done once each and in order. After those the
// board offers endless generated odd jobs. Finishing all six in a region awards a Feat.
//   title    name on the quest board
//   check    the skill named in the Chronicle rolls
//   notice   what the board says; shown when the hero takes the job
//   steps    one task bar line per step (5 to 8); each step ends in one d20 roll
//   done     Chronicle line when the last step is finished
// The sixth quest of every region points at that region's dungeon and the next story chapter.
export const QUESTS = {
  mugwick: [
    {
      id: 'millers_complaint', title: "The Miller's Complaint", check: 'Investigation',
      notice: 'Something in the grain store has been filing its own paperwork.',
      steps: ['Hearing the miller out, which takes a while', 'Sifting a grain bin for documents', 'Following small inky footprints along a beam', 'Reading a claim for damages written by a rat', 'Persuading a rat to withdraw a claim', 'Explaining the outcome to the miller'],
      done: 'The claim is withdrawn. The rat keeps a corner of the grain store under an informal arrangement.',
    },
    {
      id: 'goose_at_the_bridge', title: 'A Goose at the Bridge', check: 'Intimidation',
      notice: 'The parish would like its bridge back and asks that the goose not be told who said so.',
      steps: ['Collecting statements from people the goose has turned back', 'Measuring the bridge from the bank', 'Approaching the goose with a signed letter from the parish', 'Retrieving the letter from the river', 'Building a small second bridge for the goose', 'Waiting to see which bridge the goose prefers'],
      done: 'The goose has taken the new bridge. The old one is open on weekdays.',
    },
    {
      id: 'disputed_scarecrow', title: 'The Disputed Scarecrow', check: 'Persuasion',
      notice: 'Two farmers claim one field. The scarecrow in it has started siding with neither.',
      steps: ['Walking the boundary with the first farmer', 'Walking the same boundary with the second farmer, who disagrees', 'Finding the boundary stone in a ditch', 'Asking the scarecrow what it saw', 'Drawing a line both farmers dislike equally'],
      done: 'The field is split down the middle. The scarecrow stands on the line and faces whichever way it likes.',
    },
    {
      id: 'furniture_in_transit', title: 'Furniture in Transit', check: 'Athletics',
      notice: "Widow Pelk's dresser was seized in error and was last seen going uphill on a mule.",
      steps: ['Taking a description of the dresser', 'Following hoof prints and a trail of dropped spoons', 'Catching up with a mule that does not wish to be caught', 'Unloading a dresser from an unwilling animal', 'Carrying a dresser down a hill alone', 'Putting the spoons back in the right drawers'],
      done: 'The dresser is home. The widow has counted the spoons twice and is satisfied.',
    },
    {
      id: 'notice_of_notices', title: 'Notice of Notices', check: 'Insight',
      notice: 'The goblins are paid for every notice they serve. Somebody ought to find out by whom.',
      steps: ['Counting the notices nailed to one barn', 'Buying a goblin a drink and asking about its wages', 'Following a goblin on pay day', 'Watching coins change hands behind the tavern', 'Finding the hatch the paymaster went down', 'Reporting to the barkeep, who has gone quiet'],
      done: 'The goblins are paid from somewhere under The Wobbly Griffin. The barkeep would rather not have known.',
    },
    {
      id: 'something_downstairs', title: 'Something Downstairs', check: 'Perception',
      notice: 'The barkeep hears stamping under the cellar at night. Rubber stamping.',
      steps: ['Sitting in the cellar after closing', 'Listening at the flagstones', 'Moving the barrels nobody has moved in years', 'Finding stairs where the cellar should stop', 'Going down far enough to see lamplight and coming back up'],
      done: 'There is a second cellar under the first, and someone has set up an office in it. The stairs go on down.',
    },
  ],

  mumblewood: [
    {
      id: 'what_the_trees_said', title: 'What the Trees Said', check: 'Insight',
      notice: 'A woodcutter wants a written record of what his trees say at night, for his nerves.',
      steps: ['Sitting up all night in a wood with a pencil', 'Taking down the mumbling of a beech', 'Asking an ash to repeat itself', 'Comparing notes from three trees', 'Reading the transcript back to the woodcutter'],
      done: 'The trees are reciting a schedule of fees. The woodcutter liked it better when he thought it was ghosts.',
    },
    {
      id: 'wolf_retainer', title: 'The Wolf Retainer', check: 'Survival',
      notice: 'The wolves are being paid to howl. The charcoal burners would pay more for them to stop.',
      steps: ['Counting howls from the charcoal camp', 'Tracking a wolf to where it collects its wages', 'Finding a ledger buried under a cairn of bones', 'Making the wolves a counter-offer', 'Negotiating the difference in mutton', 'Delivering the mutton'],
      done: 'The wolves now howl on alternate nights. Everyone calls it a compromise and nobody is pleased.',
    },
    {
      id: 'notary_too_many', title: 'A Notary Too Many', check: 'Sleight of Hand',
      notice: 'Sprites have been witnessing documents that nobody signed. Several marriages are in doubt.',
      steps: ['Collecting the documents in question', 'Catching a sprite in the act with a jam jar', 'Questioning a sprite through glass', 'Finding the stump where the seal is kept', 'Swapping the seal for a turnip', 'Returning four marriage lines to their owners'],
      done: 'The seal is at the bottom of a pond. The marriages stand, by general agreement.',
    },
    {
      id: 'charcoal_arrears', title: "The Charcoal Burners' Arrears", check: 'Persuasion',
      notice: 'The charcoal burners have been billed for every tree they ever felled, with interest back to the acorn.',
      steps: ['Reading a bill four yards long', 'Checking the arithmetic by firelight', 'Finding the assessor on a rotten log', 'Disputing the age of an oak with a toadstool', 'Getting the acorns struck off', 'Carrying the amended bill back'],
      done: 'The bill is down to a yard and a half. The charcoal burners have framed the other part.',
    },
    {
      id: 'owlbears_address', title: "The Owlbear's Former Address", check: 'Animal Handling',
      notice: 'An owlbear was evicted in the spring and has been sleeping on the footpath. The footpath would like to reopen.',
      steps: ['Viewing the old den, which has a notice on it', 'Looking over three hollow trees for size', 'Lining a cave with something an owlbear might like', 'Leading an owlbear to a viewing with a trail of fish', 'Waiting outside while it decides', 'Taking the notice down off the old den, for the principle of it'],
      done: 'The owlbear has taken the cave. The footpath is open and smells of fish.',
    },
    {
      id: 'property_of_the_lessor', title: 'Property of the Lessor', check: 'Investigation',
      notice: "Every tree in the wood has a tag nailed to it. They all say 'Property of the Lessor', and they all point the same way.",
      steps: ['Reading the tag on the nearest tree', 'Reading the tags on the next hundred, to be sure', 'Following the way the nails point', 'Pushing through to where the tags are older', 'Standing at the mouth of a tunnel made of thorns'],
      done: 'The whole Mumblewood has been repossessed, tree by tree. Whoever holds the papers keeps them in the Thornwarren.',
    },
  ],

  saltmarrow: [
    {
      id: 'not_especially_giant', title: 'Not Especially Giant', check: 'Persuasion',
      notice: 'The fish market wants its beach back from a crab. The crab is to be handled with tact.',
      steps: ['Hearing about the crab from six fishwives at once', 'Measuring the crab, from memory, afterwards', 'Finding a larger tide pool up the coast', 'Describing the larger pool to the crab in flattering terms', 'Walking a crab up a beach at its own pace'],
      done: 'The crab has moved to a pool it believes was chosen for its size. The market has its beach.',
    },
    {
      id: 'lunch_money', title: 'Lunch Money', check: 'Sleight of Hand',
      notice: 'A gull has declared itself Customs. The dockers have not had a whole pie since Candlemas.',
      steps: ['Watching the quay at noon', 'Losing a test sandwich', 'Finding the nest, which is lined with pie dishes', 'Returning eleven pie dishes to the baker', 'Baking a decoy with the baker\'s help', 'Standing well back'],
      done: 'The gull has gone off pies entirely. The baker will not say what was in the decoy.',
    },
    {
      id: 'crew_wanted', title: 'Crew Wanted, No Questions', check: 'Deception',
      notice: 'Men who sign on with the Merry Margaret are not seen again. Neither, come to that, is the Merry Margaret.',
      steps: ['Reading the notice outside the Anchor', 'Accepting a drink and pouring it in a plant', 'Pretending to be unconscious in a sack', 'Being carried somewhere damp', 'Counting the other sacks', 'Letting everyone out and locking the door from the outside'],
      done: 'There is no ship. The recruits were being held in a cellar against a debt none of them owed.',
    },
    {
      id: 'receipt_for_the_tide', title: 'A Receipt for the Tide', check: 'Arcana',
      notice: 'The fishermen have been charged for high water, twice daily. They would like to know if that is allowed.',
      steps: ['Collecting a season of tide receipts', 'Waiting on a jetty for the collector', 'Asking a sea hag for her authority', 'Reading a licence that is mostly seaweed', 'Pointing out that the moon has not been paid', 'Standing firm while she thinks about that'],
      done: 'The tide charge is suspended while the hag works out what the moon is owed.',
    },
    {
      id: 'second_ledger', title: "The Harbourmaster's Second Ledger", check: 'Investigation',
      notice: 'The harbourmaster keeps two sets of books and has lost track of which one is true.',
      steps: ['Reading the first ledger', 'Reading the second ledger, which is thicker', 'Adding up a column of fees paid by the coves', 'Asking the harbourmaster who collects them', 'Being shown a mark where a name should be', 'Copying the mark onto a sleeve'],
      done: 'The smugglers pay a fee every month and it does not go up the mountain. The mark belongs to nobody the harbourmaster will name.',
    },
    {
      id: 'light_that_should_be_out', title: 'A Light That Should Be Out', check: 'Perception',
      notice: 'The old lighthouse went under the sea forty years ago. It was lit again last night.',
      steps: ['Watching the water from the cliff after dark', 'Counting the flashes', 'Checking the pattern against the smugglers\' signal book', 'Rowing out at the lowest tide of the month', 'Finding the gallery door just above the waterline'],
      done: 'The Drowned Lighthouse is signalling for payment. Someone down there is keeping the lamp, and the accounts.',
    },
  ],

  peaks: [
    {
      id: 'toll_and_mood', title: 'The Toll and the Mood', check: 'Persuasion',
      notice: 'The carters ask that the pass toll be fixed at a figure. Any figure.',
      steps: ['Writing down what each carter was charged', 'Asking the ogre how it works out the toll', 'Listening to the answer, which involves its knee', 'Painting a price on a board', 'Teaching an ogre to point at the board', 'Standing by for the first customer'],
      done: 'The toll is four coppers and is written down. The ogre points at the board with real pride.',
    },
    {
      id: 'named_in_verse', title: 'Named in Verse', check: 'Performance',
      notice: 'A cheesemaker has been called a debtor in a ballad sung from the crags. He paid in March.',
      steps: ['Hearing the ballad through once, at a distance', 'Finding the cheesemaker\'s receipt in a churn', 'Climbing to the harpy\'s ledge', 'Reading a receipt aloud over the wind', 'Suggesting a rhyme for "settled in full"'],
      done: 'There is a new last verse. It is the only kind one in the ballad and the cheesemaker hums it.',
    },
    {
      id: 'right_of_way', title: 'Right of Way', check: 'Acrobatics',
      notice: 'The high path is closed until a goat moves. The goat has been there since Tuesday week.',
      steps: ['Viewing the goat from below', 'Viewing the goat from above', 'Offering the goat a turnip on a pole', 'Cutting a passing place into the cliff with a borrowed pick', 'Edging past a goat with a pack on', 'Leaving the turnip, as a courtesy'],
      done: 'The high path has a passing place. The goat uses it to stand in.',
    },
    {
      id: 'strongbox_that_bit', title: 'The Strongbox That Bit', check: 'Investigation',
      notice: 'A prospector brought a dwarven strongbox down from the ruins. It has eaten his lunch, his pick, and part of his mule\'s tail.',
      steps: ['Examining a strongbox from across a room', 'Feeding it a ham on a string', 'Reading the maker\'s plate while it chews', 'Carrying it back up the mountain in a sack', 'Finding the vault it came from', 'Putting it back on its shelf between two real ones'],
      done: 'The strongbox is back in the ruins, where the plate says it is the property of the Under-King.',
    },
    {
      id: 'where_the_hill_was', title: 'Where the Hill Was', check: 'Survival',
      notice: 'A farm that used to be beside a hill is now under one. The farmer would like it noted that he objects.',
      steps: ['Comparing the valley with an old map', 'Digging down to a chimney', 'Following footprints the size of a pond', 'Showing a giant the old map', 'Supervising the return of a hill', 'Checking the farmer\'s cabbages'],
      done: 'The hill is back, within a few yards. The cabbages are flat but the farmer has been heard.',
    },
    {
      id: 'under_kings_door', title: "The Under-King's Door", check: 'History',
      notice: 'The surveyors keep measuring a wall in the ruins that is not on any plan. Something behind it measures back.',
      steps: ['Walking the ruins with a dwarven plan', 'Finding the wall the plan leaves out', 'Rubbing the frost off a carved seal', 'Reading the runes with the help of a tired dwarf', 'Knocking, and being knocked back at'],
      done: 'The dwarves signed something here long ago. The Under-King took the only copy through that door and has not come out.',
    },
  ],

  gloamfen: [
    {
      id: 'directions_eventually', title: 'Directions, Eventually', check: 'Survival',
      notice: 'The reed cutters ask for a path across the fen that does not rely on the wisps.',
      steps: ['Following a wisp on purpose and noting where it leads', 'Following another and noting the same', 'Marking the sound ground with stakes', 'Losing a boot to prove a point', 'Roping the stakes together', 'Walking the new path in the dark without a light'],
      done: 'The staked path is open. The wisps hang beside it and pretend it was their idea.',
    },
    {
      id: 'desk_that_sank', title: 'The Desk That Sank', check: 'History',
      notice: 'A clerk drowned at his desk in the flood of the old count\'s time. He still has the reed cutters\' licences.',
      steps: ['Finding the roof of the old office among the reeds', 'Taking a number', 'Waiting to be called by a dead man', 'Explaining that the count has also died', 'Receiving forty licences, wet but stamped'],
      done: 'The licences are a century out of date and nobody minds. The clerk has been told he may go home.',
    },
    {
      id: 'appeal_under_a_bridge', title: 'An Appeal Under a Bridge', check: 'Persuasion',
      notice: 'A troll wants a letter written. It cannot hold a pen without breaking it.',
      steps: ['Taking dictation from a troll', 'Removing the threats from the second paragraph', 'Finding out who the letter should go to', 'Learning that nobody knows', 'Addressing it to the Landlord, Wyrmspire', 'Reading the fair copy back to the troll, twice'],
      done: 'The letter is sent. The troll has not stopped looking up the road since.',
    },
    {
      id: 'rest_for_the_tenant', title: 'Rest for the Tenant', check: 'Religion',
      notice: 'A ghost in the old almshouse says it would leave if someone would only check its rent book.',
      steps: ['Finding the rent book under a floorboard', 'Reading a hundred years of entries', 'Noticing that every one is marked paid', 'Showing the ghost its own handwriting', 'Sitting with it while it takes that in'],
      done: 'The tenant was never behind. It has gone to its rest, and left the rent book on the table.',
    },
    {
      id: 'swamp_objects', title: 'The Swamp Objects', check: 'Insight',
      notice: 'The causeway crew cannot work because the swamp keeps objecting. They would like someone to hear it out.',
      steps: ['Standing at the edge and asking what the matter is', 'Being told at length', 'Carrying the swamp\'s terms to the causeway crew', 'Carrying the crew\'s reply back to the swamp', 'Moving the causeway eleven yards to the left', 'Thanking a bog'],
      done: 'The causeway bends where the swamp asked. Both sides claim to have won.',
    },
    {
      id: 'bells_under_water', title: 'Bells Under the Water', check: 'Perception',
      notice: 'The old abbey sank before anyone living was born. Its bells still ring on quarter day.',
      steps: ['Waiting by the mere on quarter day', 'Counting the bells', 'Dragging the shallows and bringing up a wax tablet', 'Reading a column of figures in a monk\'s hand', 'Finding the top of the bell tower with a pole'],
      done: 'The monks rang the bells when the rent was paid, and wrote it down each time. The ledgers are still in the Sunken Abbey.',
    },
  ],

  cinder: [
    {
      id: 'different_order', title: 'Everything in a Different Order', check: 'Investigation',
      notice: 'A caravan was audited by the wind. The merchants have their goods back but not in the right wagons.',
      steps: ['Taking an inventory of nine wagons', 'Matching forty left shoes to forty right ones', 'Finding the saffron in with the nails', 'Chasing a bolt of silk across two dunes', 'Settling who owns an unclaimed goat'],
      done: 'Every wagon has its own goods again. The goat has been awarded to the cook.',
    },
    {
      id: 'shown_out', title: 'Shown Out', check: 'Stealth',
      notice: 'The scholars at the dig cannot get past the door. Something bandaged keeps showing them out.',
      steps: ['Watching the usher work from behind a column', 'Timing its rounds', 'Writing out a pass in a dead language', 'Presenting the pass with confidence', 'Holding the door for six scholars and a donkey', 'Collecting the pass on the way out, in case'],
      done: 'The scholars are in. The usher has kept the pass and reads it when nobody is looking.',
    },
    {
      id: 'camels_papers', title: "The Camel's Papers", check: 'Animal Handling',
      notice: 'A camel was seized for a debt nobody remembers. A drover would like to know whose camel it is now.',
      steps: ['Approaching the camel from the front', 'Approaching the camel again, after a wash', 'Reading the half of the notice it has not eaten', 'Tracing the debt to a well that dried up', 'Declaring a camel its own property before two witnesses'],
      done: 'The camel belongs to itself. It has taken work with the drover on terms it finds acceptable.',
    },
    {
      id: 'on_loan', title: 'On Loan from the Volcano', check: 'Arcana',
      notice: 'The oasis is four degrees hotter than it should be. The cause is homesick and on fire.',
      steps: ['Finding the hottest dune', 'Opening a conversation from upwind', 'Asking a fire elemental about home', 'Listening for longer than expected', 'Writing to its superiors about a transfer', 'Sealing the letter with something that will not burn'],
      done: 'The request for a transfer is on its way up the mountain. The elemental is keeping its flames down while it waits.',
    },
    {
      id: 'three_questions', title: 'Three Questions', check: 'History',
      notice: 'The sphinx will not let the salt caravan through until its register is complete. One entry is missing.',
      steps: ['Reading the register over a sphinx\'s shoulder', 'Finding the gap, which is a king', 'Asking the sphinx why a king has no date of death', 'Being told he has three', 'Copying all three into the margin', 'Leading the salt caravan through'],
      done: 'The register is complete. The king in it was buried three times, and the sphinx does not think that is its business.',
    },
    {
      id: 'buried_again', title: 'Buried Again', check: 'Perception',
      notice: 'A gang of diggers was hired to bury a tomb that was already buried. They were paid in advance and want to know why.',
      steps: ['Sharing water with a burial gang', 'Looking at their orders, which are sealed', 'Counting the layers of sand over the door', 'Finding older shovels under the newer ones', 'Hearing something inside ask the time'],
      done: 'Someone has paid three times to keep this king underground. He is in the Tomb, and he sounds as though he has something to say.',
    },
  ],

  underdeep: [
    {
      id: 'cabinet_in_the_ooze', title: 'The Cabinet in the Ooze', check: 'Acrobatics',
      notice: 'An ooze has swallowed the deep dwarves\' records office. The records are in good order, but nobody can reach them.',
      steps: ['Locating the ooze by the sound of drawers', 'Asking for a file through a speaking tube', 'Being handed the wrong file, politely', 'Asking again with the correct reference', 'Drying a document over a lamp', 'Thanking an ooze'],
      done: 'The ooze has been appointed records keeper. It is the best one the deep dwarves have had.',
    },
    {
      id: 'lien_on_the_ceiling', title: 'A Lien on the Ceiling', check: 'Sleight of Hand',
      notice: 'A spider has put a claim on the only tunnel to the fungus farms. The farmers are living on last year\'s crop.',
      steps: ['Reading a web by lamplight', 'Finding the clause that matters, high up', 'Climbing to it', 'Cutting one thread and no others', 'Holding still while the spider checks the damage', 'Walking through with a string of farmers behind'],
      done: 'The claim now covers the ceiling only. The farmers keep to the floor and everyone is within their rights.',
    },
    {
      id: 'introductions_in_the_dark', title: 'Introductions in the Dark', check: 'Insight',
      notice: 'A mushroom offers to introduce anyone to anyone, for a fee. A widow would like to know who it introduced her husband to.',
      steps: ['Booking an introduction under a false name', 'Breathing through a wet cloth', 'Asking who buys the debts down here', 'Being introduced to an empty chair', 'Noticing the chair is warm', 'Finding the husband asleep in a spore bed, unharmed'],
      done: 'The husband is home. The mushroom would only say that its best client never gives a name and always sits in the dark.',
    },
    {
      id: 'collectors_collector', title: "The Collector's Collector", check: 'Intimidation',
      notice: 'A debt collector is being pursued for a debt. He would like it known that this is different.',
      steps: ['Hearing why it is different', 'Reading a bill that has been sold four times', 'Tracing the first sale to a stall', 'Tracing the second to the same stall', 'Finding that all four sales were to one buyer', 'Telling the collector, who sits down'],
      done: 'Every debt in the Underdeep ends up with the same buyer, who sells it back at a markup. The collector has taken the day off.',
    },
    {
      id: 'seen_by_too_many', title: 'Seen by Too Many', check: 'Stealth',
      notice: 'A thing with a great many eyes saw who buys the debts. It will say, if someone will bring it a hat.',
      steps: ['Asking a hatter for something wide', 'Carrying a very large hat through a low tunnel', 'Presenting a hat to something that has never worn one', 'Waiting while it tries it at several angles', 'Asking the question'],
      done: 'It saw a lamp go out and a hand take the money. It is pleased with the hat and sorry not to have seen more.',
    },
    {
      id: 'stall_with_no_lamp', title: 'A Stall With No Lamp', check: 'Perception',
      notice: 'There is a market down here that trades with every lamp put out. One stall has never been lit at all.',
      steps: ['Finding the market by the sound of haggling', 'Putting out the lamp at the gate, as the sign asks', 'Counting stalls by touch', 'Finding the one that is colder than the rest', 'Being quoted a price for something by a voice with no face'],
      done: 'The broker trades from the Lightless Market. The rent has been passing through that stall for three hundred years.',
    },
  ],

  wyrmspire: [
    {
      id: 'spiritual_matter', title: 'A Spiritual Matter', check: 'Religion',
      notice: 'The cult at the foot of the mountain has started taking confession. The penance is always a sum of money.',
      steps: ['Attending a service in a borrowed robe', 'Confessing to something small', 'Being quoted a penance with interest', 'Asking to see where it says that', 'Reading the hymn book, which is a price list', 'Leaving by the vestry window'],
      done: 'The villagers have their penances back. The cult has gone up the mountain to complain.',
    },
    {
      id: 'small_dragon_large_errand', title: 'Small Dragon, Large Errand', check: 'Animal Handling',
      notice: 'A drake has been dropping letters over the village and hitting people with them. The letters are final demands.',
      steps: ['Collecting the letters from roofs and one pond', 'Finding that they are all addressed to The Wobbly Griffin', 'Luring a drake down with a smoked ham', 'Asking a drake who writes these', 'Being shown a claw mark in place of a signature', 'Sending a reply back by the same drake'],
      done: 'The reply says the tavern will be answering in person. The drake carried it up very carefully.',
    },
    {
      id: 'foot_traffic', title: 'Foot Traffic', check: 'Investigation',
      notice: 'The only path up the mountain is closed for raking. It has been closed for raking for six years.',
      steps: ['Reading every sign on the lower slope', 'Finding the clerk of works at its raking', 'Admiring the rake lines sincerely', 'Asking about the side stair in a roundabout way', 'Being walked up it at arm\'s length'],
      done: 'There is a side stair. The clerk asks that the hero keep to the left and touch nothing.',
    },
    {
      id: 'accounts_receivable', title: 'Accounts Receivable', check: 'Persuasion',
      notice: 'The great ledger of what is owed has two columns. Nobody on the mountain has ever opened it to the second.',
      steps: ['Waiting in a queue of cultists', 'Asking to look up the tavern\'s account', 'Turning to the second column while the keeper is called away', 'Reading three hundred years of entries', 'Copying the last line onto the back of a pamphlet', 'Closing the book before the keeper returns'],
      done: "The second column says 'received' against every year. Somebody was paid. It was not the landlord.",
    },
    {
      id: 'gold_that_counts_itself', title: 'The Gold That Counts Itself', check: 'Athletics',
      notice: 'A suit of golden armour patrols the outer hoard and counts it each night. Lately the count comes up short and it has begun to worry.',
      steps: ['Walking the outer hoard with its guardian', 'Counting along, out loud, to be helpful', 'Finding a shelf with three hundred empty pegs', 'Explaining to a suit of armour that the gold never arrived', 'Steadying a suit of armour'],
      done: 'Three hundred years of rent never reached the hoard. The guardian has stopped counting and started thinking.',
    },
    {
      id: 'landlord_is_in', title: 'The Landlord Is In', check: 'History',
      notice: 'The lease is whole, all eight pages. The landlord receives callers at the top of the mountain.',
      steps: ['Putting eight pages in order on a flat rock', 'Reading the lease from start to finish', 'Reading clause nine again', 'Climbing until the path turns to coins', 'Knocking at a door that is forty feet high'],
      done: 'Everything is in order and the rent was paid. All that remains is to tell Vexaldrith, in the Hoard, to her face.',
    },
  ],
};

// Odd jobs: what the board offers once a region's story quests are done. A job is "{job} for
// {client}", with 5 to 8 steps drawn from `steps`.
export const ODD_JOBS = {
  jobs: [
    'Counting sheep', 'Delivering a cheese', 'Finding a lost ladle', 'Witnessing a will', 'Moving a piano', 'Minding a stall',
    'Returning a borrowed ladder', 'Settling a wager', 'Rehoming a rooster', 'Copying out a recipe', 'Fetching a second opinion',
    'Unblocking a well', 'Reading a letter aloud', 'Recovering a wig', 'Collecting a small debt, gently', 'Measuring a fence',
  ],
  clients: [
    'the parish clerk', 'a nervous miller', 'the widow next door', 'two brothers who are not speaking', 'a retired bandit',
    'the barkeep\'s cousin', 'a hedge wizard of no fixed spell', 'the mayor, unofficially', 'a dwarf on holiday', 'somebody\'s grandmother',
    'the local guild of one', 'a goblin going straight',
  ],
  steps: [
    'Getting the details, most of which change', 'Asking a neighbour who was not there', 'Walking to the far end of the parish',
    'Waiting for someone to come back from lunch', 'Knocking at the wrong door first', 'Carrying something awkward a long way',
    'Looking where it was last seen', 'Looking where it actually is', 'Haggling over a sum nobody wanted to say first',
    'Fixing a thing that was fine until it was touched', 'Explaining the plan to a dog', 'Climbing over a wall with the gate in plain view',
    'Counting it again, to be sure', 'Reading the instructions afterwards', 'Standing in the rain on principle',
    'Agreeing to one small extra', 'Writing it all down for the record', 'Going back for the hat',
  ],
  done: [
    'The job is done. The client says it is about what they expected.',
    'Paid in full, with a pie. The pie was the better part.',
    'Finished. The client has already thought of something else.',
    'Done, and nobody was hurt who did not deserve it.',
    'The client is satisfied, which is rarer than gold and worth less.',
  ],
};

// Chronicle lines for a quest step's roll. Quests name their own check; the lines are shared.
export const QUEST_LINES = {
  hit: [
    'It goes as planned, which surprises everyone.', 'Done, and done properly.', 'That part is settled.',
    'It takes patience, and the hero finds some.', 'Nobody objects, or nobody who counts.', 'One more thing crossed off.',
  ],
  miss: [
    'It gets done, but not gracefully.', 'That took two attempts and a bruise.', 'Done. The less said the better.',
    'It works out, at some cost to the hero\'s shins.', 'Finished the hard way.', 'The job moves on. So does the swelling.',
  ],
  crit: [
    'It could not have gone better, and somebody tips.', 'Done so well that a bystander applauds.', 'It goes so smoothly the hero is briefly suspicious.',
  ],
  fumble: [
    'It goes wrong in a way that will be talked about.', 'The hero does it backwards and has to pay for the damage in bruises.', 'Done, eventually, after falling in something.',
  ],
  ko: [
    'The client has asked whether this will affect the schedule.', 'The job will keep. The hero had to be carried.', 'It was the stairs, in the end.',
  ],
};

export const QUEST_BY_ID = Object.fromEntries(Object.values(QUESTS).flat().map((q) => [q.id, q]));
