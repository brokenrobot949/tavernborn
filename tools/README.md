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

## check-sim.mjs: proof that offline progress works

```bash
node tools/check-sim.mjs
```

Creates fresh heroes, advances them 9 hours in one call, and checks that they level, that the same
seed gives the same save, that a month away resolves in under a second, and that the save string
round-trips. It also prints the median time to each level against the design targets.

## simulate.html and simulate.mjs: the pacing simulator

Open `http://localhost:8766/tools/simulate.html` (or Tavern > Workshop in the game), or in a terminal:

```bash
node tools/simulate.mjs
```

Both run 500 heroes from level 1 to 20 through the real `advance(state, seconds)` and report the
time to each level (10th percentile, median, 90th) against `LEVEL_TARGET_HOURS`, with a breakdown
by class and race and knockout and potion counts. The terminal version exits with an error unless
the median hero reaches level 20 in 28 to 32 days. Arguments: `node tools/simulate.mjs [heroes]
[road|vale] [damageTimes]`.

- `simulate-core.js` is the shared engine; `simulate-worker.js` lets the page use every CPU core.
- **Stand-ins.** Regions with no monsters in `data/monsters.js` get nine temporary ones scaled from
  Mugwick Vale's nine (same XP and task length, DC of 10 + proficiency, damage scaled with hit
  points), and the hero moves to the next region as soon as their level allows, with no travel.
  They live in memory only. A region with real monsters is never given stand-ins, so Phase 3's
  data replaces them without touching the simulator. `vale` mode keeps the hero in Mugwick Vale.
- `damageTimes` (the page's "What if monsters hit harder?") multiplies every damage die for that
  run only. Nothing is written to the game's files.
- Rerun after any change to pacing, monsters, damage, or healing.
