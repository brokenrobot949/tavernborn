// Tavern tab. Phase 1 holds Settings only: the save string (export and import), starting over,
// and the way back to the sprite lab. Upgrades, the cleric, the roster, and the Hall of Legends
// arrive in Phase 6.

import { exportSave, importSave } from '../state.js';
import { el, confirmBtn } from './dom.js';

// `app.replaceSave(save)` swaps in an imported save; `app.newHero()` goes back to creation.
export function mountTavern(root, app) {
  const out = el('textarea', { className: 'save-text', readOnly: true, rows: 4, attrs: { 'aria-label': 'Your save string' } });
  const outMsg = el('p', { className: 'hint', attrs: { role: 'status' } });
  const input = el('textarea', { className: 'save-text', rows: 4, placeholder: 'Paste a save string here', attrs: { 'aria-label': 'Save string to load' } });
  const inMsg = el('p', { className: 'hint', attrs: { role: 'status' } });

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
      el('p', { className: 'hint', textContent: 'The Phase 0 page for judging looks: every race, class, and gear tier.' })),
  );

  return { update() {} };
}
