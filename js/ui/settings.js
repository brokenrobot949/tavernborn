// Settings (Phase 7), on the Tavern tab: the mute switch, sound effects, the tavern tune, the
// volume, and the credits. These belong to this device, not to the save (js/audio.js).

import { getSettings, setSettings, sfx } from '../audio.js';
import { el } from './dom.js';
import { showCredits } from './credits.js';

// An on/off switch: one button, 44 px tall, that says what it is and how it is set.
function toggle(label, key, onNote) {
  const b = el('button', { className: 'btn toggle', type: 'button', attrs: { role: 'switch' } });
  const draw = () => {
    const on = getSettings()[key];
    b.setAttribute('aria-checked', String(on));
    b.textContent = `${label}: ${on ? 'on' : 'off'}`;
  };
  b.onclick = () => { setSettings({ [key]: !getSettings()[key] }); draw(); onNote?.(); };
  draw();
  return { b, draw };
}

export function mountSettings() {
  const note = el('p', { className: 'hint', attrs: { role: 'status' } });
  const say = () => {
    const s = getSettings();
    note.textContent = s.muted ? 'Everything is silent.'
      : !s.effects && !s.music ? 'Sound is on, but both kinds are off, so it is silent anyway.'
      : `${s.effects ? 'Effects play for level-ups, natural 20s and 1s, loot, knockouts, and quests.' : 'No effects.'} ${s.music ? 'The tavern tune is playing, quietly, in a corner.' : 'No music.'}`;
  };
  const muted = toggle('Mute everything', 'muted', say);
  const effects = toggle('Sound effects', 'effects', say);
  const music = toggle('Tavern music', 'music', say);
  const volume = el('input', { type: 'range', min: 0, max: 100, step: 5, className: 'volume', value: Math.round(getSettings().volume * 100), attrs: { 'aria-label': 'Volume' } });
  volume.oninput = () => setSettings({ volume: volume.value / 100 });
  volume.onchange = () => sfx('quest');
  const test = el('button', { className: 'btn', type: 'button', textContent: 'Play a level-up', onclick: () => { if (!sfx('levelup')) note.textContent = getSettings().muted || !getSettings().effects ? 'Effects are off, so that was silent.' : 'This device has not let the page make sound yet. Tap once more.'; } });
  say();
  return el('section', { className: 'panel settings' },
    el('h3', { textContent: 'Settings' }),
    el('div', { className: 'row' }, muted.b),
    el('div', { className: 'row' }, effects.b, music.b),
    el('label', { className: 'volume-row' }, el('span', { textContent: 'Volume' }), volume),
    el('div', { className: 'row' }, test),
    note,
    el('p', { className: 'hint', textContent: 'Every sound is made by the game as it plays; there are no recordings. Phones keep a page silent until it has been touched once, and the switch on the side of the phone wins over all of this. These choices belong to this device and do not travel in a save string.' }),
    el('h3', { className: 'settings-sub', textContent: 'Credits' }),
    el('p', { className: 'hint', textContent: 'The artists whose work the hero is drawn from, and the licences it comes under.' }),
    el('div', { className: 'row' }, el('button', { className: 'btn', type: 'button', textContent: 'Open the credits', onclick: () => showCredits(document.getElementById('game')) })));
}
