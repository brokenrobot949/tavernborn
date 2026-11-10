// Monsters by region. Phase 1 has region 1 only.
//   level   how tough it is; the hero mostly meets monsters at or below their own level
//   dc      the number the d20 roll has to meet
//   dmg     size of its damage die
//   xp      XP for a full success
//   gold    [min, max] gold for a full success
//   secs    [min, max] length of the task in seconds
//   check   the skill named in the Chronicle (flavor; the roll uses the class's main ability)
//   about   Bestiary line
//   tasks   task bar descriptions
//   hit / miss   Chronicle lines for meeting or missing the DC
//   crit / fumble   lines for a natural 20 and a natural 1
//   ko      second sentence of the knockout line
export const MONSTERS = {
  mugwick: [
    {
      id: 'cellar_rat', name: 'Cellar Rat', level: 1, dc: 10, dmg: 3, xp: 15, gold: [1, 3], secs: [20, 40],
      check: 'Animal Handling',
      about: 'Lives beneath the tavern. Considers the arrangement a tenancy.',
      tasks: ['Removing a rat from the cheese, and the cheese from the rat', 'Following a rat that knows a shortcut', 'Discussing boundaries with a cellar rat'],
      hit: ['The rat departs with what it believes is dignity.', 'The rat is relocated to a field it did not choose.'],
      miss: ['The rat keeps the cheese. Terms were not discussed.', 'The rat bites first and does not stay for questions.'],
      crit: 'The rat leaves and takes its relatives with it.',
      fumble: "The rat now has the hero's lunch as well.",
      ko: "Witnesses describe the rat as 'about the usual size'.",
    },
    {
      id: 'goose', name: 'Aggrieved Goose', level: 1, dc: 11, dmg: 4, xp: 15, gold: [1, 3], secs: [20, 40],
      check: 'Intimidation',
      about: 'Holds the bridge on the mill road. Nobody recalls granting it the bridge.',
      tasks: ['Asking a goose for the use of a bridge', 'Approaching a goose from what was hoped to be its blind side', 'Standing ground against a goose'],
      hit: ["The goose yields the bridge and makes a note of the hero's face.", 'The goose withdraws to the far bank to reconsider.'],
      miss: ['The goose keeps the bridge. The hero goes around by the ford.', 'The goose was not impressed and said so at length.'],
      crit: 'The goose steps aside and escorts the hero across.',
      fumble: 'The goose remains in charge of the bridge.',
      ko: 'The goose did not look back.',
    },
    {
      id: 'goblin_server', name: 'Goblin Process Server', level: 1, dc: 11, dmg: 4, xp: 16, gold: [2, 4], secs: [20, 40],
      check: 'Persuasion',
      about: 'Delivers notices on behalf of the dragon. Paid per notice, which explains the enthusiasm.',
      tasks: ['Declining to accept a notice from a goblin', 'Chasing a goblin who is chasing someone else with paperwork', 'Reading the small print while the goblin waits'],
      hit: ["The goblin marks the notice 'refused' and moves on.", 'The goblin is sent off with its satchel no lighter.'],
      miss: ['The notice is considered served. The goblin also kicked a shin.', 'The goblin leaves a copy, and a bruise for the file.'],
      crit: 'The goblin apologizes for the error and serves the notice on a hedge instead.',
      fumble: 'The hero signed for it. Twice, in the wrong place.',
      ko: "It left a notice on the hero's chest regarding the delay.",
    },
    {
      id: 'scarecrow', name: 'Scarecrow of Disputed Ownership', level: 2, dc: 12, dmg: 5, xp: 24, gold: [2, 5], secs: [30, 50],
      check: 'Investigation',
      about: 'Stands in a field claimed by two farmers and, lately, by itself.',
      tasks: ['Establishing whether a scarecrow moved', 'Acting as witness in a dispute between a farmer and a scarecrow', 'Walking past a scarecrow at an unhurried pace'],
      hit: ['The scarecrow is returned to its pole and its duties.', 'The straw settles. The crows resume their work.'],
      miss: ['The scarecrow stands its ground, which is technically its job.', 'It was a scarecrow the whole time, apart from the punching.'],
      crit: 'The scarecrow concedes the field and hands over its hat.',
      fumble: 'The hero apologized to an ordinary scarecrow. The other one was behind them.',
      ko: 'The crows watched and have told everyone.',
    },
    {
      id: 'hedge_bandit', name: 'Hedge Bandit', level: 2, dc: 12, dmg: 5, xp: 24, gold: [3, 7], secs: [30, 50],
      check: 'Deception',
      about: 'Robs travelers on the Vale road. New to the work and still using notes.',
      tasks: ['Being robbed by someone reading from a card', 'Waiting for a bandit to find the right page', 'Correcting a bandit on the going rate'],
      hit: ['The bandit hands over the takings and asks for feedback.', 'The bandit retires to the hedge to think about other trades.'],
      miss: ['The bandit keeps a few coins and, somehow, the moral high ground.', 'The hero is robbed, though of less than was requested.'],
      crit: "The bandit apologizes and returns a wallet that was not the hero's.",
      fumble: 'The hero paid the toll and tipped.',
      ko: 'The bandit stayed to check the hero was breathing, then took the bootlaces.',
    },
    {
      id: 'mule', name: "Repossessor's Mule", level: 2, dc: 13, dmg: 6, xp: 25, gold: [2, 6], secs: [30, 50],
      check: 'Athletics',
      about: 'Carries seized furniture up the Vale road. Has seized several things on its own initiative.',
      tasks: ['Reclaiming a chair from a mule', 'Persuading a mule to put down a wardrobe', 'Standing behind a mule, briefly'],
      hit: ['The mule releases the furniture and keeps the grudge.', 'The chair is returned to its owner, who had not noticed.'],
      miss: ['The mule kicks once, with accuracy, and keeps the chair.', 'The mule declines to move. The hero moves instead, some distance.'],
      crit: 'The mule gives up the wardrobe and a dresser nobody had reported missing.',
      fumble: 'The hero stood behind the mule. This was an error.',
      ko: 'The mule carried the hero back and has invoiced the tavern.',
    },
    {
      id: 'goblin_bailiff', name: 'Goblin Bailiff', level: 3, dc: 13, dmg: 6, xp: 34, gold: [4, 9], secs: [40, 60],
      check: 'Intimidation',
      about: 'Senior to the process servers. Carries a ledger, a club, and a strong sense of procedure.',
      tasks: ['Contesting an inventory with a goblin bailiff', "Preventing a bailiff from valuing the hero's boots", 'Asking a bailiff to show its authority, and regretting the phrasing'],
      hit: ['The bailiff strikes the entry from the ledger and leaves.', 'The bailiff withdraws to file a complaint with itself.'],
      miss: ["The bailiff applies the club, then notes the club's use in the ledger.", "The hero's boots have been valued. The figure was hurtful."],
      crit: 'The bailiff finds an error in its own paperwork and has to start the district again.',
      fumble: "The hero is now listed in the ledger under 'fixtures'.",
      ko: "The bailiff recorded the event as 'resolved'.",
    },
    {
      id: 'lurker', name: 'Hired Lurker', level: 3, dc: 14, dmg: 6, xp: 34, gold: [3, 8], secs: [40, 60],
      check: 'Perception',
      about: 'Retained to stand menacingly near property. Does not know whose, and is paid by the hour.',
      tasks: ['Asking a lurker to lurk somewhere else', 'Being loomed at near a barn', 'Out-waiting something that is paid by the hour'],
      hit: ['The lurker moves on to stand near a different barn.', 'The lurker clocks off early.'],
      miss: ['The lurker looms. It is very good at it.', 'The lurker stays put. The hero leaves, somewhat loomed upon.'],
      crit: 'The lurker admits it has no idea whose barn this is and goes home.',
      fumble: 'The hero lurked back. It did not go well.',
      ko: 'It went on standing there menacingly, as contracted.',
    },
    {
      id: 'boar', name: 'Wild Boar', level: 3, dc: 14, dmg: 8, xp: 35, gold: [1, 4], secs: [40, 60],
      check: 'Survival',
      about: 'Not employed by anyone. Simply in a mood.',
      tasks: ['Sharing a turnip field with a boar', 'Climbing a tree at short notice', 'Explaining to a boar that this is a public footpath'],
      hit: ['The boar loses interest and takes it out on a fence.', "The boar is driven off toward someone else's turnips."],
      miss: ['The boar makes its point, and then several more.', 'The footpath is closed until the boar says otherwise.'],
      crit: 'The boar is turned so neatly that it leaves without comment.',
      fumble: 'The tree was shorter than it looked.',
      ko: "The boar ate the hero's provisions while it waited.",
    },
  ],
};

export const MONSTER_BY_ID = Object.fromEntries(Object.values(MONSTERS).flat().map((m) => [m.id, m]));
