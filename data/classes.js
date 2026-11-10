// The four classes.
//   attack    which sprite animation shows the weapon attack
//   main      the ability used for the d20 roll at the end of each task
//   hitDie    hit points at level 1; later levels add half of it plus one
//   priority  where the six ability scores go, highest first
export const CLASSES = {
  fighter: { name: 'Fighter', attack: 'slash', main: 'str', hitDie: 10, priority: ['str', 'con', 'dex', 'wis', 'cha', 'int'] },
  wizard: { name: 'Wizard', attack: 'thrust', main: 'int', hitDie: 6, priority: ['int', 'con', 'dex', 'wis', 'cha', 'str'] },
  rogue: { name: 'Rogue', attack: 'slash', main: 'dex', hitDie: 8, priority: ['dex', 'con', 'cha', 'wis', 'int', 'str'] },
  cleric: { name: 'Cleric', attack: 'slash', main: 'wis', hitDie: 8, priority: ['wis', 'con', 'str', 'cha', 'dex', 'int'] },
};
