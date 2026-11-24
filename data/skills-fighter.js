// Skill tree for the Fighter: three branches of eight skills, in the order js/skills.js lays them out:
//   0, 1  passives with ranks        2 | 3  a fork of two moves (one may be learned)
//   4     a passive with ranks       5 | 6  a second fork        7  the capstone (subclass only)
//
//   id      never changes once shipped: saves store it
//   ranks   how many points the skill takes (1 if missing). `fx` is per rank
//   text    what the Skills tab says the skill does. Keep it in step with `fx` and `sig`
//   fx      passive numbers, added up across every learned rank (the keys are listed in js/skills.js)
//   sig     a signature move: something that fires on its own during tasks (types in js/skills.js)
//   learn   Chronicle line written when the skill is first learned
//   fire    Chronicle line written each time a signature move fires
// Voice: a dry chronicler. No exclamation marks.
export const FIGHTER = {
  class: 'fighter',
  branches: [
    {
      id: 'vanguard', kind: 'might', name: 'Vanguard',
      blurb: 'Hits first and hardest. Monsters fall faster, and bosses are met at a run.',
      chosen: '{name} is entered in the tavern book as a Vanguard. The column for "approach" reads "directly".',
      skills: [
        { id: 'f_weapon_focus', name: 'Weapon Focus', ranks: 2, text: '+1 on rolls in fights (roaming, dungeon rooms, and bosses) for each rank.', fx: { rollRoam: 1, rollDelve: 1, rollBoss: 1 },
          learn: 'Learned Weapon Focus. The sword has been asked to concentrate, and is trying.' },
        { id: 'f_footwork', name: 'Drilled Footwork', ranks: 3, text: 'Monster tasks and dungeon rooms finish 4% faster for each rank.', fx: { speedRoam: 0.04, speedDelve: 0.04 },
          learn: 'Learned Drilled Footwork. The hero now arrives at trouble slightly ahead of schedule.' },
        { id: 'f_cleave', name: 'Cleave', text: 'While roaming, a 10% chance the monster is dealt with before it can object: full reward, no roll, no damage.',
          sig: { type: 'autoWin', source: 'roam', chance: 0.1 },
          learn: 'Learned Cleave. A fence post was consulted and has not been the same since.',
          fire: 'Cleave. One swing settles the matter, and most of a hedge.' },
        { id: 'f_charge', name: 'Opening Charge', text: 'Opens every boss fight with a free blow.',
          sig: { type: 'freeBossHit' },
          learn: 'Learned Opening Charge. Introductions will be kept short from now on.',
          fire: 'Opening Charge. {name} arrives before the speech does. One blow is landed on account.' },
        { id: 'f_press', name: 'Press the Advantage', ranks: 3, text: 'A critical pays 20% more of the reward for each rank.', fx: { critReward: 0.2 },
          learn: 'Learned Press the Advantage. Good fortune will now be followed up in writing.' },
        { id: 'f_second_wind', name: 'Second Wind', text: 'Once per dungeon run, when below half hit points, recovers 30% of them.',
          sig: { type: 'secondWind', scope: 'run', below: 0.5, heal: 0.3 },
          learn: 'Learned Second Wind. It is kept in reserve, behind the first one.',
          fire: 'Second Wind. {name} stops, breathes out, and carries on as if nothing had been said.' },
        { id: 'f_relentless', name: 'Relentless Assault', text: 'A failed roll has a 12% chance of counting as a success after all.',
          sig: { type: 'turn', chance: 0.12 },
          learn: 'Learned Relentless Assault. The monster\'s objection has been noted and overruled.',
          fire: 'Relentless Assault. The blow was turned. {name} sends it back round the other way, and it is not turned twice.' },
        { id: 'f_action_surge', name: 'Action Surge', text: 'Capstone. Once every ten minutes, a failed roll is made again.',
          sig: { type: 'reroll', scope: 'cooldown', seconds: 600 },
          learn: 'Learned Action Surge. There will be a second attempt, and it will be made immediately.',
          fire: 'Action Surge. The first attempt is withdrawn and a better one submitted in its place.' },
      ],
    },

    {
      id: 'bulwark', kind: 'guard', name: 'Bulwark',
      blurb: 'Still standing when it is over. Less damage, more hit points, and a shorter stay on the good bench.',
      chosen: '{name} is entered in the tavern book as a Bulwark. The barkeep has moved the breakables anyway.',
      skills: [
        { id: 'f_thick_skin', name: 'Thick Skin', ranks: 3, text: '+5% maximum hit points for each rank.', fx: { hp: 0.05 },
          learn: 'Learned Thick Skin. Remarks and arrows are both expected to bounce.' },
        { id: 'f_shield_drill', name: 'Shield Discipline', ranks: 3, text: '5% less damage from everything, for each rank.', fx: { dr: 0.05 },
          learn: 'Learned Shield Discipline. The shield is now held where the monster is, not where it was.' },
        { id: 'f_brace', name: 'Brace', text: 'A 20% chance that a failed roll costs no hit points.',
          sig: { type: 'negate', on: 'fail', chance: 0.2 },
          learn: 'Learned Brace. It looks like flinching and is filed under technique.',
          fire: 'Brace. The blow arrives and finds a shield already waiting for it.' },
        { id: 'f_catch_breath', name: 'Catch Breath', text: 'Outside dungeons, when below 35% hit points after a task, recovers 25% of them. Once every 20 minutes.',
          sig: { type: 'shortRest', below: 0.35, heal: 0.25, seconds: 1200 },
          learn: 'Learned Catch Breath. Sitting on a wall for a minute is now a recognised manoeuvre.',
          fire: 'Catch Breath. {name} sits on a milestone until the road stops moving.' },
        { id: 'f_field_dressing', name: 'Field Dressing', ranks: 3, text: 'Rests between tasks heal 15% more, and a failed roll pays 4% more of the reward, for each rank.', fx: { rest: 0.15, missReward: 0.04 },
          learn: 'Learned Field Dressing. The bandages are clean, which is new.' },
        { id: 'f_hold_the_line', name: 'Hold the Line', text: 'Once per dungeon run, drops to 1 hit point instead of 0.',
          sig: { type: 'cheatDeath', scope: 'run' },
          learn: 'Learned Hold the Line. The line is wherever the hero happens to be standing.',
          fire: 'Hold the Line. By all accounts {name} should be lying down. {name} disagrees, with 1 HP in support.' },
        { id: 'f_stand_fast', name: 'Stand Fast', text: 'The first two exchanges of every boss fight cost no hit points.',
          sig: { type: 'bossShield', rolls: 2 },
          learn: 'Learned Stand Fast. The larger the opponent, the less the hero intends to move.',
          fire: 'Stand Fast. The boss opens with its best. {name} is still there afterwards, and so is the shield.' },
        { id: 'f_last_stand', name: 'Last Stand', text: 'Capstone. Once per boss fight, a blow that would knock the hero out leaves them at 40% hit points instead. All damage is reduced by 5%.',
          fx: { dr: 0.05 }, sig: { type: 'cheatDeath', scope: 'boss', heal: 0.4 },
          learn: 'Learned Last Stand. It has been rehearsed, in case the first one does not take.',
          fire: 'Last Stand. {name} goes down on one knee, reconsiders, and gets up again.' },
      ],
    },

    {
      id: 'sellsword', kind: 'fortune', name: 'Sellsword',
      blurb: 'Paid for every swing. More gold, more experience, and better terms on every job.',
      chosen: '{name} is entered in the tavern book as a Sellsword. Rates are available on request.',
      skills: [
        { id: 'f_haggler', name: 'Haggler', ranks: 3, text: '+5% gold from everything, for each rank.', fx: { gold: 0.05 },
          learn: 'Learned Haggler. The first offer is now treated as a greeting.' },
        { id: 'f_campaigner', name: 'Campaigner', ranks: 3, text: '+4% XP from everything, for each rank.', fx: { xp: 0.04 },
          learn: 'Learned Campaigner. Every job is now also practice for the next one.' },
        { id: 'f_invoice', name: 'Itemised Invoice', text: 'A finished quest has a 25% chance of paying double gold.',
          sig: { type: 'windfall', chance: 0.25 },
          learn: 'Learned Itemised Invoice. Sundries will be listed separately from now on.',
          fire: 'Itemised Invoice. The client pays for sundries, mileage, and a line that reads only "peril".' },
        { id: 'f_finders', name: "Finders' Rights", text: 'A critical pays three times the gold.',
          sig: { type: 'onCrit', gold: 2 },
          learn: "Learned Finders' Rights. A clause has been found that covers whatever is lying about afterwards.",
          fire: "Finders' Rights. Everything not nailed down is declared salvage, and one thing that was." },
        { id: 'f_traveller', name: 'Seasoned Traveller', ranks: 3, text: 'Travel takes 12% less time, for each rank.', fx: { travel: 0.12 },
          learn: 'Learned Seasoned Traveller. The cart in front will be passed, politely, on the verge.' },
        { id: 'f_hazard_pay', name: 'Hazard Pay', text: 'A beaten dungeon boss pays a second purse and drops a second piece of gear.',
          sig: { type: 'bossPurse', gold: 1, items: 1 },
          learn: 'Learned Hazard Pay. Dungeon bosses have been reclassified as a workplace hazard.',
          fire: 'Hazard Pay. A second purse is collected, and something off the wall with it, on the grounds that nobody mentioned the size of it.' },
        { id: 'f_spoils', name: 'Spoils of War', text: 'Whenever a dungeon room, a chest, a boss, or a finished quest gives a piece of gear, there is a 20% chance of a second.',
          sig: { type: 'bonusLoot', chance: 0.2 },
          learn: 'Learned Spoils of War. Anything left on the field is presumed to be unwanted.',
          fire: 'Spoils of War. A second piece is found on the field, and presumed unwanted.' },
        { id: 'f_name_your_price', name: 'Name Your Price', text: 'Capstone. The first roll of every quest is made with advantage, and quests pay 20% more XP.',
          fx: { xpQuest: 0.2 }, sig: { type: 'advantage', scope: 'quest' },
          learn: 'Learned Name Your Price. The price has been named. It was accepted too quickly, and has been raised.',
          fire: 'Name Your Price. Terms are agreed before the client has finished describing the problem.' },
      ],
    },
  ],
};
