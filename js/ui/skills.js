// Skills tab, in the manner of an old player's handbook. A header with the hero and the points to spend; three
// ribbon bookmarks, one per branch (Might red, Guard blue, Fortune gold); the branch drawn as its five rows of
// seals (js/skills.js, `ROWS`): a round seal for a passive, with pips for its ranks; a diamond for a signature move,
// the two of a fork joined by "or"; a great star for the capstone. Learned seals are pressed in the branch's colour
// and keep a low glow. Tapping a seal opens its card under the tree, set like a handbook's sidebar, with the rule,
// its Chronicle line, and the Learn (or Raise) button.
// "What they do" adds every learned skill up into a stat block, with how often each move has fired
// (`hero.fired`). Subclass and Abilities show only while they wait.
// Everything here is banked until the player spends it; nothing on this tab ever blocks the hero.
// The tab only calls learnSkill, chooseSubclass (skills.js) and raiseAbility (hero.js), the same
// functions the simulator's stand-in player uses.

import { CLASSES } from '../../data/classes.js';
import { RACES } from '../../data/races.js';
import { ABILITIES, ABILITY_NAMES, ABILITY_MAX, ABILITY_LEVELS, MAX_LEVEL, mod, proficiency } from '../rules.js';
import { raiseAbility } from '../hero.js';
import {
  SKILL_BY_ID, treeFor, whyNot, learnSkill, canChooseSubclass, chooseSubclass, pointsIn, rankOf, pending, subclassName, skillMods,
  MAX_SKILLS, ROWS, ROW_GATE, branchPoints, SUBCLASS_LEVEL, BRANCH_KINDS,
} from '../skills.js';
import { el, pressBtn, confirmBtn, signed } from './dom.js';
import { icon } from './icons.js';

const ABILITY_USE = {
  str: 'Fighter and Barbarian rolls', dex: 'Rogue and Ranger rolls, dodging', con: 'Hit points, shorter knockouts',
  int: 'Wizard rolls, a little XP', wis: 'Cleric rolls, quest checks', cha: 'Gold',
};
const KIND_NOTE = { might: 'hits harder', guard: 'survives longer', fortune: 'earns more' };
const KIND_ICON = { might: 'swords', guard: 'offhand', fortune: 'coin' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A medallion's picture, from what the skill does: its signature move's type, or else its first number.
const SIG_ICON = {
  autoWin: 'swords', reroll: 'repeat', turn: 'vortex', advantage: 'd20', clearRoom: 'door', skipRoom: 'door',
  shortcut: 'compass', hiddenRoom: 'lantern', negate: 'offhand', cheatDeath: 'heart', secondWind: 'heart',
  roomHeal: 'heart', shortRest: 'bed', freeBossHit: 'horse', smite: 'bolt', bossShield: 'offhand',
  bossPurse: 'coin', windfall: 'coin', bonusLoot: 'trinket', onCrit: 'star',
};
const FX_ICON = [
  [/^roll/, 'target'], [/^crit/, 'bolt'], [/^missReward$/, 'repeat'], [/^xp/, 'book'], [/^gold|^potionPrice$/, 'coin'],
  [/^dr/, 'offhand'], [/^dodge$/, 'cloak'], [/^hp/, 'heart'], [/^rest$|^recovery$/, 'bed'], [/^potion/, 'potion'],
  [/^speed/, 'hourglass'], [/^quality$/, 'eye'], [/^travel$/, 'boots'], [/^rooms$/, 'compass'],
];
function skillIcon(s) {
  if (s.sig) return SIG_ICON[s.sig.type] ?? 'spark';
  const key = Object.keys(s.fx ?? {})[0] ?? '';
  return FX_ICON.find(([re]) => re.test(key))?.[1] ?? 'spark';
}

// "What they do": every number the learned skills add up to, in plain words. Each line is [key, words].
const pct = (v) => `${Math.round(v * 100)}%`;
const times = (x) => (x === 2 ? 'double' : x === 3 ? 'three times' : `${+x.toFixed(2)} times`);
const SUMMARY = [
  ['Rolls', [['roll', (v) => `+${v} on every roll`], ['rollRoam', (v) => `+${v} against roaming monsters`], ['rollQuest', (v) => `+${v} on quests`], ['rollDelve', (v) => `+${v} in dungeon rooms`], ['rollBoss', (v) => `+${v} against bosses`]]],
  ['Critical hits', [['crit', (v) => `on a ${20 - v} or better`], ['critReward', (v) => `pay ${times(1.5 + v)} the reward`]]],
  ['Failed rolls', [['missReward', (v) => `pay ${pct(0.5 + v)} of the reward`]]],
  ['Experience', [['xp', (v) => `${pct(v)} more from everything`], ['xpRoam', (v) => `${pct(v)} more from roaming`], ['xpQuest', (v) => `${pct(v)} more from quests`], ['xpDelve', (v) => `${pct(v)} more from dungeon rooms`], ['xpBoss', (v) => `${pct(v)} more from bosses`]]],
  ['Gold', [['gold', (v) => `${pct(v)} more from everything`], ['goldRoam', (v) => `${pct(v)} more from roaming`], ['goldQuest', (v) => `${pct(v)} more from quests`], ['goldDelve', (v) => `${pct(v)} more from dungeon rooms`], ['goldBoss', (v) => `${pct(v)} more from bosses`], ['potionPrice', (v) => `potions ${pct(v)} cheaper`]]],
  ['Damage taken', [['dr', (v) => `${pct(v)} less everywhere`], ['drRoam', (v) => `${pct(v)} less while roaming`], ['drQuest', (v) => `${pct(v)} less on quests`], ['drDelve', (v) => `${pct(v)} less in dungeon rooms`], ['drBoss', (v) => `${pct(v)} less from bosses`], ['drTrap', (v) => `${pct(v)} less from traps`]]],
  ['Dodging', [['dodge', (v) => `a ${pct(v)} chance to halve a hit`]]],
  ['Hit points', [['hp', (v) => `${pct(v)} more`], ['hpLevel', (v) => `+${v} a level`]]],
  ['Healing', [['rest', (v) => `rests heal ${pct(v)} more`], ['potion', (v) => `potions heal ${pct(v)} more`], ['potions', (v) => `${plural(v, 'more potion')} each dungeon run`]]],
  ['Speed', [['speedRoam', (v) => `monster tasks ${pct(v)} quicker`], ['speedQuest', (v) => `quest steps ${pct(v)} quicker`], ['speedDelve', (v) => `dungeon rooms ${pct(v)} quicker`], ['travel', (v) => `travel ${pct(v)} quicker`], ['recovery', (v) => `knockouts ${pct(v)} shorter`], ['rooms', (v) => `${plural(v, 'room')} fewer each dungeon run`]]],
  ['Finds', [['quality', (v) => `${+v.toFixed(1)} of a rarity step better`]]],
];
// What a move has done so far, in words that fit the move: [the words before the number, one, many].
const DONE = {
  autoWin: ['Settled', 'fight outright', 'fights outright'], reroll: ['Gave', 'second try', 'second tries'],
  turn: ['Turned', 'failure into a success', 'failures into successes'], advantage: ['Gave advantage', 'time', 'times'],
  clearRoom: ['Cleared', 'room', 'rooms'], skipRoom: ['Slipped past', 'room', 'rooms'], shortcut: ['Cut short', 'dungeon run', 'dungeon runs'],
  hiddenRoom: ['Found', 'hidden room', 'hidden rooms'], negate: ['Turned aside', 'blow', 'blows'], cheatDeath: ['Saved the hero', 'time', 'times'],
  secondWind: ['Healed the hero', 'time', 'times'], roomHeal: ['Healed the hero', 'time', 'times'], shortRest: ['Healed the hero', 'time', 'times'],
  freeBossHit: ['Opened', 'boss fight', 'boss fights'], smite: ['Struck', 'triple blow', 'triple blows'], bossShield: ['Shielded', 'boss fight', 'boss fights'],
  bossPurse: ['Paid out at', 'boss', 'bosses'], windfall: ['Doubled the pay', 'time', 'times'], bonusLoot: ['Found', 'extra piece', 'extra pieces'],
  onCrit: ['Paid out on', 'critical', 'criticals'],
};
function firedText(n, type) {
  if (!n) return 'Not fired yet.';
  const [said, one, many] = DONE[type] ?? ['Fired', 'time', 'times'];
  return `${said} ${n.toLocaleString('en-GB')} ${n === 1 ? one : many}.`;
}

// `app.changed()` saves and redraws after a choice.
export function mountSkills(root, app) {
  let shown = null; // branch id on display
  let sel = null; // skill id whose card is open
  let picked = null; // subclass tapped but not yet confirmed
  let view = 'tree'; // which section shows: the tree, what they do, or a waiting choice (subclass, abilities)
  let key = '';
  let heroId = null;
  let counters = []; // [span, skill id]: fire counts, kept current without a redraw

  // The card that opens first: the first seal that can be learned, else the first not learned, else the capstone.
  function firstSel(hero, branch) {
    return (branch.skills.find((s) => whyNot(hero, s.id) === null) ?? branch.skills.find((s) => !hero.skills.includes(s.id)) ?? branch.skills.at(-1)).id;
  }

  function draw(hero) {
    const tree = treeFor(hero);
    const p = pending(hero);
    const spent = hero.skills.length;
    const sub = subclassName(hero);
    const act = (fn) => () => { if (fn()) app.changed(); };
    counters = [];
    const count = (id) => { const s = el('span', { className: 'fired', textContent: firedText(hero.fired?.[id] ?? 0, SKILL_BY_ID[id]?.sig?.type) }); counters.push([s, id]); return s; };

    // ----- the hero and the points -----
    const head = el('section', { className: 'hb-head' },
      el('div', { className: 'hb-who' },
        el('strong', { className: 'hb-name', textContent: hero.name }),
        el('span', { className: 'hb-line', textContent: `${RACES[hero.race].name} ${CLASSES[hero.class].name}, level ${hero.level}.${sub ? ` ${sub}.` : ''} ${spent} of ${MAX_SKILLS} points spent.` })),
      el('div', { className: 'hb-coin' + (hero.skillPoints ? ' has' : ''), attrs: { 'aria-label': `${plural(hero.skillPoints, 'skill point')} to spend` } },
        el('strong', { textContent: String(hero.skillPoints) }),
        el('span', { textContent: hero.skillPoints === 1 ? 'point' : 'points' })));

    // ----- subclass choice -----
    let subclass = null;
    if (canChooseSubclass(hero)) {
      const cards = tree.branches.map((b) => {
        const card = el('button', { className: 'choice k-' + b.kind, type: 'button', onclick: () => { picked = b.id; shown = b.id; sel = null; update.force(); } },
          el('span', { className: 'choice-head' }, el('span', { className: 'kind-badge' }, icon(KIND_ICON[b.kind])), el('strong', { textContent: b.name }), el('span', { className: 'tag', textContent: `${BRANCH_KINDS[b.kind]}: ${KIND_NOTE[b.kind]}` })),
          el('span', { className: 'choice-text', textContent: b.blurb }));
        card.setAttribute('aria-pressed', String(picked === b.id));
        return card;
      });
      const chosen = tree.branches.find((b) => b.id === picked);
      subclass = el('section', { className: 'panel waiting' },
        el('h3', { className: 'waiting-head' }, icon('crown'), el('span', { textContent: 'Choose a subclass' })),
        el('p', { className: 'hint', textContent: `A subclass marks one branch as the hero's own. Only that branch's last skill, the capstone, can be learned. Skills in the other two branches stay open. It can be changed later at the tavern, for gold.` }),
        el('div', { className: 'choices' }, ...cards),
        chosen
          ? el('div', { className: 'row' }, el('button', { className: 'btn primary grow', type: 'button', textContent: `Become ${/^[AEIOU]/.test(chosen.name) ? 'an' : 'a'} ${chosen.name}`, onclick: act(() => { picked = null; return chooseSubclass(hero, chosen.id); }) }))
          : el('p', { className: 'hint', textContent: 'Tap one to look it over. Nothing is chosen until you confirm.' }));
    }

    // ----- ability score increase -----
    let abilities = null;
    if (p.abilities > 0) {
      const main = CLASSES[hero.class].main;
      const buttons = ABILITIES.map((a) => {
        const score = hero.abilities[a];
        const b = confirmBtn(`${ABILITY_NAMES[a]} ${score} (${signed(mod(score))})`, `Tap again: ${ABILITY_NAMES[a]} ${score + 1} (${signed(mod(score + 1))})`, act(() => raiseAbility(hero, a)), 'btn ability-btn' + (a === main ? ' main' : ''));
        b.disabled = score >= ABILITY_MAX;
        return el('div', { className: 'ability-pick' }, b, el('span', { className: 'hint', textContent: ABILITY_USE[a] + (a === main ? ' (main)' : '') }));
      });
      abilities = el('section', { className: 'panel waiting' },
        el('h3', { className: 'waiting-head' }, icon('up'), el('span', { textContent: 'Ability score increase' })),
        el('p', { textContent: `${plural(p.abilities, 'point')} to place. Each adds 1 to a score, up to ${ABILITY_MAX}.` }),
        el('p', { className: 'hint', textContent: `Two points arrive at levels ${ABILITY_LEVELS.slice(0, -1).join(', ')}, and ${ABILITY_LEVELS.at(-1)}. The modifier in brackets goes up at every even score. These are kept through a respec.` }),
        el('div', { className: 'ability-picks' }, ...buttons));
    }

    // ----- the tree -----
    const branch = tree.branches.find((b) => b.id === shown) ?? tree.branches[0];
    if (!branch.skills.some((s) => s.id === sel)) sel = firstSel(hero, branch);
    const ribbons = el('div', { className: 'hb-ribbons' }, ...tree.branches.map((b) => {
      const n = pointsIn(hero, b.id);
      const r = pressBtn('', b.id === branch.id, () => { shown = b.id; sel = null; update.force(); }, 'hb-ribbon k-' + b.kind);
      r.append(
        el('span', { className: 'hb-ribbon-name' }, icon(KIND_ICON[b.kind]), el('strong', { textContent: b.name })),
        el('span', { className: 'hb-ribbon-meta' }, `${n} of ${branchPoints(b)}`, hero.subclass === b.id ? icon('crown') : null));
      r.setAttribute('aria-label', `${b.name}, ${BRANCH_KINDS[b.kind]}, ${n} of ${branchPoints(b)} points${hero.subclass === b.id ? ', your subclass' : ''}`);
      return r;
    }));

    const rows = [];
    const spentHere = pointsIn(hero, branch.id);
    ROWS.forEach((row, r) => {
      const open = spentHere >= ROW_GATE[r];
      if (r > 0) rows.push(el('div', { className: 'hb-link' + (open ? ' on' : '') }));
      if (!open) rows.push(el('p', { className: 'hb-gate', textContent: `Opens at ${ROW_GATE[r]} points in ${branch.name}` }));
      const fork = row.length === 2 && r % 2 === 1;
      const taken = fork && row.some((j) => hero.skills.includes(branch.skills[j].id));
      const cells = [];
      row.forEach((i, k) => {
        const s = branch.skills[i];
        const ranks = s.ranks ?? 1;
        const rank = rankOf(hero, s.id);
        const why = whyNot(hero, s.id);
        const capstone = i === branch.skills.length - 1;
        const shape = capstone ? 'cap' : s.sig ? 'sig' : 'pas';
        const state = rank ? ' on' + (why === null ? ' can' : '') : why === null ? ' can' : taken ? ' gone' : open ? '' : ' lock';
        const b = pressBtn('', s.id === sel, () => { sel = s.id; update.force(); }, `hb-seal ${shape}${state}`);
        b.append(icon(capstone ? 'star' : skillIcon(s)));
        b.setAttribute('aria-label', `${s.name}: ${rank >= ranks ? 'learned' : rank ? `rank ${rank} of ${ranks}` : why === null ? 'can be learned' : 'not yet'}`);
        if (fork && k === 1) cells.push(el('span', { className: 'hb-or', textContent: 'or' }));
        cells.push(el('div', { className: 'hb-cell' }, b,
          ranks > 1 ? el('span', { className: 'hb-pips' }, ...Array.from({ length: ranks }, (_, j) => el('i', { className: j < rank ? 'on' : '' }))) : null));
      });
      rows.push(el('div', { className: 'hb-row' + (fork ? ' fork' : '') }, ...cells));
    });

    // The card for the chosen seal.
    const sIdx = branch.skills.findIndex((k) => k.id === sel);
    const s = branch.skills[sIdx];
    const capstone = sIdx === branch.skills.length - 1;
    const ranks = s.ranks ?? 1;
    const rank = rankOf(hero, s.id);
    const why = whyNot(hero, s.id);
    const row = ROWS.findIndex((rw) => rw.includes(sIdx));
    const kind = capstone ? 'Capstone' : s.sig ? (row % 2 === 1 ? 'Signature move, one of a pair' : 'Signature move') : ranks > 1 ? `Passive, rank ${rank} of ${ranks}` : 'Passive';
    const quote = String(s.learn ?? '').replace(/^Learned [^.]*\.\s*/, '').replaceAll('{name}', hero.name);
    const action = why === null
      ? confirmBtn(rank ? `Raise to rank ${rank + 1} for 1 point` : 'Learn for 1 point', rank ? 'Tap again to raise it' : 'Tap again to learn', act(() => learnSkill(hero, s.id)), 'btn primary hb-learn')
      : rank >= ranks
        ? el('p', { className: 'hb-state learned' }, icon('check'), el('span', { textContent: ranks > 1 ? 'Learned in full.' : 'Learned.' }), s.sig ? count(s.id) : null)
        : el('p', { className: 'hb-state' }, icon('lock'), el('span', { textContent: why }));
    const card = el('div', { className: 'hb-card' },
      el('strong', { className: 'hb-card-name', textContent: s.name }),
      el('span', { className: 'hb-card-kind', textContent: kind }),
      el('p', { className: 'hb-card-text', textContent: s.text }),
      quote ? el('p', { className: 'hb-card-quote', textContent: `"${quote}"` }) : null,
      action);

    const treePage = el('section', { className: 'handbook tree k-' + branch.kind },
      ribbons,
      el('p', { className: 'hb-blurb', textContent: branch.blurb }),
      el('div', { className: 'hb-seals' }, ...rows),
      card,
      el('p', { className: 'hb-key', textContent: 'A round seal is a passive, and its pips are its ranks. A diamond is a signature move; of two joined by "or", only one may be learned. The great star is the capstone.' }));

    // ----- what they do -----
    const n = skillMods(hero).n;
    const lines = SUMMARY.map(([label, parts]) => {
      const said = parts.filter(([k]) => n[k]).map(([k, say]) => say(Math.round(n[k] * 1000) / 1000));
      const words = said.join(', ');
      return said.length ? el('p', { className: 'hb-stat' }, el('strong', { textContent: `${label}.` }), ` ${words[0].toUpperCase()}${words.slice(1)}.`) : null;
    }).filter(Boolean);
    const moves = [...new Set(hero.skills)].map((id) => tree.branches.flatMap((b) => b.skills).find((k) => k.id === id)).filter((k) => k?.sig);
    const doPage = el('section', { className: 'handbook' },
      el('h3', { className: 'hb-h', textContent: 'What your skills do' }),
      el('p', { className: 'hb-sub', textContent: 'Everything learned, set down in one place.' }),
      el('div', { className: 'hb-rule' }),
      el('p', { className: 'hb-stat' }, el('strong', { textContent: 'Proficiency.' }), ` +${proficiency(hero.level)} on every roll, from the hero's level.`),
      el('p', { className: 'hb-stat' }, el('strong', { textContent: 'Points spent.' }), ` ${spent} of ${MAX_SKILLS}.`),
      el('p', { className: 'hb-stat' }, el('strong', { textContent: 'Feats.' }), ` ${hero.feats.length} of 8, each worth a skill point.`),
      ...(lines.length ? lines : [el('p', { className: 'hb-stat', textContent: 'Nothing else yet. Learn a skill on the tree and it is written here.' })]),
      el('div', { className: 'hb-rule right' }),
      el('h3', { className: 'hb-h small', textContent: 'Moves that fire on their own' }),
      ...(moves.length
        ? moves.map((k) => el('p', { className: 'hb-move' }, el('strong', { textContent: `${k.name}.` }), ` ${k.text} `, count(k.id)))
        : [el('p', { className: 'hb-stat', textContent: 'None learned yet. The diamond seals on the tree are moves.' })]));

    // Section pills: the tree and what they do always, and each choice only while it waits, with a count.
    const pages = [['tree', 'Skill tree', 'book', treePage, 0], ['does', 'What they do', 'scroll', doPage, 0], ['subclass', 'Subclass', 'crown', subclass, 1], ['abilities', 'Abilities', 'up', abilities, p.abilities]]
      .filter(([, , , node]) => node);
    if (!pages.some(([id]) => id === view)) view = 'tree';
    const nav = el('nav', { className: 'subnav', attrs: { role: 'tablist', 'aria-label': 'Sections' } }, ...pages.map(([id, label, glyph, , cnt]) => {
      const b = el('button', { type: 'button', attrs: { role: 'tab', 'aria-selected': String(id === view) }, onclick: () => { view = id; update.force(); if (nav.getBoundingClientRect().top < 0) nav.scrollIntoView(); } }, icon(glyph), el('span', { textContent: label }));
      b.dataset.badge = cnt ? String(cnt) : '';
      return b;
    }));
    root.replaceChildren(...[
      el('h2', { className: 'view-title', textContent: 'Skills' }),
      head, nav, ...pages.filter(([id]) => id === view).map(([, , , node]) => node),
      el('details', { className: 'panel how' }, el('summary', { textContent: 'How skills work' }),
        el('p', { className: 'hint', textContent: `One point per level from 2 to ${MAX_LEVEL}, and one per Feat (all six story quests in a region). Points wait here as long as you like; the hero carries on regardless.` }),
        el('p', { className: 'hint', textContent: `Each point learns a skill or raises a passive one rank. The rows of a branch open as points go into it (at ${ROW_GATE.slice(1).join(', ')}). A branch holds 11 or 12 points and a hero has ${MAX_SKILLS} to spend in all, so no hero has everything.` }),
        el('p', { className: 'hint', textContent: `Moves joined by "or" are a choice: learning one closes the other until a respec. The capstone needs that branch as the subclass (chosen from level ${SUBCLASS_LEVEL}).` }),
        el('p', { className: 'hint', textContent: 'Passives change numbers. Signature moves fire on their own during tasks and write their own lines in the Chronicle. To take every point back, see the barkeep on the Tavern tab.' }),
        el('p', { className: 'hint', textContent: `The proficiency bonus is +${proficiency(hero.level)} on every d20 roll. It rises at levels 5, 9, 13, and 17.` })),
    ].filter(Boolean));
  }

  // Redraw only when something on the tab has changed: a rebuild every second would swallow taps.
  // Fire counts change often, so they are updated in place instead.
  function update(state, hero, force = false) {
    if (hero.id !== heroId) { heroId = hero.id; shown = hero.subclass; picked = null; sel = null; }
    if (!shown) shown = hero.subclass ?? treeFor(hero).branches[0].id;
    const next = [hero.id, hero.name, hero.level, hero.skillPoints, hero.skills.join(), hero.subclass, hero.abilityPoints, ABILITIES.map((a) => hero.abilities[a]).join(), hero.feats.length, shown, sel, picked, view].join('|');
    update.hero = hero;
    if (next !== key || force) { key = next; draw(hero); return; }
    for (const [span, id] of counters) {
      const t = firedText(hero.fired?.[id] ?? 0, SKILL_BY_ID[id]?.sig?.type);
      if (span.textContent !== t) span.textContent = t;
    }
  }
  update.force = () => update(null, update.hero, true);
  return { update };
}
