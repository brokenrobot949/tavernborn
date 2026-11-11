// Tavern tab, in the design doc's order: upgrades (and the trophy wall they hang), the cleric,
// respec, the hero roster, the Hall of Legends, then Settings: the save string, sound and credits
// (Phase 7), and the workshop links.
//
// Each panel is rebuilt only when something it shows changes, so a tap is never lost to the
// once-a-second redraw. Buttons that spend a lot or cannot be undone ask for a second tap.

import { exportSave, importSave } from '../state.js';
import { clericFee, payCleric, foeName } from '../tasks.js';
import { respec, respecCost, subclassName, BRANCH_BY_ID } from '../skills.js';
import { respecPrice, MAX_HEROES, MAX_LEVEL } from '../rules.js';
import { UPGRADES, TROPHIES } from '../../data/tavern.js';
import { RACES } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { TIERS } from '../../data/items.js';
import { SLOT_BY_ID } from '../loot.js';
import { upgradeRank, upgradePrice, upgradeEffect, maxRank, buyUpgrade, trophyWall, canRecruit, canRetire, paragonTitle } from '../tavern.js';
import { el, confirmBtn, num } from './dom.js';
import { drawPortrait } from './legacy.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const who = (h) => `Level ${h.level} ${RACES[h.race].name} ${CLASSES[h.class].name}`;

// `app` swaps saves (replaceSave), changes the roster (recruit, switchHero, retire, dismiss), and
// redraws after a choice (changed).
export function mountTavern(root, app) {
  let current = null; // { state, hero } as of the last update

  // ----- upgrades -----
  const upgradesBox = el('div', { className: 'upgrades' });
  const upgradesNote = el('p', { className: 'hint' });
  let upgradesKey = '';
  const trophyBox = el('div', {});
  let trophyKey = '';

  // ----- the cleric -----
  const clericText = el('p', {});
  const clericBtn = el('button', { className: 'btn primary', type: 'button', textContent: 'Pay the cleric' });
  clericBtn.onclick = () => { if (current && payCleric(current.state, current.hero) != null) app.changed(); };

  // ----- respec -----
  const respecText = el('p', {});
  const respecRow = el('div', { className: 'row' });
  let respecKey = '';

  // ----- roster and Hall -----
  const rosterBox = el('div', {});
  let rosterKey = '';
  const hallBox = el('div', {});
  let hallKey = '';

  // ----- save string -----
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
      el('h3', { textContent: 'Upgrades' }),
      upgradesNote,
      upgradesBox),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'The trophy wall' }),
      trophyBox),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'The cleric' }),
      clericText,
      el('div', { className: 'row' }, clericBtn),
      el('p', { className: 'hint', textContent: 'A knocked-out hero gets up unaided after a rest, 15 minutes at level 1 up to about 2 hours at level 20, and loses nothing but the dungeon run or quest step they were on. A better room shortens the rest. The cleric ends it at once for a fee that grows with the time left and with level.' })),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Respec' }),
      respecText,
      respecRow,
      el('p', { className: 'hint', textContent: 'The barkeep keeps an unlabelled bottle for heroes with second thoughts. One glass returns every skill point and leaves the subclass open to choose again. The price rises with level. Ability score increases are kept.' })),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Heroes' }),
      rosterBox),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'The Hall of Legends' }),
      hallBox),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Save' }),
      el('p', { className: 'hint', textContent: 'The game saves itself on this device every few seconds. A save string holds the whole tavern: every hero, the upgrades, and the Hall. Use it to move to another device or keep a backup.' }),
      el('div', { className: 'row' },
        el('button', { className: 'btn', type: 'button', textContent: 'Make save string', onclick: makeString }),
        el('button', { className: 'btn', type: 'button', textContent: 'Copy', onclick: copy })),
      out, outMsg),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Load a save string' }),
      input,
      el('div', { className: 'row' }, confirmBtn('Load this save', 'Tap again: replaces the whole tavern', load)),
      inMsg),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Sound and credits' }),
      el('p', { className: 'hint', textContent: 'Sound effects, tavern music, the mute switch, and the credits screen arrive in the last build (Phase 7). Until then the game is silent, and every artist whose art it uses is listed in CREDITS.md.' }),
      el('div', { className: 'row' }, el('a', { className: 'btn link', href: 'CREDITS.md', textContent: 'Open CREDITS.md' }))),
    el('section', { className: 'panel' },
      el('h3', { textContent: 'Workshop' }),
      el('div', { className: 'row' }, el('a', { className: 'btn link', href: 'sprite-lab.html', textContent: 'Open the sprite lab' })),
      el('p', { className: 'hint', textContent: 'The Phase 0 page for judging looks: every race, class, and gear tier.' }),
      el('div', { className: 'row' }, el('a', { className: 'btn link', href: 'tools/simulate.html', textContent: 'Open the pacing simulator' })),
      el('p', { className: 'hint', textContent: 'Runs 500 heroes through the game rules at high speed and charts when each level lands. It does not touch your save.' })),
  );

  // ---------- panels ----------

  function drawUpgrades(state, hero) {
    upgradesNote.textContent = `Bought from ${hero.name}'s purse (${num(hero.gold)} gp). Upgrades belong to the tavern: every hero, now and later, has them.`;
    const key = JSON.stringify([hero.id, state.tavern.upgrades, UPGRADES.map((u) => hero.gold >= (upgradePrice(state, u.id) ?? Infinity))]);
    if (key === upgradesKey) return;
    upgradesKey = key;
    upgradesBox.replaceChildren(...UPGRADES.map((u) => {
      const rank = upgradeRank(state, u.id);
      const top = maxRank(u.id);
      const price = upgradePrice(state, u.id);
      const kids = [
        el('div', { className: 'upgrade-head' }, el('span', { className: 'upgrade-name', textContent: u.name }), el('span', { className: 'upgrade-rank', textContent: `Rank ${rank} of ${top}` })),
        el('p', { className: 'hint', textContent: u.about }),
        el('p', { className: 'upgrade-now', textContent: rank ? `${u.ranks[rank - 1]}. ${upgradeEffect(u.id, rank)}` : 'Nothing yet.' }),
      ];
      if (price == null) kids.push(el('p', { className: 'hint', textContent: 'Finished. There is nothing left to add, and the regulars have stopped suggesting things.' }));
      else {
        const short = hero.gold < price;
        kids.push(el('p', { className: 'hint', textContent: `Next: ${u.ranks[rank]}. ${upgradeEffect(u.id, rank + 1)}` }));
        const b = confirmBtn(`Build for ${num(price)} gp`, `Tap again: pay ${num(price)} gp`, () => { if (current && buyUpgrade(current.state, current.hero, u.id) != null) app.changed(); }, 'btn primary');
        b.disabled = short;
        kids.push(el('div', { className: 'row' }, b));
        if (short) kids.push(el('p', { className: 'hint', textContent: `${num(price - hero.gold)} gp short.` }));
      }
      return el('div', { className: 'upgrade' }, ...kids);
    }));
  }

  function drawTrophies(state) {
    const wall = trophyWall(state);
    const key = JSON.stringify(wall);
    if (key === trophyKey) return;
    trophyKey = key;
    const kids = [];
    if (!wall.hooks) kids.push(el('p', { className: 'hint', textContent: `No hooks yet. Build the trophy wall above to hang what heroes bring back from the dungeons.${wall.waiting.length ? ` ${wall.waiting.length} trophies are waiting behind the bar.` : ''}` }));
    else {
      kids.push(el('p', { className: 'hint', textContent: `${wall.hung.length} of ${wall.hooks} hooks in use. Each dungeon gives one trophy, the first time any hero of this tavern clears it.` }));
      if (wall.hung.length) kids.push(el('ul', { className: 'stats trophies' }, ...wall.hung.map((id) => el('li', {}, el('span', { textContent: TROPHIES[id] })))));
      if (wall.waiting.length) kids.push(el('p', { className: 'hint', textContent: `${wall.waiting.length} more waiting behind the bar for a hook.` }));
    }
    trophyBox.replaceChildren(...kids);
  }

  function drawRespec(hero) {
    const cost = respecCost(hero);
    const short = cost != null && hero.gold < cost;
    const key = [hero.id, cost, short, hero.skills.length, hero.subclass].join('|');
    if (key === respecKey) return;
    respecKey = key;
    const sub = subclassName(hero);
    if (cost == null) {
      respecText.textContent = `${hero.name} has learned nothing yet and chosen no subclass, so there is nothing to take back. At level ${hero.level} it would cost ${num(respecPrice(hero.level))} gp.`;
      respecRow.replaceChildren();
    } else {
      respecText.textContent = `${hero.skills.length} skill${hero.skills.length === 1 ? '' : 's'} learned${sub ? `, subclass ${sub}` : ', no subclass'}. Forgetting it all costs ${num(cost)} gp at level ${hero.level}.${short ? ' That is more gold than there is.' : ''}`;
      const b = confirmBtn(`Respec for ${num(cost)} gp`, 'Tap again: every skill is forgotten', () => { if (current && respec(current.hero) != null) app.changed(); }, 'btn primary');
      b.disabled = short;
      respecRow.replaceChildren(b);
    }
  }

  function drawCleric(hero) {
    const fee = clericFee(hero);
    clericBtn.hidden = fee == null;
    if (fee == null) { clericText.textContent = `${hero.name} is on their feet. The cleric is reading and would like it to stay that way.`; return; }
    const left = Math.max(0, hero.knockedOutUntil - hero.age);
    clericBtn.textContent = `Pay the cleric ${num(fee)} gp`;
    clericBtn.disabled = hero.gold < fee;
    clericText.textContent = `${hero.name} is on the good bench and will be up in ${Math.ceil(left / 60)} min. Purse: ${num(hero.gold)} gp.${hero.gold < fee ? ' That is not enough for the cleric.' : ''}`;
  }

  function drawRoster(state) {
    const key = JSON.stringify([state.activeHeroId, state.heroes.map((h) => [h.id, h.name, h.level, h.knockedOutUntil != null, h.subclass]), state.tavern.legends.length]);
    if (key === rosterKey) return;
    rosterKey = key;
    const rows = state.heroes.map((h) => {
      const active = h.id === state.activeHeroId;
      const sub = subclassName(h);
      const status = active ? 'Out adventuring' : h.knockedOutUntil != null ? 'Waiting at the tavern, still on the good bench' : 'Waiting at the tavern';
      const buttons = [];
      if (!active) buttons.push(el('button', { className: 'btn primary', type: 'button', textContent: 'Send out', onclick: () => app.switchHero(h.id) }));
      if (canRetire(h)) buttons.push(confirmBtn('Retire', 'Tap again: retire for good', () => app.retire(h.id)));
      buttons.push(confirmBtn('Dismiss', 'Tap again: gone for good', () => app.dismiss(h.id)));
      return el('li', { className: 'roster-hero' + (active ? ' active' : '') },
        el('div', { className: 'roster-head' }, el('span', { className: 'roster-name', textContent: h.name }), el('span', { className: 'tag', textContent: active ? 'Active' : 'Waiting' })),
        el('p', { className: 'hint', textContent: `${who(h)}${sub ? ', ' + sub : ''}. ${status}.` }),
        el('div', { className: 'row' }, ...buttons));
    });
    const kids = [
      el('p', { className: 'hint', textContent: `${state.heroes.length} of ${MAX_HEROES} rooms taken. One hero adventures at a time. The others wait at the tavern exactly as you left them: no time passes for them, so they earn nothing and risk nothing until they are sent out again.` }),
      el('ul', { className: 'roster' }, ...rows),
    ];
    if (canRecruit(state)) kids.push(el('div', { className: 'row' }, el('button', { className: 'btn', type: 'button', textContent: 'Recruit a new hero', onclick: () => app.recruit() })));
    else kids.push(el('p', { className: 'hint', textContent: `All ${MAX_HEROES} rooms are taken. A hero who reaches level ${MAX_LEVEL} can retire to the Hall and free a room; dismissing one frees it too, with no legend and no bonus.` }));
    kids.push(el('p', { className: 'hint', textContent: 'Dismissing a hero sends them home for good. Only retirement puts a hero in the Hall.' }));
    rosterBox.replaceChildren(...kids);
  }

  function drawHall(state) {
    const legends = state.tavern.legends;
    const key = String(legends.length);
    if (key === hallKey) return;
    hallKey = key;
    const bonus = state.tavern.legacyBonus ?? 0;
    const intro = legends.length
      ? `${legends.length} legend${legends.length === 1 ? '' : 's'} on the wall. Every hero here earns ${pct(bonus)} more XP for it (2% per legend, 10% at most).`
      : `The wall is bare. A hero who reaches level ${MAX_LEVEL} can retire here; each legend gives every hero 2% more XP, up to 10%.`;
    const cards = legends.slice().reverse().map((l) => {
      const canvas = el('canvas', { className: 'portrait', attrs: { 'aria-label': `Portrait of ${l.name}` } });
      if (l.look) drawPortrait(canvas, l.look, 2);
      const best = l.best;
      const bestRow = best ? el('li', {}, el('span', { textContent: 'Best item' }), el('span', { className: 'best-item', textContent: `${best.name} (${TIERS[best.tier].name} ${SLOT_BY_ID[best.slot]?.name.toLowerCase() ?? best.slot})` })) : null;
      if (bestRow) bestRow.style.setProperty('--tier', TIERS[best.tier].color);
      const stat = (label, value) => el('li', {}, el('span', { textContent: label }), el('span', { textContent: value }));
      const s = l.stats ?? {};
      const sub = BRANCH_BY_ID[l.subclass]?.name;
      return el('li', { className: 'legend' },
        el('div', { className: 'legend-top' },
          el('div', { className: 'portrait-frame' }, canvas),
          el('div', {},
            el('p', { className: 'legend-name', textContent: l.name }),
            el('p', { className: 'hint', textContent: `${who(l)}${sub ? ', ' + sub : ''}${l.paragon ? `. Paragon ${l.paragon}, ${paragonTitle(l.paragon)}` : ''}.` }),
            el('p', { className: 'legend-line', textContent: l.line }))),
        el('ul', { className: 'stats' },
          stat('Career', `${l.days.toFixed(1)} days`),
          stat('Knocked out', `${num(s.knockouts ?? 0)} time${s.knockouts === 1 ? '' : 's'}`),
          stat('Most Embarrassing Defeat', l.worst ?? (s.mostEmbarrassingDefeat ? foeName(s.mostEmbarrassingDefeat) : 'None')),
          bestRow,
          stat('Dungeons cleared', `${l.dungeons} of 8, ${num(s.dungeonClears ?? 0)} clears in all`),
          stat('Story quests', num(s.quests ?? 0)),
          stat('Monsters in the Bestiary', num(l.monsters ?? 0)),
          stat('Natural 20s', num(s.natural20s ?? 0)),
          l.riftBest ? stat('Deepest in the Rifts', `floor ${l.riftBest}`) : null,
          stat('Gold at retirement', `${num(l.gold ?? 0)} gp`)));
    });
    hallBox.replaceChildren(el('p', { className: 'hint', textContent: intro }), ...(cards.length ? [el('ul', { className: 'hall' }, ...cards)] : []));
  }

  function update(state, hero) {
    current = { state, hero };
    drawUpgrades(state, hero);
    drawTrophies(state);
    drawCleric(hero);
    drawRespec(hero);
    drawRoster(state);
    drawHall(state);
  }
  return { update };
}
