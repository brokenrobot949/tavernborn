// Chronicle lines that are not tied to one monster. {name}, {level}, {cost}, {monster}, {place},
// {dungeon}, {quest}, and {breath} are filled in by the game. Voice: a dry chronicler; no exclamation marks.
export const ARRIVAL = [
  '{name} signs the guest book at The Wobbly Griffin. There is an eviction notice nailed to the door.',
  '{name} sets out into Mugwick Vale to see about the rent.',
];

export const LEVEL_UP = [
  'Level {level}. The road feels a little shorter than it did.',
  'Level {level}. {name} stands straighter, and means it.',
  'Level {level}. Somebody at The Wobbly Griffin will raise a mug to this.',
  'Level {level}. It was earned, every step of it.',
];

export const TAVERN_TASKS = [
  'Being lectured by the cleric',
  'Explaining to the barkeep what happened',
  'Lying very still on the good bench',
  'Drinking something medicinal and brown',
  "Listening to the regulars' version of events",
  'Counting the ceiling beams of The Wobbly Griffin',
  'Being told it could have been worse',
  'Waiting for the room to hold still',
];

export const RECOVERED = [
  'Back on their feet. The cleric asks that it not become a habit.',
  'Recovered. The barkeep has kept the tab open.',
  'Up again and walking back out. Nobody mentions how it happened.',
];

export const POTION = [
  'Drank a healing potion ({cost} gp). It tasted of copper and mint.',
  "Bought a healing potion ({cost} gp). The label said 'probably'.",
  'Drank a healing potion ({cost} gp). The cork was the best part.',
];

export const BESTIARY_NEW = 'New Bestiary entry: {monster}.';

// ----- travel -----
export const TRAVEL_TASKS = [
  'Walking to {place} behind a cart that will not be passed',
  'On the road to {place}, being told a shortcut by a man going the other way',
  'Travelling to {place} and regretting the newer boots',
  'On the way to {place}, sharing the road with a funeral that is in no hurry',
  'Walking to {place} in rain that was not forecast',
  'On the road to {place}, paying a toll at a bridge with no river',
  'Travelling to {place} beside a pedlar with opinions',
  'Walking to {place} and reading the milestones, which disagree',
];
export const RETURN_TASK = 'Walking back out to {place}';
export const CAMP_TASKS = [
  'Making camp outside {dungeon} and getting some sleep',
  'Resting at the door of {dungeon} with a kettle on',
  'Binding up the worst of it before going into {dungeon}',
];

// ----- quests -----
export const QUEST_TAKEN = 'Took a job from the board. {quest}: {notice}';
export const ODD_JOB_TAKEN = 'Took an odd job from the board: {quest}.';
export const QUEST_DONE = 'Quest complete: {quest}. {done}';
export const FEAT = 'Feat earned: every story quest in {place} is done. One bonus skill point.';

// ----- dungeons -----
export const RUN_LOST = 'The run is lost.';
export const STEP_LOST = 'That step will have to be done again.';
export const DUNGEON_CLEARED = [
  '{dungeon} is cleared. It is quieter down there now.',
  '{dungeon} is cleared again. It does not get easier, only more familiar.',
];
export const REGION_OPEN = 'The road to {place} is open.';
export const CONFIDENCE = 'Three defeats running in {dungeon}. {name} will roam for a while to rebuild confidence.';
export const STUBBORN = 'Too Stubborn to Fall. {name} should be on the floor and is not, with 1 HP to show for it.';
export const BREATH = 'Breath Weapon. {name} opens with {breath}, and it counts.';

// ----- the tavern cleric -----
export const CLERIC_PAID = [
  'Paid the cleric {cost} gp. On their feet at once, with a short lecture included in the price.',
  'The cleric took {cost} gp and did in a moment what rest would have done for free.',
];
