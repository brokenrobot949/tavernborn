// Deeds and titles (after Phase 7). Pure logic: no page. The deeds themselves are in data/deeds.js.
// `checkDeeds` is called by sim.js after every task and by the Tavern tab after anything the player
// buys or joins; a deed is done once, writes a Chronicle line, and offers its title.
// `wearTitle` is the player's choice of title (or none), shown after the hero's name.

import { DEEDS, DEED_BY_ID, DEED_TEXT } from '../data/deeds.js';
import { chronicle } from './hero.js';

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

export function checkDeeds(hero, events = []) {
  const done = (hero.deeds ??= []);
  if (done.length >= DEEDS.length) return events;
  for (const d of DEEDS) {
    if (done.includes(d.id) || !d.test(hero)) continue;
    done.push(d.id);
    const text = fill(DEED_TEXT.done, { deed: d.name, name: hero.name, title: d.title });
    events.push({ type: 'deed', at: hero.age, text, deed: d.id });
    chronicle(hero, 'deed', text, { roll: d.about, deed: d.id });
  }
  return events;
}

// Wear the title of a deed done, or none (`id` null). Returns true if it changed.
export function wearTitle(hero, id) {
  if (id != null && !(hero.deeds ?? []).includes(id)) return false;
  if (id != null && !DEED_BY_ID[id]) return false;
  hero.title = id;
  return true;
}

// The hero's name with their title, as the Hero tab shows it.
export const titled = (hero) => (hero.title && DEED_BY_ID[hero.title] ? `${hero.name} ${DEED_BY_ID[hero.title].title}` : hero.name);
