// The writing check (Phase 7): node tools/check-text.mjs [--list]
// Gathers every line of game text a player can read (the data files, plus the string literals in
// js/ and js/ui/) and holds it to the design doc's "Humor and voice" rules:
//   - no exclamation marks, no emoji, no internet or pop-culture words
//   - no breaking the fourth wall in story text (players, games, clicking) and no mocking the hero
//   - British spelling, as most of the game is written (colour, armour, grey, travelled); -ize
//     endings are kept, as in Oxford spelling (apologized, recognize)
//   - every {placeholder} is one the game fills in
//   - task bar lines fit a phone: 70 characters at most
//   - Chronicle and Bestiary sentences end with a full stop (or a closing quote or question mark)
//   - no line is written twice in the same list
// `--list` prints every gathered line, for reading the whole script in one place.
// `checkText()` is also called by tools/check-sim.mjs. Dev-only: the game never loads this file.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Data files that hold player-facing text. Sprite layers, credits, and items are generated or art.
const DATA = ['chronicle', 'monsters', 'quests', 'dungeons', 'story', 'regions', 'races', 'classes', 'names', 'loot', 'tavern', 'skills-fighter', 'skills-wizard', 'skills-rogue', 'skills-cleric', 'road', 'market', 'deeds'];
// Keys whose values are code, not text.
const NOT_TEXT = new Set(['id', 'def', 'color', 'type', 'source', 'scope', 'on', 'kind', 'cls', 'slot', 'main', 'priority', 'check_', 'body', 'head', 'hair', 'beard', 'skin', 'skins', 'builds', 'extras', 'region', 'requires', 'attack', 'icon', 'legend', 'tone']);
// Keys whose text is a task-bar line (shown in one or two lines on a phone).
const TASK_KEYS = new Set(['tasks', 'roomTasks', 'TAVERN_TASKS', 'TRAVEL_TASKS', 'CAMP_TASKS', 'steps']);
// Keys whose text is a full sentence in the Chronicle or the Bestiary.
const SENTENCE_KEYS = new Set(['hit', 'miss', 'crit', 'fumble', 'ko', 'about', 'learn', 'fire', 'done', 'win', 'enter', 'chosen', 'flavor', 'arrive', 'bought']);
// Placeholders the game fills in.
const FILLED = new Set(['tavern', 'deed', 'when', 'name', 'level', 'cost', 'points', 'monster', 'place', 'dungeon', 'quest', 'breath', 'notice', 'item', 'old', 'gold', 'slot', 'flavor', 'title', 'rank', 'floor', 'worst', 'weapon', 'trophy', 'done', 'does', 'he', 'she']);

const BANNED = [
  /!/, /\p{Extended_Pictographic}/u,
  /\b(awesome|epic|lol|lmao|omg|wtf|meme|memes|vibes?|dude|bro|yay|woohoo|haha|okay|ok|cool|literally|totally|noob|pwned|level up|loot box|respawn|nerf|buff|grind|grinding|DLC|NPC|XP farm)\b/i,
  /\b(Star Wars|Tolkien|Gandalf|Hogwarts|Pokemon|Pokémon|Marvel|Batman|Netflix|Monty Python|Game of Thrones|Skyrim|Zelda|Mario|internet|email|smartphone|selfie|wifi)\b/i,
];
const MOCKING = /\b(stupid|idiot|idiotic|moron|dumb|incompetent|useless|pathetic|loser|fool)\b/i;
const FOURTH_WALL = /\b(player|players|the game|video game|click|tap|save file|savegame|button)\b/i;
// ("Divine Favor" is the 5e spell's own name and stays as it is.)
const US_SPELLING = /\b(color|colors|colored|armor|armored|gray|honor|honored|favorite|behavior|neighbor|neighbors|center|traveled|traveling|traveler|travelers|defense|offense|analyze|cozy|mold|plow|theater|meter)\b/;
const TASK_MAX = 70;

// Walk any value and collect its strings with a path, e.g. "monsters.mugwick.0.hit.1".
function collect(value, path, out, key = '') {
  if (typeof value === 'string') { out.push({ path, key, text: value }); return; }
  if (Array.isArray(value)) { value.forEach((v, i) => collect(v, `${path}.${i}`, out, key)); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (NOT_TEXT.has(k) || typeof v === 'number' || typeof v === 'boolean') continue;
      collect(v, `${path}.${k}`, out, k);
    }
  }
}

// String literals in the UI and rules code: anything with a space and a capital letter or a full
// stop is taken to be text a player reads. Template literals count, minus their ${...} parts.
function codeStrings(file) {
  const src = fs.readFileSync(ROOT + file, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const m of src.matchAll(re)) {
    let text = (m[1] ?? m[2] ?? m[3] ?? '');
    if (m[3] != null) text = text.replace(/\$\{[^}]*\}/g, '…');
    if (!/ /.test(text) || !/[A-Z.]/.test(text) || /^[\w.-]+( [\w.-]+)*$/.test(text) && !/[A-Z]/.test(text)) continue;
    if (/^(\.|#|\[|@|M-?\d|[a-z-]+\(|rgba?\(|https?:)/.test(text) || /=>|\bfunction\b|querySelector|\.js\b|px\b/.test(text)) continue;
    out.push({ path: file, key: 'code', text });
  }
  return out;
}

export async function gather() {
  const lines = [];
  for (const name of DATA) {
    const mod = await import(new URL(`../data/${name}.js`, import.meta.url));
    for (const [exp, value] of Object.entries(mod)) {
      if (/_BY_ID$|INDEX$|^START_|^BODY_TYPES$|^HAIR_COLORS$|^LPC_/.test(exp)) continue;
      collect(value, `${name}.${exp}`, lines, exp);
    }
  }
  const code = ['js/ui/hero.js', 'js/ui/map.js', 'js/ui/skills.js', 'js/ui/gear.js', 'js/ui/tavern.js', 'js/ui/create.js', 'js/ui/away.js', 'js/ui/story.js', 'js/ui/legacy.js', 'js/ui/settings.js', 'js/ui/credits.js', 'js/ui/scene-fx.js', 'js/ui/foes.js', 'js/ui/common-room.js', 'js/ui/bosses.js', 'js/road.js', 'js/deeds.js', 'js/boons.js', 'js/tasks.js', 'js/tavern.js', 'js/loot.js', 'js/skills.js', 'js/hero.js', 'js/state.js', 'js/main.js'];
  for (const f of code) if (fs.existsSync(ROOT + f)) lines.push(...codeStrings(f));
  return lines;
}

export async function checkText() {
  const lines = await gather();
  const problems = [];
  const flag = (l, why) => problems.push(`${l.path}: ${why}: "${l.text.length > 90 ? l.text.slice(0, 87) + '...' : l.text}"`);
  const story = (l) => l.key !== 'code';
  const seen = new Map();
  for (const l of lines) {
    const t = l.text;
    for (const re of BANNED) if (re.test(t)) flag(l, `breaks the voice (${t.match(re)[0]})`);
    if (MOCKING.test(t)) flag(l, `mocks someone (${t.match(MOCKING)[0]})`);
    if (story(l) && FOURTH_WALL.test(t) && !/^(skills|loot)\./.test(l.path.split('.')[0] + '.') ) {
      // Skill descriptions and the Tavern's plain instructions may talk about the game; story text may not.
      if (!['text', 'blurb', 'later', 'about'].includes(l.key) || /story|chronicle|monsters|quests|dungeons/.test(l.path)) flag(l, `breaks the fourth wall (${t.match(FOURTH_WALL)[0]})`);
    }
    if (US_SPELLING.test(t)) flag(l, `American spelling (${t.match(US_SPELLING)[0]})`);
    for (const m of t.matchAll(/\{(\w+)\}/g)) if (!FILLED.has(m[1])) flag(l, `unknown placeholder {${m[1]}}`);
    if (/ {2,}|^\s|\s$/.test(t) && story(l)) flag(l, 'stray spaces');
    if (TASK_KEYS.has(l.key) && t.length > TASK_MAX) flag(l, `task line longer than ${TASK_MAX} characters (${t.length})`);
    if (SENTENCE_KEYS.has(l.key) && !/[.?'"’”)]$/.test(t)) flag(l, 'sentence without a full stop');
    if (story(l) && /\.\./.test(t.replace(/\.\.\./g, ''))) flag(l, 'double full stop');
    // The same line twice in one list.
    const list = l.path.replace(/\.\d+$/, '');
    if (list !== l.path) {
      const k = list + '\u0000' + t;
      if (seen.has(k)) flag(l, 'written twice in the same list');
      seen.set(k, true);
    }
  }
  return { lines, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { lines, problems } = await checkText();
  if (process.argv.includes('--list')) for (const l of lines) console.log(`${l.path}\t${l.text}`);
  const words = lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
  console.log(`${lines.length} lines of text, about ${words.toLocaleString('en-US')} words.`);
  for (const p of problems) console.log('  ' + p);
  console.log(problems.length ? `${problems.length} problem(s).` : 'No problems: the text keeps to the Humor and voice rules.');
  process.exit(problems.length ? 1 : 0);
}
