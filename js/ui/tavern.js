// Tavern tab: the cleric (pay to end a knockout now), then Settings: the save string (export and
// import), starting over, and the workshop links. Upgrades, respec, the roster, and the Hall of
// Legends arrive in Phases 4 and 6.

import { exportSave, importSave } from '../state.js';
import { clericFee, payCleric } from '../tasks.js';
import { el, confirmBtn, num } from './dom.js';

// `app.replaceSave(save)` swaps in an imported save; `app.newHero()` goes back to creation.
export function mountTavern(root, app) {
  const out = el('textarea', { className: 'save-text', readOnly: true, rows: 4, attrs: { 'aria-label': 'Your save string' } });
  const outMsg = el('p', { className: 'hint', attrs: { role: 'status' } });
  const input = el('textarea', { className: 'save-text', rows: 4, placeholder: 'Paste a save string here', attrs: { 'aria-label': 'Save string to load' } });
  const inMsg = el('p', { className: 'hint', attrs: { role: 'status' } });

  // The cleric. The panel is always here; the button only works while the hero is knocked out.
  const clericText = el('p', {});
  const clericBtn = el('button', { className: 'btn primary', type: 'button', textContent: 'Pay the cleric' });
  let current = null;
  clericBtn.onclick = () => { if (current && payCleric(current.state, current.hero) != null) app.changed(); };

  const makeString = () => {
    out.value = exportSave(app.currentSave());
    outMsg.textContent = `Save string made (${out.value.length.toLocaleString('en-US')} characters). Copy it somewhere safe.`;
  };
  const copy = async () => {
    if (!out.value) makeString();
    try {
      await navigator.clipboard.writeText(out.value);
      outMsg.textContent = 'Copied.';
    } catch {
      out.focus();
      out.select();
      outMsg.textContent = 'Could not copy automatically. The text is selected; copy it by hand.';
    }
  };
  const load = () => {
    try {
      const save = importSave(input.value);
      input.value = '';
      inMsg.textContent = 'Save loaded.';
      app.replaceSave(save);
    } catch (err) {
      inMsg.textContent = err.message;
    }
  };

  root.append(
    el('h2', { className: 'view-title', textContent: 'The Wobbly Griffin' }),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'The cleric' }),
      clericText,
      el('div', { className: 'row' }, clericBtn),
      el('p', { className: 'hint', textContent: 'A knocked-out hero gets up unaided after a rest, 15 minutes at level 1 up to about 2 hours at level 20, and loses nothing but the dungeon run or quest step they were on. The cleric ends the rest at once for a fee that grows with the time left and with level.' })),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Still to come' }),
      el('p', { className: 'hint', textContent: 'Tavern upgrades, the roster of three heroes, retirement, and the Hall of Legends are not built yet. Gold keeps; nothing is lost by saving it.' })),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Save' }),
      el('p', { className: 'hint', textContent: 'The game saves itself on this device every few seconds. A save string lets you move a hero to another device or keep a backup.' }),
      el('div', { className: 'row' },
        el('button', { className: 'btn', type: 'button', textContent: 'Make save string', onclick: makeString }),
        el('button', { className: 'btn', type: 'button', textContent: 'Copy', onclick: copy })),
      out, outMsg),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Load a save string' }),
      input,
      el('div', { className: 'row' }, confirmBtn('Load this save', 'Tap again: replaces the current hero', load)),
      inMsg),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Start over' }),
      el('p', { className: 'hint', textContent: 'Creates a new hero in place of this one. A roster of three heroes arrives in a later build; until then, make a save string first if you want this hero back.' }),
      el('div', { className: 'row' }, confirmBtn('Create a new hero', 'Tap again: this hero is replaced', () => app.newHero()))),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Workshop' }),
      el('div', { className: 'row' }, el('a', { className: 'btn link', href: 'sprite-lab.html', textContent: 'Open the sprite lab' })),
      el('p', { className: 'hint', textContent: 'The Phase 0 page for judging looks: every race, class, and gear tier.' }),
      el('div', { className: 'row' }, el('a', { className: 'btn link', href: 'tools/simulate.html', textContent: 'Open the pacing simulator' })),
      el('p', { className: 'hint', textContent: 'Runs 500 heroes through the game rules at high speed and charts when each level lands. It does not touch your save.' })),
  );

  function update(state, hero) {
    current = { state, hero };
    const fee = clericFee(hero);
    clericBtn.hidden = fee == null;
    if (fee == null) { clericText.textContent = `${hero.name} is on their feet. The cleric is reading and would like it to stay that way.`; return; }
    const left = Math.max(0, hero.knockedOutUntil - hero.age);
    clericBtn.textContent = `Pay the cleric ${num(fee)} gp`;
    clericBtn.disabled = hero.gold < fee;
    clericText.textContent = `${hero.name} is on the good bench and will be up in ${Math.ceil(left / 60)} min. Purse: ${num(hero.gold)} gp.${hero.gold < fee ? ' That is not enough for the cleric.' : ''}`;
  }
  return { update };
}
