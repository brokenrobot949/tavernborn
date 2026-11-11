// Skill tree for the Fighter: three branches of twelve skills, in tier order (three per tier).
// The twelfth skill of a branch is its capstone, which only that branch's subclass can learn.
//
//   id      never changes once shipped: saves store it
//   text    what the Skills tab says the skill does. Keep it in step with `fx` and `sig`
//   fx      passive numbers, added up across every learned skill (the keys are listed in js/skills.js)
//   sig     a signature move: something that fires on its own during tasks (types in js/skills.js)
//   learn   Chronicle line written when the skill is learned
//   fire    Chronicle line written each time a signature move fires
//   later   an honest note for a part of the skill that waits on a later build
// Voice: a dry chronicler. No exclamation marks.
export const FIGHTER = {
  class: 'fighter',
  branches: [
    {
      id: 'vanguard', kind: 'might', name: 'Vanguard',
      blurb: 'Hits first and hardest. Monsters fall faster, and bosses are met at a run.',
      chosen: '{name} is entered in the tavern book as a Vanguard. The column for "approach" reads "directly".',
      skills: [
        { id: 'f_footwork', name: 'Drilled Footwork', text: 'Monster tasks finish 10% faster.', fx: { speedRoam: 0.1 },
          learn: 'Learned Drilled Footwork. The hero now arrives at trouble slightly ahead of schedule.' },
        { id: 'f_weapon_focus', name: 'Weapon Focus', text: '+1 on rolls against monsters while roaming.', fx: { rollRoam: 1 },
          learn: 'Learned Weapon Focus. The sword has been asked to concentrate, and is trying.' },
        { id: 'f_cleave', name: 'Cleave', text: 'While roaming, a 10% chance the monster is dealt with before it can object: full reward, no roll, no damage.',
          sig: { type: 'autoWin', source: 'roam', chance: 0.1 },
          learn: 'Learned Cleave. A fence post was consulted and has not been the same since.',
          fire: 'Cleave. One swing settles the matter, and most of a hedge.' },

        { id: 'f_press', name: 'Press the Advantage', text: 'A critical pays double instead of one and a half times.', fx: { critReward: 0.5 },
          learn: 'Learned Press the Advantage. Good fortune will now be followed up in writing.' },
        { id: 'f_heavy_hand', name: 'Heavy Hand', text: '+1 on rolls in dungeon rooms.', fx: { rollDelve: 1 },
          learn: 'Learned Heavy Hand. Doors are advised to open when asked.' },
        { id: 'f_second_wind', name: 'Second Wind', text: 'Once per dungeon run, when below half hit points, recovers 30% of them.',
          sig: { type: 'secondWind', scope: 'run', below: 0.5, heal: 0.3 },
          learn: 'Learned Second Wind. It is kept in reserve, behind the first one.',
          fire: 'Second Wind. {name} stops, breathes out, and carries on as if nothing had been said.' },

        { id: 'f_rhythm', name: 'Battle Rhythm', text: 'Dungeon rooms finish 10% faster.', fx: { speedDelve: 0.1 },
          learn: 'Learned Battle Rhythm. It is mostly counting, done under the breath.' },
        { id: 'f_giant_slayer', name: 'Giant Slayer', text: '+1 on rolls against dungeon bosses.', fx: { rollBoss: 1 },
          learn: 'Learned Giant Slayer. The title is aspirational and has been noted as such.' },
        { id: 'f_charge', name: 'Opening Charge', text: 'Opens every boss fight with a free blow.',
          sig: { type: 'freeBossHit' },
          learn: 'Learned Opening Charge. Introductions will be kept short from now on.',
          fire: 'Opening Charge. {name} arrives before the speech does. One blow is landed on account.' },

        { id: 'f_veteran', name: "Veteran's Eye", text: '+1 on every roll.', fx: { roll: 1 },
          learn: "Learned Veteran's Eye. The hero has seen this before, or something enough like it." },
        { id: 'f_relentless', name: 'Relentless', text: 'A failed roll pays 60% of the reward instead of 50%.', fx: { missReward: 0.1 },
          learn: 'Learned Relentless. Failure is now billed as partial completion.' },
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
        { id: 'f_thick_skin', name: 'Thick Skin', text: '+8% maximum hit points.', fx: { hp: 0.08 },
          learn: 'Learned Thick Skin. Remarks and arrows are both expected to bounce.' },
        { id: 'f_shield_drill', name: 'Shield Discipline', text: 'Monsters met while roaming deal 15% less damage.', fx: { drRoam: 0.15 },
          learn: 'Learned Shield Discipline. The shield is now held where the monster is, not where it was.' },
        { id: 'f_brace', name: 'Brace', text: 'A 20% chance that a failed roll costs no hit points.',
          sig: { type: 'negate', on: 'fail', chance: 0.2 },
          learn: 'Learned Brace. It looks like flinching and is filed under technique.',
          fire: 'Brace. The blow arrives and finds a shield already waiting for it.' },

        { id: 'f_field_dressing', name: 'Field Dressing', text: 'Resting between tasks heals 30% more, and a failed roll pays 60% of the reward instead of 50%.', fx: { rest: 0.3, missReward: 0.1 },
          learn: 'Learned Field Dressing. The bandages are clean, which is new.' },
        { id: 'f_armour_drill', name: 'Armour Drill', text: 'Dungeon rooms deal 10% less damage.', fx: { drDelve: 0.1 },
          learn: 'Learned Armour Drill. Every buckle has been done up, including the ones at the back.' },
        { id: 'f_hold_the_line', name: 'Hold the Line', text: 'Once per dungeon run, drops to 1 hit point instead of 0.',
          sig: { type: 'cheatDeath', scope: 'run' },
          learn: 'Learned Hold the Line. The line is wherever the hero happens to be standing.',
          fire: 'Hold the Line. By all accounts {name} should be lying down. {name} disagrees, with 1 HP in support.' },

        { id: 'f_iron_constitution', name: 'Iron Constitution', text: 'Knockout recovery is 20% shorter.', fx: { recovery: 0.2 },
          learn: 'Learned Iron Constitution. The cleric will have less time to make the usual points.' },
        { id: 'f_quartermaster', name: 'Quartermaster', text: 'Carries one more healing potion into every dungeon run.', fx: { potions: 1 },
          learn: 'Learned Quartermaster. A third potion fits if the lunch is left behind.' },
        { id: 'f_catch_breath', name: 'Catch Breath', text: 'Outside dungeons, when below 35% hit points after a task, recovers 25% of them. Once every 20 minutes.',
          sig: { type: 'shortRest', below: 0.35, heal: 0.25, seconds: 1200 },
          learn: 'Learned Catch Breath. Sitting on a wall for a minute is now a recognised manoeuvre.',
          fire: 'Catch Breath. {name} sits on a milestone until the road stops moving.' },

        { id: 'f_stand_fast', name: 'Stand Fast', text: 'Dungeon bosses deal 15% less damage.', fx: { drBoss: 0.15 },
          learn: 'Learned Stand Fast. The larger the opponent, the less the hero intends to move.' },
        { id: 'f_old_scars', name: 'Old Scars', text: '+2 maximum hit points per level.', fx: { hpLevel: 2 },
          learn: 'Learned Old Scars. Each one is a lesson, and several are the same lesson.' },
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
        { id: 'f_haggler', name: 'Haggler', text: '+10% gold from every source.', fx: { gold: 0.1 },
          learn: 'Learned Haggler. The first offer is now treated as a greeting.' },
        { id: 'f_contract', name: 'Read the Contract', text: '+15% gold from quests.', fx: { goldQuest: 0.15 },
          learn: 'Learned Read the Contract. Including the back, where the money is.' },
        { id: 'f_invoice', name: 'Itemised Invoice', text: 'A finished quest has a 25% chance of paying double gold.',
          sig: { type: 'windfall', chance: 0.25 },
          learn: 'Learned Itemised Invoice. Sundries will be listed separately from now on.',
          fire: 'Itemised Invoice. The client pays for sundries, mileage, and a line that reads only "peril".' },

        { id: 'f_campaigner', name: 'Campaigner', text: '+4% XP from every source.', fx: { xp: 0.04 },
          learn: 'Learned Campaigner. Every job is now also practice for the next one.' },
        { id: 'f_bulk', name: 'Bulk Discount', text: 'Healing potions cost 25% less.', fx: { potionPrice: 0.25 },
          learn: 'Learned Bulk Discount. The apothecary has agreed to it and is not sure when.' },
        { id: 'f_hazard_pay', name: 'Hazard Pay', text: 'A beaten dungeon boss pays a second purse and drops a second piece of gear.',
          sig: { type: 'bossPurse', gold: 1, items: 1 },
          learn: 'Learned Hazard Pay. Dungeon bosses have been reclassified as a workplace hazard.',
          fire: 'Hazard Pay. A second purse is collected, and something off the wall with it, on the grounds that nobody mentioned the size of it.' },

        { id: 'f_traveller', name: 'Seasoned Traveller', text: 'Travel takes 30% less time.', fx: { travel: 0.3 },
          learn: 'Learned Seasoned Traveller. The cart in front will be passed, politely, on the verge.' },
        { id: 'f_war_stories', name: 'War Stories', text: '+10% XP from quests.', fx: { xpQuest: 0.1 },
          learn: 'Learned War Stories. Each job improves in the telling, and the hero with it.' },
        { id: 'f_finders', name: "Finders' Rights", text: 'A critical pays three times the gold.',
          sig: { type: 'onCrit', gold: 2 },
          learn: "Learned Finders' Rights. A clause has been found that covers whatever is lying about afterwards.",
          fire: "Finders' Rights. Everything not nailed down is declared salvage, and one thing that was." },

        { id: 'f_reputation', name: 'Reputation', text: 'Quest steps finish 10% faster.', fx: { speedQuest: 0.1 },
          learn: 'Learned Reputation. People now start explaining the job before the hero has sat down.' },
        { id: 'f_retainer', name: 'Retainer', text: '+5% XP from every source.', fx: { xp: 0.05 },
          learn: 'Learned Retainer. The hero is paid to be available, and learns something while waiting.' },
        { id: 'f_name_your_price', name: 'Name Your Price', text: 'Capstone. The first roll of every quest is made with advantage, and quests pay 10% more XP.',
          fx: { xpQuest: 0.1 }, sig: { type: 'advantage', scope: 'quest' },
          learn: 'Learned Name Your Price. The price has been named. It was accepted too quickly, and has been raised.',
          fire: 'Name Your Price. Terms are agreed before the client has finished describing the problem.' },
      ],
    },
  ],
};
