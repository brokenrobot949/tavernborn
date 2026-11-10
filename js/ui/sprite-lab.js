// Phase 0 screen: one composited hero with controls for race, class, and every gear slot.
// It exists so the chosen LPC looks can be judged on a phone before any game logic is built.

import { RACES, HAIR_STYLES, HAIR_COLORS } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { GEAR, SLOTS, TIERS } from '../../data/items.js';
import { SWATCHES } from '../../data/sprite-layers.js';
import { SpriteView, heroLook, drawStill, ANIMS, FACINGS, SCALE } from '../sprite.js';
import { layerKey } from '../layer-key.js';

const STORE_KEY = 'tavernborn.spriteLab.v1';

const DEFAULTS = {
  race: 'human', build: 'male', skin: 'light', hairStyle: 'parted', hairColor: 'chestnut', beard: false,
  cls: 'fighter', anim: 'walk', facing: 'down', dark: false,
  tiers: { body: 0, head: 0, hands: 0, feet: 0, weapon: 0, offhand: 0, cloak: null },
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && RACES[saved.race] && CLASSES[saved.cls]) return { ...DEFAULTS, ...saved, tiers: { ...DEFAULTS.tiers, ...saved.tiers } };
  } catch { /* fall through to defaults */ }
  return structuredClone(DEFAULTS);
}

const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const [k, v] of Object.entries(props.attrs ?? {})) node.setAttribute(k, v);
  node.append(...kids.filter((k) => k != null));
  return node;
};

export function mountSpriteLab(root) {
  const state = loadState();
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode */ } };

  // ----- stage -----
  const canvas = el('canvas', { attrs: { 'aria-label': 'Hero preview' } });
  const stage = el('div', { className: 'stage' }, canvas);
  const view = new SpriteView(canvas);
  const animRow = el('div', { className: 'stage-row' });
  const faceRow = el('div', { className: 'stage-row' });
  const stageWrap = el('section', { className: 'stage-wrap' }, stage, animRow, faceRow);

  const fitStage = () => {
    const room = Math.min(stageWrap.clientWidth, 420) - 4;
    const stageW = Math.max(72, Math.min(104, Math.floor(room / SCALE)));
    view.resize(stageW);
    stage.style.width = stageW * SCALE + 4 + 'px';
  };
  new ResizeObserver(fitStage).observe(stageWrap);

  // ----- panels -----
  const heroPanel = el('section', { className: 'panel' });
  const gearPanel = el('section', { className: 'panel' });
  const lineupPanel = el('section', { className: 'panel' });
  const wearingPanel = el('section', { className: 'panel' });
  root.append(stageWrap, el('div', { className: 'controls' }, heroPanel, gearPanel, lineupPanel, wearingPanel));

  const pressBtn = (label, pressed, onClick, cls = 'btn') => {
    const b = el('button', { className: cls, type: 'button', textContent: label, onclick: onClick });
    b.setAttribute('aria-pressed', String(pressed));
    return b;
  };
  const gearRow = (label, ...kids) => el('div', { className: 'row gear' }, el('span', { className: 'label', textContent: label }), ...kids);
  const row = (label, ...kids) => el('div', { className: 'row' }, el('span', { className: 'label', textContent: label }), ...kids);

  function look(tiers = state.tiers) {
    return heroLook({ ...state, tiers });
  }

  function setRace(id) {
    const race = RACES[id];
    state.race = id;
    if (!race.builds.some((b) => b.id === state.build)) state.build = race.builds[0].id;
    if (!race.skins.includes(state.skin)) state.skin = race.skins[0];
    state.hairStyle = race.hair;
    state.beard = !!race.builds.find((b) => b.id === state.build).beard;
  }

  function render() {
    save();
    const race = RACES[state.race];
    const build = race.builds.find((b) => b.id === state.build);

    // stage buttons
    animRow.replaceChildren(...Object.keys(ANIMS).map((a) => pressBtn(a[0].toUpperCase() + a.slice(1), state.anim === a, () => { state.anim = a; render(); })));
    const arrows = { up: '↑', left: '←', down: '↓', right: '→' };
    faceRow.replaceChildren(
      ...FACINGS.map((f) => {
        const b = pressBtn(arrows[f], state.facing === f, () => { state.facing = f; render(); });
        b.setAttribute('aria-label', 'Face ' + f);
        return b;
      }),
      pressBtn('Dark backdrop', state.dark, () => { state.dark = !state.dark; render(); }),
    );
    stage.classList.toggle('dark', state.dark);
    view.set({ look: look(), anim: state.anim, facing: state.facing });

    // hero
    const select = (options, value, onChange) => {
      const s = el('select', { className: 'pick', onchange: () => { onChange(s.value); render(); } });
      for (const [v, text] of options) s.append(el('option', { value: v, textContent: text, selected: v === value }));
      return s;
    };
    const swatches = (names, palette, value, onPick) => names.map((n) => {
      const b = pressBtn('', value === n, () => { onPick(n); render(); }, 'btn swatch');
      b.style.background = palette[n] ?? '#888';
      b.title = n;
      b.setAttribute('aria-label', n.replaceAll('_', ' '));
      return b;
    });
    heroPanel.replaceChildren(...[
      el('h2', { textContent: 'Hero' }),
      row('Race', ...Object.entries(RACES).map(([id, r]) => pressBtn(r.name, state.race === id, () => { setRace(id); render(); }))),
      row('Build', ...race.builds.map((b) => pressBtn(b.label, state.build === b.id, () => { state.build = b.id; state.beard = !!b.beard; render(); }))),
      row('Skin', ...swatches(race.skins, SWATCHES.skin, state.skin, (n) => { state.skin = n; })),
      row('Hair', select([['none', 'None'], ...HAIR_STYLES.map((h) => [h.id, h.id.replaceAll('_', ' ')])], state.hairStyle, (v) => { state.hairStyle = v; })),
      row('Hair colour', ...swatches(HAIR_COLORS, SWATCHES.hair, state.hairColor, (n) => { state.hairColor = n; })),
      race.beard ? row('Beard', pressBtn(state.beard ? 'On' : 'Off', state.beard, () => { state.beard = !state.beard; render(); })) : null,
      row('Class', ...Object.entries(CLASSES).map(([id, c]) => pressBtn(c.name, state.cls === id, () => { state.cls = id; render(); }))),
      el('p', { className: 'hint', textContent: `Body sheet: ${build.body}. ${CLASSES[state.cls].name} weapons attack with "${CLASSES[state.cls].attack}".` }),
    ].filter(Boolean));

    // gear
    const tierBtn = (i, pressed, onClick) => {
      const b = pressBtn(String(i + 1), pressed, onClick, 'btn tier');
      b.style.setProperty('--tier', TIERS[i].color);
      b.setAttribute('aria-label', TIERS[i].name);
      b.title = TIERS[i].name;
      return b;
    };
    const allSame = (i) => SLOTS.every((s) => state.tiers[s.id] === i);
    gearPanel.replaceChildren(
      el('h2', { textContent: 'Gear' }),
      gearRow('All slots', el('span', { className: 'tier-gap' }), ...TIERS.map((_, i) => tierBtn(i, allSame(i), () => { for (const s of SLOTS) state.tiers[s.id] = i; render(); }))),
      ...SLOTS.map((s) => gearRow(
        s.name,
        pressBtn('–', state.tiers[s.id] == null, () => { state.tiers[s.id] = null; render(); }, 'btn tier none'),
        ...TIERS.map((_, i) => tierBtn(i, state.tiers[s.id] === i, () => { state.tiers[s.id] = i; render(); })),
      )),
      el('p', { className: 'hint', textContent: '1 Common, 2 Uncommon, 3 Rare, 4 Very Rare, 5 Legendary. The dash empties a slot.' }),
    );

    // tier line-up: the whole outfit at each tier, side by side
    const figures = TIERS.map((t, i) => {
      const c = el('canvas');
      const tiers = Object.fromEntries(SLOTS.map((s) => [s.id, i]));
      drawStill(c, look(tiers), { facing: state.facing, scale: 2 });
      const fig = el('figure', {}, c, el('figcaption', { textContent: t.name }));
      fig.style.setProperty('--tier', t.color);
      return fig;
    });
    lineupPanel.replaceChildren(
      el('h2', { textContent: `${CLASSES[state.cls].name} tiers side by side` }),
      el('div', { className: 'lineup' }, ...figures),
    );

    // what is being drawn, so a look can be named when asking for a swap
    const items = SLOTS.filter((s) => state.tiers[s.id] != null).map((s) => {
      const refs = GEAR[state.cls][s.id][state.tiers[s.id]];
      return el('li', { textContent: `${s.name} (${TIERS[state.tiers[s.id]].name}): ${refs.map(layerKey).join(', ')}` });
    });
    wearingPanel.replaceChildren(
      el('h2', { textContent: 'Layers on screen' }),
      el('ul', { className: 'wearing' }, ...items),
      el('p', { className: 'hint', textContent: 'Quote a line from this list to name a look you want swapped.' }),
    );
  }

  render();
  fitStage();
}
