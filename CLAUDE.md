# Tavernborn: project rules for Claude Code

## What this is
An idle D&D-style fantasy game. One hero adventures on their own from a tavern, The Wobbly
Griffin, and reaches level 20 in about a month of real time. The player guides growth.
Spec: the "Tavernborn — Game Design Document" Claude Doc (tabs: Design, Sprite looks,
Claude Code handoff). The spec wins over guesses.

## Who you're working with
Rob is the game designer and does not write code.
- Explain what you built in plain language.
- End every phase with a short phone test checklist.
- Do not ask Rob to edit code. Terminal commands only when a phase's handoff needs them.

## Hard constraints
- Multi-file static site on GitHub Pages, same pattern as PetCraft, Whimsywild RP5, and Undercut.
- No build step, no CDN, no frameworks. Plain HTML, CSS, and JavaScript ES modules.
- Saves in `localStorage`, with export and import of a save string in Settings.
- Mobile-first layout. Touch targets at least 44 px.
- ES modules do not load from `file://`. Test with `python tools/serve.py` (no caching) or on Pages.
- Node is allowed for dev-only tools in `tools/`. No npm dependencies.

## Architecture
- `js/main.js` boot, tab routing, render loop
- `js/state.js` save, load, migrate, export/import
- `js/sim.js` all game logic in one pure function, `advance(state, seconds)`. It never touches the page.
  The live game calls it once a second; on load it is called with the seconds since `lastSavedAt`.
  Long gaps run task by task, not second by second. Random numbers come from a seeded generator
  stored in the save. It returns a list of events; the Chronicle and "While you were away" use that list.
- `js/rules.js`, `tasks.js`, `hero.js`, `skills.js`, `loot.js` the systems `sim.js` calls
- `js/sprite.js` LPC layer compositing and animation
- `js/ui/` one module per tab, plus `create.js` (creation), `away.js` (the summary card), `dom.js` (helpers);
  `data/` all content; `tools/` dev-only

## Sprites
- Asset list: `data/races.js` and `data/items.js`. A layer is `{ def, color }`, where `def` is an LPC
  sheet definition file name and `color` a recolor or variant it offers.
- `node tools/sprites.mjs check | fetch | bake` (see `tools/README.md`) reads draw order, body-type
  paths, palettes, and credits from the LPC generator repository, recolors once, and writes
  `assets/lpc/`, `data/sprite-layers.js`, `data/credits.js`, and `CREDITS.md`. Never edit those by hand.
- The game does no recoloring. `sprite.js` stacks the baked PNGs in `zPos` order on a small buffer and
  scales up 4x with smoothing off.
- Frames are 64 x 64. Rows are up, left, down, right. Walk uses frames 1 to 8 of 9, slash 0 to 5,
  thrust 0 to 7, hurt 0 to 5 (one row). Some weapons swing on 128 or 192 px "oversize" sheets; the
  tool records those in `CUSTOM_ANIMS`.
- Rerun `bake` whenever layers are added, so the credits stay exact. LPC licenses require credit.
- Adding a body type, animation, or hair colour means editing the lists at the top of
  `data/races.js` or `tools/sprites.mjs` and rebaking.

## Known art limits found in Phase 0
- No LPC torso or leg armour has a muscular sheet; muscular bodies wear the male sheet.
- Robe, mage belt, and buckles are female-only art; the vest is male-only.
- Staffs have no slash art (Wizards attack with thrust). Round and kite shields have no hurt art.
- Dagger, rapier, saber, mace, flail, longsword, and longsword_alt each ship in one fixed look.
- The cane is drawn in the shield hand and only has walk art; the club only has swing art. The Cleric
  Common weapon uses both: the cane, mirrored into the weapon hand at bake time (`mirror: true`), and
  the club for the slash. It is not drawn during thrust or hurt.

## Working rules
- Build phase by phase. Finish a phase's "done when" before starting the next.
- The site must work at the end of every phase. Test at 375 x 812 before saying a phase is done.
- Update the Status section at the end of each phase.

## Build phases
| Phase | Delivers | Done when |
| --- | --- | --- |
| 0. Sprite proof | One hero composited from layers, animated, with gear swapping | Rob approves the look on his phone |
| 1. Core loop | Creation, task bar, d20 rolls, XP, Chronicle, save and offline progress, Roam only, region 1 | A hero levels overnight with the tab closed |
| 2. Simulator | `tools/simulate.html` runs 500 heroes and charts time to each level | Level 20 lands at 28 to 32 days |
| 3. Activities and map | Quests, dungeons, knockouts with the paid skip, all eight regions, world map, story chapter cards | A simulated hero clears Wyrmspire |
| 4. Growth | Skill trees for four classes, subclasses, ability increases, respec | Every skill has an effect and a Chronicle line |
| 5. Gear and visuals | Loot, auto-equip, five looks per slot, milestones, backdrops | The sprite changes at each rarity tier |
| 6. Tavern and legacy | Upgrades, roster, retirement, Hall of Legends, Planar Rifts | A hero can retire and a new one gets the bonus |
| 7. Polish | Writing pass, sound, credits screen, settings | Tone matches the Humor and voice section |

## Status
- Current phase: 2 (Simulator), built and waiting on Rob's phone test. Phase 1 (Core loop) is also still
  in his phone test. Phase 0 is approved.
- Built in Phase 2: `tools/simulate.html` (Tavern > Workshop > "Open the pacing simulator") and
  `node tools/simulate.mjs`. Both run 500 heroes through the real `advance()` and report time to each level
  against the targets, by class and race, with knockouts and potions. Engine: `tools/simulate-core.js`.
- Simulator stand-ins: regions 2 to 8 have no monsters yet, so the simulator scales Mugwick Vale's nine
  monsters up for each (same XP and task length, DC 10 + proficiency, damage scaled with hit points) and
  moves the hero up the road with no travel time. Real monsters added in Phase 3 replace the stand-ins
  automatically; rerun the simulator then, because the result will shift.
- Measured with stand-ins, 500 heroes, median (target): L2 10 min (10 min), L3 59 min (1 h), L4 3.1 h (3 h),
  L5 6.6 h (6.5 h), L6 11.5 h (11 h), L8 29.9 h (30 h), L10 2.9 days (3), L12 5.9 days (6), L15 12.8 days (13),
  L18 22.9 days (23), L20 29.8 days (30). Middle 80% of heroes reach level 20 between 28.5 and 31.2 days.
  Staying in Mugwick Vale alone (the game as built today) gives level 20 at about 25 to 26 days.
- Danger findings (recommendations for Phase 3, nothing changed): the Vale is harmless (0 knockouts). With
  stand-ins a hero averages 17 knockouts in the month, but very unevenly: Fighter 0.6, Rogue 5, Cleric 9,
  Wizard 55. Damage has a cliff: at 1.5x damage a hero averages about 480 knockouts and only half reach level 20 in
  60 days; at 2x it is about 1,000 and nobody does. Healing between tasks is a flat 15% of max HP, so once
  damage outruns it everything collapses. Phase 3 should rebalance damage and healing together.
- `index.html` is the game. The Phase 0 sprite proof moved to `sprite-lab.html` (linked from Tavern > Workshop).
- Built in Phase 1: four-step creation (race, class, ability scores, then name; the preview wears no hat), the task bar, one d20 roll per task, XP and levels 1 to 20, HP,
  automatic potions, a basic knockout (recover at the tavern, no paid skip yet), the Chronicle (last 200
  lines), the Bestiary, autosave, offline progress with the "While you were away" card (after 10 minutes),
  export and import of a save string, Roam in Mugwick Vale with nine monsters.
- `node tools/check-sim.mjs` proves the sim: every race and class levels in 9 hours away, the same seed gives
  the same save, one long call equals second-by-second calls, 30 days resolves in about 0.2 s, and the save
  string round-trips. Run it after any change to `js/sim.js`, `tasks.js`, `rules.js`, `hero.js`, or `state.js`.
- Pacing lives in `js/rules.js`: `LEVEL_TARGET_HOURS` (the design doc's table) times `XP_PER_SECOND` (0.5) up to
  level 6, and times `XP_PER_SECOND_LATE` (0.48, tuned in Phase 2) for the hours after it. Levels 3 to 6 were
  moved later than the design doc's table after Rob's play test (they came too fast); do not move them earlier.
- Placeholders shown honestly in the UI: Map lists regions 2 to 8 as locked, Quest and Delve are disabled,
  Skills only banks points, Gear shows the Common starting kit in every slot (Cloak unlocks at 5, Phase 5).
- Race quirks: Human, Elf, and Goblin work. Dwarf, Half-Orc, and Dragonborn need Phase 3 (grudges, dungeons, bosses).
- "Create a new hero" replaces the current hero; the roster of three is Phase 6. No in-game credits screen yet (Phase 7).
- `sprite.js` draws the front of every shield above hats (LPC puts it under them, which clipped wide brims).
- Not baked yet: level milestone layers (cape clip), the other 18 hair colours.
