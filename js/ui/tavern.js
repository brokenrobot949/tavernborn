// Tavern tab: the inn sign, the common room (the roster standing about, the trophy plaques, and a
// line overheard at the bar), a festival card while one runs, then sections behind tabs: the
// travelling merchant; upgrades; heroes; the Hall of
// Legends and the trophy wall; the bard, who sings back the story chapters the tavern has heard;
// the cleric and respec; and settings, the save string, and the workshop links.
//
// Each panel is rebuilt only when something it shows changes, so a tap is never lost to the
// once-a-second redraw. Buttons that spend a lot or cannot be undone ask for a second tap.

import { exportSave, importSave } from '../state.js';
import { clericFee, payCleric, foeName } from '../tasks.js';
import { respec, respecCost, subclassName, BRANCH_BY_ID } from '../skills.js';
import { respecPrice, MAX_HEROES, MAX_LEVEL } from '../rules.js';
import { UPGRADES, TROPHIES, TROPHY_COLORS, BAR_TALK, BARD, SIGN } from '../../data/tavern.js';
import { CHAPTERS, STORY_TITLE } from '../../data/story.js';
import { REGIONS } from '../../data/regions.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { showChapter } from './story.js';
import { REGION_COLORS } from './map.js';
import { mountCommonRoom } from './common-room.js';
import { LEGENDARIES } from '../../data/loot.js';
import { RACES } from '../../data/races.js';
import { CLASSES } from '../../data/classes.js';
import { TIERS } from '../../data/items.js';
import { SLOT_BY_ID } from '../loot.js';
import { upgradeRank, upgradePrice, upgradeEffect, maxRank, buyUpgrade, trophyWall, canRecruit, canRetire, paragonTitle, portraitOf, nameTavern, signOf, paintSign, TAVERN_NAME_MAX } from '../tavern.js';
import { el, confirmBtn, num, sectionTabs, named, getTavernName, DEFAULT_TAVERN, pressBtn } from './dom.js';
import { drawPortrait } from './legacy.js';
import { icon } from './icons.js';
import { timeOfDay } from './hero.js';
import { mountSettings } from './settings.js';
import { sfx } from '../audio.js';
import { MERCHANT_TEXT, BOON_TEXT } from '../../data/market.js';
import { merchantOn, nextVisit, warePrice, boughtToday, buyWare, festivalOn, hasJoined, joinFestival } from '../road.js';
import { checkDeeds } from '../deeds.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const UPGRADE_ICONS = { room: 'bed', stable: 'horse', notice: 'board', trophies: 'trophy' };
const TALK_SECONDS = 20; // how long one overheard line stays before the next
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
  clericBtn.onclick = () => { if (current && payCleric(current.state, current.hero) != null) { sfx('coins'); app.changed(); } };

  // ----- respec -----
  const respecText = el('p', {});
  const respecRow = el('div', { className: 'row' });
  let respecKey = '';

  // ----- roster and Hall -----
  const rosterBox = el('div', {});
  let rosterKey = '';
  const hallBox = el('div', {});
  let hallKey = '';
  const bardBox = el('div', {});
  let bardKey = '';

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

  // ----- the sign and the common room -----
  const commonRoom = mountCommonRoom();
  const talk = el('p', { className: 'bar-talk', attrs: { 'aria-live': 'off' } });
  let talkAt = -1;
  const caseBox = el('div', {});
  let caseKey = '';

  // ----- the sign: tap it to rename the tavern and repaint the board -----
  const signTitle = el('h2', {});
  const signMotto = el('small', {});
  const signEmblem = el('span', { className: 'sign-emblem' });
  const signBoard = el('button', { className: 'sign-board', type: 'button', attrs: { 'aria-label': 'The tavern sign. Tap to rename the tavern or repaint the sign.', 'aria-expanded': 'false' } }, signEmblem, signTitle, signMotto);
  const signEditor = el('section', { className: 'panel sign-editor', hidden: true });
  let signKey = '';
  signBoard.onclick = () => {
    signEditor.hidden = !signEditor.hidden;
    signBoard.setAttribute('aria-expanded', String(!signEditor.hidden));
    signKey = '';
    if (current) drawSign(current.state, current.hero);
  };
  function drawSign(state, hero) {
    const s = signOf(state);
    const board = SIGN.boards.find((b) => b.id === s.board);
    const ink = SIGN.inks.find((b) => b.id === s.ink);
    const key = JSON.stringify([s, getTavernName(), signEditor.hidden]);
    if (key === signKey) return;
    signKey = key;
    for (const [k, v] of Object.entries({ '--sign-wood': board.wood, '--sign-grain': board.grain, '--sign-rim': board.rim, '--sign-ink': ink.ink, '--sign-trim': ink.trim })) signBoard.style.setProperty(k, v);
    signTitle.textContent = getTavernName();
    signMotto.textContent = SIGN.mottos[s.motto];
    signEmblem.replaceChildren(...(s.emblem === 'none' ? [] : [icon(s.emblem)]));
    if (signEditor.hidden) return;
    const paint = (change) => { paintSign(state, change); signKey = ''; app.changed(); };
    const input = el('input', { className: 'text-input', type: 'text', value: getTavernName(), maxLength: TAVERN_NAME_MAX, autocomplete: 'off', attrs: { 'aria-label': 'Tavern name' } });
    const rename = el('button', { className: 'btn primary', type: 'button', textContent: 'Put up new letters', disabled: true });
    input.oninput = () => { rename.disabled = (input.value.replace(/\s+/g, ' ').trim() || DEFAULT_TAVERN) === getTavernName(); };
    rename.onclick = () => { if (nameTavern(state, input.value, hero)) app.renamed(); };
    const row = (label, ...kids) => el('div', { className: 'row' }, el('span', { className: 'label', textContent: label }), ...kids);
    const swatch = (on, color, label, onClick) => {
      const b = pressBtn('', on, onClick, 'btn swatch');
      b.style.background = color;
      b.setAttribute('aria-label', label);
      b.title = label;
      return b;
    };
    const motto = el('select', { className: 'pick', attrs: { 'aria-label': 'Motto' }, onchange: () => paint({ motto: Number(motto.value) }) },
      ...SIGN.mottos.map((m, i) => el('option', { value: String(i), textContent: m, selected: i === s.motto })));
    signEditor.replaceChildren(
      el('h3', {}, icon('hammer'), el('span', { textContent: 'The sign over the door' })),
      el('p', { className: 'hint', textContent: 'A new name changes it everywhere, the Chronicle included. Leave the box empty for the old name.' }),
      input,
      el('div', { className: 'row' }, rename, el('button', { className: 'btn', type: 'button', textContent: 'Done', onclick: () => signBoard.onclick() })),
      row('Board', ...SIGN.boards.map((b) => swatch(s.board === b.id, b.wood, b.name, () => paint({ board: b.id })))),
      row('Letters', ...SIGN.inks.map((b) => swatch(s.ink === b.id, b.ink, b.name, () => paint({ ink: b.id })))),
      row('Emblem', el('div', { className: 'emblem-picks' }, ...SIGN.emblems.map((e) => {
        const b = pressBtn('', s.emblem === e.id, () => paint({ emblem: e.id }), 'btn emblem-pick');
        b.append(e.id === 'none' ? el('span', { textContent: 'None' }) : icon(e.id));
        b.setAttribute('aria-label', e.name);
        b.title = e.name;
        return b;
      }))),
      row('Motto', motto),
    );
  }

  // ----- a festival, while one runs -----
  const festivalBox = el('section', { className: 'panel festival-card', hidden: true });
  let festivalKey = '';
  // ----- the travelling merchant -----
  const merchantBox = el('div', {});
  let merchantKey = '';

  const page = (id, label, glyph, ...kids) => ({ id, label, icon: icon(glyph), node: el('div', {}, ...kids) });
  const pages = [
    page('merchant', 'Merchant', 'cart',
      el('section', { className: 'panel' }, merchantBox)),
    page('upgrades', 'Upgrades', 'hammer',
      el('section', { className: 'panel' },
        el('h3', { textContent: 'Upgrades' }),
        upgradesNote,
        upgradesBox)),
    page('heroes', 'Heroes', 'people',
      el('section', { className: 'panel' },
        el('h3', { textContent: 'Heroes' }),
        rosterBox)),
    page('hall', 'Hall', 'frame',
      el('section', { className: 'panel' },
        el('h3', { textContent: 'The Hall of Legends' }),
        hallBox),
      el('section', { className: 'panel glass-case' },
        el('h3', {}, icon('trinket'), el('span', { textContent: 'The glass case' })),
        caseBox),
      el('section', { className: 'panel' },
        el('h3', { textContent: 'The trophy wall' }),
        trophyBox)),
    page('bard', 'Bard', 'lute',
      el('section', { className: 'panel bard' },
        el('h3', {}, icon('lute'), el('span', { textContent: `The bard: ${STORY_TITLE}` })),
        bardBox)),
    page('services', 'Cleric', 'potion',
      el('section', { className: 'panel service' },
        el('h3', {}, icon('heart'), el('span', { textContent: 'The cleric' })),
        clericText,
        el('div', { className: 'row' }, clericBtn),
        el('p', { className: 'hint', textContent: 'A knocked-out hero gets up unaided after a rest, 15 minutes at level 1 up to about 2 hours at level 20, and loses nothing but the dungeon run or quest step they were on. A better room shortens the rest. The cleric ends it at once for a fee that grows with the time left and with level.' })),
      el('section', { className: 'panel service' },
        el('h3', {}, icon('potion'), el('span', { textContent: 'Respec' })),
        respecText,
        respecRow,
        el('p', { className: 'hint', textContent: 'The barkeep keeps an unlabelled bottle for heroes with second thoughts. One glass returns every skill point and leaves the subclass open to choose again. The price rises with level. Ability score increases are kept.' }))),
    page('settings', 'Settings', 'gear',
      mountSettings(),
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
        el('h3', { textContent: 'Workshop' }),
        el('div', { className: 'row' }, el('a', { className: 'btn link', href: 'sprite-lab.html', textContent: 'Open the sprite lab' })),
        el('p', { className: 'hint', textContent: 'The Phase 0 page for judging looks: every race, class, and gear tier.' }),
        el('div', { className: 'row' }, el('a', { className: 'btn link', href: 'tools/simulate.html', textContent: 'Open the pacing simulator' })),
        el('p', { className: 'hint', textContent: 'Runs 500 heroes through the game rules at high speed and charts when each level lands. It does not touch your save.' }))),
  ];
  const tabs = sectionTabs('tavern', pages);
  tabs.nav.classList.add('two-rows'); // seven sections: four pills above, three below, so the names have room
  root.append(
    el('header', { className: 'inn-sign' }, el('span', { className: 'sign-chain left' }), el('span', { className: 'sign-chain right' }),
      signBoard),
    signEditor,
    commonRoom.room,
    el('div', { className: 'bar-talk-box' }, icon('mug'), talk),
    festivalBox,
    tabs.nav,
    ...pages.map((p) => p.node),
  );

  // The common room (js/ui/common-room.js): the hearth, the wall, and the heroes walking about; the
  // window shows the time of day. And one line overheard at the bar.
  // While a festival runs, every other line overheard is about it.
  function drawRoom(state) {
    const fest = festivalOn(new Date());
    commonRoom.setTime(timeOfDay());
    commonRoom.setFestival(fest?.deco);
    commonRoom.update(state);
    const at = Math.floor(Date.now() / 1000 / TALK_SECONDS);
    if (at !== talkAt) {
      talkAt = at;
      talk.textContent = named(fest && at % 2 ? fest.talk[Math.floor(at / 2) % fest.talk.length] : BAR_TALK[at % BAR_TALK.length]);
    }
  }

  // The festival card: what it is, and joining in once this year for a day of festive spirits.
  function drawFestival(state, hero) {
    const now = new Date();
    const f = festivalOn(now);
    const joined = f ? hasJoined(hero, f, now) : false;
    const key = f ? [f.id, hero.id, joined].join('|') : '';
    if (key === festivalKey) return;
    festivalKey = key;
    festivalBox.hidden = !f;
    if (!f) return;
    const until = new Date(now.getFullYear() + (f.to[0] < now.getMonth() + 1 ? 1 : 0), f.to[0] - 1, f.to[1]);
    const kids = [
      el('h3', {}, icon('lantern'), el('span', { textContent: f.name })),
      el('p', { className: 'festival-about', textContent: f.about }),
      el('p', { className: 'hint', textContent: `Until ${until.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. Joining in gives ${hero.name} a day of festive spirits: ${BOON_TEXT.festive.does}. Each hero may join once a year.` }),
    ];
    if (joined) kids.push(el('p', { className: 'hint', textContent: `${hero.name} has joined in this year already.` }));
    else kids.push(el('div', { className: 'row' }, el('button', { className: 'btn primary', type: 'button', textContent: f.join, onclick: () => {
      if (current && joinFestival(current.state, current.hero, new Date())) { checkDeeds(current.hero); sfx('levelup'); app.changed(); }
    } })));
    festivalBox.replaceChildren(...kids);
  }

  // The merchant's cart: in the yard today with four wares, or out on the road until a named day.
  function drawMerchant(state, hero) {
    const now = new Date();
    const visit = merchantOn(now);
    const bought = boughtToday(state, now);
    const key = JSON.stringify([visit.day, visit.here, bought, hero.id, hero.level, visit.wares.map((w) => hero.gold >= warePrice(hero, w))]);
    if (key === merchantKey) return;
    merchantKey = key;
    const head = el('div', { className: 'merchant-head' },
      el('span', { className: 'cart' }, icon('cart')),
      el('div', {}, el('p', { className: 'merchant-name', textContent: MERCHANT_TEXT.name }), el('p', { className: 'hint', textContent: MERCHANT_TEXT.about })));
    if (!visit.here) {
      const days = nextVisit(now);
      const when = days === 1 ? 'tomorrow' : days ? `on ${new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).toLocaleDateString('en-GB', { weekday: 'long' })}` : 'some day soon';
      merchantBox.replaceChildren(el('h3', { textContent: 'The travelling merchant' }), head, el('p', { className: 'region-line', textContent: MERCHANT_TEXT.away.replace('{when}', when) }));
      tabs.badge('merchant', '');
      return;
    }
    const wares = visit.wares.map((w) => {
      const price = warePrice(hero, w);
      const sold = bought.includes(w.id);
      const b = sold ? el('span', { className: 'tag', textContent: 'Sold' })
        : confirmBtn(`${num(price)} gp`, 'Tap again: buy', () => {
          if (!current) return;
          const r = buyWare(current.state, current.hero, w.id, new Date());
          if (r) { checkDeeds(current.hero); sfx('coins'); app.changed(); }
        }, 'btn primary');
      if (!sold) b.disabled = hero.gold < price;
      const boon = w.boon ? BOON_TEXT[w.boon[0]].does : '';
      const does = w.boon ? `${boon[0].toUpperCase() + boon.slice(1)} for ${w.boon[1]} hours.` : w.potions ? `${w.potions} more potions on the next dungeon or Rifts run.` : `One piece of gear of level ${hero.level}, worn at once if it is better.`;
      return el('li', { className: 'ware' + (sold ? ' sold' : '') },
        el('span', { className: 'ware-name', textContent: w.name }), b,
        el('p', { className: 'hint', textContent: `${w.about.replace(/\{name\}/g, hero.name)} ${does}` }));
    });
    const left = visit.wares.filter((w) => !bought.includes(w.id));
    merchantBox.replaceChildren(
      el('h3', { textContent: 'The travelling merchant' }), head,
      el('p', { className: 'region-line', textContent: `${MERCHANT_TEXT.here} ${visit.greeting}` }),
      el('p', { className: 'hint', textContent: `Bought from the purse of ${hero.name} (${num(hero.gold)} gp). Prices rise with level. One of each, each visit.` }),
      left.length ? el('span', {}) : el('p', { className: 'hint', textContent: MERCHANT_TEXT.soldOut }),
      el('ul', { className: 'wares' }, ...wares));
    tabs.badge('merchant', left.filter((w) => hero.gold >= warePrice(hero, w)).length || '');
  }

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
      const pips = el('span', { className: 'pips', attrs: { 'aria-label': `Rank ${rank} of ${top}` } }, ...Array.from({ length: top }, (_, k) => el('i', { className: k < rank ? 'on' : '' })));
      const kids = [
        el('div', { className: 'upgrade-head' },
          el('span', { className: 'upgrade-icon' }, icon(UPGRADE_ICONS[u.id] ?? 'hammer')),
          el('span', { className: 'upgrade-name', textContent: u.name }), pips),
        el('p', { className: 'hint', textContent: u.about }),
        el('p', { className: 'upgrade-now', textContent: rank ? `${u.ranks[rank - 1]}. ${upgradeEffect(u.id, rank)}` : 'Nothing yet.' }),
      ];
      if (price == null) kids.push(el('p', { className: 'hint', textContent: 'Finished. There is nothing left to add, and the regulars have stopped suggesting things.' }));
      else {
        const short = hero.gold < price;
        kids.push(el('p', { className: 'hint', textContent: `Next: ${u.ranks[rank]}. ${upgradeEffect(u.id, rank + 1)}` }));
        const b = confirmBtn(`Build for ${num(price)} gp`, `Tap again: pay ${num(price)} gp`, () => { if (current && buyUpgrade(current.state, current.hero, u.id) != null) { sfx('coins'); app.changed(); } }, 'btn primary');
        b.disabled = short;
        kids.push(el('div', { className: 'row' }, b));
        if (short) kids.push(el('p', { className: 'hint', textContent: `${num(price - hero.gold)} gp short.` }));
      }
      return el('div', { className: 'upgrade' + (price == null ? ' done' : '') }, ...kids);
    }));
    tabs.badge('upgrades', UPGRADES.filter((u) => hero.gold >= (upgradePrice(state, u.id) ?? Infinity)).length);
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
      if (wall.hung.length) kids.push(el('ul', { className: 'stats trophies' }, ...wall.hung.map((id) => {
        const plaque = el('i', { className: 'plaque' });
        plaque.style.setProperty('--trophy', TROPHY_COLORS[id]);
        return el('li', {}, plaque, el('span', { textContent: TROPHIES[id] }));
      })));
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
      const b = confirmBtn(`Respec for ${num(cost)} gp`, 'Tap again: every skill is forgotten', () => { if (current && respec(current.hero) != null) { sfx('coins'); app.changed(); } }, 'btn primary');
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
    const key = JSON.stringify([state.activeHeroId, state.heroes.map((h) => [h.id, h.name, h.level, h.knockedOutUntil != null, h.subclass, portraitOf(h)]), state.tavern.legends.length]);
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
      const face = el('canvas', { className: 'portrait', attrs: { 'aria-label': `Portrait of ${h.name}` } });
      drawPortrait(face, portraitOf(h), 1);
      return el('li', { className: 'roster-hero' + (active ? ' active' : '') },
        el('div', { className: 'roster-top' },
          el('div', { className: 'portrait-frame small' }, face),
          el('div', { className: 'roster-info' },
            el('div', { className: 'roster-head' }, el('span', { className: 'roster-name', textContent: h.name }), el('span', { className: 'tag' + (active ? ' out' : ''), textContent: active ? 'Out adventuring' : 'Waiting' })),
            el('p', { className: 'hint', textContent: `${who(h)}${sub ? ', ' + sub : ''}. ${status}.` }))),
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
            el('p', { className: 'legend-name', textContent: l.title ? `${l.name} ${l.title}` : l.name }),
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

  // The bard: every chapter the tavern has heard, from any hero's first clear of a dungeon (the
  // trophy list keeps that, retired heroes included) or a clear by a hero on the roster.
  function drawBard(state) {
    const known = new Set([...(state.tavern.trophies ?? []), ...state.heroes.flatMap((h) => Object.keys(h.dungeonClears).filter((id) => h.dungeonClears[id]))]);
    const key = [...known].sort().join() + '|' + state.heroes.map((h) => h.name).join();
    if (key === bardKey) return;
    bardKey = key;
    const heard = REGIONS.filter((r) => known.has(r.id)).length;
    const fill = el('i');
    fill.style.width = `${(100 * heard) / REGIONS.length}%`;
    const verses = REGIONS.map((r) => {
      const c = CHAPTERS[r.id];
      const d = DUNGEONS[r.id];
      if (!known.has(r.id)) {
        return el('li', { className: 'verse unheard' },
          el('span', { className: 'verse-num', textContent: String(c.n) }),
          el('div', { className: 'verse-body' },
            el('p', { className: 'verse-kicker', textContent: `Chapter ${c.n}` }),
            el('p', { className: 'hint', textContent: BARD.waiting.replace('{dungeon}', d.name) })));
      }
      const finder = state.heroes.find((h) => h.dungeonClears[r.id]);
      const teller = { name: finder?.name ?? BARD.someone };
      const v = el('li', { className: 'verse' },
        el('span', { className: 'verse-num', textContent: String(c.n) }),
        el('div', { className: 'verse-body' },
          el('p', { className: 'verse-kicker', textContent: `Chapter ${c.n} · ${r.name}` }),
          el('p', { className: 'verse-title', textContent: c.title }),
          el('p', { className: 'verse-line', textContent: c.learned }),
          el('div', { className: 'row' }, el('button', { className: 'btn', type: 'button', onclick: () => showChapter(document.getElementById('game'), r.id, teller) }, icon('lute'), el('span', { textContent: 'Hear it again' })))));
      v.style.setProperty('--region', REGION_COLORS[r.id]);
      return v;
    });
    bardBox.replaceChildren(
      el('p', { className: 'bard-intro', textContent: heard === 0 ? BARD.none : heard === REGIONS.length ? BARD.all : BARD.intro }),
      el('div', { className: 'bard-progress' }, el('span', { textContent: `${heard} of ${REGIONS.length} chapters` }), el('div', { className: 'bar thin' }, fill)),
      el('ol', { className: 'verses' }, ...verses));
    tabs.badge('bard', '');
  }

  // The glass case: every named Legendary a hero of this tavern has outgrown, one shelf each.
  function drawCase(state) {
    const relics = state.tavern.relics ?? [];
    const key = JSON.stringify(relics);
    if (key === caseKey) return;
    caseKey = key;
    const shelves = REGIONS.map((r) => {
      const l = LEGENDARIES[r.id];
      const got = relics.find((x) => x.legend === r.id);
      if (!got) {
        return el('li', { className: 'shelf empty' },
          el('span', { className: 'slot-icon' }, icon(l.slot)),
          el('div', {}, el('p', { className: 'shelf-name', textContent: 'An empty shelf' }), el('p', { className: 'hint', textContent: `For ${l.name}, from ${DUNGEONS[r.id].name}, once a hero outgrows it.` })));
      }
      const li = el('li', { className: 'shelf' },
        el('span', { className: 'slot-icon' }, icon(l.slot)),
        el('div', {},
          el('p', { className: 'shelf-name', textContent: l.name }),
          el('p', { className: 'shelf-meta', textContent: `Legendary ${SLOT_BY_ID[l.slot].name.toLowerCase()}, level ${got.level}${got.hero ? `. Brought home by ${got.hero}` : ''}.` }),
          el('p', { className: 'shelf-flavor', textContent: l.flavor })));
      li.style.setProperty('--tier', TIERS[4].color);
      return li;
    });
    caseBox.replaceChildren(
      el('p', { className: 'hint', textContent: `${relics.length} of ${REGIONS.length} named Legendaries on display. When a hero finds something better than a named Legendary, the Legendary comes here instead of going to a pedlar.` }),
      el('ul', { className: 'shelves' }, ...shelves));
  }

  function update(state, hero) {
    current = { state, hero };
    drawRoom(state);
    drawSign(state, hero);
    drawFestival(state, hero);
    drawMerchant(state, hero);
    drawCase(state);
    drawBard(state);
    drawUpgrades(state, hero);
    drawTrophies(state);
    drawCleric(hero);
    drawRespec(hero);
    drawRoster(state);
    drawHall(state);
  }
  return { update };
}
