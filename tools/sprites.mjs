#!/usr/bin/env node
// Dev-time sprite tool. The game itself never recolors anything; this script does it once.
//
//   node tools/sprites.mjs check   run the Sprite looks checks 1 and 2, write tools/looks-report.md
//   node tools/sprites.mjs fetch   pull only the needed layer PNGs into the local LPC clone
//   node tools/sprites.mjs bake    recolor + copy layers into assets/lpc, write data/sprite-layers.js,
//                                  data/credits.js and CREDITS.md
//
// Options: --lpc <path>  local clone of the LPC generator repository (default: .lpc-source)
// See tools/README.md for how to make that clone.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng, encodePng } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cmd = args[0];
const lpcArg = args.indexOf('--lpc');
const LPC = path.resolve(lpcArg >= 0 ? args[lpcArg + 1] : path.join(ROOT, '.lpc-source'));
const OUT = path.join(ROOT, 'assets', 'lpc');

const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { RACES, BODY_TYPES, HAIR_STYLES, HAIR_COLORS } = await load('data/races.js');
const { GEAR, SLOTS, TIERS, BODY_FALLBACK } = await load('data/items.js');
const { layerKey } = await load('js/layer-key.js');

// Animations the game uses, and the oversize weapon animations that map onto them.
// Frame lists are body-frame indices; an oversize sheet has one column per list entry.
const ANIMS = ['walk', 'slash', 'thrust', 'hurt'];
const CUSTOM = {
  slash_128: { anim: 'slash', size: 128, frames: [0, 1, 2, 3, 4, 5] },
  slash_oversize: { anim: 'slash', size: 192, frames: [0, 1, 2, 3, 4, 5] },
  slash_reverse_oversize: { anim: 'slash', size: 192, frames: [5, 4, 3, 2, 1, 0] },
  thrust_128: { anim: 'thrust', size: 128, frames: [0, 1, 2, 3, 4, 5, 6, 7] },
  thrust_oversize: { anim: 'thrust', size: 192, frames: [0, 1, 2, 3, 4, 5, 6, 7] },
  walk_128: { anim: 'walk', size: 128, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], skip: 1 },
};

// ---------- load upstream data ----------

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function loadDefs() {
  const defs = {};
  for (const f of walk(path.join(LPC, 'sheet_definitions'))) {
    const stem = path.basename(f, '.json');
    if (!f.endsWith('.json') || stem.startsWith('meta_')) continue;
    defs[stem] = { ...JSON.parse(fs.readFileSync(f, 'utf8')), _file: path.relative(LPC, f).replaceAll('\\', '/') };
  }
  return defs;
}

function loadPalettes() {
  const mats = {};
  const dir = path.join(LPC, 'palette_definitions');
  for (const m of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!m.isDirectory()) continue;
    const meta = JSON.parse(fs.readFileSync(path.join(dir, m.name, `meta_${m.name}.json`), 'utf8'));
    const versions = {};
    for (const f of fs.readdirSync(path.join(dir, m.name))) {
      const hit = f.match(new RegExp(`^${m.name}_(\\w+)\\.json$`));
      if (hit) versions[hit[1]] = JSON.parse(fs.readFileSync(path.join(dir, m.name, f), 'utf8'));
    }
    mats[m.name] = { ...meta, versions };
  }
  return mats;
}

const git = (...a) => execFileSync('git', ['-C', LPC, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });

function loadTree() {
  return new Set(git('ls-tree', '-r', '--name-only', 'HEAD', 'spritesheets').split('\n').map((l) => l.replace(/^spritesheets\//, '')));
}

// ---------- every layer ref the game can ask for ----------

function allRefs() {
  const refs = new Map();
  const add = (ref, where) => {
    const key = layerKey(ref);
    if (!refs.has(key)) refs.set(key, { ref, where: [] });
    refs.get(key).where.push(where);
  };
  const fill = (ref, skin, hair) => ({ ...ref, color: ref.color === '$skin' ? skin : ref.color === '$hair' ? hair : ref.color });
  for (const [raceId, race] of Object.entries(RACES)) {
    for (const skin of race.skins) {
      add({ def: 'body', color: skin }, `race ${raceId}`);
      for (const b of race.builds) add({ def: b.head, color: skin }, `race ${raceId} head`);
      for (const e of race.extras) add(fill(e, skin), `race ${raceId} extra`);
    }
    for (const e of race.beard ?? []) for (const hair of HAIR_COLORS) add(fill(e, null, hair), `race ${raceId} beard`);
  }
  for (const s of HAIR_STYLES) for (const c of HAIR_COLORS) add({ def: s.def, color: c }, 'hair');
  for (const [cls, slots] of Object.entries(GEAR)) {
    for (const slot of SLOTS) {
      slots[slot.id].forEach((tier, i) => tier.forEach((ref) => add(ref, `${cls} ${slot.id} ${TIERS[i].name}`)));
    }
  }
  return refs;
}

// ---------- resolve one ref against the sheet definitions ----------

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function slotPalettes(mats, slot, color, issues, forced) {
  // source colours: an explicit list, or the material's base palette
  let from = slot.source;
  if (!from) {
    const meta = mats[slot.material];
    const [ver, name] = slot.base ? (slot.base.includes('.') ? slot.base.split('.') : [meta.default, slot.base]) : [meta.default, meta.base];
    from = meta.versions[ver]?.[name];
    if (!from) issues.push(`base palette ${slot.material}.${ver}.${name} not found`);
  }
  // target colours: first palette in the item's recolors list that has this name
  let to = null;
  for (const p of slot.palettes) {
    const [mat, ver] = p.includes('.') ? p.split('.') : [slot.material, p];
    to = mats[mat]?.versions[ver]?.[color];
    if (to) break;
  }
  if (!to) {
    const offered = slot.palettes.map((p) => {
      const [mat, ver] = p.includes('.') ? p.split('.') : [slot.material, p];
      return `${p}: ${Object.keys(mats[mat]?.versions[ver] ?? {}).join(' ')}`;
    });
    issues.push(`CHECK 2: colour "${color}" is not ${forced ? 'in' : 'offered by'} its recolors list (${offered.join(' | ')})`);
  }
  return from && to ? { from: from.map(hex), to: to.map(hex) } : null;
}

function resolve(ref, defs, mats, tree) {
  const issues = [], notes = [];
  const def = defs[ref.def];
  if (!def) return { ref, key: layerKey(ref), issues: [`no sheet definition named ${ref.def}`], notes, sublayers: [], credits: [] };

  const variantMode = !def.recolors;
  let variant = null, maps = [];
  if (variantMode && ref.force) {
    variant = (ref.variant ?? def.variants[0]).replaceAll(' ', '_');
    const m = slotPalettes(mats, { material: ref.force, palettes: [mats[ref.force].default] }, ref.color, issues, true);
    if (m) maps.push(m);
    notes.push(`forced ${ref.force} recolor to "${ref.color}": upstream ships this item in one fixed colour`);
  } else if (variantMode) {
    if (!(def.variants ?? []).includes(ref.color)) {
      issues.push(`CHECK 2: "${ref.color}" is not one of this item's variants (${(def.variants ?? []).join(', ')})`);
    }
    variant = String(ref.color).replaceAll(' ', '_');
  } else {
    const slots = def.recolors.material ? [def.recolors] : Object.keys(def.recolors).sort().map((k) => def.recolors[k]);
    [ref.color, ref.color2].forEach((c, i) => {
      if (!c) return;
      if (!slots[i]) return issues.push(`item has no recolor slot ${i + 1}`);
      const slot = i === 0 && ref.base ? { ...slots[i], base: ref.base } : slots[i];
      if (slot !== slots[i]) notes.push(`base colour overridden to "${ref.base}": the art does not match the definition's stated base`);
      const m = slotPalettes(mats, slot, c, issues, false);
      if (m) maps.push(m);
    });
  }
  const suffix = maps.length ? '.' + [ref.color, ref.color2].filter(Boolean).join('+').replaceAll(' ', '_') : '';

  const sublayers = [];
  const missingBody = new Set(), fallbackBody = new Set();
  const animSeen = new Set();
  const customFor = {};
  for (const k of Object.keys(def).filter((k) => /^layer_\d+$/.test(k)).sort((a, b) => a.slice(6) - b.slice(6))) {
    const layer = def[k];
    const custom = layer.custom_animation;
    if (custom && !CUSTOM[custom]) continue; // an animation the game does not use
    // some weapons ship two swings for one animation (slash and reverse slash): keep the first
    if (custom) {
      const base = CUSTOM[custom].anim;
      customFor[base] ??= custom;
      if (customFor[base] !== custom) continue;
    }
    const sub = { z: layer.zPos, custom, files: {} };
    for (const bt of BODY_TYPES) {
      let p = layer[bt];
      const other = (ref.bodies ?? BODY_FALLBACK)[bt];
      if (!p && other && layer[other]) {
        p = layer[other];
        fallbackBody.add(`${bt} draws the ${other} sheet`);
      }
      if (!p) { missingBody.add(bt); continue; }
      if (!p.endsWith('/')) p += '/';
      sub.files[bt] = {};
      for (const anim of ANIMS) {
        if (custom && CUSTOM[custom].anim !== anim) continue;
        const src = custom
          ? (variant ? `${p}${variant}.png` : `${p.slice(0, -1)}.png`)
          : (variant ? `${p}${anim}/${variant}.png` : `${p}${anim}.png`);
        if (!tree.has(src)) continue;
        sub.files[bt][anim] = { src, out: suffix ? src.replace(/\.png$/, `${suffix}.png`) : src };
        animSeen.add(anim);
      }
    }
    if (Object.values(sub.files).some((f) => Object.keys(f).length)) sublayers.push(sub);
  }
  for (const bt of missingBody) issues.push(`CHECK 1: no ${bt} files`);
  for (const f of fallbackBody) notes.push(`CHECK 1 swap: ${f}`);
  const noArt = ANIMS.filter((a) => !animSeen.has(a));
  if (noArt.length === ANIMS.length) issues.push('no image files found for any animation');
  else if (noArt.length) notes.push(`no ${noArt.join('/')} art: the item is not drawn during ${noArt.join('/')}`);

  const used = sublayers.flatMap((s) => Object.values(s.files).flatMap((f) => Object.values(f).map((x) => x.src)));
  let credits = (def.credits ?? []).filter((c) => used.some((u) => u.startsWith(c.file.replace(/\/?$/, '/')) || u.startsWith(c.file)));
  if (!credits.length) credits = def.credits ?? [];
  return { ref, key: layerKey(ref), def, issues, notes, sublayers, maps, credits };
}

function resolveAll() {
  const defs = loadDefs(), mats = loadPalettes(), tree = loadTree();
  const out = [];
  for (const { ref, where } of allRefs().values()) out.push({ ...resolve(ref, defs, mats, tree), where });
  return out;
}

// ---------- commands ----------

function report(resolved) {
  const lines = ['# Sprite looks check report', '', `Generated by \`node tools/sprites.mjs check\`. ${resolved.length} layers checked.`, ''];
  const problems = resolved.filter((r) => r.issues.length), noted = resolved.filter((r) => !r.issues.length && r.notes.length);
  lines.push(`## Failing checks (${problems.length})`, '');
  for (const r of problems) {
    lines.push(`- **${r.key}** (${[...new Set(r.where)].join('; ')})`);
    for (const i of r.issues) lines.push(`  - ${i}`);
    for (const n of r.notes) lines.push(`  - note: ${n}`);
  }
  lines.push('', `## Passing with notes (${noted.length})`, '');
  for (const r of noted) {
    lines.push(`- **${r.key}** (${[...new Set(r.where)].join('; ')})`);
    for (const n of r.notes) lines.push(`  - ${n}`);
  }
  lines.push('');
  fs.writeFileSync(path.join(ROOT, 'tools', 'looks-report.md'), lines.join('\n'));
  console.log(lines.join('\n'));
  console.log(`${problems.length} failing, ${noted.length} with notes, ${resolved.length - problems.length - noted.length} clean`);
  return problems.length;
}

function sources(resolved) {
  const map = new Map(); // out -> { src, maps }
  for (const r of resolved) {
    for (const s of r.sublayers) for (const f of Object.values(s.files)) for (const x of Object.values(f)) map.set(x.out, { src: x.src, maps: r.maps });
  }
  return map;
}

function fetch(resolved) {
  const files = [...new Set([...sources(resolved).values()].map((v) => v.src))];
  const patterns = ['/sheet_definitions/', '/palette_definitions/', '/CREDITS.csv', '/LICENSE', ...files.map((f) => '/spritesheets/' + f)];
  execFileSync('git', ['-C', LPC, 'sparse-checkout', 'set', '--no-cone', '--stdin'], { input: patterns.join('\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'] });
  console.log(`sparse checkout now holds ${files.length} layer images`);
}

function recolor(img, maps) {
  const d = img.data;
  let hits = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    search: for (const m of maps) {
      for (let c = 0; c < m.from.length; c++) {
        const f = m.from[c];
        if (Math.abs(d[i] - f[0]) <= 1 && Math.abs(d[i + 1] - f[1]) <= 1 && Math.abs(d[i + 2] - f[2]) <= 1) {
          d[i] = m.to[c][0]; d[i + 1] = m.to[c][1]; d[i + 2] = m.to[c][2];
          hits++;
          break search;
        }
      }
    }
  }
  return hits;
}

function bake(resolved) {
  const bad = resolved.filter((r) => r.issues.length);
  if (bad.length) {
    console.error(`Refusing to bake: ${bad.length} layers fail the checks. Run "check" and fix data/items.js or data/races.js.`);
    process.exit(1);
  }
  const want = sources(resolved);
  const hitsBySrcKey = new Map();
  fs.rmSync(OUT, { recursive: true, force: true });
  let bytes = 0;
  for (const [out, { src, maps }] of want) {
    const from = path.join(LPC, 'spritesheets', src);
    if (!fs.existsSync(from)) { console.error(`missing ${src}: run "fetch" first`); process.exit(1); }
    let buf = fs.readFileSync(from);
    if (maps.length) {
      const img = decodePng(buf);
      hitsBySrcKey.set(out, recolor(img, maps));
      buf = encodePng(img);
    }
    const to = path.join(OUT, out);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, buf);
    bytes += buf.length;
  }
  // a recolor that changed nothing means the base-colour assumption is wrong for that item
  for (const r of resolved) {
    if (!r.maps.length) continue;
    const outs = r.sublayers.flatMap((s) => Object.values(s.files).flatMap((f) => Object.values(f).map((x) => x.out)));
    if (outs.every((o) => !hitsBySrcKey.get(o))) console.warn(`WARNING ${r.key}: recolor matched no pixels`);
  }

  // manifest for sprite.js
  const layers = {};
  const usedCustom = {};
  for (const r of resolved) {
    layers[r.key] = r.sublayers.map((s) => {
      const sets = [], by = {};
      for (const bt of BODY_TYPES) {
        if (!s.files[bt]) continue;
        const set = Object.fromEntries(Object.entries(s.files[bt]).map(([a, x]) => [a, x.out]));
        const json = JSON.stringify(set);
        let idx = sets.findIndex((x) => JSON.stringify(x) === json);
        if (idx < 0) idx = sets.push(set) - 1;
        by[bt] = idx;
      }
      if (s.custom) usedCustom[s.custom] = CUSTOM[s.custom];
      return { z: s.z, ...(s.custom ? { c: s.custom } : {}), b: by, f: sets };
    });
  }
  const mats = loadPalettes();
  const mid = (mat, names) => Object.fromEntries(names.map((n) => [n, mats[mat].versions[mats[mat].default][n]?.[3]]));
  const swatches = { skin: mid('body', [...new Set(Object.values(RACES).flatMap((r) => r.skins))]), hair: mid('hair', HAIR_COLORS) };
  const head = '// GENERATED by tools/sprites.mjs bake. Do not edit by hand.\n';
  fs.writeFileSync(path.join(ROOT, 'data', 'sprite-layers.js'),
    `${head}// Draw order (z), oversize animation (c), body type -> file set index (b), file sets by animation (f).\n` +
    `export const CUSTOM_ANIMS = ${JSON.stringify(usedCustom)};\n\n// A mid-tone of each skin and hair palette, for colour buttons.\nexport const SWATCHES = ${JSON.stringify(swatches)};\n\nexport const LAYERS = ${JSON.stringify(layers, null, 0).replaceAll('],"', '],\n"')};\n`);

  // credits
  const commit = git('rev-parse', 'HEAD').trim();
  const byDef = new Map();
  for (const r of resolved) if (!byDef.has(r.ref.def)) byDef.set(r.ref.def, r);
  const items = [...byDef.values()].sort((a, b) => a.def._file.localeCompare(b.def._file)).map((r) => ({
    name: r.def.name, def: r.def._file,
    credits: r.credits.map((c) => ({ file: c.file, notes: c.notes ?? '', authors: c.authors ?? [], licenses: c.licenses ?? [], urls: c.urls ?? [] })),
  }));
  fs.writeFileSync(path.join(ROOT, 'data', 'credits.js'), `${head}export const LPC_COMMIT = '${commit}';\nexport const CREDITS = ${JSON.stringify(items, null, 1)};\n`);
  const authors = [...new Set(items.flatMap((i) => i.credits.flatMap((c) => c.authors)))].sort((a, b) => a.localeCompare(b));
  const licenses = [...new Set(items.flatMap((i) => i.credits.flatMap((c) => c.licenses)))].sort();
  const md = [
    '# Credits', '',
    'Tavernborn\'s hero sprites are built from Liberated Pixel Cup (LPC) art, taken from the',
    '[Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)',
    `at commit \`${commit}\`.`, '',
    'This file is generated by `node tools/sprites.mjs bake` from the `credits` entries in the sheet',
    'definitions of exactly the layers copied into `assets/lpc/`. Do not edit it by hand.', '',
    'Many layers were recolored with the generator\'s own palettes before being saved here. Those recolored',
    `images are derivative works and are offered under the same licenses as their sources (${licenses.join(', ')}).`,
    'The generator repository README explains how to comply when a piece lists several licenses.', '',
    '## Artists', '', authors.join(', ') + '.', '',
    '## Layers', '',
  ];
  for (const it of items) {
    md.push(`### ${it.name}`, '', `Definition: \`${it.def}\``, '');
    for (const c of it.credits) {
      md.push(`- \`${c.file}\``);
      if (c.notes) md.push(`  - Notes: ${c.notes}`);
      md.push(`  - Authors: ${c.authors.join(', ')}`, `  - Licenses: ${c.licenses.join(', ')}`);
      for (const u of c.urls) md.push(`  - ${u}`);
    }
    md.push('');
  }
  fs.writeFileSync(path.join(ROOT, 'CREDITS.md'), md.join('\n'));
  console.log(`baked ${want.size} images (${(bytes / 1048576).toFixed(1)} MB), ${Object.keys(layers).length} layers, credits for ${items.length} items by ${authors.length} artists`);
}

if (!['check', 'fetch', 'bake'].includes(cmd)) {
  console.log('usage: node tools/sprites.mjs <check|fetch|bake> [--lpc <path to LPC generator clone>]');
  process.exit(1);
}
if (!fs.existsSync(path.join(LPC, 'sheet_definitions'))) {
  console.error(`No LPC generator clone at ${LPC}. See tools/README.md.`);
  process.exit(1);
}
const resolved = resolveAll();
if (cmd === 'check') process.exit(report(resolved) ? 2 : 0);
if (cmd === 'fetch') fetch(resolved);
if (cmd === 'bake') bake(resolved);
