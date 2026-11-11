// The credits screen (Phase 7), opened from the Tavern tab. Every artist and license comes from
// data/credits.js, which `node tools/sprites.mjs bake` writes from the sheet definitions of exactly
// the layers the game uses, so this screen is always as exact as CREDITS.md. That file is large,
// so it is loaded only when the screen is opened.

import { el } from './dom.js';

const link = (url) => el('a', { href: url, textContent: url.replace(/^https?:\/\//, ''), target: '_blank', rel: 'noopener' });

export async function showCredits(root) {
  root.querySelector('.overlay.credits')?.remove();
  const close = el('button', { className: 'btn primary', type: 'button', textContent: 'Close' });
  const body = el('div', { className: 'credits-body' }, el('p', { className: 'hint', textContent: 'Fetching the list of artists from the cellar...' }));
  const overlay = el('div', { className: 'overlay credits', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'credits-title' } },
    el('div', { className: 'panel card credits-card' },
      el('h2', { id: 'credits-title', textContent: 'Credits' }),
      body,
      el('div', { className: 'row card-actions credits-close' }, close)));
  close.onclick = () => overlay.remove();
  root.append(overlay);
  close.focus();

  let data;
  try {
    data = await import('../../data/credits.js');
  } catch {
    body.replaceChildren(el('p', { textContent: 'The list could not be loaded. Every artist is also named in CREDITS.md, beside the game.' }));
    return;
  }
  const { CREDITS, LPC_COMMIT } = data;
  const files = CREDITS.flatMap((c) => c.credits);
  const artists = [...new Set(files.flatMap((f) => f.authors))].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  const named = artists.filter((a) => a !== '??');
  const licenses = [...new Set(files.flatMap((f) => f.licenses))].sort();

  const layers = CREDITS.map((c) => el('details', { className: 'credit-layer' },
    el('summary', { textContent: c.name }),
    ...c.credits.map((f) => el('div', { className: 'credit-file' },
      el('p', { className: 'credit-path', textContent: f.file }),
      el('p', { textContent: `By ${f.authors.join(', ')}.` }),
      f.notes ? el('p', { className: 'hint', textContent: f.notes }) : null,
      el('p', { className: 'hint', textContent: `Licences: ${f.licenses.join(', ')}.` }),
      ...f.urls.map((u) => el('p', { className: 'credit-link' }, link(u)))))));

  body.replaceChildren(
    el('h3', { textContent: 'The hero' }),
    el('p', { textContent: 'Every hero, and every piece of gear they wear, is drawn from Liberated Pixel Cup (LPC) art, by the artists below. The layers were taken from the Universal LPC Spritesheet Character Generator and recoloured with its own palettes.' }),
    el('p', { className: 'credit-link' }, link('https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator')),
    el('p', { className: 'hint', textContent: `Generator commit ${LPC_COMMIT.slice(0, 12)}. ${files.length} art files in ${CREDITS.length} layers. The recoloured images are derivative works, offered under the same licences as their sources.` }),
    el('h3', { textContent: `Artists (${named.length})` }),
    el('p', { className: 'credit-artists', textContent: named.join(' · ') + (artists.includes('??') ? '. One layer credits an artist the generator lists only as "??".' : '.') }),
    el('h3', { textContent: 'Licences' }),
    el('p', { textContent: licenses.join(', ') + '.' }),
    el('p', { className: 'hint', textContent: 'Many pieces carry several licences; the generator\'s README explains how to keep to them. This is a summary, not legal advice.' }),
    el('h3', { textContent: 'Layer by layer' }),
    el('p', { className: 'hint', textContent: 'Who made each piece, with notes, licences, and where it was first published.' }),
    ...layers,
    el('h3', { textContent: 'Everything else' }),
    el('p', { textContent: 'The backdrops, the map, the sound effects, and the tavern tune are made by the game itself, in code, and use no one else\'s work. The headings use whatever old-style serif the device has to hand.' }),
    el('p', { className: 'hint', textContent: 'The same list, in full, is in CREDITS.md beside the game.' }));
}
