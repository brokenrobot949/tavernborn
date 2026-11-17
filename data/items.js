// Gear looks: class -> slot -> five rarity tiers -> sprite layers.
// Source: the "Sprite looks" tab of the design doc.
//
// Phase 0 swaps (the same list is recorded in that tab):
//  - Muscular body: no LPC torso or leg armour has a muscular sheet, so it wears the male sheet.
//  - Wizard robe, mage belt, and Rogue buckles are female-only art; male bodies draw the female sheet.
//    A long-sleeved shirt and trousers were added under every robe so no skin shows through.
//  - Rogue vest is male-only art; female bodies draw the male sheet.
//  - Cleric Common tunic (female-only) -> long-sleeved shirt in white.
//  - Weapons that ship in one fixed look cannot be recoloured, so tiers use different weapons:
//    Rogue dagger, scimitar, rapier, katana, saber. Cleric cane, mace, mace, flail, war axe.
//    Fighter longsword and longsword_alt keep their own colours.
//  - Cleric Common weapon: the club has art only while swinging and the cane only while walking,
//    so the hero carries the cane and swings the club. The cane art is drawn in the shield hand,
//    so it is mirrored into the weapon hand at bake time.
//  - Closed helmets hide the hair layer.
// Phase 5 swap: the Cleric's Uncommon and Rare weapons were the same mace. The Uncommon one is
// now that mace recoloured to bronze by brightness at bake time (`force` with `ramp`), so every tier of
// every visible slot is a different look.
// A layer ref is { def, color, ... }:
//   def     LPC sheet definition file name, without .json
//   color   a recolor name from the definition's palettes, or one of its variants
//   color2  second recolor slot, for the few items that have one
//   base    name the colour the art actually ships in, where the definition gets it wrong
//   hideHair  skip the hair layer while this is worn
//   mirror  flip a walk-only item into the other hand (its other animations are dropped)
//   standIn draw the standing walk frame for an animation the art lacks, e.g. ['thrust'] (the robe has no
//           thrust art, so without it the robe vanishes whenever a Wizard attacks)
//   bodies  draw another body type's sheet where the item has none, e.g. { muscular: 'male' }
//   force   recolour an item that ships in one fixed look, by material (with `variant`, the look to start
//           from; `ramp: true` maps by brightness where the art is not drawn in that material's palette)
// After editing, rerun: node tools/sprites.mjs bake

export const SLOTS = [
  { id: 'body', name: 'Body' },
  { id: 'head', name: 'Head' },
  { id: 'hands', name: 'Hands' },
  { id: 'feet', name: 'Feet' },
  { id: 'weapon', name: 'Weapon' },
  { id: 'offhand', name: 'Off-hand' },
  { id: 'cloak', name: 'Cloak' },
];

export const TIERS = [
  { id: 'common', name: 'Common', color: '#9d9d9d' },
  { id: 'uncommon', name: 'Uncommon', color: '#1eff00' },
  { id: 'rare', name: 'Rare', color: '#0070dd' },
  { id: 'veryrare', name: 'Very Rare', color: '#a335ee' },
  { id: 'legendary', name: 'Legendary', color: '#ff8000' },
];

const L = (def, color, more) => ({ def, color, ...more });

// Almost no LPC torso or leg armour has a muscular sheet, so the muscular body wears the male one.
export const BODY_FALLBACK = { muscular: 'male' };
// Closed helmets and the cloth hood: hair is not drawn, or it pokes through.
const HIDE_HAIR = { hideHair: true };
const FEMALE_ONLY = { bodies: { male: 'female', muscular: 'female' } };
// The robe and the mage belt have no thrust art, and Wizards attack with thrust.
const ROBE = { ...FEMALE_ONLY, standIn: ['thrust'] };

const heater = (kind, wood, trim, paint, pattern) => [
  L(`shield_heater${kind}_wood`, wood),
  L(`shield_heater${kind}_paint`, paint),
  ...(pattern ? [L(`shield_heater${kind}_pattern_${pattern[0]}`, pattern[1])] : []),
  L(`shield_heater${kind}_trim`, trim),
];

export const GEAR = {
  fighter: {
    body: [
      [L('torso_clothes_longsleeve', 'brown'), L('torso_armour_leather', 'leather'), L('legs_pants', 'walnut')],
      [L('torso_chainmail', 'iron'), L('legs_pants', 'charcoal')],
      [L('torso_armour_plate', 'steel'), L('legs_armour', 'steel')],
      [L('torso_armour_plate', 'silver'), L('shoulders_pauldrons', 'silver'), L('legs_armour', 'silver')],
      [L('torso_armour_plate', 'gold'), L('shoulders_pauldrons', 'gold'), L('legs_armour', 'gold')],
    ],
    head: [
      [L('hat_cap_leather', 'leather')],
      [L('hat_helmet_kettle', 'iron')],
      [L('hat_helmet_barbuta', 'steel', HIDE_HAIR)],
      [L('hat_helmet_armet', 'silver', HIDE_HAIR)],
      [L('hat_helmet_armet', 'gold', HIDE_HAIR), L('hat_accessory_plumage', 'red')],
    ],
    hands: [
      [L('arms_bracers', 'leather')],
      [L('arms_gloves', 'brown')],
      [L('arms_armour', 'steel')],
      [L('arms_armour', 'silver')],
      [L('arms_armour', 'gold')],
    ],
    feet: [
      [L('feet_boots_basic', 'brown')],
      [L('feet_boots_rim', 'walnut')],
      [L('feet_armour', 'steel')],
      [L('feet_armour', 'silver')],
      [L('feet_armour', 'gold')],
    ],
    weapon: [
      [L('weapon_sword_arming', 'iron')],
      [L('weapon_sword_arming', 'steel')],
      [L('weapon_sword_longsword', 'longsword')],
      [L('weapon_sword_longsword_alt', 'longsword_alt')],
      [L('weapon_sword_glowsword', 'blue')],
    ],
    offhand: [
      [L('shield_round', 'brown')],
      [L('shield_kite', 'kite gray')],
      heater('_revised', 'oak', 'steel', 'maroon'),
      [L('shield_spartan', 'spartan')],
      [L('shield_two_engrailed', 'two_engrailed'), L('shield_two_engrailed_trim', 'two_engrailed_trim')],
    ],
    cloak: [
      [L('cape_tattered', 'maroon')],
      [L('cape_solid', 'maroon')],
      [L('cape_solid', 'red')],
      [L('cape_solid', 'red'), L('cape_trim', 'silver')],
      [L('cape_solid', 'white'), L('cape_trim', 'gold')],
    ],
  },

  wizard: {
    body: [
      [L('torso_clothes_longsleeve', 'brown'), L('legs_pants', 'brown'), L('torso_clothes_robe', 'brown', ROBE), L('belt_robe', 'white')],
      [L('torso_clothes_longsleeve', 'charcoal'), L('legs_pants', 'charcoal'), L('torso_clothes_robe', 'dark gray', ROBE), L('belt_sash', 'navy')],
      [L('torso_clothes_longsleeve', 'blue'), L('legs_pants', 'navy'), L('torso_clothes_robe', 'blue', ROBE), L('belt_mage', 'gold', ROBE)],
      [L('torso_clothes_longsleeve', 'purple'), L('legs_pants', 'charcoal'), L('torso_clothes_robe', 'purple', ROBE), L('shoulders_mantal', 'navy')],
      [L('torso_clothes_longsleeve', 'white'), L('legs_pants', 'gray'), L('torso_clothes_robe', 'white', ROBE), L('shoulders_mantal', 'purple')],
    ],
    head: [
      [L('hat_hood_cloth', 'brown', HIDE_HAIR)],
      [L('hat_magic_wizard', 'navy')],
      [L('hat_magic_large', 'brown')],
      [L('hat_magic_celestial', 'purple')],
      [L('hat_magic_celestial_moon', 'white')],
    ],
    hands: [
      [L('wrists_cuffs', 'tan')],
      [L('wrists_cuffs', 'blue')],
      [L('arms_gloves', 'navy')],
      [L('arms_gloves', 'purple')],
      [L('arms_gloves', 'white'), L('arms_hands_ring_stud', 'gold')],
    ],
    feet: [
      [L('feet_slippers', 'brown')],
      [L('feet_shoes_basic', 'charcoal')],
      [L('feet_shoes_revised', 'navy')],
      [L('feet_boots_fold', 'black')],
      [L('feet_boots_revised', 'white')],
    ],
    weapon: [
      [L('weapon_magic_simple', 'simple')],
      [L('weapon_magic_gnarled', 'medium')],
      [L('weapon_magic_loop', 'dark')],
      [L('weapon_magic_diamond', 'silver')],
      [L('weapon_magic_crystal', 'purple')],
    ],
    offhand: [
      [L('neck_charm_oval', 'bronze')],
      [L('neck_amulet_star', 'silver_blue')],
      [L('neck_gem_round', 'blue')],
      [L('neck_gem_emerald', 'green')],
      [L('neck_gem_trilliant', 'purple')],
    ],
    cloak: [
      [L('cape_tattered', 'slate')],
      [L('cape_solid', 'navy')],
      [L('cape_solid', 'blue')],
      [L('cape_solid', 'purple'), L('cape_trim', 'silver')],
      [L('cape_solid', 'white'), L('cape_trim', 'gold')],
    ],
  },

  rogue: {
    body: [
      [L('torso_clothes_longsleeve', 'charcoal'), L('torso_clothes_vest', 'brown', { bodies: { female: 'male', muscular: 'male' } }), L('legs_pants', 'brown')],
      [L('torso_armour_leather', 'leather'), L('legs_pants', 'charcoal')],
      [L('torso_armour_leather', 'walnut'), L('legs_leggings', 'charcoal')],
      [L('torso_armour_leather', 'black'), L('bauldron', 'leather'), L('legs_leggings', 'black')],
      [L('torso_armour_leather', 'black'), L('bauldron', 'leather'), L('neck_scarf', 'maroon'), L('legs_leggings', 'black')],
    ],
    head: [
      [L('hat_bandana', 'charcoal')],
      [L('hat_headband_kerchief', 'maroon', { base: 'brown' })],
      [L('hat_hood_cloth', 'charcoal', HIDE_HAIR)],
      [L('hat_hood_cloth', 'black', HIDE_HAIR), L('facial_mask_plain', 'black')],
      [L('hat_cap_cavalier', 'black'), L('facial_mask_plain', 'black')],
    ],
    hands: [
      [L('wrists_cuffs', 'charcoal')],
      [L('arms_bracers', 'leather')],
      [L('arms_gloves', 'brown')],
      [L('arms_gloves', 'black')],
      [L('arms_gloves', 'black'), L('arms_hands_ring_stud', 'gold')],
    ],
    feet: [
      [L('feet_shoes_basic', 'brown')],
      [L('feet_boots_basic', 'brown')],
      [L('feet_boots_fold', 'brown')],
      [L('feet_boots_fold', 'black')],
      [L('feet_boots_rim', 'black')],
    ],
    weapon: [
      [L('weapon_sword_dagger', 'dagger')],
      [L('weapon_sword_scimitar', 'scimitar')],
      [L('weapon_sword_rapier', 'rapier')],
      [L('weapon_sword_katana', 'katana')],
      [L('weapon_sword_saber', 'saber')],
    ],
    offhand: [
      [L('belt_leather', 'leather')],
      [L('belt_leather2', 'leather')],
      [L('belt_loose', 'walnut')],
      [L('belt_double', 'charcoal')],
      [L('belt_double', 'charcoal'), L('buckles', 'gold', FEMALE_ONLY)],
    ],
    cloak: [
      [L('cape_tattered', 'charcoal')],
      [L('cape_solid', 'charcoal')],
      [L('cape_solid', 'forest')],
      [L('cape_solid', 'black'), L('cape_trim', 'silver')],
      [L('cape_solid', 'maroon'), L('cape_trim', 'gold')],
    ],
  },

  cleric: {
    body: [
      [L('torso_clothes_longsleeve', 'white'), L('belt_robe', 'white'), L('legs_pants', 'tan')],
      [L('torso_chainmail', 'iron'), L('torso_jacket_tabard', 'white'), L('neck_amulet_cross', 'silver_blue'), L('legs_pants', 'gray')],
      [L('torso_chainmail', 'steel'), L('torso_jacket_tabard', 'sky'), L('neck_amulet_cross', 'silver_blue'), L('legs_pants', 'slate')],
      [L('torso_chainmail', 'silver'), L('torso_jacket_tabard', 'blue'), L('shoulders_mantal', 'white'), L('neck_amulet_cross', 'gold_blue'), L('legs_armour', 'silver')],
      [L('torso_chainmail', 'gold'), L('torso_jacket_tabard', 'white'), L('shoulders_mantal', 'white'), L('neck_amulet_cross', 'gold_blue'), L('legs_armour', 'gold')],
    ],
    head: [
      [L('hat_headband_thick', 'white')],
      [L('hat_helmet_mail', 'iron', HIDE_HAIR)],
      [L('hat_helmet_spangenhelm', 'steel', HIDE_HAIR)],
      [L('hat_helmet_bascinet', 'silver', HIDE_HAIR)],
      [L('hat_formal_tiara', 'tiara_gold')],
    ],
    hands: [
      [L('wrists_cuffs', 'white')],
      [L('arms_bracers', 'leather')],
      [L('arms_gloves', 'white')],
      [L('arms_armour', 'silver')],
      [L('arms_armour', 'gold')],
    ],
    feet: [
      [L('feet_sandals', 'brown')],
      [L('feet_boots_basic', 'brown')],
      [L('feet_boots_rim', 'gray')],
      [L('feet_boots_revised', 'white')],
      [L('feet_armour', 'gold')],
    ],
    weapon: [
      [L('weapon_polearm_cane', 'cane', { mirror: true }), L('weapon_blunt_club', 'club')],
      [L('weapon_blunt_mace', 'bronze', { force: 'metal', variant: 'mace', ramp: true })],
      [L('weapon_blunt_mace', 'mace')],
      [L('weapon_blunt_flail', 'flail')],
      [L('weapon_blunt_waraxe', 'waraxe')],
    ],
    offhand: [
      [L('shield_round', 'brown')],
      heater('', 'oak', 'iron', 'white', ['cross', 'red']),
      [L('shield_kite', 'kite blue gray')],
      [L('shield_crusader', 'crusader')],
      [L('shield_plus', 'plus')],
    ],
    cloak: [
      [L('cape_tattered', 'tan')],
      [L('cape_solid', 'white')],
      [L('cape_solid', 'sky')],
      [L('cape_solid', 'blue'), L('cape_trim', 'silver')],
      [L('cape_solid', 'white'), L('cape_trim', 'gold')],
    ],
  },
  // The Barbarian carries no shield: the off-hand is a string of trophies at the neck. The Uncommon and
  // Legendary axes are the war axe recoloured by brightness, as the Cleric's bronze mace is.
  barbarian: {
    body: [
      [L('torso_clothes_sleeveless', 'brown'), L('legs_pants', 'walnut')],
      [L('torso_clothes_sleeveless', 'leather'), L('bauldron', 'walnut'), L('legs_pants', 'walnut')],
      [L('torso_armour_leather', 'walnut'), L('shoulders_legion', 'iron'), L('legs_pants', 'charcoal')],
      [L('torso_armour_legion', 'steel'), L('shoulders_legion', 'steel'), L('legs_skirts_legion', 'maroon'), L('legs_pants', 'charcoal')],
      [L('torso_armour_legion', 'gold'), L('shoulders_pauldrons', 'gold'), L('legs_skirts_legion', 'red'), L('legs_pants', 'black')],
    ],
    head: [
      [L('hat_headband_tied', 'maroon')],
      [L('hat_helmet_barbarian', 'iron', { color2: 'brown' })],
      [L('hat_helmet_barbarian_nasal', 'steel', { color2: 'brown' })],
      [L('hat_helmet_barbarian_viking', 'silver', { color2: 'maroon' })],
      [L('hat_helmet_horned', 'gold')],
    ],
    hands: [
      [L('wrists_cuffs', 'leather')],
      [L('arms_bracers', 'leather')],
      [L('arms_bracers', 'iron')],
      [L('arms_bracers', 'silver')],
      [L('arms_bracers', 'gold')],
    ],
    feet: [
      [L('feet_sandals', 'leather')],
      [L('feet_boots_basic', 'walnut')],
      [L('feet_boots_fold', 'walnut')],
      [L('feet_boots_rim', 'charcoal'), L('feet_plate_toe', 'steel')],
      [L('feet_boots_rim', 'black'), L('feet_plate_toe_thick', 'gold')],
    ],
    weapon: [
      [L('weapon_polearm_scythe', 'scythe')],
      [L('weapon_blunt_waraxe', 'bronze', { force: 'metal', variant: 'waraxe', ramp: true })],
      [L('weapon_blunt_waraxe', 'waraxe')],
      [L('weapon_polearm_halberd', 'halberd')],
      [L('weapon_blunt_waraxe', 'gold', { force: 'metal', variant: 'waraxe', ramp: true })],
    ],
    offhand: [
      [L('neck_necklace_simple', 'iron')],
      [L('neck_necklace_beaded_small', 'bronze')],
      [L('neck_necklace_beaded_large', 'bronze')],
      [L('neck_necklace_chain', 'silver')],
      [L('neck_necklace_beaded_large', 'gold')],
    ],
    cloak: [
      [L('cape_tattered', 'walnut')],
      [L('cape_solid', 'walnut')],
      [L('cape_solid', 'brown')],
      [L('cape_solid', 'charcoal'), L('cape_trim', 'silver')],
      [L('cape_solid', 'maroon'), L('cape_trim', 'gold')],
    ],
  },

  // The Ranger attacks with the shoot animation: the bow, and an arrow that is drawn only while shooting.
  // The off-hand is the quiver and what it hangs from.
  ranger: {
    body: [
      [L('torso_clothes_longsleeve', 'forest'), L('legs_pants', 'brown')],
      [L('torso_clothes_longsleeve', 'forest'), L('torso_armour_leather', 'leather'), L('legs_pants', 'walnut')],
      [L('torso_clothes_longsleeve', 'tan'), L('torso_armour_leather', 'forest'), L('legs_leggings', 'walnut')],
      [L('torso_clothes_longsleeve', 'charcoal'), L('torso_armour_leather', 'forest'), L('bauldron', 'walnut'), L('legs_leggings', 'charcoal')],
      [L('torso_clothes_longsleeve', 'white'), L('torso_armour_leather', 'green', { color2: 'gold' }), L('shoulders_mantal', 'forest'), L('legs_leggings', 'forest')],
    ],
    head: [
      [L('hat_cap_leather', 'forest')],
      [L('hat_cap_leather', 'forest'), L('hat_cap_leather_feather', 'white')],
      [L('hat_hood_cloth', 'forest', HIDE_HAIR)],
      [L('hat_cap_bonnie', 'forest'), L('hat_cap_bonnie_feather', 'white')],
      [L('hat_hood_cloth', 'green', HIDE_HAIR), L('facial_mask_plain', 'forest')],
    ],
    hands: [
      [L('wrists_cuffs', 'forest')],
      [L('arms_bracers', 'leather')],
      [L('arms_gloves', 'brown')],
      [L('arms_gloves', 'forest')],
      [L('arms_gloves', 'green'), L('arms_bracers', 'gold')],
    ],
    feet: [
      [L('feet_shoes_basic', 'brown')],
      [L('feet_boots_basic', 'brown')],
      [L('feet_boots_fold', 'walnut')],
      [L('feet_boots_revised', 'forest')],
      [L('feet_boots_rim', 'forest')],
    ],
    weapon: [
      [L('weapon_ranged_bow_normal', 'light'), L('weapon_ranged_bow_arrow', 'arrow')],
      [L('weapon_ranged_bow_normal', 'dark'), L('weapon_ranged_bow_arrow', 'arrow')],
      [L('weapon_ranged_bow_recurve', 'medium'), L('weapon_ranged_bow_arrow', 'arrow')],
      [L('weapon_ranged_bow_great', 'silver'), L('weapon_ranged_bow_arrow', 'arrow')],
      [L('weapon_ranged_bow_great', 'gold'), L('weapon_ranged_bow_arrow', 'arrow')],
    ],
    offhand: [
      [L('quiver', 'quiver')],
      [L('quiver', 'quiver'), L('belt_leather', 'leather')],
      [L('quiver', 'quiver'), L('belt_loose', 'walnut')],
      [L('quiver', 'quiver'), L('belt_double', 'charcoal')],
      [L('quiver', 'quiver'), L('belt_double', 'walnut'), L('backpack_straps', 'forest')],
    ],
    cloak: [
      [L('cape_tattered', 'forest')],
      [L('cape_solid', 'forest')],
      [L('cape_solid', 'green')],
      [L('cape_solid', 'forest'), L('cape_trim', 'silver')],
      [L('cape_solid', 'green'), L('cape_trim', 'gold')],
    ],
  },
};

// Level 10 milestone: a class emblem, worn as a clip at the neck in the class's cloth and metal.
// (Levels 15 and 20, the wisp and the golden glow, are drawn in code: see js/sprite.js.)
export const EMBLEM_LEVEL = 10;
// The level 15 wisp (in the class colour) and the level 20 glow are drawn in code by js/sprite.js.
export const WISP_LEVEL = 15, GLOW_LEVEL = 20;
export const WISP_COLOR = { fighter: 'rgba(255, 150, 90, 0.85)', wizard: 'rgba(120, 180, 255, 0.85)', rogue: 'rgba(150, 225, 120, 0.85)', cleric: 'rgba(255, 232, 150, 0.85)', barbarian: 'rgba(255, 96, 80, 0.85)', ranger: 'rgba(120, 225, 205, 0.85)' };
export const EMBLEM = {
  fighter: [L('neck_capeclip', 'red', { color2: 'steel' })],
  wizard: [L('neck_capeclip', 'blue', { color2: 'silver' })],
  rogue: [L('neck_capeclip', 'charcoal', { color2: 'brass' })],
  cleric: [L('neck_capeclip', 'white', { color2: 'gold' })],
  barbarian: [L('neck_capeclip', 'maroon', { color2: 'iron' })],
  ranger: [L('neck_capeclip', 'forest', { color2: 'bronze' })],
};
