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
loads with every level, skill point, and Feat. It also prints the median time to each early level
against the targets (for heroes whose points are left unspent).

## simulate.html and simulate.mjs: the pacing simulator

Open `http://localhost:8766/tools/simulate.html` (or Tavern > Workshop in the game), or in a terminal:

```bash
node tools/simulate.mjs
```

Both run 500 heroes through the real `advance(state, seconds)` in the real eight regions, from
level 1 until they are level 20 and have cleared the last dungeon. They report the time to each
level (10th percentile, median, 90th) against `LEVEL_TARGET_HOURS`, a breakdown by class and race,
each dungeon's first clear (how many heroes, when, at what level, runs lost), and where the
knockouts happened. The terminal version exits with an error unless the median hero reaches level
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
- `damageTimes` (the page's "What if monsters hit harder?") multiplies all damage for that run only,
  through `WHAT_IF` in `js/rules.js`. Nothing is written to the game's files.
- Rerun after any change to pacing, monsters, quests, dungeons, damage, healing, or skills.
