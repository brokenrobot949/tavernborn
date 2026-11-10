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

## simulate.html

Placeholder for the Phase 2 pacing simulator.
