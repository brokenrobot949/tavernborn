// Skills tab: unspent points, the pending subclass and ability score choices, and the class tree.
// The three branches have their own colour and icon (Might red, Guard blue, Fortune gold); the tree
// is drawn as a path of tiers, each skill a card with a badge for passive, signature, or capstone.
// Everything here is banked until the player spends it; nothing on this tab ever blocks the hero.
// The tab only calls learnSkill, chooseSubclass (skills.js) and raiseAbility (hero.js), the same
// functions the simulator's stand-in player uses.

import { CLASSES } from '../../data/classes.js';
import { ABILITIES, ABILITY_NAMES, ABILITY_MAX, ABILITY_LEVELS, MAX_LEVEL, mod, proficiency } from '../rules.js';
import { raiseAbility } from '../hero.js';
import {
  treeFor, whyNot, learnSkill, canChooseSubclass, chooseSubclass, pointsIn, pending, subclassName,
  MAX_SKILLS, TIER_SIZE, TIER_GATE, SUBCLASS_LEVEL, BRANCH_KINDS,
} from '../skills.js';
import { el, pressBtn, confirmBtn, signed } from './dom.js';
import { icon } from './icons.js';

const ABILITY_USE = {
  str: 'Fighter rolls', dex: 'Rogue rolls, dodging', con: 'Hit points, shorter knockouts',
  int: 'Wizard rolls, a little XP', wis: 'Cleric rolls, quest checks', cha: 'Gold',
};
const KIND_NOTE = { might: 'hits harder', guard: 'survives longer', fortune: 'earns more' };
const KIND_ICON = { might: 'swords', guard: 'offhand', fortune: 'coin' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// `app.changed()` saves and redraws after a choice.
export function mountSkills(root, app) {
  let shown = null; // branch id on display
  let picked = null; // subclass tapped but not yet confirmed
  let view = 'tree'; // which section shows: the tree, or a waiting choice (subclass, abilities)
  let key = '';
  let heroId = null;

  function draw(hero) {
    const tree = treeFor(hero);
    const p = pending(hero);
    const spent = hero.skills.length;
    const sub = subclassName(hero);
    const act = (fn) => () => { if (fn()) app.changed(); };

    // ----- points -----
    const learnedFill = el('i');
    learnedFill.style.width = `${(100 * spent) / MAX_SKILLS}%`;
    const summary = el('section', { className: 'skill-summary' },
      el('div', { className: 'points-coin' + (hero.skillPoints ? ' has' : '') },
        el('strong', { textContent: String(hero.skillPoints) }),
        el('span', { textContent: `skill point${hero.skillPoints === 1 ? '' : 's'} to spend` })),
      el('div', { className: 'sum-tiles' },
        el('div', { className: 'sum-tile' }, el('span', { className: 'sum-label' }, icon('book'), 'Learned'), el('strong', { textContent: `${spent} of ${MAX_SKILLS}` }), el('div', { className: 'bar thin' }, learnedFill)),
        el('div', { className: 'sum-tile' }, el('span', { className: 'sum-label' }, icon('crown'), 'Subclass'), el('strong', { textContent: sub ?? (hero.level >= SUBCLASS_LEVEL ? 'Not chosen' : `At level ${SUBCLASS_LEVEL}`) })),
        el('div', { className: 'sum-tile' }, el('span', { className: 'sum-label' }, icon('flag'), 'Feats'), el('strong', { textContent: `${hero.feats.length} of 8` })),
        el('div', { className: 'sum-tile' }, el('span', { className: 'sum-label' }, icon('d20'), 'Proficiency'), el('strong', { textContent: `+${proficiency(hero.level)} on rolls` }))));

    // ----- subclass choice -----
    let subclass = null;
    if (canChooseSubclass(hero)) {
      const cards = tree.branches.map((b) => {
        const card = el('button', { className: 'choice k-' + b.kind, type: 'button', onclick: () => { picked = b.id; shown = b.id; update.force(); } },
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
    const tabs = el('div', { className: 'branch-tabs' }, ...tree.branches.map((b) => {
      const n = hero.skills.filter((id) => b.skills.some((s) => s.id === id)).length;
      const t = pressBtn('', b.id === branch.id, () => { shown = b.id; update.force(); }, 'branch-tab k-' + b.kind);
      const fill = el('i');
      fill.style.width = `${(100 * n) / b.skills.length}%`;
      t.append(
        el('span', { className: 'kind-badge' }, icon(KIND_ICON[b.kind])),
        el('strong', { textContent: b.name }),
        el('span', { className: 'branch-meta', textContent: `${BRANCH_KINDS[b.kind]} · ${n}/${b.skills.length}` }),
        el('span', { className: 'branch-bar' }, fill),
        ...(hero.subclass === b.id ? [el('span', { className: 'yours' }, icon('crown'))] : []));
      return t;
    }));
    const tiers = [];
    for (let tier = 1; tier <= branch.skills.length / TIER_SIZE; tier++) {
      const open = tier === 1 || pointsIn(hero, branch.id, tier - 1) >= TIER_GATE;
      const have = pointsIn(hero, branch.id, tier);
      const cards = [];
      for (const s of branch.skills.slice((tier - 1) * TIER_SIZE, tier * TIER_SIZE)) {
        const learned = hero.skills.includes(s.id);
        const why = learned ? null : whyNot(hero, s.id);
        const capstone = s === branch.skills.at(-1);
        const tag = capstone ? 'Capstone' : s.sig ? 'Signature move' : 'Passive';
        const glyph = capstone ? 'star' : s.sig ? 'spark' : 'up';
        const action = learned ? el('span', { className: 'skill-state learned' }, icon('check'), el('span', { textContent: 'Learned' }))
          : why === null ? confirmBtn('Learn', 'Tap again to learn', act(() => learnSkill(hero, s.id)), 'btn primary skill-learn')
          : el('span', { className: 'skill-state' }, icon('lock'), el('span', { textContent: why }));
        cards.push(el('div', { className: 'skill' + (learned ? ' learned' : why === null ? ' open' : ' closed') + (capstone ? ' capstone' : '') },
          el('span', { className: 'skill-badge' }, icon(glyph)),
          el('div', { className: 'skill-body' },
            el('div', { className: 'skill-head' }, el('strong', { textContent: s.name }), el('span', { className: 'tag' + (s.sig ? ' move' : '') + (capstone ? ' cap' : ''), textContent: tag })),
            el('p', { className: 'skill-text', textContent: s.text }),
            s.later ? el('p', { className: 'hint later', textContent: `Not built yet: ${s.later}` }) : null,
            action)));
      }
      tiers.push(el('div', { className: 'tier-step' + (open ? '' : ' closed') + (have === TIER_SIZE ? ' full' : '') },
        el('div', { className: 'tier-head' },
          el('span', { className: 'tier-num', textContent: String(tier) }),
          el('span', { className: 'tier-name', textContent: `Tier ${tier}` }),
          open
            ? el('span', { className: 'pips', attrs: { 'aria-label': `${have} of ${TIER_SIZE} learned` } }, ...Array.from({ length: TIER_SIZE }, (_, k) => el('i', { className: k < have ? 'on' : '' })))
            : el('span', { className: 'tier-lock' }, icon('lock'), el('span', { textContent: `After ${TIER_GATE} in tier ${tier - 1}` }))),
        ...cards));
    }
    const treePanel = el('section', { className: 'panel tree k-' + branch.kind },
      el('h3', { textContent: `${CLASSES[hero.class].name} skills` }),
      tabs,
      el('p', { className: 'branch-blurb', textContent: branch.blurb }),
      el('div', { className: 'tier-path' }, ...tiers));

    // Section pills: the tree always, and each choice only while it waits, with a count.
    const pages = [['tree', 'Skill tree', 'book', treePanel, 0], ['subclass', 'Subclass', 'crown', subclass, 1], ['abilities', 'Abilities', 'up', abilities, p.abilities]]
      .filter(([, , , node]) => node);
    if (!pages.some(([id]) => id === view)) view = 'tree';
    const nav = pages.length > 1 ? el('nav', { className: 'subnav', attrs: { role: 'tablist', 'aria-label': 'Sections' } }, ...pages.map(([id, label, glyph, , count]) => {
      const b = el('button', { type: 'button', attrs: { role: 'tab', 'aria-selected': String(id === view) }, onclick: () => { view = id; update.force(); if (nav.getBoundingClientRect().top < 0) nav.scrollIntoView(); } }, icon(glyph), el('span', { textContent: label }));
      b.dataset.badge = count ? String(count) : '';
      return b;
    })) : null;
    root.replaceChildren(...[
      el('h2', { className: 'view-title', textContent: 'Skills' }),
      summary, nav, ...pages.filter(([id]) => id === view).map(([, , , node]) => node),
      el('details', { className: 'panel how' }, el('summary', { textContent: 'How skills work' }),
        el('p', { className: 'hint', textContent: `One point per level from 2 to ${MAX_LEVEL}, and one per Feat (all six story quests in a region). Points wait here as long as you like; the hero carries on regardless.` }),
        el('p', { className: 'hint', textContent: `A tier opens after ${TIER_GATE} skills in the tier above. Each branch's last skill, the capstone, needs that branch as the subclass.` }),
        el('p', { className: 'hint', textContent: 'Passives change numbers. Signature moves fire on their own during tasks and write their own lines in the Chronicle. To take every point back, see the barkeep on the Tavern tab.' }),
        el('p', { className: 'hint', textContent: `The proficiency bonus is +${proficiency(hero.level)} on every d20 roll. It rises at levels 5, 9, 13, and 17.` })),
    ].filter(Boolean));
  }

  // Redraw only when something on the tab has changed: a rebuild every second would swallow taps.
  function update(state, hero, force = false) {
    if (hero.id !== heroId) { heroId = hero.id; shown = hero.subclass; picked = null; }
    if (!shown) shown = hero.subclass ?? treeFor(hero).branches[0].id;
    const next = [hero.id, hero.level, hero.skillPoints, hero.skills.join(), hero.subclass, hero.abilityPoints, ABILITIES.map((a) => hero.abilities[a]).join(), hero.feats.length, shown, picked, view].join('|');
    if (next === key && !force) return;
    key = next;
    update.hero = hero;
    draw(hero);
  }
  update.force = () => update(null, update.hero, true);
  return { update };
}
