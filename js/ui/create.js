// Hero creation: four steps (race and appearance, class, ability scores, name) with a live
// sprite preview. The name comes last so the suggestion can suit the race.

import { RACES, RACE_TRAITS, HAIR_STYLES, HAIR_COLORS } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { SWATCHES } from '../../data/sprite-layers.js';
import { SpriteView, heroLook } from '../sprite.js';
import { ABILITIES, ABILITY_NAMES, mod } from '../rules.js';
import {
  STANDARD_ARRAY, MAX_ROLLS, assignScores, rollScores, withRaceBonus, randomName, randomAppearance,
  defaultAppearance, createHero, maxHp,
} from '../hero.js';
import { el, pressBtn, signed } from './dom.js';

const STEPS = ['Race', 'Class', 'Ability scores', 'Name'];
// The preview leaves the hat off so the hair being chosen can be seen.
const START_TIERS = { body: 0, head: null, hands: 0, feet: 0, weapon: 0, offhand: 0, cloak: null };
const CLASS_NOTES = {
  fighter: 'Strength. Mail, a sword, and a shield. The most hit points.',
  wizard: 'Intelligence. Robes and a staff. Learns a little faster and bruises easily.',
  rogue: 'Dexterity. Leathers and a dagger. Hard to hit squarely.',
  cleric: 'Wisdom. Vestments and a stout stick. Sturdy and sensible.',
};

// `onDone(hero)` is called with the finished hero. `state` supplies the seeded dice.
export function mountCreate(root, state, onDone) {
  const draft = { name: '', race: 'human', cls: 'fighter', scores: [...STANDARD_ARRAY], rolled: false, rollsLeft: MAX_ROLLS, ...defaultAppearance('human') };
  let suggested = (draft.name = randomName(state, draft.race));
  let step = 0;

  const canvas = el('canvas', { attrs: { 'aria-label': 'Hero preview' } });
  const stage = el('div', { className: 'stage create-stage' }, canvas);
  const view = new SpriteView(canvas, { stageW: 64, stageH: 60, ground: 2 });
  const stepLabel = el('p', { className: 'step-label' });
  const body = el('section', { className: 'panel' });
  const nav = el('div', { className: 'create-nav' });

  root.append(el('div', { className: 'create' },
    el('header', { className: 'create-head' }, el('h1', { textContent: 'Tavernborn' }), el('p', { textContent: 'A new hero arrives at The Wobbly Griffin.' })),
    el('div', { className: 'stage-wrap' }, stage),
    stepLabel, body, nav));

  const row = (label, ...kids) => el('div', { className: 'row' }, el('span', { className: 'label', textContent: label }), ...kids);
  const swatches = (names, palette, value, onPick) => names.map((n) => {
    const b = pressBtn('', value === n, () => { onPick(n); render(); }, 'btn swatch');
    b.style.background = palette[n] ?? '#888';
    b.setAttribute('aria-label', n.replaceAll('_', ' '));
    return b;
  });

  function setRace(id) {
    const keepColor = draft.hairColor;
    Object.assign(draft, defaultAppearance(id), { race: id, hairColor: keepColor });
    if (draft.name === suggested) draft.name = suggested = randomName(state, id); // an untouched suggestion follows the race
  }

  const abilities = () => withRaceBonus(assignScores(draft.cls, draft.scores), draft.race);

  function stepName() {
    const input = el('input', { className: 'text-input', type: 'text', value: draft.name, maxLength: 24, autocomplete: 'off', attrs: { 'aria-label': 'Hero name' } });
    input.oninput = () => { draft.name = input.value; nextBtn.disabled = !draft.name.trim(); };
    return [
      el('h2', { textContent: 'What is the hero called?' }),
      input,
      el('div', { className: 'row' }, el('button', { className: 'btn', type: 'button', textContent: 'Suggest another', onclick: () => { draft.name = suggested = randomName(state, draft.race); render(); } })),
      el('p', { className: 'hint', textContent: `Type a name, or tap for another ${RACES[draft.race].name} name.` }),
    ];
  }

  function stepRace() {
    const race = RACES[draft.race];
    const trait = RACE_TRAITS[draft.race];
    const bonus = Object.entries(trait.bonus).map(([a, n]) => `+${n} ${a.toUpperCase()}`).join(', ');
    return [
      el('h2', { textContent: 'Race and appearance' }),
      row('Race', ...Object.entries(RACES).map(([id, r]) => pressBtn(r.name, draft.race === id, () => { setRace(id); render(); }))),
      el('p', { className: 'hint', textContent: `${Object.keys(trait.bonus).length === 6 ? '+1 to all six abilities' : bonus}. ${trait.quirk}: ${trait.effect[0].toLowerCase() + trait.effect.slice(1)}.${trait.built ? '' : ' (This quirk wakes up in a later build.)'}` }),
      row('Build', ...race.builds.map((b) => pressBtn(b.label, draft.build === b.id, () => { draft.build = b.id; draft.beard = !!b.beard; render(); }))),
      row('Skin', ...swatches(race.skins, SWATCHES.skin, draft.skin, (n) => { draft.skin = n; })),
      row('Hair', (() => {
        const s = el('select', { className: 'pick', onchange: () => { draft.hairStyle = s.value; render(); }, attrs: { 'aria-label': 'Hair style' } });
        for (const [v, text] of [['none', 'None'], ...HAIR_STYLES.map((h) => [h.id, h.id.replaceAll('_', ' ')])]) s.append(el('option', { value: v, textContent: text, selected: v === draft.hairStyle }));
        return s;
      })()),
      row('Hair color', ...swatches(HAIR_COLORS, SWATCHES.hair, draft.hairColor, (n) => { draft.hairColor = n; })),
      race.beard ? row('Beard', pressBtn(draft.beard ? 'On' : 'Off', draft.beard, () => { draft.beard = !draft.beard; render(); })) : null,
      el('div', { className: 'row' }, el('button', { className: 'btn', type: 'button', textContent: 'Randomize appearance', onclick: () => { Object.assign(draft, randomAppearance(state, draft.race)); render(); } })),
    ];
  }

  function stepClass() {
    return [
      el('h2', { textContent: 'Class' }),
      row('Class', ...Object.entries(CLASSES).map(([id, c]) => pressBtn(c.name, draft.cls === id, () => { draft.cls = id; render(); }))),
      el('p', { className: 'hint', textContent: CLASS_NOTES[draft.cls] }),
      el('p', { className: 'hint', textContent: 'Every hero starts in Common gear, hat included (left off here so you can see the hair). Better gear is found on the road and puts itself on.' }),
    ];
  }

  function stepAbilities() {
    const scores = abilities();
    const main = CLASSES[draft.cls].main;
    const hp = maxHp({ class: draft.cls, level: 1, abilities: scores, skills: [], gear: {} }); // a hero-to-be: no skills, no gear
    return [
      el('h2', { textContent: 'Ability scores' }),
      el('div', { className: 'abilities' }, ...ABILITIES.map((a) => el('div', { className: 'ability' + (a === main ? ' main' : '') },
        el('span', { className: 'ab-name', textContent: ABILITY_NAMES[a] }),
        el('span', { className: 'ab-score', textContent: String(scores[a]) }),
        el('span', { className: 'ab-mod', textContent: signed(mod(scores[a])) })))),
      el('p', { className: 'hint', textContent: `${draft.rolled ? 'Rolled scores' : 'The standard array (15, 14, 13, 12, 10, 8)'}, placed to suit a ${CLASSES[draft.cls].name}, with the ${RACES[draft.race].name} bonus added. Starting hit points: ${hp}.` }),
      el('div', { className: 'row' },
        el('button', { className: 'btn', type: 'button', disabled: draft.rollsLeft === 0, textContent: `Roll instead (${draft.rollsLeft} left)`, onclick: () => { draft.scores = rollScores(state); draft.rolled = true; draft.rollsLeft -= 1; render(); } }),
        draft.rolled ? el('button', { className: 'btn', type: 'button', textContent: 'Use the standard array', onclick: () => { draft.scores = [...STANDARD_ARRAY]; draft.rolled = false; render(); } }) : null),
      el('p', { className: 'hint', textContent: 'Rolling is 4d6, drop the lowest, six times. The latest roll stands.' }),
    ];
  }

  let nextBtn;
  function render() {
    view.set({ look: heroLook({ ...draft, tiers: START_TIERS }), anim: 'walk', facing: 'down' });
    stepLabel.textContent = `Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`;
    const last = step === STEPS.length - 1;
    nextBtn = el('button', { className: 'btn primary', type: 'button', textContent: last ? 'Begin the adventure' : 'Next', disabled: last && !draft.name.trim(), onclick: () => {
      if (!last) { step += 1; render(); window.scrollTo(0, 0); return; }
      cancelAnimationFrame(view.frameReq);
      const { name, race, cls, build, skin, hairStyle, hairColor, beard } = draft;
      onDone(createHero(state, { name, race, cls, appearance: { build, skin, hairStyle, hairColor, beard }, baseScores: assignScores(cls, draft.scores) }));
    } });
    nav.replaceChildren(
      el('button', { className: 'btn', type: 'button', textContent: 'Back', disabled: step === 0, onclick: () => { step -= 1; render(); window.scrollTo(0, 0); } }),
      nextBtn);
    body.replaceChildren(...[stepRace, stepClass, stepAbilities, stepName][step]().filter(Boolean));
  }
  render();
}
