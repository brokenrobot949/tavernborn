// Small page helpers shared by the screens.

// el('div', { className: 'x', attrs: { role: 'tab' } }, child, 'text', ...)
export function el(tag, props = {}, ...kids) {
  const { attrs, ...rest } = props;
  const node = Object.assign(document.createElement(tag), rest);
  for (const [k, v] of Object.entries(attrs ?? {})) node.setAttribute(k, v);
  node.append(...kids.flat().filter((k) => k != null && k !== false));
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
