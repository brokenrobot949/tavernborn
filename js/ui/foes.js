// The foes on the Hero tab's scene, as pixel art (v2 of the dark shapes). LPC has no monsters, so
// each kind is a small hand-drawn map, facing left toward the hero. The outline is added in code
// round every filled pixel, as LPC draws its own, and the map is drawn on a canvas with smoothing
// off at the same size of pixel as the hero. Colours come from a palette per kind, changed for
// particular monsters by name (`VARIANTS`): a drowned clerk is grey-blue, a toll ogre is an ogre.
//
// Map letters: a main, b shade, c light, d second colour, e eyes, f skin, k dark, w bone, teeth,
// or metal. '.' is empty.

const OUTLINE = '#1c1418';

const MAPS = {
  humanoid: { px: 4, map: [
    '.......aaaa.......',
    '......acaaaa......',
    '.....acaaaaaa.....',
    '.....aakkkkaa.....',
    '....aakfffkkaa....',
    '....aakefefkaa....',
    '....aakfffkkaa....',
    '.....aakffkaa.....',
    '......aaaaaa......',
    '....aaaaaaaaaa....',
    '...acaaaaaaaaba...',
    '..acaabaaaabaaba..',
    '..ac.abaaaab.aba..',
    '..ff.abaaaab..ff..',
    '.ww..abaaaab......',
    '.ww..ddddddd......',
    '.ww..abaaaab......',
    '.ww..abbaabb......',
    '.....abb.abb......',
    '.....abb.abb......',
    '.....abb.abb......',
    '.....abb.abb......',
    '.....kkk.kkk......',
    '....kkkk.kkkk.....',
  ], pal: { a: '#5a4a6a', b: '#3e3250', c: '#7a6a8a', d: '#7a5a2a', e: '#ff5a3a', f: '#c99a7a', k: '#2a2026', w: '#b8b8c4' } },
  small: { px: 4, map: [
    '..aa........aa..',
    '..aaa.aaaa.aaa..',
    '...aaaaaaaaaa...',
    '....acaaaaaa....',
    '....aeaaaeaa....',
    '....aaaaaaab....',
    '....awwwwaab....',
    '.....aaaaab.....',
    '......dddd......',
    '....dddddddd....',
    '...aadddddddaa..',
    '..aa.dddddd..aa.',
    '.kk..dddddd.....',
    '.kk..kkkkkk.....',
    '.kk..aa..aa.....',
    '.....aa..aa.....',
    '.....ab..ab.....',
    '....kkk..kkk....',
  ], pal: { a: '#6f9a3a', b: '#4f7a2a', c: '#8fb85a', d: '#7a5a3a', e: '#ffd040', k: '#3a2a20', w: '#f0ead0' } },
  big: { px: 5, map: [
    '.........aaaaaa...........',
    '........acaaaaaa..........',
    '........aeaaaeaa..........',
    '........aaaaaaab..........',
    '........awwwwaab..........',
    '.......dddaaaaddd.........',
    '.....aaaddddddddaaaa......',
    '....acaaaddddddddaaaaa....',
    '...acaaaaaddddddaaaaaab...',
    '..aaa.aaaaaaaaaaaaa.aaab..',
    '..aaa.aaaaaaaaaaaaa..aab..',
    '.aaa..aacaaaaaaaaab...aab.',
    '.ff...aacaaaaaaaaab...aff.',
    'kkk...aaaaaaaaaaaab....ff.',
    'kkkk..aaaaaaaaaaaab.......',
    'kkkk..dddddddddddddd......',
    '.kkk..dddddddddddddd......',
    '..kk..aaaaaa..aaaaab......',
    '..kk..aaaaab..aaaaab......',
    '..kk..aaaaab..aaaaab......',
    '......aaaab....aaaab......',
    '......aaaab....aaaab......',
    '......aaaab....aaaab......',
    '.....kkkkkk...kkkkkk......',
  ], pal: { a: '#a08c5c', b: '#76643e', c: '#c0ac7c', d: '#6a4a2a', e: '#ff5a3a', f: '#a08c5c', k: '#4a3020', w: '#f0ead0' } },
  beast: { px: 4, map: [
    '...aa.....................',
    '..aaaa....................',
    '.aacaaa...................',
    'aaeaaaaa......cccccc......',
    'kaaaaaaaaaacccaaaaaaaac...',
    'waaaaaaaaaaaaaaaaaaaaaaaa.',
    '.wwaaaaaaaaaaaaaaaaaaaaaaa',
    '...aaaaaaaaaaaaaaaaaaaab.a',
    '....bbaaaabbbbbbbbaaaab..a',
    '.....baab........baab.....',
    '.....baab........baab.....',
    '.....bab..........bab.....',
    '.....kk...........kk......',
  ], pal: { a: '#6a5444', b: '#4a3a2e', c: '#8a7460', e: '#ffcc40', k: '#2a2020', w: '#f0ead0' } },
  critter: { px: 4, map: [
    '....aa............',
    '...acaa...........',
    '..aaaaacccccaa....',
    '.aeaaaaaaaaaaaa...',
    'kaaaaaaaaaaaaaab..',
    '.waaaaaaaaaaaab.ddd',
    '...bb.bb...bb.b...d',
    '...k..k....k..k....',
  ], pal: { a: '#7a6a5a', b: '#5a4a3e', c: '#9a8a78', d: '#c08080', e: '#ff4040', k: '#2a2020', w: '#f0ead0' } },
  bird: { px: 4, map: [
    '..........aa.....aa...',
    '.........acaa...caa...',
    '..aaa....aaaaa.aaaa...',
    '.aeaa.....aaaaaaaa....',
    'ddaaa......aaaaaa.....',
    'ddaaa.....aaaaaaaa....',
    '...aa....aaaaaaaaab...',
    '...aaa..aaaaaaaaaab...',
    '....aaaaaaaaaaaaab....',
    '.....aaaaaaaaaaab.....',
    '.......bbbbbbbb.......',
    '........d....d........',
    '........d....d........',
    '.......dd...dd........',
  ], pal: { a: '#e8e2d8', b: '#b8b0a4', c: '#ffffff', d: '#e08a2a', e: '#202020' } },
  tree: { px: 4, map: [
    '......cccccc..........',
    '....cccaaaaacc........',
    '...caaaaaaaaaac.......',
    '..caaaaaaaaaaaab......',
    '.caaaaaaaaaaaaaab.....',
    '.aaaaaaaaaaaaaaab.....',
    '.aaaaaaaaaaaaaabb.....',
    '..aaabbaaaaaabbb......',
    '....bbbkkkkkbb........',
    '.......kkkkk..........',
    '......kekkekk.........',
    '......kkkkkkk.........',
    '..kk..kkwwwkk..kk.....',
    '...kk.kkkkkkk.kk......',
    '....kkkkkkkkkkk.......',
    '......kkkkkkk.........',
    '......kkkkkkk.........',
    '......kkk.kkk.........',
    '.....kkk...kkk........',
    '....kkk.....kkk.......',
  ], pal: { a: '#4f7a3a', b: '#3a5a2a', c: '#6f9a4a', e: '#ffcc40', k: '#5a3e26', w: '#2a1a10' } },
  blob: { px: 4, map: [
    '........cccc..........',
    '......caaaaaac........',
    '.....caaaaaaaac.......',
    '....caaaaaaaaaab......',
    '....aaeaaaaeaaab......',
    '...aaaaaaaaaaaaab.....',
    '...aaaawwwwwaaaab.....',
    '..aaaaaaaaaaaaaaab....',
    '.aaaaaaaaaaaaaaaaab...',
    'aaaaaaaaaaaaaaaaaabb..',
    '.bbbbbbbbbbbbbbbbbb...',
  ], pal: { a: '#9ab83a', b: '#6a8a2a', c: '#c8e070', e: '#2a2a10', w: '#2a2a10' } },
  spider: { px: 4, map: [
    '..........aaaaaa..........',
    '....k....acaaaaaa....k....',
    '...k.k..acaaaaaaaa..k.k...',
    '..k...kaaaaaaaaaaaak...k..',
    '.k.....aaaaaaaaaaaa.....k.',
    'k..eeaaaaaaaaaaaaaab.....k',
    '...eeaaaaaaaaaaaaab.......',
    '..kkaaaaabbbbbbbbb.kk.....',
    '.k..k.k..k....k..k..k.....',
    'k...k..k..k..k..k...k.....',
    '....k...k..k.k..k....k....',
  ], pal: { a: '#3a3040', b: '#2a2030', c: '#5a4a62', e: '#ff3a3a', k: '#2a2030' } },
  flame: { px: 4, map: [
    '.......d........',
    '......dd........',
    '......ddd....d..',
    '.....dcdd...dd..',
    '.....dccd..ddd..',
    '....dcccdd.dcd..',
    '...ddcccccddcd..',
    '..ddccwwccccdd..',
    '..dccwwwwcccdd..',
    '.ddccwwwwwccdd..',
    '.dcccweewecccd..',
    '.dccccwwwwcccd..',
    '.ddcccccccccdd..',
    '..ddccccccccd...',
    '...dddcccddd....',
    '.....ddddd......',
  ], pal: { d: '#e0602a', c: '#ffb040', w: '#fff0b0', e: '#5a2010' } },
  eye: { px: 4, map: [
    '.....aaaaaaaaa......',
    '...aacaaaaaaaaaa....',
    '..aaaweaaaaaweaaa...',
    '.aaaaaaaawwwaaaaaa..',
    '.aawe.aaawwwwaaaaaa.',
    'aaaaaaaawwkkwwaaaaa.',
    'aaaaaaaawwkkwwaaweaa',
    'aaaaaaaaawwwwaaaaaa.',
    '.aaaaaaaaawwaaaaaab.',
    '.aawe.aaaaaaaaaaab..',
    '..aaaaaaaaaaaaaab...',
    '...abbbbbbbbbbbb....',
    '....b..b..b..b......',
    '...b..b...b...b.....',
    '..b...b...b....b....',
  ], pal: { a: '#7a4a8a', b: '#5a3a6a', c: '#9a6aaa', e: '#ff4040', k: '#1a1020', w: '#f0e8f0' } },
  dragon: { px: 4, map: [
    '...aa....................cc.........',
    '..aaaa..................cccc........',
    '.aaeaaa................ccccccc......',
    'aaaaaaaa..............cccccccccc....',
    'waaaaaaab............ccccbbbbcccc...',
    '.wwaaaaaab..........cccbb....bbccc..',
    '...aaaaaaab........ccbb........bcc..',
    '.....aaaaaab......aaab..............',
    '......aaaaaab...aaaaaaaa............',
    '.......aaaaaaaaaaaaaaaaaaa..........',
    '........aaaaaaaaaaaaaaaaaaaa........',
    '........aaaddddddddaaaaaaaaaaa......',
    '.........addddddddddaaaaaaaaaaab....',
    '.........adddddddddaaaaaaaaaaaaab...',
    '..........aaaaaaaaaaaabbaaaaaaaaab..',
    '..........aab..aab.......bbaaaaaaab.',
    '..........aab..aab..........bbaaaaab',
    '.........kkk..kkk.............bbaaab',
    '................................bab.',
  ], pal: { a: '#8a2a2a', b: '#5a1a1a', c: '#b05040', d: '#d8a050', e: '#ffcf4a', k: '#2a1a1a', w: '#f0ead0' } },
};
export const FOE_SHAPES = Object.keys(MAPS);

// Colours for particular monsters, matched on the name (first match wins).
const VARIANTS = [
  [/drown|clerk|tenant|restless/i, { a: '#7a8a9a', b: '#5a6a7a', c: '#9aaab8', f: '#b8c8c0' }],
  [/mumm|usher/i, { a: '#c8b890', b: '#a09068', c: '#e0d4b0', f: '#c8b890', k: '#6a5a40' }],
  [/cultist|arch-cultist/i, { a: '#8a2a2a', b: '#5a1a1a', c: '#b04a3a' }],
  [/pirate|smuggler|press/i, { a: '#2f4a6a', b: '#1f3450', c: '#4a6a8a' }],
  [/hag/i, { a: '#4a6a4a', b: '#2f4a2f', c: '#6a8a6a', f: '#8aa07a' }],
  [/dwarf|collector/i, { a: '#6a5a4a', b: '#4a3e32', c: '#8a7a66', f: '#d8a888' }],
  [/spider/i, {}],
  [/scorpion/i, { a: '#b8803a', b: '#8a5a2a', c: '#d8a05a', k: '#6a4020' }],
  [/wolf/i, { a: '#6a6a72', b: '#4a4a52', c: '#8a8a92' }],
  [/camel|goat|mule|sphinx/i, { a: '#a08050', b: '#7a5a38', c: '#c0a070' }],
  [/crab/i, { a: '#c04a2a', b: '#8a2a1a', c: '#e06a4a' }],
  [/gull/i, { a: '#e8e8f0', b: '#a8a8b8' }],
  [/harpy/i, { a: '#8a6a5a', b: '#6a4a3a', c: '#aa8a7a' }],
  [/ash drake|drake clerk/i, { a: '#5a5a62', b: '#3a3a42', c: '#7a7a82', d: '#c08040' }],
  [/salamander/i, { a: '#d0602a', b: '#a0401a', c: '#f08a4a', d: '#ffd060' }],
  [/troll/i, { a: '#5a7a5a', b: '#3a5a3a', c: '#7a9a7a', f: '#5a7a5a' }],
  [/giant/i, { a: '#c09a7a', b: '#9a7a5a', c: '#d8b898', f: '#c09a7a', d: '#5a6a3a' }],
  [/guardian/i, { a: '#9a8a3a', b: '#6a5a2a', c: '#c8b85a', d: '#4a3a20' }],
  [/stalactite/i, { a: '#6a6a72', b: '#4a4a52', c: '#8a8a92', k: '#4a4a52' }],
  [/toadstool|myconid/i, { a: '#c04a3a', b: '#8a2a2a', c: '#e8dcc0', k: '#e8dcc0', w: '#5a3e26' }],
  [/scarecrow/i, { a: '#c8a050', b: '#9a7a38', c: '#e0c070', k: '#6a4a2a' }],
  [/sleep-talking|oak|bramble/i, {}],
  [/mimic/i, { a: '#8a5a2a', b: '#5a3a1a', c: '#c9962c', w: '#f0ead0' }],
  [/bog/i, { a: '#5a6a3a', b: '#3e4a2a', c: '#7a8a5a' }],
  [/leech/i, { a: '#4a2a3a', b: '#2f1a26', c: '#6a4a5a', w: '#c08080' }],
  [/dust devil/i, { d: '#b08a5a', c: '#d8c090', w: '#f0e8d8' }],
  [/wisp/i, { d: '#2a9a9a', c: '#80e8d0', w: '#e0fff8', e: '#0a3a3a' }],
  [/boar|owlbear/i, { a: '#5a4030', b: '#3e2c20', c: '#7a5a44' }],
  [/goose/i, {}],
  [/rat\b/i, {}],
  [/goblin|sprite/i, {}],
];
// The Rifts: everything in it is the colour of the place.
const RIFT_PAL = { a: '#4a3a6a', b: '#32264a', c: '#6a5a8a', d: '#8a6aff', e: '#e0c0ff', f: '#8a7aaa', k: '#2a1e3a', w: '#d8c8ff' };
// Bosses have gold eyes.
const BOSS_EYES = '#ffcf4a';

// A canvas with one foe drawn on it, one canvas pixel per map pixel plus a pixel of outline all
// round. `name` picks the colours; `kind` is 'rift' or 'boss' for those palettes.
export function foeCanvas(shape, name = '', kind = '') {
  const m = MAPS[shape] ?? MAPS.humanoid;
  let pal = { ...m.pal };
  if (kind === 'rift') pal = { ...pal, ...RIFT_PAL };
  else for (const [re, over] of VARIANTS) if (re.test(name)) { pal = { ...pal, ...over }; break; }
  if (kind === 'boss') pal.e = BOSS_EYES;
  const w = Math.max(...m.map.map((r) => r.length));
  const h = m.map.length;
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? m.map[y][x] ?? '.' : '.');
  const c = document.createElement('canvas');
  c.width = w + 2;
  c.height = h + 2;
  c.className = 'foe-px';
  c.style.width = `${(w + 2) * m.px}px`; // `px` screen pixels to a map pixel: 4, as the hero is drawn
  const g = c.getContext('2d');
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const ch = at(x, y);
      let color = ch !== '.' ? pal[ch] : null;
      if (!color && (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.')) color = OUTLINE;
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  return c;
}
