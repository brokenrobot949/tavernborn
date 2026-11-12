// Small line icons drawn in code (24 x 24, stroked in the current text colour), for the
// Chronicle, the gear slots, the map, and the tavern. Nothing to download and nothing to credit.

const NS = 'http://www.w3.org/2000/svg';

// Each icon is one path, or a list of paths; a path starting with '*' is filled, not stroked.
export const ICONS = {
  // gear slots
  weapon: ['M14.5 4.5h5v5L9 20l-5-5z', 'M5 13l6 6', 'M3 21l3-3'],
  offhand: ['M12 3l8 3v6c0 5-3.5 8-8 9.5C7.5 20 4 17 4 12V6z', 'M12 7v10', 'M8 11h8'],
  head: ['M4 15c0-5 3.5-9 8-9s8 4 8 9z', 'M3 15h18v3H3z', 'M12 6V3'],
  body: ['M7 3l5 3 5-3 4 4-3 3v11H6V10L3 7z', 'M9 13h6'],
  hands: ['M7 21v-8L5 9.5a1.5 1.5 0 0 1 2.6-1.5L9 10V4.5a1.5 1.5 0 0 1 3 0V10V3.5a1.5 1.5 0 0 1 3 0V10V5a1.5 1.5 0 0 1 3 0v10c0 3-2 6-5 6z'],
  feet: ['M8 3h5v10l6 3c1.5.8 2 2 2 3v2H6l-1-3V3z', 'M5 17h16'],
  cloak: ['M8 3h8l1 4 3 14H4L7 7z', 'M12 7v14', 'M8 3c1 2 2.5 3 4 3s3-1 4-3'],
  trinket: ['M7 3l5 6 5-6', '*M12 10l4 5-4 5-4-5z'],
  // the Chronicle
  swords: ['M4 4l10 10', 'M4 4h4v1', 'M4 4v4', 'M20 4L10 14', 'M20 4h-4', 'M20 4v4', 'M13 16l3-3 5 5-3 3z', 'M11 16l-3-3-5 5 3 3z'],
  star: ['*M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z'],
  skull: ['M5 11a7 7 0 0 1 14 0v3l-2 1v4H7v-4l-2-1z', '*M9 10.5a1.6 1.6 0 1 0 .01 0z', '*M15 10.5a1.6 1.6 0 1 0 .01 0z', 'M10 19v-2', 'M14 19v-2'],
  up: ['M12 20V5', 'M6 11l6-6 6 6', 'M5 21h14'],
  crown: ['M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z', 'M5 16h14'],
  door: ['M5 21V9a7 7 0 0 1 14 0v12', 'M3 21h18', 'M9 21v-8h6v8', '*M14 16.5a.8.8 0 1 0 .01 0z'],
  scroll: ['M6 4h11a2 2 0 0 1 2 2v12', 'M6 4a2 2 0 0 0-2 2v1h4', 'M8 6v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1H10', 'M11 9h5', 'M11 12h5'],
  pin: ['M12 21s-6-6.5-6-11a6 6 0 0 1 12 0c0 4.5-6 11-6 11z', '*M12 7.5a2.5 2.5 0 1 0 .01 0z'],
  boots: ['M8 3h5v10l6 3c1.5.8 2 2 2 3v2H6l-1-3V3z'],
  spark: ['M12 3v5', 'M12 16v5', 'M3 12h5', 'M16 12h5', 'M6 6l3 3', 'M15 15l3 3', 'M18 6l-3 3', 'M9 15l-3 3'],
  potion: ['M10 3h4', 'M10 3v5L5.5 16A3.5 3.5 0 0 0 8.6 21h6.8a3.5 3.5 0 0 0 3.1-5L14 8V3', 'M7 14h10'],
  heart: ['*M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z'],
  coin: ['M12 3a9 9 0 1 0 .01 0z', 'M12 7v10', 'M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5'],
  mug: ['M5 6h11v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z', 'M16 9h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2', 'M8 10v7', 'M12 10v7', 'M5 6c0-2 2-3 3.5-2C10 2 13 2 14 4c1.5-.5 2.5.5 2 2'],
  book: ['M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z', 'M4 20a2 2 0 0 0 2 1h13v-3', 'M9 7h6'],
  eye: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z', '*M12 9a3 3 0 1 0 .01 0z'],
  vortex: ['M12 12m-1.5 0a1.5 1.5 0 1 0 3 0a3 3 0 1 0-6 0a4.5 4.5 0 1 0 9 0a6 6 0 1 0-12 0a7.5 7.5 0 1 0 15 0'],
  d20: ['M12 2.5l8.5 5v9L12 21.5l-8.5-5v-9z', 'M12 2.5L7 11h10z', 'M7 11l5 10.5L17 11', 'M3.5 7.5L7 11', 'M20.5 7.5L17 11', 'M3.5 16.5L7 11', 'M20.5 16.5L17 11'],
  hammer: ['M4 8l5-5 4 4-5 5z', 'M10.5 9.5L20 19l-1.5 1.5L9 11'],
  bed: ['M3 19V6', 'M3 14h18v5', 'M3 11h7v3', 'M10 11h8a3 3 0 0 1 3 3'],
  horse: ['M7 21v-6l-3-1 1-4 5-5 2-2v3l3 1 3 4-1 2-3-1-2 3v6', '*M13 8.5a.8.8 0 1 0 .01 0z'],
  board: ['M3 4h18v12H3z', 'M8 20l2-4', 'M16 20l-2-4', 'M6 7h5', 'M6 10h7', 'M14 7h4v5h-4z'],
  trophy: ['M7 4h10v4a5 5 0 0 1-10 0z', 'M7 6H4c0 3 1.5 4 3 4', 'M17 6h3c0 3-1.5 4-3 4', 'M12 13v4', 'M8 21h8l-1-4H9z'],
  people: ['M9 11a3 3 0 1 0 .01 0z', 'M3 20c0-3 2.7-5 6-5s6 2 6 5', 'M16 8a2.5 2.5 0 1 0 .01 0z', 'M16 13c2.8 0 5 1.6 5 4.5'],
  frame: ['M4 3h16v18H4z', 'M7 6h10v12H7z', 'M9.5 16c0-2 1-3 2.5-3s2.5 1 2.5 3', 'M12 10a1.5 1.5 0 1 0 .01 0z'],
  gear: ['M12 9a3 3 0 1 0 .01 0z', 'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3', 'M4.9 4.9l2.1 2.1', 'M17 17l2.1 2.1', 'M19.1 4.9L17 7', 'M7 17l-2.1 2.1'],
  compass: ['M12 3a9 9 0 1 0 .01 0z', '*M12 6l2 6h-4z', 'M10 12l2 6 2-6'],
  flag: ['M5 21V4', 'M5 4h12l-3 4 3 4H5'],
  lock: ['M6 11h12v10H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  check: ['M4 12.5l5 5L20 6.5'],
  lute: ['M8.5 11a6 6 0 1 0 4.5 4.5l2-2L10.5 9z', 'M13 11l6.5-6.5', 'M18 3l3 3', '*M8.5 16a1.4 1.4 0 1 0 .01 0z'],
};

// An <svg> for one icon. `cls` adds classes (for colour and size, set in CSS).
export function icon(name, cls = '') {
  const paths = ICONS[name] ?? ICONS.star;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', ('icon ' + cls).trim());
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const p = document.createElementNS(NS, 'path');
    if (d[0] === '*') { p.setAttribute('d', d.slice(1)); p.setAttribute('class', 'fill'); } else p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}
