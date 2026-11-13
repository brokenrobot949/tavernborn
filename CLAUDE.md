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
- `js/rules.js`, `tasks.js`, `hero.js`, `skills.js`, `loot.js` the systems `sim.js` calls. `loot.js` makes,
  judges, equips, and sells gear; `loot()` in `tasks.js` is the one place a piece arrives. `tasks.js` also holds
  the player's standing orders (`setFocus`, `orderTravel`, `payCleric`); `skills.js` and `hero.js` hold the
  growth choices (`learnSkill`, `chooseSubclass`, `respec`, `raiseAbility`)
- `js/tavern.js` the tavern and legacy: upgrades (`buyUpgrade`, `tavernMods`), the trophy wall, the roster
  (`switchHero`, `dismissHero`), retirement and the Hall (`retire`, `portraitOf`), Paragon ranks. Text in `data/tavern.js`
- `js/road.js` choices on the road (`afterTask`, `answerChoice`), the travelling merchant (`merchantOn`, `buyWare`),
  and festivals (`festivalOn`, `joinFestival`); `js/boons.js` timed boons; `js/deeds.js` deeds and titles
  (`checkDeeds`, `wearTitle`). Text in `data/road.js`, `data/market.js`, `data/deeds.js`
- `js/sprite.js` LPC layer compositing and animation
- `js/audio.js` sound: effects and the tavern tune, synthesised with the Web Audio API (no audio files), and the
  sound settings, kept in localStorage under `tavernborn.settings`, apart from the save
- `js/ui/` one module per tab, plus `create.js` (creation), `away.js` (the summary card), `story.js` (chapter
  cards), `legacy.js` (the retirement card and Hall portraits), `settings.js` (sound switches, volume, credits
  button), `credits.js` (the credits screen), `dom.js` (helpers, and `sectionTabs`, the pill row that splits a
  long tab into sections), `icons.js` (the small line icons, drawn as inline SVG);
  `data/` all content (`data/loot.js` holds gear names and the named Legendaries; `data/items.js` the
  sprite look of each class, slot, and rarity); `css/backdrops.css` the scene backdrops, their scrolling, and
  day and night; `css/screens.css` the visual pass (Chronicle colours, section tabs, Map, Gear, Tavern); `tools/` dev-only

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
- The level 10 emblem is `EMBLEM` in `data/items.js` (LPC's neck clip, baked like any layer). The level 15
  wisp and the level 20 glow are drawn in code by `sprite.js` (`fx` on a look); LPC has no art for either.

## Known art limits found in Phase 0
- No LPC torso or leg armour has a muscular sheet; muscular bodies wear the male sheet.
- Robe, mage belt, and buckles are female-only art; the vest is male-only.
- Staffs have no slash art (Wizards attack with thrust). Round and kite shields have no hurt art.
- Dagger, rapier, saber, mace, flail, longsword, and longsword_alt each ship in one fixed look.
- The cane is drawn in the shield hand and only has walk art; the club only has swing art. The Cleric
  Common weapon uses both: the cane, mirrored into the weapon hand at bake time (`mirror: true`), and
  the club for the slash. It is not drawn during thrust or hurt.
- LPC has four blunt weapons, so the Cleric's Uncommon weapon is the mace recoloured to bronze at bake
  time (`force: 'metal', ramp: true` maps the mace's greys onto the bronze palette by brightness).
- Shields, the cane, and the club have no hurt art, so they vanish for the second and a half of a fall.

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
- Current phase: 7 (Polish), built and waiting on Rob's phone test. This is the last phase in the plan.
  Phases 1 to 6 are also still in his phone test. Phase 0 is approved.
- Built in Phase 7: sound effects and a tavern tune (`js/audio.js`), settings with the mute switch
  (`js/ui/settings.js`), the in-game credits screen (`js/ui/credits.js`), and a writing pass held in place by
  `tools/check-text.mjs`.
- Sound: nothing is recorded or downloaded. `audio.js` builds every sound from oscillators and noise (a plucked
  string, a small bell, a pipe, a thump, a rattle). `main.js` passes each live tick's events to
  `playEvents`, which plays only the one that matters most (`pickSound`: level-up, dungeon clear, Paragon
  rank, knockout, Legendary, quest, natural 20, other gear going on, natural 1, potion), and nothing for an
  ordinary task or a piece that is only sold. A long time away plays one chime when the away card opens.
  Buying an upgrade, paying the cleric, and respec play coins; retiring plays a short fanfare. Browsers keep
  pages silent until the first tap, so sound starts then; the context is suspended while the page is hidden.
- The tavern tune: D minor, three time, about 143 beats a minute, eight bars of Dm, C, Bb, A on a plucked
  bass and chords, with a pipe melody that alternates between two passes (`TUNE`). Scheduled a half second
  ahead, so it keeps time when the phone is busy.
- Settings (Tavern tab, above Save): "Mute everything" (the doc's mute switch), "Sound effects", "Tavern
  music", a volume slider, "Play a level-up" to test, and "Open the credits". Defaults: effects on, music
  off, volume 60%. They belong to the device, not the save, so a save string does not carry them.
- Credits screen: loads `data/credits.js` only when opened. The LPC generator link and commit, all 44 named
  artists, the licences, then every one of the 127 layers as a fold-out with its files, artists, notes,
  licences, and links. It says the backdrops, map, sounds, and tune are made in code. CREDITS.md stays as
  the full file.
- Writing pass: `node tools/check-text.mjs` gathers all 3,005 lines of player-facing text (about 23,000
  words: the data files and the string literals in `js/`) and checks them against "Humor and voice": no
  exclamation marks, emoji, internet or pop-culture words, mocking words, or fourth-wall words in story text;
  British spelling (-our, -re, -ll; Oxford -ize is kept; "Divine Favor" keeps the 5e spelling); every
  placeholder is one the game fills; task lines at most 70 characters; Chronicle sentences end properly; no
  line twice in one list. `--list` prints the whole script. Fixed in the pass: five "traveler(s)", "Hair
  color", two task lines too long for a phone, "a parking notice" (now carts), a stray leading space in the
  Legendary line, and a Phase 6 legend line that repeated an existing joke. The rest was read in samples and
  through a count of repeated phrases; the running themes (rent, receipts, paperwork, three hundred years)
  are the story's own and were kept.
- `node tools/check-sim.mjs` proves the sim (201 checks): Phases 1 to 6 as before, plus for Phase 7 the
  writing check, which sound plays when several things happen at once, every sound exists, the tune's bars,
  the default settings, and the credits data.
- No rule, number, or save change in Phase 7: pacing is as measured in Phase 6, and saves stay version 5.
- Spec departures to raise with Rob, new in Phase 7:
  - Music is off by default (effects on). An idle game is opened in odd places; the switch is one tap away.
  - Sound is made in code rather than from recordings, so there is nothing to download or credit.
  - The doc does not name a spelling; the game is held to British spelling, as most of it was written.

## Visual pass after Phase 7 (waiting on Rob's phone test)
- Hero tab scene: the backdrop scrolls while the hero walks. Each backdrop is two tracks (sky, ground) of three
  tiles (plain, mirrored, plain) that slide two tiles and loop; the mirror makes both seams meet. The sky moves
  at a quarter of the ground's speed. `--ground-time` is set from the scene's width so the ground passes at
  about 120 px a second. It stops while the hero swings, stands in the tavern, or falls. Every ground has a
  few pebbles (`.bd > i`) so the motion shows on plain earth. A soft shadow sits under the hero
  (`SpriteView`'s `shadow`).
- Fights alternate walking and swinging (`PATTERNS` in `js/ui/hero.js`, read from the task's elapsed
  seconds): roam walks up for the first 20% and then swings 4 s, walks 3 s; a quest walks 6, swings 4, walks 3,
  swings 3; dungeon rooms, bosses, and the Rifts are mostly swings with short walks. Travel is all walking.
- Day and night from the device's clock (`timeOfDay`): dawn 5 to 7, day 7 to 18, dusk 18 to 21, night after.
  Outdoors only (not dungeons, the Rifts, the tavern, or the Underdeep): a multiply tint, and stars over the
  regions with open sky. The tavern's window shows the sky too, on the Hero tab and the Tavern tab.
- Chronicle: each line has a round icon in its family's colour (fights, crits, bad luck, growth, skills,
  dungeons, quests, the road, loot by rarity, healing, the tavern, the Rifts, story). Highlights are cards.
  "Everything / Highlights" switches the list. Highlights (`isHighlight` in `js/hero.js`: level-ups,
  milestones, Paragon ranks, Feats, knockouts, bosses beaten, clears, chapters, new regions, trophies,
  finished quests, Very Rare and Legendary gear) are trimmed last: the Chronicle still holds 200 lines, but
  up to 60 highlights outlive the ordinary lines (`KEPT_MAX`). No save change.
- Map: region colours (`REGION_COLORS` in `js/ui/map.js`) glowing under open regions, fog over locked ones
  with a padlock, a sea, sand, swamp, cave, and the volcano's glow, scorched parchment edges, a compass,
  the travelled road drawn solid, and a red flag and pulse on the hero's region. The region card opens with
  that region's backdrop as a still strip, then progress tiles (monsters met, story quests, the dungeon), a
  dark dungeon box, and icon buttons. Standing orders are four large icon buttons.
- Gear: section tabs (Gear, Abilities, Lifetime, Bestiary). A dark card with the hero in their gear and
  "All told" as chips, then the eight slots as a two-column grid of cards tinted and bordered in their
  rarity's colour, each with a slot icon and a rarity chip. Legendaries shine; a named Legendary's card is full
  width with its story line. Lifetime is a grid of icon tiles.
- Tavern: a hanging inn sign, the common room (the tavern backdrop with the trophy plaques and every hero on
  the roster standing in it), a line overheard at the bar that changes every 20 seconds (`BAR_TALK` in
  `data/tavern.js`, 14 lines), then section tabs: Upgrades (icons and rank pips; the pill shows how many can be
  afforded), Heroes (with portraits), Hall (legends and the trophy wall), Cleric (the cleric and respec),
  Settings (sound, credits, save, load, workshop).
- The Tavern tab's seven section pills sit in two rows (four, then three: `.subnav.two-rows`).
- Section tabs remember the last section on the device (`tavernborn.section.*` in localStorage, apart from the
  save).
- Skills tab: a header of a gold coin with the points to spend (glowing while any wait) and tiles for skills
  learned, subclass, Feats, and the proficiency bonus. Section pills: Skill tree always, and Subclass and
  Abilities only while they wait, each with a count. Branches have a colour and icon (Might red and swords,
  Guard blue and shield, Fortune gold and coin), a progress bar, and a crown on the hero's subclass. The tree is
  a path of numbered tier medallions with pips; each skill is a card with a badge (an arrow for a passive, a
  spark for a signature move, a star for the capstone): filled when learned, gold-edged when it can be learned,
  dashed with a padlock and the reason when not. The explanations sit in "How skills work" at the bottom.
  (Class `.tier-step`, not `.tier`: `.tier` is the sprite lab's rarity button.)
- Bestiary (Gear tab): every region in road order as a fold-out in its colour, with monsters met, a bar, and
  the dungeon's boss once beaten (count from `dungeonClears`). The hero's region starts open; regions not
  reached are locked. A total across all 51 monsters and 8 bosses at the top.
- The Bard (Tavern tab, a sixth section): the eight chapters of The Dragon's Due as verses in their region's
  colour, each with its title, its `learned` line, and "Hear it again" (the chapter card). A chapter is known
  once any hero of the tavern has cleared that dungeon (`state.tavern.trophies`, which keeps retired heroes'
  clears too, or a roster hero's `dungeonClears`); the card names the roster hero who cleared it, or "a hero of
  this tavern". Unheard chapters say which dungeon the bard is waiting on. Text in `BARD`, `data/tavern.js`.
- `node tools/make-test-save.mjs [days] [class] [race] [--unspent]` makes a save string for testing screens
  (`--unspent` leaves the skill points, ability points, and subclass waiting).
- Scene extras (`js/ui/scene-fx.js`, styles at the end of `css/screens.css`), round two of the pass:
  - The foe: a dark shape with glinting eyes on the right of the scene once the hero has walked up to it.
    Twelve shapes (`SHAPES`), picked from the monster's or boss's name (`shapeFor`); quests and the Rifts pick
    one steadily from the task text. None for travel, rests, or dungeon rooms that are a trap. It flinches when
    a roll lands; the hero flashes red when hurt.
  - Dice rise from the fight for each roll seen live (`popRoll`, at most three a second, none after a gap of
    more than 3 seconds): the d20 in gold for a natural 20, red for a 1, grey for a miss, with XP, gold, and
    hit points lost. `main.js` hands each live tick's events to the Hero tab (`show(events, gap)`).
  - Level-up and Paragon rank: gold rays behind the hero and a banner (`burst`). Arriving in a region: a
    banner with its name and levels (`arrival`).
  - Weather (`weatherFor`): leaves in the Mumblewood, rain on the coast (greying the daytime sky), snow in
    the Peaks, blowing sand in the Wastes, spells of 90 minutes that come and go the same on every device;
    mist in Gloamfen, spores in the Underdeep, and embers at Wyrmspire always. Mugwick Vale is fair. Not in
    the tavern, dungeons, or the Rifts. Phones set to reduce motion get a still scene.
- Home screen: `manifest.webmanifest` and `assets/icons/` (192, 512, maskable 512, and the Apple 180), so
  the game can be added to a phone's home screen and opens full screen. The icons are drawn by
  `tools/make-icons.html` from the game's own LPC layers (a Human Fighter in Rare gear), already credited.
- Round three (Rob's notes on gear, the tavern, and the foes):
  - Gear is judged by power (`gearPower` in `js/rules.js`): rarity plus a seventh of a rarity step per level
    above 1, so seven levels are worth one step. A level 3 Legendary (the Boots of Office) gives way to a Very
    Rare of level 11 or a Rare of level 18. Each slot's number is `at20` (what a level 20 Legendary gives, the
    same totals as before) in proportion to power; the weapon's roll bonus is rounded to a whole number. Along
    the usual path the numbers match the Phase 5 table; a piece far ahead of its level is worth less than it
    was. The sprite can now step back a look when a newer, commoner piece wins. `better`, `weakestSlot`, and
    `bestItem` all use power.
    Measured after the change (`node tools/simulate.mjs`, 500 heroes): median level 20 at 29.6 days (10th to
    90th: 27.7 to 32.2), every level within 4% of its target except level 3 (+11%, as before), all 500 clear
    the last dungeon. At the end 63% of slots are Very Rare and 37% Legendary (was 56 / 44); 493 of 500 heroes
    still wear a Legendary.
  - The glass case: a named Legendary that loses its place is not sold (`receive` returns it as `kept`).
    `displayLegend` (js/tavern.js) puts it in `state.tavern.relics` ({ legend, level, hero }), one of each,
    keeping the higher level; a copy no better than the one in the case is sold. Chronicle lines in
    `LOOT_LINES` (`upgradeShelved`, `shelved`, `legendShelved`, `legendSpare`). Shown in the Tavern tab's Hall
    section (a shelf per named Legendary, empty ones saying where each comes from) and as gems in a small
    case on the common room wall. Saves stay version 5; `tavernFields` keeps only valid relics.
  - The common room (`js/ui/common-room.js`): a pixel-art hearth drawn every frame (stone surround, mantel,
    logs, a fire from layered sines, embers) with a flickering glow, and every hero on the roster walking
    about on real LPC walk frames (`SpriteView` at half size, two screen pixels to a sprite pixel): to the
    fire, the window, the bar, the door, the middle of the room, standing a few seconds on the standing
    frame (`still` on `SpriteView.set`) facing what they came for, then off again. It pauses while the
    Tavern tab is hidden.
  - Foes v2 (`js/ui/foes.js`): pixel art instead of dark shapes. Twelve hand-drawn maps facing left, with
    the outline added in code round every filled pixel as LPC draws its own, drawn four or five screen pixels
    to a map pixel (the hero is four). A palette per kind and colours per monster by name (`VARIANTS`); the
    Rifts are violet, bosses have gold eyes. They step in, bob, and flinch in steps, like the sprites.
- `node tools/check-sim.mjs` (209 checks) adds two for the kept highlights and, for round three, seven
  levels to a rarity step, the Boots of Office giving way at Very Rare 11, whole-number weapon rolls, and the
  glass case (unsold, one of each, the higher copy, in the save string).
- Spec departures to raise with Rob: the time of day comes from the phone's clock, not from the hero's own day
  count; the Highlights list keeps 60 lines at most.

## Round four after Phase 7 (waiting on Rob's phone test)
Rob picked eleven of a list of suggestions: choice cards, the merchant, deeds and titles, festivals, fight bars, class
effects, bosses, loot arriving, the hero on the map, and the barkeep (no other patrons).
- Choices on the road (`data/road.js`, 18 meetings; `js/road.js`): from level 2, between roam, quest, and travel
  tasks, one turns up every 3 to 6 hours of the hero's age (the first after 1 to 2). It waits 4 hours in
  `hero.choice` while work carries on; the Hero tab shows a card with two buttons and a badge on the Hero tab.
  With no word, the hero takes the option in character (`auto`), unless they cannot pay for it. Options pay XP
  in minutes of work (`workXp`), gold in level-scaled units (`goldUnit`: 25 gp at 1, about 5,000 at 10, 40,000 at
  20), boons, a piece of gear (as from a chest), or hit points (never below 1), some on a chance. `afterTask` is
  called by `advance` after every task. Events `meeting` and `choice`; Chronicle kind `choice`.
- Boons (`BOONS` in `js/rules.js`, names in `data/market.js`): short spells of the same numbers skills and gear
  change, on the hero's own clock (`hero.boons`), added in `modsOf` (`withBoons`). The same boon again extends it.
  Shown as chips under the hero's name.
- The travelling merchant, Odlin Farthingale (Tavern tab, first section): in the yard on about 6 days in 10 by
  the device's calendar (`merchantOn`, a hash of the day), four of eight wares a visit, one of each per visit
  (`state.tavern.merchant`), priced in gold units. Wares: five boons, a crate of three potions for the next
  dungeon or Rifts run (`hero.supplies`), and a mystery crate (one piece at the hero's level). The simulator's
  player never shops there.
- Festivals by the device's calendar (`FESTIVALS`): Lantern Night 5 to 25 November, Midwinter 18 December to
  6 January, the Blossom Fair 10 to 30 April, Midsummer 14 June to 4 July, the Harvest Fair 20 September to
  10 October. Bunting or lanterns in the tavern only (the common room, and the Hero tab while recovering there),
  every other bar line about it, and a card on the Tavern tab: each hero may join once a year (`hero.joined`) for
  24 hours of festive spirits (+10% XP and gold).
- Deeds (`data/deeds.js`, 24): checked after every task and after buying or joining; each writes a Chronicle line
  (kind `deed`, a highlight) and offers a title, chosen on the Gear tab's Deeds section (`hero.title`), shown
  after the name on the Hero tab and kept in the Hall. Thresholds were set from the simulator: a career rolls about
  3,000 natural 20s and as many 1s.
- Fight bars (`.fight-bars`): the hero's real hit points over their head and the foe's bar over theirs, which
  wears down with the fight's progress (the roll at the end decides). A boss's bar is in as many parts as it
  takes blows. A foe beaten live sinks and fades (`defeatGhost`).
- Class effects while swinging (CSS only, `.scene.attacking[data-cls]`): a sword arc (Fighter), two crossing cuts
  (Rogue), a fireball and its flash (Wizard), a burst of holy light and a halo (Cleric). Healing shows motes round
  the hero (`healGlow`), gold for a Cleric.
- Bosses (`js/ui/bosses.js`): eight hand-drawn maps at 6 screen pixels to a map pixel (an ordinary foe is 4 or
  5), each in its own colours. A boss arriving live gets a banner and a shudder (`bossEntrance`); during a boss
  fight the hero steps back a little (`.vs-boss`).
- Loot arriving (`lootDrop`): a chest by the foe opens and the piece, in its rarity's colour, flies to the hero.
  Very Rare and Legendary come in a beam of light. At most two shown per tick.
- The map walker: during travel and the walk back after a knockout, the hero's sprite walks the road on the Map
  tab, placed along the road by the journey's progress and facing along the current stretch.
- The barkeep: a balding grey-bearded dwarf in a vest behind a new bar counter in the common room, who wanders
  along the bar now and then. Heroes walk in front of the counter.
- Saves: version 6 (`roadFields` in `js/state.js`): unreadable choices, boons, and deeds are dropped; a hero from
  an older save starts with none and earns the deeds already done on the next task.
- `node tools/check-sim.mjs` (229 checks) adds 19 for this round: every choice whole, meetings turning up and
  being decided alone, answering, boons, the merchant's days, stock and prices, festivals and the new year,
  deeds and titles, the save string, and a version 5 save. Two older checks changed: the story quest piece check
  now compares names with the starting kit (the trinket has none), and check 15's hero uses seed base 2, since the
  road draws from the same dice and the old seed's hero now ends without a Legendary.
- Measured after the change (`node tools/simulate.mjs`, 500 heroes, nobody answering choices or shopping): median level
  20 at 29.2 days (10th to 90th: 27.3 to 31.7), about half a day quicker than before from choices the heroes
  decide alone; every level within 5% of its target except level 3 (+11%, as before); all 500 clear the last dungeon.
- Spec departures to raise with Rob: none of this round is in the design doc. The merchant and festivals follow
  the phone's calendar, not the hero's days; the hero keeps working while a choice waits.

## Known gaps closed after Phase 7
- All 26 LPC hair colours are baked (`HAIR_COLORS` in `data/races.js`, natural shades first). The art is now
  7.6 MB; the credits did not change, since no new artwork was added.
- Each dungeon has its own backdrop (`css/backdrops.css`, `.scene[data-dungeon=<region>]`, set by the Hero tab;
  the shared stone stays as the fallback): a brick cellar with barrels, a root-hung burrow, a wet lighthouse
  with a sea window, a dwarven hall of columns and gold runes, a drowned abbey window, a sandstone tomb, a
  dark market of stalls and lanterns, and the gold of the hoard.
- The trophy wall shows in the tavern scene: one plaque per trophy hung, above the bottle shelf, each in its
  dungeon's colour (`TROPHY_COLORS` in `data/tavern.js`).
- The credits screen opens with "Tavernborn was designed by Rob, and built with Claude Code."
- The design doc's Sprite looks tab now says the Cleric's Uncommon weapon is the mace recoloured to bronze.

## Phase 6 record
- Built in Phase 6 (`js/tavern.js`, `data/tavern.js`, numbers in `js/rules.js` under TAVERN, LEGACY, RIFT,
  PARAGON_XP): four tavern upgrades, the trophy wall, a roster of three heroes, retirement to the Hall of
  Legends with a redrawable portrait and the legacy bonus, the Planar Rifts, and Paragon ranks.
- Upgrades (`TAVERN`), bought with the active hero's gold, belong to the tavern, so every hero has them.
  Each is a pure function call (`buyUpgrade`) that writes a Chronicle line of kind `tavern`.
  - A better room, 5 ranks: knockout recovery 8% quicker per rank, added to boots and skills, 60% off at most.
  - A stable, 5 ranks: travel 8% quicker per rank, added to boots (75% off at most, as before).
  - A notice board, 5 ranks: odd jobs pay 10% more XP and gold per rank (steps and the finishing fee), and
    their gear is 0.1 of a rarity step better per rank. Story quests are untouched.
  - A trophy wall, 3 ranks: 3, 6, then 8 hooks. Cosmetic only. Each dungeon's first clear by any hero of the
    tavern wins its trophy (`TROPHIES`, `state.tavern.trophies`); it hangs if there is a free hook and waits
    behind the bar if not.
  - Prices: room and stable 2,500 / 15,000 / 60,000 / 200,000 / 600,000; notice board 2,000 / 12,000 /
    50,000 / 175,000 / 500,000; trophy wall 5,000 / 50,000 / 300,000. All of it: 2,849,000 gp, about two
    careers' gold. A first hero holds about 20,000 gp at level 8, 65,000 at 10, 500,000 at 15, 1.5 million at 20.
- The roster (`MAX_HEROES` 3): one hero adventures at a time. The others wait at the tavern exactly as they
  were: `advance` only moves the active hero, so no time passes for them (no XP, gold, or risk). Before the
  active hero changes, `main.js` settles the time so far on the one who was out. Recruiting opens creation,
  which can be called off ("Never mind") while other heroes wait. Dismissing a hero is for good, with no
  legend. A save with more than three heroes is refused.
- Retirement (`retire`): level 20 only. Offered once by a card when level 20 is first seen
  (`hero.retireOffered`), then always on the Hero tab; also on the Tavern roster. Both ask for a second tap.
  The legend keeps `look` (the input to `heroLook`, from `portraitOf`, so the portrait redraws exactly:
  gear tiers, emblem, wisp, glow), name, race, class, subclass, Paragon rank, a copy of `stats`, the best
  item worn, the Most Embarrassing Defeat by name, dungeons cleared, Bestiary count, gold, days, deepest
  Rifts floor, and a one-line legend (`LEGEND_LINES`). The slot is freed and the next waiting hero goes out;
  with none left, creation opens and says what the bonus is worth. `legacyBonus` = 2% per legend, at most
  10% (`legacyFor`), read by `xpBonus` in `js/tasks.js`. The hero's gold leaves with them (both retirement
  texts say so).
- The Planar Rifts (`RIFT`): from level 20, a fourth standing order on the Map tab ("Rifts"), entered from
  wherever the hero stands. Task kind `rift`, one roll per floor. Floor 1 is a room of the Hoard of
  Vexaldrith; each floor after hits 12% harder and pays 4% more, and every third is +1 DC. Hit points come
  back a little between floors as on the road; potions are limited to those carried in, as in a dungeon.
  Every tenth floor a Warden leaves a piece of boss gear and, 5% of the time, a named Legendary the hero is
  not wearing, at level 20. A knockout ends the run; the next starts at floor 1. Changing order ends it too.
  Measured on geared level 20 heroes: runs end between floor 10 and 50 by build; best floors 25 to 50 in a
  day. Own backdrop (`data-bg="rift"`).
- Paragon ranks: titles only. XP past level 20 counts; rank r needs `PARAGON_XP` (50,000) x r(r+1)/2 in all.
  Ten written titles (`PARAGON_TITLES`), then "Paragon 11" and so on. Each rank is a `paragon` event and
  Chronicle line, once. At level 20 the Hero tab's XP bar fills toward the next rank. Level 20 heroes earn
  about 30,000 to 50,000 XP a day, so rank 1 comes in one or two days, rank 5 in two to four weeks.
- Measured, `node tools/simulate.mjs`, 500 heroes, the simulated player buying upgrades (`shop`: the
  cheapest rank whenever the purse holds twice its price): median level 20 at 29.8 days (10th to 90th:
  27.9 to 32.3), all 500 clear The Hoard of Vexaldrith, 4.2 knockouts per hero (2.4 h recovering). By level 20
  the average hero has the room, stable, and notice board at rank 4 and the trophy wall at 2.8, has spent about
  1.09 million gp on them, and keeps about 490,000. Levels 2 to 6 did not move. A second hero (100 heroes,
  starting in the tavern their first hero left, with one legend's +2% XP): median level 20 at 28.8 days,
  against 29.5 for those same first heroes, so about 0.7 days quicker; all 100 clear the last dungeon.
- Saves: version 5. `migrate` keeps only upgrade ranks that exist, works `legacyBonus` out again from the
  Hall, fills the trophy wall from dungeons already cleared (version 4 saves only), and counts a level 20
  hero's Paragon ranks quietly. No hero loses a level, skill, point, gear, or gold.
- `node tools/check-sim.mjs` proves the sim (192 checks): Phases 1 to 5 as before, plus for Phase 6 each
  upgrade's price and effect, upgrades shared across heroes, the trophy wall, the roster, retirement and the
  portrait look, the legacy bonus and its cap, the Rifts and Paragon ranks, determinism and the save string
  with two heroes and the Rifts, and a version 4 save loading intact.
- Spec departures to raise with Rob, new in Phase 6:
  - The Rifts are a standing order reached from the Map tab's order buttons, not a ninth spot on the map.
  - Paragon ranks come from XP past level 20 (any activity), not from Rift floors alone.
  - Inactive heroes are frozen: no time passes for them. (The doc says they "wait at the tavern exactly as
    you left them".)
  - A hero can be dismissed for good to free a slot (the doc has no way to empty a slot below level 20).
  - A retiring hero's gold is not passed on.
  - Trophies are a list on the Tavern tab, and plaques on the tavern wall behind the hero.
  - Wardens hand over named Legendaries at level 20, so one can replace a lower-level Legendary.

## Phase 5 record
- Built in Phase 5: loot (`js/loot.js`, names in `data/loot.js`, numbers in `js/rules.js`), gear that changes
  the rules, auto-equip and auto-sell, the eight named Legendaries, the cloak at level 5, the level 10, 15,
  and 20 milestones on the sprite, a backdrop for each region plus the dungeon and the tavern
  (`css/backdrops.css`), the knockout fall, the Gear tab, loot on the away card, the real effect of the six
  loot skills, and gear in the simulator's report.
- A piece of gear is `{ tier (0 Common to 4 Legendary), level, name }`, plus `legend` (a region id) on a named
  Legendary. It sits in `hero.gear[slot]`; there is no inventory. "Better" was rarity first, then level, in
  Phase 5; since round three of the visual pass it is power (see that section). A better piece goes on at
  once and whichever piece loses is sold (`sellPrice` in `js/rules.js`), except a named Legendary.
- What gear does (`GEAR_STATS` in `js/rules.js`): one job per slot. Weapon: +1 to every roll per rarity step,
  and criticals pay more with its level. Off-hand: chance to halve a hit. Head: hit points. Body: damage
  taken. Hands: gold. Feet: travel and knockout recovery. Cloak: healing from rests and potions. Trinket: XP.
  A slot's number is rarity steps plus a little per level; nineteen levels are worth just under one rarity
  step. The starting kit (Common, level 1) is worth exactly nothing. A full Legendary level 20 kit: +4 to
  rolls, 7.4% dodge, +9.9% hit points, 9.9% less damage, +15% gold, 25% quicker travel and recovery, +20%
  healing, +5% XP. `gearMods(hero)` is the one door from gear into the rules; `modsOf(hero)` in `js/tasks.js`
  adds it to the skill numbers, and `maxHp` reads it.
- Where gear comes from (`LOOT` in `js/rules.js`): a monster beaten on the road 1% (Wisdom adds a tenth per
  modifier point; a natural 20 doubles it), a dungeon room cleared cleanly 10%, every finished quest one
  piece (a story quest's goes to the slot that needs it most, an odd job's to any slot), every beaten boss one
  piece, and a 15% chance per clear of the dungeon's named Legendary while the hero is not wearing it. Rarity is
  `level / 5 + the source's shift + luck`, so each source has a ceiling: monsters never drop Legendary, quests
  run about a tier behind bosses, and Legendaries come from the level 18 and 20 bosses, level 20 quests,
  and hidden chests.
- The named Legendaries (`LEGENDARIES` in `data/loot.js`), one per dungeon and one per slot: Boots of Office
  (Cellar, feet), Old Bramblewick's Mantle (Thornwarren, cloak), the Tide-Reeve's Counting Gloves
  (Lighthouse, hands), the Under-King's Second-Best Crown (Hall, head), The Abbot's Last Word (Abbey,
  off-hand), The Third Seal (Tomb, trinket), The Broker's Guarantee (Market, body), Vexaldrith's Spare Tooth
  (Hoard, weapon). Each is tier 4 at its dungeon's level, so an early one is the best in its slot until a
  higher-level Legendary turns up.
- Events and Chronicle: a found piece is a `loot` event (`slot, tier, level, name, equipped, gold, source,
  legend`) and a Chronicle line of kind `upgrade` or `sold` that carries `tier` for its colour. Levels 5, 10,
  15, and 20 write a `milestone` line. `summarize` counts `found`, `upgrades`, and `soldFor`.
- Measured, `node tools/simulate.mjs`, 500 heroes, every point spent, median (target): L2 10 min (10 min),
  L3 66 min (1 h), L4 3.1 h (3 h), L5 6.2 h (6.5 h), L6 10.8 h (11 h), L8 30.1 h (30 h), L10 3.1 days (3),
  L12 6.1 days (6), L15 13.1 days (13), L18 22.9 days (23), L20 29.8 days (30). Middle 80% reach level 20
  between 27.8 and 32.3 days. All 500 clear The Hoard of Vexaldrith (median day 29.8).
- Gear by level, as the average rarity across the eight slots (0 Common to 4 Legendary): L5 0.18, L8 0.76,
  L10 1.30, L12 1.76, L15 2.27, L18 2.84, L20 3.31. After the last dungeon: 56% of slots Very Rare, 44%
  Legendary; 496 of 500 heroes wear a Legendary and 466 wore all five rarities in one slot. Each hero finds
  about 800 pieces, wears 75, and sells the rest for about 87,000 gp (gold at the end: about 1.6 million, still
  with little to spend it on until Phase 6).
- Knockouts per hero per month: 4.2 overall (0.3 roaming, 1.3 on quests, 1.0 in dungeon rooms, 1.6 to
  bosses), down from 5.8 in Phase 4. By class: Fighter 2.6, Wizard 3.7, Rogue 4.0, Cleric 6.4. By subclass,
  level 20 in days / knockouts: Vanguard 30.0 / 2.2, Bulwark 32.2 / 0.8, Sellsword 30.5 / 4.9, Evoker
  28.4 / 5.5, Abjurer 30.5 / 0.7, Diviner 27.8 / 5.1, Duelist 29.3 / 5.1, Shadow 31.9 / 2.1, Treasure Hunter
  29.7 / 4.9, Warpriest 29.6 / 6.3, Lifebinder 33.0 / 2.2, Pilgrim 28.5 / 10.9.
- What changed in the rules to make room for gear (`js/rules.js`; rerun the simulator after touching any):
  - `GROWN.dcFrom` is now `[5, 8, 10, 13, 15, 18]`: anything of those levels and up is +1 harder to roll
    against for each step (three steps in Phase 4). This is what a weapon's bonus pays for.
  - `GROWN.damagePerLevel` is 0.02 (was 0.015).
  - `XP_RATE` is up about 6% from level 6 (0.51 at level 6, 0.57 at 7, rising to 0.74 at 19 and 20). Levels
    2 to 5 cost what they did. `PAST_CURVES[3]` holds the Phase 4 curve.
  - Still true from Phase 4: Intelligence gives 1% XP per modifier point, the Wizard's 15% ward stays, and
    skills, wards, and armour together never turn aside more than 60% of a hit.
- The trees (Phase 4): each class has a Might, a Guard, and a Fortune branch (the three subclasses), twelve
  skills each in four tiers of three. A tier opens after two skills in the tier above. The twelfth skill of a
  branch is its capstone and needs that branch's subclass (chosen from level 3). At most 27 skills.
- How a skill works: `fx` is passive numbers, summed across learned skills (`FX_KEYS` in `js/skills.js`);
  `sig` is a signature move, looked up by type in `js/tasks.js` (`SIG_TYPES`), which fires on its own and
  writes its `fire` line as a `skill` event. Moves with limited uses count in `hero.delve.used` (per run), the
  quest's `used`, the boss fight, or `hero.cooldowns`. To add or change a skill, edit the data file; a new
  kind of effect needs a key or type in `js/skills.js` and its code in `js/tasks.js`.
- The six loot skills now do what the doc says, and no card says "Not built yet": Hazard Pay and The Big
  Score make a beaten boss drop a second piece (`items` on a `bossPurse` move); Sticky Fingers gives a 20%
  chance of a second piece wherever a room, chest, boss, or quest gives one (`bonusLoot`; it no longer pays a
  purse); Eye for Quality adds 0.3 of a rarity step to everything found (`quality`, a new `FX_KEYS` entry);
  Locate Object and Treasure Map put a chest in the hidden room.
- The player's growth choices are four functions that only change the save and write a Chronicle line:
  `learnSkill`, `chooseSubclass`, `respec` (`js/skills.js`) and `raiseAbility` (`js/hero.js`). Skill points (one
  per level and per Feat) and ability points (two at levels 4, 8, 12, 16, 19) bank until spent. Respec costs
  `respecPrice(level)`, returns every skill point, reopens the subclass, and keeps ability scores.
- Saves: version 4. `migrate` in `js/state.js` turns a Phase 4 hero's bare `{ tier: 0 }` gear into the named
  starting kit, hands the cloak to a hero already at level 5 or more, and moves XP to the same place within
  the level on the new curve. No hero loses a level, a skill, a point, a Feat, or any gold.
- `node tools/check-sim.mjs` proves the sim (131 checks): Phases 1, 3, and 4 as before, plus for Phase 5 five
  different baked looks per visible slot, the starting kit, 4,000 random pieces through auto-equip and
  auto-sell, drops from each source, the guaranteed quest piece, gear never going backwards, the named
  Legendaries, the cloak at 5, the six loot skills, determinism with loot, a version 3 save loading intact,
  and one simulated hero's gear climbing from Common to Legendary. Run it after any change to `js/sim.js`,
  `tasks.js`, `rules.js`, `hero.js`, `skills.js`, `loot.js`, `state.js`, or the data files.
- Spec departures to raise with Rob. From earlier phases, still standing: the Dwarf grudge is +2 on the roll,
  the Wizard ward, chapter cards do not change for later heroes, Fireball turns one failed room per run into
  a success, Slip Away skips a room only below half hit points, Divine Favor is the first roll after arriving
  and the first of each dungeon run, Healing Word heals up to three times a run, Second Wind is in the Vanguard
  branch, respec does not refund ability scores, and Strength's "faster monster tasks" and Dexterity's
  "critical chance" are covered by skills. New in Phase 5:
  - A lower-level piece of a higher rarity always wins, so the sprite never goes back to an older look.
  - A story quest's guaranteed piece is aimed at the hero's weakest slot (the doc says only "one piece").
  - Odd jobs also pay a piece, to a random slot.
  - Wisdom's "extra loot" is a better drop chance from monsters and rooms.
  - A natural 20's "bonus (extra loot or XP)" is the 1.5x reward it already was, plus a doubled drop chance.
  - The named Legendary is a 15% chance per clear, not a certainty, so there is a reason to run a dungeon again.
  - The level 10 emblem is LPC's neck clip, which comes with a short collar in the class colour; the title
    that goes with it is shown after the hero's class on the Hero tab (`TITLES` in `data/loot.js`).
  - Sticky Fingers no longer pays a second purse of gold; it pays in gear.
- `index.html` is the game. The Phase 0 sprite proof is `sprite-lab.html`; the simulator is
  `tools/simulate.html` (both linked from Tavern > Workshop).
- Levels 3 to 6 were moved later than the design doc's table after Rob's play test (they came too fast);
  do not move them earlier. `LEVEL_TARGET_HOURS` in `js/rules.js` holds every target.
- The Skills tab redraws only when something on it changes (a rebuild every second would swallow taps).
  Learn, ability, and respec buttons ask for a second tap. The Gear tab has nothing to tap.
- The knockout fall plays only for a knockout seen as it happens, for a second and a half, in the scene where
  it happened; then the scene moves to the tavern.
- `sprite.js` draws the front of every shield above hats (LPC puts it under them, which clipped wide brims).
- Local preview: `.claude/launch.json` has five servers (ports 8771, 8773, 8779, 8784, 8792) so sessions do not collide.
  Phase 6 was tested on `tavernborn-phase5` (8792).
