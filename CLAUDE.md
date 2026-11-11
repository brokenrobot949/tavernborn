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
  the player's standing orders (`setFocus`, `orderTravel`, `payCleric`); `skills.js` and `hero.js` hold the
  growth choices (`learnSkill`, `chooseSubclass`, `respec`, `raiseAbility`)
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
- Current phase: 4 (Growth), built and waiting on Rob's phone test. Phases 1 to 3 are also still in his
  phone test. Phase 0 is approved.
- Built in Phase 4: the four class skill trees (144 skills in `data/skills-*.js`), the tree rules, subclass
  choice, and respec (`js/skills.js`), ability score increases (`js/hero.js`), every skill's effect in the
  simulation (`js/tasks.js`), the Skills tab with its badge, the respec panel on the Tavern tab, and a
  simulator player that picks a subclass and spends every point.
- The trees: each class has a Might, a Guard, and a Fortune branch (the three subclasses), twelve skills
  each in four tiers of three. A tier opens after two skills in the tier above. The twelfth skill of a branch
  is its capstone and needs that branch's subclass (chosen from level 3). At most 27 skills. Each branch has
  eight passives and four signature moves (96 and 48 in all, 20 kinds of move).
- How a skill works: `fx` is passive numbers, summed across learned skills (`FX_KEYS` in `js/skills.js`);
  `sig` is a signature move, looked up by type in `js/tasks.js` (`SIG_TYPES`), which fires on its own and
  writes its `fire` line as a `skill` event. Learning writes the skill's `learn` line. `skillMods(hero)` is
  the one door from skills into the rules. Moves with limited uses count in `hero.delve.used` (per run), the
  quest's `used`, the boss fight, or `hero.cooldowns`. To add or change a skill, edit the data file; a new
  kind of effect needs a key or type in `js/skills.js` and its code in `js/tasks.js`.
- The player's growth choices are four functions that only change the save and write a Chronicle line:
  `learnSkill`, `chooseSubclass`, `respec` (`js/skills.js`) and `raiseAbility` (`js/hero.js`). The UI and the
  simulator call the same ones. Skill points (one per level and per Feat) and ability points (two at levels
  4, 8, 12, 16, 19; each is +1 to a score, up to 20) bank until spent. Respec costs `respecPrice(level)` in
  `js/rules.js` (450 gp at level 3, 3,250 at 10, 11,500 at 20), returns every skill point, reopens the
  subclass, and keeps ability scores.
- Measured, `node tools/simulate.mjs`, 500 heroes, every point spent, median (target): L2 10 min (10 min),
  L3 66 min (1 h), L4 3.1 h (3 h), L5 6.3 h (6.5 h), L6 11.0 h (11 h), L8 29.7 h (30 h), L10 3.0 days (3),
  L12 6.0 days (6), L15 13.0 days (13), L18 22.8 days (23), L20 29.7 days (30). Middle 80% reach level 20
  between 28.1 and 32.1 days. All 500 clear The Hoard of Vexaldrith (median day 29.8).
- By subclass, level 20 in days / knockouts in the month: Vanguard 29.6 / 3.1, Bulwark 31.8 / 1.1,
  Sellsword 30.8 / 8.8, Evoker 28.4 / 6.8, Abjurer 30.3 / 1.1, Diviner 28.0 / 6.3, Duelist 29.5 / 5.9,
  Shadow 32.1 / 2.7, Treasure Hunter 30.1 / 8.6, Warpriest 29.5 / 7.1, Lifebinder 32.5 / 1.7,
  Pilgrim 28.7 / 16.4. By class: Fighter 4.3, Wizard 4.7, Rogue 5.7, Cleric 8.4 knockouts. Overall 5.8 per
  hero per month (0.4 roaming, 1.8 on quests, 1.4 in dungeon rooms, 2.3 to bosses), down from 11.8 in
  Phase 3; about 0.2 to 0.6 lost runs per dungeon before its first clear. No cliff: at 1.5x damage
  every hero still reaches level 20 and clears the last dungeon (31.1 days, 33 knockouts).
- What changed in the rules to make room for growth (`js/rules.js`, all tuned with the simulator; rerun it
  after touching any of them):
  - The XP curve is now `XP_RATE`, one rate per level: 0.5 a second up to level 6 (unchanged, so levels 2
    to 6 land where they did), climbing to 0.7 by level 19, because a hero who spends points earns faster.
  - `GROWN`: anything of level 5, 10, or 15 and up has +1, +2, or +3 on its DC, and damage rises 1.5% per
    level above 3. The data files still hold the Phase 3 numbers; the Chronicle prints the DC rolled against.
  - Dungeon room and boss damage in `data/dungeons.js` is up from the third dungeon on (x1.1 rising to
    x1.55 at the last), so a dungeon is still a test for a grown hero.
  - Intelligence gives 1% XP per modifier point (`INT_XP`), down from 2%: at Intelligence 20 the Wizard ran
    a tenth ahead of every other class.
  - The Wizard's 15% ward stays (`data/classes.js`). With it Wizards sit beside the other classes (4.7
    knockouts); Guard skills stack on top of it, capped at 60% of a hit turned aside in all.
- A hero whose points are never spent (`node tools/simulate.mjs 240 unspent`) still reaches level 20, at a
  median of 46 days, and mostly cannot clear the last two dungeons until the points are spent. Banked
  points are never lost, but the later game now expects them to be used.
- Saves: version 3. `migrate` in `js/state.js` fills the growth fields, grants the ability points a hero's
  level has already earned, never leaves fewer skill points than levels and Feats are worth, and moves XP
  to the same place within the level on the new curve (`PAST_CURVES` holds the version 1 and 2 curves). No
  hero loses a level, a skill point, or a Feat.
- `node tools/check-sim.mjs` proves the sim: the Phase 1 and 3 checks, plus for Phase 4 the shape of the
  trees, that each of the 144 skills changes what happens and each of the 48 moves fires with its own line,
  that learning writes each skill's line, tier gating, the capstone rule, the 27 cap, ability increases,
  respec, determinism with skills learned, and a Phase 3 save loading intact. Run it after any change to
  `js/sim.js`, `tasks.js`, `rules.js`, `hero.js`, `skills.js`, `state.js`, or the data files.
- Skills that touch things not built yet have a real effect now and say so on the card ("Not built yet"):
  Hazard Pay and The Big Score pay extra boss purses (the extra item is Phase 5); Sticky Fingers pays a
  second purse (a second item, Phase 5); Eye for Quality pays 25% more boss gold (better rarity odds,
  Phase 5); Locate Object and Treasure Map find a hidden room of gold (a chest, Phase 5). No skill refers
  to tavern upgrades.
- Spec departures to raise with Rob: the three in Phase 3 still stand (the Dwarf grudge is +2 on the roll,
  the Wizard ward, chapter cards do not change for later heroes). New in Phase 4: Fireball turns one failed
  room per run into a clean success (a room is already one task, so "clears a room in one task" needed a
  meaning). Slip Away skips a room only when the hero is below half hit points. Divine Favor gives advantage
  on the first roll after arriving in a region and the first of each dungeon run (once per region ever would
  be eight rolls a month). Healing Word heals between rooms up to three times a run. Second Wind is in the
  Vanguard branch as the doc's table has it. Respec does not refund ability score increases. Strength's
  "faster monster tasks for Fighters" and Dexterity's "critical chance" from the doc's ability table are
  still not built; skills cover both for now (Drilled Footwork, Keen Edge).
- Placeholders shown honestly in the UI: quests do not pay the guaranteed gear piece yet (Phase 5), Gear
  shows the Common starting kit, the Tavern lists upgrades, roster, and retirement as still to come. The
  scene backdrop is the same field everywhere except dungeons (dark) and the tavern; region backdrops are
  Phase 5. The knockout "fall" animation is not played yet.
- `index.html` is the game. The Phase 0 sprite proof is `sprite-lab.html`; the simulator is
  `tools/simulate.html` (both linked from Tavern > Workshop).
- Levels 3 to 6 were moved later than the design doc's table after Rob's play test (they came too fast);
  do not move them earlier. `LEVEL_TARGET_HOURS` in `js/rules.js` holds every target.
- The Skills tab redraws only when something on it changes (a rebuild every second would swallow taps).
  Learn, ability, and respec buttons ask for a second tap.
- "Create a new hero" replaces the current hero; the roster of three is Phase 6. No in-game credits screen yet (Phase 7).
- `sprite.js` draws the front of every shield above hats (LPC puts it under them, which clipped wide brims).
- Not baked yet: level milestone layers (cape clip), the other 18 hair colours.
- Local preview: `.claude/launch.json` has four servers (ports 8771, 8773, 8779, 8784) so sessions do not collide.
