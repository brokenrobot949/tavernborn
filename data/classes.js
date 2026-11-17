// The six classes.
//   attack    which sprite animation shows the weapon attack
//   main      the ability used for the d20 roll at the end of each task
//   hitDie    hit points at level 1; later levels add half of it plus one
//   priority  where the six ability scores go, highest first
//   ward      share of every hit turned aside. The Wizard has one: standing wards make up for
//             the smallest hit die, so a Wizard is fragile but not helpless. The Barbarian's is
//             negative: the largest hit die, no thought for defence, and every blow lands 10% harder.
export const CLASSES = {
  fighter: { name: 'Fighter', attack: 'slash', main: 'str', hitDie: 10, priority: ['str', 'con', 'dex', 'wis', 'cha', 'int'] },
  wizard: { name: 'Wizard', attack: 'thrust', main: 'int', hitDie: 6, ward: 0.15, priority: ['int', 'con', 'dex', 'wis', 'cha', 'str'] },
  rogue: { name: 'Rogue', attack: 'slash', main: 'dex', hitDie: 8, priority: ['dex', 'con', 'cha', 'wis', 'int', 'str'] },
  cleric: { name: 'Cleric', attack: 'slash', main: 'wis', hitDie: 8, priority: ['wis', 'con', 'str', 'cha', 'dex', 'int'] },
  barbarian: { name: 'Barbarian', attack: 'slash', main: 'str', hitDie: 12, ward: -0.1, priority: ['str', 'con', 'dex', 'wis', 'cha', 'int'] },
  ranger: { name: 'Ranger', attack: 'shoot', main: 'dex', hitDie: 8, priority: ['dex', 'wis', 'con', 'str', 'int', 'cha'] },
};
