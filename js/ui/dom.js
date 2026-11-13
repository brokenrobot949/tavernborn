// Small page helpers shared by the screens.

// The tavern's name. The game's text says "The Wobbly Griffin"; when the player has named the tavern
// something else, the name is swapped in as the text is put on the page (`named`), so a rename
// reaches every line, old Chronicle lines included. `main.js` sets it from the save on each start.
export const DEFAULT_TAVERN = 'The Wobbly Griffin';
let tavernName = DEFAULT_TAVERN;
export function setTavernName(name) { tavernName = name || DEFAULT_TAVERN; }
export const getTavernName = () => tavernName;
export const named = (s) => (typeof s === 'string' && tavernName !== DEFAULT_TAVERN ? s.replaceAll(DEFAULT_TAVERN, tavernName) : s);

// el('div', { className: 'x', attrs: { role: 'tab' } }, child, 'text', ...)
export function el(tag, props = {}, ...kids) {
  const { attrs, ...rest } = props;
  if (typeof rest.textContent === 'string') rest.textContent = named(rest.textContent);
  const node = Object.assign(document.createElement(tag), rest);
  for (const [k, v] of Object.entries(attrs ?? {})) node.setAttribute(k, named(v));
  node.append(...kids.flat().filter((k) => k != null && k !== false).map(named));
  return node;
}

export function pressBtn(label, pressed, onClick, cls = 'btn') {
  const b = el('button', { className: cls, type: 'button', textContent: label, onclick: onClick });
  b.setAttribute('aria-pressed', String(pressed));
  return b;
}

// A button that asks for a second tap before doing something that cannot be undone.
export function confirmBtn(label, confirmLabel, onConfirm, cls = 'btn') {
  let armed = false;
  let timer = 0;
  const b = el('button', { className: cls, type: 'button', textContent: label });
  b.onclick = () => {
    clearTimeout(timer);
    if (armed) { armed = false; b.textContent = label; b.classList.remove('danger'); onConfirm(); return; }
    armed = true;
    b.textContent = confirmLabel;
    b.classList.add('danger');
    timer = setTimeout(() => { armed = false; b.textContent = label; b.classList.remove('danger'); }, 5000);
  };
  return b;
}

export const num = (n) => Math.round(n).toLocaleString('en-US');
export const signed = (n) => (n >= 0 ? '+' + n : String(n));

// "Day 2, 03:07": how long the hero had been adventuring when a Chronicle line was written.
export function heroClock(seconds) {
  const day = Math.floor(seconds / 86400) + 1;
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `Day ${day}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// "9 hours 12 minutes", "3 days 4 hours", "45 seconds"
export function duration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const units = [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  const parts = [];
  let left = s;
  for (const [name, size] of units) {
    const n = Math.floor(left / size);
    left -= n * size;
    if (n) parts.push(`${n} ${name}${n === 1 ? '' : 's'}`);
    if (parts.length === 2) break;
  }
  return parts.join(' ') || '0 seconds';
}

// Section tabs at the top of a long tab: a row of pills that shows one section at a time instead
// of one long scroll. `pages` is [{ id, label, icon (an svg node or null), node }]. The choice is
// remembered on this device (a convenience only; it is fine if storage is unavailable).
export function sectionTabs(name, pages) {
  const storeKey = 'tavernborn.section.' + name;
  let current = null;
  try { current = localStorage.getItem(storeKey); } catch { /* storage blocked: start on the first */ }
  if (!pages.some((p) => p.id === current)) current = pages[0].id;
  const buttons = {};
  const nav = el('nav', { className: 'subnav', attrs: { role: 'tablist', 'aria-label': 'Sections' } });
  for (const p of pages) {
    p.node.classList.add('subpage');
    buttons[p.id] = el('button', { type: 'button', attrs: { role: 'tab' }, onclick: () => show(p.id, true) }, p.icon, el('span', { textContent: p.label }));
    nav.append(buttons[p.id]);
  }
  function show(id, tapped = false) {
    current = id;
    for (const p of pages) {
      p.node.hidden = p.id !== id;
      buttons[p.id].setAttribute('aria-selected', String(p.id === id));
    }
    if (tapped) {
      try { localStorage.setItem(storeKey, id); } catch { /* not remembered, which is fine */ }
      if (nav.getBoundingClientRect().top < 0) nav.scrollIntoView();
      buttons[id].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
  show(current);
  return {
    nav, show,
    current: () => current,
    // A small count on a section's pill (an empty value hides it).
    badge(id, value) { buttons[id].dataset.badge = value ? String(value) : ''; },
  };
}
