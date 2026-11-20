// The Stats tab's Career section (after round five): four small charts drawn as SVG from `hero.career`
// (js/hero.js), which the sim fills in after every task. Pace (the level by day, against the expected
// pace), XP earned each day, gold held at the end of each day, and knockouts by place. Each chart is one
// series; tapping or pointing at a mark shows its numbers in the line under the chart. A written list of
// the day each level came sits under the charts, for anyone who would rather read than look.
// A hero from a save made before the charts existed has a career from the day it was loaded.

import { REGIONS } from '../../data/regions.js';
import { LEVEL_TARGET_HOURS, MAX_LEVEL } from '../rules.js';
import { REGION_COLORS } from './map.js';
import { el, num } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...kids.filter(Boolean));
  return node;
};
const W = 320, H = 150;
const PAD = { l: 34, r: 10, t: 10, b: 22 };
const INK = '#8a2f24'; // the hero's own line and bars: the game's accent
const RIFT_COLOR = '#6a3fa0';
const dayText = (d) => (d < 1 ? `${Math.round(d * 24)} h` : `day ${(d + 1).toFixed(1).replace(/\.0$/, '')}`);
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}m` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n)));
// A round step for an axis up to `max`, about four lines.
function niceStep(max) {
  const raw = Math.max(1, max) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw);
}

// A chart frame: the plot, a recessive grid with its numbers on the left, day numbers along the bottom,
// and the readout line under it. `marks` are SVG nodes with a `data-tip`.
function frame(title, note, yMax, yLabel, xMax, marks, extra = []) {
  const x = (d) => PAD.l + (d / xMax) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - (v / yMax) * (H - PAD.t - PAD.b);
  const grid = [];
  const step = niceStep(yMax);
  for (let v = 0; v <= yMax + 1e-9; v += step) {
    grid.push(svg('line', { x1: PAD.l, x2: W - PAD.r, y1: y(v), y2: y(v), class: v ? 'grid' : 'axis' }));
    const t = svg('text', { x: PAD.l - 5, y: y(v) + 3.5, class: 'tick', 'text-anchor': 'end' });
    t.textContent = yLabel(v);
    grid.push(t);
  }
  const xs = niceStep(xMax);
  for (let d = 0; d <= xMax + 1e-9; d += xs) {
    const t = svg('text', { x: x(d), y: H - 6, class: 'tick', 'text-anchor': 'middle' });
    t.textContent = d === 0 ? 'Day 1' : String(d + 1);
    grid.push(t);
  }
  const plot = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'career-chart', role: 'img', 'aria-label': title }, ...grid, ...marks(x, y));
  return card(title, note, plot, extra);
}

// A chart's card, with the readout that shows what was tapped.
function card(title, note, plot, extra = []) {
  const readout = el('p', { className: 'chart-readout', textContent: note, attrs: { 'aria-live': 'polite' } });
  const show = (e) => { const tip = e.target.closest?.('[data-tip]')?.getAttribute('data-tip'); if (tip) readout.textContent = tip; };
  plot.addEventListener('pointerover', show);
  plot.addEventListener('click', show);
  return el('section', { className: 'panel career-card' }, el('h3', { textContent: title }), ...extra, plot, readout);
}

// Hit areas wider than the mark, so a finger finds it.
const hit = (x, y, w, h, tip) => svg('rect', { x, y, width: w, height: h, class: 'hit', 'data-tip': tip });

// The level by day of adventuring, as steps, against the pace the game is built for (dashed).
function paceChart(hero) {
  const at = hero.career.levelAt;
  const pts = Object.entries(at).map(([l, t]) => [t / 86400, Number(l)]).sort((a, b) => a[1] - b[1]);
  const now = hero.age / 86400;
  const xMax = Math.max(4, Math.ceil(Math.max(now, ...pts.map((p) => p[0])) * 1.08), Math.min(30, Math.ceil(LEVEL_TARGET_HOURS[Math.min(MAX_LEVEL, hero.level + 1)] / 24)));
  return frame('Pace', 'The solid line is the hero, the dashed one the pace the game is built for. Tap a step for its day.', MAX_LEVEL, (v) => (v ? String(v) : ''), xMax, (x, y) => {
    const target = LEVEL_TARGET_HOURS.slice(1).map((h, i) => [h / 24, i + 1]).filter((p) => p[0] <= xMax);
    const out = [svg('polyline', { points: target.map(([d, l]) => `${x(d)},${y(l)}`).join(' '), class: 'target' })];
    if (!pts.length) return out;
    // Steps: flat until the next level arrives, then up. The last runs on to now.
    const path = [];
    pts.forEach(([d, l], i) => {
      if (i) path.push(`${x(d)},${y(pts[i - 1][1])}`);
      path.push(`${x(d)},${y(l)}`);
    });
    path.push(`${x(Math.max(now, pts[pts.length - 1][0]))},${y(pts[pts.length - 1][1])}`);
    out.push(svg('polyline', { points: path.join(' '), class: 'line' }));
    for (const [d, l] of pts) {
      const want = LEVEL_TARGET_HOURS[l] / 24;
      const diff = d - want;
      const vs = l < 2 ? '' : Math.abs(diff) < 1 / 24 ? ', right on the expected pace' : `, ${Math.abs(diff) < 1 ? `${Math.round(Math.abs(diff) * 24)} h` : `${Math.abs(diff).toFixed(1)} days`} ${diff < 0 ? 'ahead of' : 'behind'} the expected pace`;
      out.push(svg('circle', { cx: x(d), cy: y(l), r: 2.6, class: 'dot' }));
      out.push(hit(x(d) - 7, y(l) - 7, 14, 14, `Level ${l} on ${dayText(d)}${vs}.`));
    }
    return out;
  }, [legend([['line', 'The hero'], ['target', 'Expected pace']])]);
}

// The days the career has numbers for, oldest first: [day, [xp, gold, knockouts, level]].
const daysOf = (hero) => hero.career.days.map((d, i) => [i, d]).filter(([, d]) => d);

// XP earned each day: the gain from the day before (the first day counts from nothing, if the career
// began with the hero).
function xpChart(hero) {
  const days = daysOf(hero);
  const bars = [];
  days.forEach(([i, d], k) => {
    const prev = k ? days[k - 1] : null;
    if (prev && prev[0] === i - 1) bars.push([i, d[0] - prev[1][0]]);
    else if (i === 0 && hero.career.levelAt[1] === 0) bars.push([i, d[0]]);
  });
  const xMax = Math.max(4, (bars.at(-1)?.[0] ?? 0) + 1);
  const yMax = Math.max(1, ...bars.map((b) => b[1])) * 1.1;
  const today = Math.floor(hero.age / 86400);
  return frame('XP each day', bars.length ? 'Tap a bar for its day. The last bar is today so far.' : 'The first full day will show here.', yMax, (v) => (v ? short(v) : ''), xMax, (x, y) => {
    const w = Math.max(2, Math.min(14, (x(1) - x(0)) - 2));
    return bars.flatMap(([i, v]) => {
      const left = x(i + 0.5) - w / 2;
      return [
        svg('path', { d: roundTop(left, y(v), w, y(0)), class: 'bar' + (i === today ? ' today' : '') }),
        hit(x(i), PAD.t, x(i + 1) - x(i), H - PAD.t - PAD.b, `Day ${i + 1}${i === today ? ' (today, so far)' : ''}: ${num(v)} XP.`),
      ];
    });
  });
}

// A bar with its top corners rounded and its foot square on the baseline.
function roundTop(x, top, w, base) {
  const r = Math.min(3, w / 2, Math.max(0, base - top));
  return `M${x} ${base}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + w - r}Q${x + w} ${top} ${x + w} ${top + r}V${base}Z`;
}

// Gold held at the end of each day. It drops when the purse is spent.
function goldChart(hero) {
  const days = daysOf(hero);
  const xMax = Math.max(4, (days.at(-1)?.[0] ?? 0) + 1);
  const yMax = Math.max(1, ...days.map(([, d]) => d[1])) * 1.1;
  return frame('Gold in the purse', days.length ? 'At the end of each day. It falls when gold is spent at the tavern. Tap a point.' : 'The first day will show here.', yMax, (v) => (v ? short(v) : ''), xMax, (x, y) => {
    if (!days.length) return [];
    const pts = days.map(([i, d]) => [x(i + 0.5), y(d[1])]);
    return [
      svg('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'line' }),
      ...days.flatMap(([i, d], k) => [
        days.length < 40 ? svg('circle', { cx: pts[k][0], cy: pts[k][1], r: 2.2, class: 'dot' }) : null,
        hit(x(i), PAD.t, x(i + 1) - x(i), H - PAD.t - PAD.b, `Day ${i + 1}: ${num(d[1])} gp in the purse.`),
      ].filter(Boolean)),
    ];
  });
}

// Knockouts by place, longest bar first: each region in its own colour, named beside its bar.
function knockoutChart(hero) {
  const ko = hero.career.ko;
  const rows = [...REGIONS.map((r) => [r.id, r.name, REGION_COLORS[r.id]]), ['rift', 'The Planar Rifts', RIFT_COLOR]]
    .map(([id, name, color]) => ({ id, name, color, n: ko[id] ?? 0 })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  const total = rows.reduce((a, r) => a + r.n, 0);
  if (!rows.length) {
    return el('section', { className: 'panel career-card' }, el('h3', { textContent: 'Knockouts by place' }),
      el('p', { className: 'chart-readout', textContent: hero.stats.knockouts ? 'None since the charts began. The good bench has been quiet.' : 'None yet. The good bench is kept for nobody.' }));
  }
  const rowH = 26;
  const h = rows.length * rowH + 6;
  const max = rows[0].n;
  const plot = svg('svg', { viewBox: `0 0 ${W} ${h}`, class: 'career-chart', role: 'img', 'aria-label': 'Knockouts by place' },
    ...rows.flatMap((r, i) => {
      const top = 3 + i * rowH;
      const w = Math.max(3, ((W - 60) * r.n) / max);
      const name = svg('text', { x: 0, y: top + 9, class: 'tick name' });
      name.textContent = r.name;
      const count = svg('text', { x: w + 5, y: top + 21, class: 'tick count' });
      count.textContent = String(r.n);
      const bar = svg('path', { d: `M0 ${top + 13}H${w - 3}Q${w} ${top + 13} ${w} ${top + 16}V${top + 19}Q${w} ${top + 22} ${w - 3} ${top + 22}H0Z`, fill: r.color });
      return [name, bar, count, hit(0, top, W, rowH, `${r.name}: ${r.n} knockout${r.n === 1 ? '' : 's'}, ${Math.round((100 * r.n) / total)}% of those counted.`)];
    }));
  return card('Knockouts by place', 'Tap a bar for its share.', plot);
}

// A small legend for a chart with a second line.
function legend(items) {
  return el('ul', { className: 'chart-legend' }, ...items.map(([cls, label]) => el('li', {},
    svg('svg', { viewBox: '0 0 22 8', class: 'key ' + cls }, svg('line', { x1: 1, x2: 21, y1: 4, y2: 4 })), el('span', { textContent: label }))));
}

// The day each level came, written out.
function levelList(hero) {
  const at = hero.career.levelAt;
  const rows = Object.entries(at).map(([l, t]) => [Number(l), t]).filter(([l]) => l > 1).sort((a, b) => a[0] - b[0]);
  return el('details', { className: 'panel how' }, el('summary', { textContent: 'Every level, written out' }),
    rows.length
      ? el('ul', { className: 'stats level-list' }, ...rows.map(([l, t]) => el('li', {}, el('span', { textContent: `Level ${l}` }), el('span', { textContent: `${dayText(t / 86400)} (expected ${dayText(LEVEL_TARGET_HOURS[l] / 24)})` }))))
      : el('p', { className: 'hint', textContent: 'No level reached since the charts began.' }));
}

// A key for redrawing: the career changes after every task, so the charts redraw at most every five minutes.
export const careerKey = (hero) => JSON.stringify([hero.id, hero.level, Object.keys(hero.career.levelAt).length, hero.career.ko, Math.floor(hero.age / 300)]);

export function careerPage(hero) {
  return [
    el('p', { className: 'hint career-intro', textContent: `${hero.name}'s career so far, by day of adventuring. Time waiting at the tavern does not count, so the days are the hero's own.` }),
    paceChart(hero), xpChart(hero), goldChart(hero), knockoutChart(hero), levelList(hero),
  ];
}
