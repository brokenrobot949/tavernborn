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
- `js/rules.js`, `tasks.js`, `hero.js`, `skills.js`, `loot.js` the systems `sim.js` calls. `tasks.js` also holds
  the player's standing orders (`setFocus`, `orderTravel`, `payCleric`)
- `js/sprite.js` LPC layer compositing and animation
- `js/ui/` one module per tab, plus `create.js` (creation), `away.js` (the summary card), `story.js` (chapter
  cards), `dom.js` (helpers);
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
- Current phase: 3 (Activities and map), built and waiting on Rob's phone test. Phases 1 and 2 are also
  still in his phone test. Phase 0 is approved.
- Built in Phase 3: real monsters for all eight regions (51 in `data/monsters.js`), 48 story quests and
  generated odd jobs (`data/quests.js`), eight dungeons with bosses (`data/dungeons.js`), the eight chapter
  cards of The Dragon's Due (`data/story.js`), the drawn world map with travel and the Roam / Quest / Delve
  switch (Map tab), the tavern cleric's paid knockout skip (Hero and Tavern tabs), and the three race quirks
  that were waiting (Dwarf, Half-Orc, Dragonborn).
- How it works: `js/tasks.js` has eight task kinds (roam, quest, delve, boss, camp, travel, return, tavern).
  The player's only orders are `setFocus`, `orderTravel`, and `payCleric` in that file; the UI and the
  simulator call the same three. An order takes effect when the current task ends. A region opens when the
  dungeon before it is cleared once. A dungeon run is 8 to 15 rooms with no healing between them (two
  potions per run), then a boss fought over several rolls. A knockout loses the run or the quest step and
  nothing else; three in a row in one dungeon switches the hero to Roam (the confidence safeguard).
- Measured, `node tools/simulate.mjs`, 500 heroes, real content, no stand-ins, median (target): L2 10 min
  (10 min), L3 65 min (1 h), L4 3.2 h (3 h), L5 6.5 h (6.5 h), L6 11.6 h (11 h), L8 30.2 h (30 h), L10 3.0 days
  (3), L12 5.9 days (6), L15 12.8 days (13), L18 22.7 days (23), L20 29.5 days (30). Middle 80% reach level 20
  between 28.2 and 30.7 days. All 500 clear The Hoard of Vexaldrith (median day 29.8). A roam-only player
  also lands at 29.5 days. Staying in Mugwick Vale no longer pays: about a quarter reach level 20 in 60 days.
- Danger after the rebalance: 11.8 knockouts per hero per month (0.7 roaming, 2.8 on quests, 2.4 in dungeon
  rooms, 5.9 to bosses), about one lost run per dungeon before its first clear. By class: Fighter 6, Rogue 11,
  Wizard 15, Cleric 15 (was 0.6 to 55). No cliff: at 1.5x damage every hero still finishes (32.6 days, 89
  knockouts); at 2x all reach level 20 (38.8 days) and about half clear the last dungeon.
- What changed in the rules (`js/rules.js`): healing after a Roam or Quest task is 5% of max HP plus 25% of
  what is missing (was a flat 15%); a foe above the hero's level adds +1 DC and +25% damage per level and pays
  +12% XP per level; one below pays 6% less per level. `XP_PER_SECOND_LATE` went from 0.48 to 0.51. Wizards
  have a 15% ward (`data/classes.js`) to make up for the d6 hit die. Dungeon room and boss damage in
  `data/dungeons.js` was tuned with the simulator; rerun it after touching any of these.
- Saves: version 2. `migrate` in `js/state.js` fills the new hero fields and moves a version 1 hero's XP to
  the same place within their level on the new curve. No hero loses a level.
- `node tools/check-sim.mjs` proves the sim: the Phase 1 checks plus quests, Feats, dungeon clears, travel,
  what a knockout costs, the confidence safeguard, the cleric's fee, the three quirks, old saves, and one hero
  clearing all eight dungeons. Run it after any change to `js/sim.js`, `tasks.js`, `rules.js`, `hero.js`,
  `state.js`, or the data files.
- Spec departures to raise with Rob: the Dwarf grudge is +2 on the roll, not bonus damage (a task is one roll
  and the hero deals no damage number). The Wizard ward is not in the design doc. Chapter cards do not yet
  change for later heroes ("Another one."); that needs the roster (Phase 6).
- Placeholders shown honestly in the UI: quests do not pay the guaranteed gear piece yet (Phase 5), Skills
  only banks points (Feats add to them), Gear shows the Common starting kit, the Tavern lists upgrades,
  roster, and retirement as still to come. The scene backdrop is the same field everywhere except dungeons
  (dark) and the tavern; region backdrops are Phase 5. The knockout "fall" animation is not played yet.
- `index.html` is the game. The Phase 0 sprite proof is `sprite-lab.html`; the simulator is
  `tools/simulate.html` (both linked from Tavern > Workshop).
- Pacing lives in `js/rules.js`: `LEVEL_TARGET_HOURS` times `XP_PER_SECOND` (0.5) up to level 6, and times
  `XP_PER_SECOND_LATE` (0.51) after it. Levels 3 to 6 were moved later than the design doc's table after Rob's
  play test (they came too fast); do not move them earlier.
- "Create a new hero" replaces the current hero; the roster of three is Phase 6. No in-game credits screen yet (Phase 7).
- `sprite.js` draws the front of every shield above hats (LPC puts it under them, which clipped wide brims).
- Not baked yet: level milestone layers (cape clip), the other 18 hair colours.
- Local preview: `.claude/launch.json` has three servers (ports 8771, 8773, 8779) so sessions do not collide.
