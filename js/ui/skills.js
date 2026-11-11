// Skills tab: unspent points, the pending subclass and ability score choices, and the class tree.
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

const ABILITY_USE = {
  str: 'Fighter rolls', dex: 'Rogue rolls, dodging', con: 'Hit points, shorter knockouts',
  int: 'Wizard rolls, a little XP', wis: 'Cleric rolls, quest checks', cha: 'Gold',
};
const KIND_NOTE = { might: 'hits harder', guard: 'survives longer', fortune: 'earns more' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// `app.changed()` saves and redraws after a choice.
export function mountSkills(root, app) {
  let shown = null; // branch id on display
  let picked = null; // subclass tapped but not yet confirmed
  let key = '';
  let heroId = null;

  function draw(hero) {
    const tree = treeFor(hero);
    const p = pending(hero);
    const spent = hero.skills.length;
    const sub = subclassName(hero);
    const act = (fn) => () => { if (fn()) app.changed(); };

    // ----- points -----
    const summary = el('section', { className: 'panel' },
      el('p', { className: 'big-number', textContent: String(hero.skillPoints) }),
      el('p', { className: 'centered', textContent: `skill point${hero.skillPoints === 1 ? '' : 's'} to spend` }),
      el('ul', { className: 'stats skill-facts' },
        el('li', {}, el('span', { textContent: 'Skills learned' }), el('span', { textContent: `${spent} of ${MAX_SKILLS}` })),
        el('li', {}, el('span', { textContent: 'Subclass' }), el('span', { textContent: sub ?? (hero.level >= SUBCLASS_LEVEL ? 'Not chosen' : `At level ${SUBCLASS_LEVEL}`) })),
        el('li', {}, el('span', { textContent: 'Feats' }), el('span', { textContent: `${hero.feats.length} of 8` }))),
      el('p', { className: 'hint', textContent: `One point per level from 2 to ${MAX_LEVEL}, and one per Feat (all six story quests in a region). Points wait here as long as you like; the hero carries on regardless.` }));

    // ----- subclass choice -----
    let subclass = null;
    if (canChooseSubclass(hero)) {
      const cards = tree.branches.map((b) => {
        const card = el('button', { className: 'choice', type: 'button', onclick: () => { picked = b.id; shown = b.id; update.force(); } },
          el('span', { className: 'choice-head' }, el('strong', { textContent: b.name }), el('span', { className: 'tag', textContent: `${BRANCH_KINDS[b.kind]}: ${KIND_NOTE[b.kind]}` })),
          el('span', { className: 'choice-text', textContent: b.blurb }));
        card.setAttribute('aria-pressed', String(picked === b.id));
        return card;
      });
      const chosen = tree.branches.find((b) => b.id === picked);
      subclass = el('section', { className: 'panel waiting' },
        el('h3', { textContent: 'Choose a subclass' }),
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
        el('h3', { textContent: 'Ability score increase' }),
        el('p', { textContent: `${plural(p.abilities, 'point')} to place. Each adds 1 to a score, up to ${ABILITY_MAX}.` }),
        el('p', { className: 'hint', textContent: `Two points arrive at levels ${ABILITY_LEVELS.slice(0, -1).join(', ')}, and ${ABILITY_LEVELS.at(-1)}. The modifier in brackets goes up at every even score. These are kept through a respec.` }),
        el('div', { className: 'ability-picks' }, ...buttons));
    }

    // ----- the tree -----
    const branch = tree.branches.find((b) => b.id === shown) ?? tree.branches[0];
    const tabs = el('div', { className: 'row branch-tabs' }, ...tree.branches.map((b) => {
      const n = hero.skills.filter((id) => b.skills.some((s) => s.id === id)).length;
      const t = pressBtn('', b.id === branch.id, () => { shown = b.id; update.force(); }, 'btn grow branch-tab');
      t.append(el('strong', { textContent: b.name }), el('span', { textContent: `${BRANCH_KINDS[b.kind]} · ${n}/12${hero.subclass === b.id ? ' · yours' : ''}` }));
      return t;
    }));
    const tiers = [];
    for (let tier = 1; tier <= branch.skills.length / TIER_SIZE; tier++) {
      const open = tier === 1 || pointsIn(hero, branch.id, tier - 1) >= TIER_GATE;
      const have = pointsIn(hero, branch.id, tier);
      tiers.push(el('h4', { className: 'tier-head' + (open ? '' : ' closed') },
        el('span', { textContent: `Tier ${tier}` }),
        el('span', { textContent: open ? `${have} of ${TIER_SIZE} learned` : `Opens after ${TIER_GATE} skills in tier ${tier - 1}` })));
      for (const s of branch.skills.slice((tier - 1) * TIER_SIZE, tier * TIER_SIZE)) {
        const learned = hero.skills.includes(s.id);
        const why = learned ? null : whyNot(hero, s.id);
        const capstone = s === branch.skills.at(-1);
        const tag = capstone ? 'Capstone' : s.sig ? 'Signature move' : 'Passive';
        const action = learned ? el('span', { className: 'skill-state learned', textContent: 'Learned' })
          : why === null ? confirmBtn('Learn', 'Tap again to learn', act(() => learnSkill(hero, s.id)), 'btn primary skill-learn')
          : el('span', { className: 'skill-state', textContent: why });
        tiers.push(el('div', { className: 'skill' + (learned ? ' learned' : why === null ? ' open' : ' closed') },
          el('div', { className: 'skill-head' }, el('strong', { textContent: s.name }), el('span', { className: 'tag' + (s.sig ? ' move' : ''), textContent: tag })),
          el('p', { className: 'skill-text', textContent: s.text }),
          s.later ? el('p', { className: 'hint later', textContent: `Not built yet: ${s.later}` }) : null,
          action));
      }
    }
    const treePanel = el('section', { className: 'panel tree' },
      el('h3', { textContent: `${CLASSES[hero.class].name} skills` }),
      tabs,
      el('p', { className: 'hint', textContent: branch.blurb }),
      ...tiers);

    root.replaceChildren(...[
      el('h2', { className: 'view-title', textContent: 'Skills' }),
      summary, subclass, abilities, treePanel,
      el('section', { className: 'panel' },
        el('h3', { textContent: 'Proficiency bonus' }),
        el('p', { textContent: `+${proficiency(hero.level)} on every d20 roll. It rises at levels 5, 9, 13, and 17.` }),
        el('p', { className: 'hint', textContent: 'Passives change numbers. Signature moves fire on their own during tasks and write their own lines in the Chronicle. To take every point back, see the barkeep on the Tavern tab.' })),
    ].filter(Boolean));
  }

  // Redraw only when something on the tab has changed: a rebuild every second would swallow taps.
  function update(state, hero, force = false) {
    if (hero.id !== heroId) { heroId = hero.id; shown = hero.subclass; picked = null; }
    if (!shown) shown = hero.subclass ?? treeFor(hero).branches[0].id;
    const next = [hero.id, hero.level, hero.skillPoints, hero.skills.join(), hero.subclass, hero.abilityPoints, ABILITIES.map((a) => hero.abilities[a]).join(), hero.feats.length, shown, picked].join('|');
    if (next === key && !force) return;
    key = next;
    update.hero = hero;
    draw(hero);
  }
  update.force = () => update(null, update.hero, true);
  return { update };
}
