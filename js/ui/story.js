// The story chapter card. One is earned by the first clear of each dungeon (text in data/story.js)
// and can be read again from the Map tab.

import { CHAPTERS, STORY_TITLE } from '../../data/story.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { REGIONS } from '../../data/regions.js';
import { el } from './dom.js';

// `onClose` runs when the card is dismissed.
export function showChapter(root, regionId, hero, onClose) {
  const c = CHAPTERS[regionId];
  if (!c) { onClose?.(); return; }
  root.querySelector('.overlay.chapter')?.remove();
  const close = el('button', { className: 'btn primary', type: 'button', textContent: c.n === REGIONS.length ? 'Raise a mug' : 'Carry on' });
  const overlay = el('div', { className: 'overlay chapter', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'chapter-title' } },
    el('div', { className: 'panel card chapter-card' },
      el('p', { className: 'chapter-kicker', textContent: `${STORY_TITLE} · Chapter ${c.n} of ${REGIONS.length}` }),
      el('h2', { id: 'chapter-title', textContent: c.title }),
      el('p', { className: 'chapter-page', textContent: `${c.page}, recovered by ${hero.name} from ${DUNGEONS[regionId].name}.` }),
      ...c.text.map((p) => el('p', { className: 'chapter-text', textContent: p })),
      close));
  close.onclick = () => { overlay.remove(); onClose?.(); };
  root.append(overlay);
  close.focus();
}
