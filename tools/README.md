# Dev tools

Nothing in this folder runs in the game. These are for building and checking it. They need
Node 18+ and git, and nothing else (no npm install).

## sprites.mjs: the LPC layer pipeline

The asset list is `data/races.js` and `data/items.js`. The tool turns it into finished PNGs.

One-time setup, from the repo root. This makes a small partial clone; the tool then pulls only
the layer images the game uses.

```bash
git clone --filter=blob:none --sparse https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator.git .lpc-source
```

```bash
git -C .lpc-source sparse-checkout set sheet_definitions palette_definitions
```

Then, every time the asset list changes:

```bash
node tools/sprites.mjs check
```

```bash
node tools/sprites.mjs fetch
```

```bash
node tools/sprites.mjs bake
```

- `check` runs Sprite looks checks 1 (body types) and 2 (colours offered) and writes `looks-report.md`.
- `fetch` downloads the needed layer images into `.lpc-source`.
- `bake` recolors with the generator's palettes, writes `assets/lpc/`, `data/sprite-layers.js`,
  `data/credits.js`, and `CREDITS.md`. It refuses to run while any check fails.

The asset list also takes in `EMBLEM` in `data/items.js` (the level 10 neck clip). A layer that ships
in one fixed look can be recoloured with `force: '<material>'`; add `ramp: true` when its art is not
drawn in that material's palette (the mace is plain greys), and the tool maps every pixel but the
outline onto the target colours by brightness. The Cleric's bronze mace is made this way.

Draw order, body-type paths, recolor palettes, and credits are all read from the generator's
`sheet_definitions/` and `palette_definitions/`. Nothing is hard-coded here except the four
animations the game uses and the oversize weapon animations that map onto them.

## lineup.html: every look on one page

Open `http://localhost:8766/tools/lineup.html`. Query options: `race`, `cls`, `scale`, `anim`,
`facing`, `step`, `hair`, `nocloak=1`, `wide=1` (show the whole oversize weapon frame).

## serve.py: local test server

```bash
python tools/serve.py
```

Serves the repo at `http://localhost:8766` with caching off, so a rebake shows up on reload.
ES modules do not load from `file://`.

## check-sim.mjs: proof that the simulation works

```bash
node tools/check-sim.mjs
```

Creates fresh heroes, advances them 9 hours in one call, and checks that they level, that the same
seed gives the same save, that a month away resolves in under a second, and that the save string
round-trips. Then the Phase 3 activities: six story quests earn a Feat, a dungeon clear shows a
chapter and opens the next region, travel works and locked regions refuse it, a knockout loses the
run and nothing else, three knockouts running switch the hero to Roam, the cleric's fee, the Dwarf,
Half-Orc, and Dragonborn quirks, a version 1 save keeping its level, and one hero clearing all
eight dungeons. Then Phase 4, growth: the four trees have the right shape (144 skills, twelve
capstones, no exclamation marks); each of the 144 skills changes what happens to a hero over two
scripted days compared with a twin who lacks it, and each of the 48 signature moves fires and
writes its own Chronicle line; learning writes each skill's line; a tier opens after two skills in
the tier above; only the chosen subclass's capstone can be learned; 27 skills at most; ability
points bank at levels 4, 8, 12, 16, and 19 and stop at a score of 20; respec refunds every point
for a price that rises with level; a hero with skills is still deterministic; and a Phase 3 save
loads with every level, skill point, and Feat. Then Phase 5, gear: every class has five different
baked looks in each of the seven visible slots, and the four emblems are baked; the starting kit is
worth nothing and a rarer piece always beats a commoner one; 4,000 random pieces go through
auto-equip and auto-sell without one worse piece being worn or one sale going unpaid; monsters,
rooms, quests, odd jobs, and bosses each drop as they should, with bosses dropping the best; every
finished quest pays its piece on the next Chronicle line; no slot goes backwards over 33 hours; the
eight named Legendaries exist, drop, and are not dropped twice; the Cloak slot is shut until level
5 and then comes with a cloak; Hazard Pay, The Big Score, Sticky Fingers, Eye for Quality, Locate
Object, and Treasure Map each do what their card says and no card says "Not built yet"; loot is
deterministic and survives the save string; a Phase 4 save (version 3) loads with its level, place
within the level, gold, skills, points, and Feats, and is given the named starting kit and its
cloak; and one simulated hero's gear climbs from Common to Legendary over the month. Then Phase 6,
the tavern and legacy: the four upgrades' prices (each rank dearer, everything together about 2.8
million gp) and that buying pays exactly and stops at the last rank; the room cuts recovery 8% a
rank and stops at 60% off with boots; the stable shortens travel; the notice board makes odd jobs
(and only odd jobs) pay more and drop rarer gear; the trophy wall wins a trophy once per dungeon,
hangs it only on a hook, and changes nothing else; the roster holds three, only the active hero
moves, and dismissing frees a slot; an upgrade bought with one hero's gold works for another;
retirement only at level 20, freeing the slot and keeping the portrait look (it redraws exactly)
and the record; a new hero after one retirement earns 2% more XP, capped at 10%; the Rifts open at
level 20, get harder each floor, restart at floor 1 after a knockout, and have Wardens; Paragon
ranks come from XP past level 20, are announced once, and change no roll; determinism and the save
string with two heroes, upgrades, and the Rifts; and a Phase 5 save (version 4) loading intact. It
also prints the median time to each early level against the targets (for heroes whose points are
left unspent).

## simulate.html and simulate.mjs: the pacing simulator

Open `http://localhost:8766/tools/simulate.html` (or Tavern > Workshop in the game), or in a terminal:

```bash
node tools/simulate.mjs
```

Both run 500 heroes through the real `advance(state, seconds)` in the real eight regions, from
level 1 until they are level 20 and have cleared the last dungeon. They report the time to each
level (10th percentile, median, 90th) against `LEVEL_TARGET_HOURS`, a breakdown by class and race,
each dungeon's first clear (how many heroes, when, at what level, runs lost), where the
knockouts happened, and gear: the average rarity across the eight slots on reaching each level,
what is worn at the end, and how much was found, worn, and sold. The terminal version exits with an error unless the median hero reaches level
20 in 28 to 32 days and at least nine in ten heroes clear The Hoard of Vexaldrith.

Arguments: `node tools/simulate.mjs [heroes] [road|roam|vale|unspent] [damageTimes]`.

- `simulate-core.js` is the shared engine; `simulate-worker.js` lets the page use every CPU core.
- **No stand-ins.** Every region has real monsters, quests, and a dungeon. The only invented part
  is the player: `steer` in `simulate-core.js` gives the same orders the Map tab does (`setFocus`,
  `orderTravel`). It roams to level 2, does a region's six story quests and then roams, delves on
  reaching the level the dungeon is built for, waits a level if the hero loses confidence there,
  and walks on once the dungeon is cleared and the next region's level range is reached.
- **Growth.** The same player spends everything the hero earns, through the functions the Skills
  tab uses (`chooseSubclass`, `learnSkill`, `raiseAbility`): `grow` in `simulate-core.js` takes the
  planned subclass at level 3, puts ability points into the class's main ability and then
  Constitution, and buys skills down the subclass's own branch first (capstone included), then the
  other two branches a tier at a time. Each class's three subclasses take turns, and the report has
  a table by subclass.
- `road` is that player (the judged run). `roam` never quests. `vale` never leaves Mugwick Vale.
  `unspent` is the road played by someone who never spends a skill or ability point.
- **Gear.** Nothing is played: loot equips and sells itself inside `advance`. The simulator only
  watches (`tierAt`, `worn`, `gear` on each result).
- **The tavern.** `shop` in `simulate-core.js` buys tavern upgrades through `buyUpgrade`, the
  cheapest rank left whenever the purse holds twice its price. The report shows the average rank of
  each upgrade at levels 10, 15, and 20 and the gold spent. After the judged run, `simulate.mjs`
  plays a second hero for the first 100: each starts in the tavern its first hero left (the same
  upgrades) with one legend in the Hall (+2% XP), and the report compares their level 20 median
  with those first heroes'. `runHero` takes `tavern` (a starting tavern, see `tavernAfter`) and
  `shop: false`.
- `damageTimes` (the page's "What if monsters hit harder?") multiplies all damage for that run only,
  through `WHAT_IF` in `js/rules.js`. Nothing is written to the game's files.
- Rerun after any change to pacing, monsters, quests, dungeons, damage, healing, or skills.
