import {COURSE} from './config.js';
import {TERRITORIES} from './wasteland-career.js';

const courseNames = new Map(COURSE.map(course => [course.id, course.name]));
const venueNames = Object.freeze({
  scrapdome: 'Scrapdome (coming later)',
  'salt-flats': 'Salt Flats Convoy Raid (coming later)',
});

export function territoryPanel(profile) {
  const career = profile?.wasteland;
  if (career?.version !== 1 || career.discoveredGate !== true) return '';
  const cards = Object.entries(TERRITORIES).map(([id, territory]) => {
    const progress = career.territories?.[id] || {hold: 0, claimed: false};
    const hold = Number.isSafeInteger(progress.hold)
      ? Math.max(0, Math.min(100, progress.hold)) : 0;
    const courses = territory.courses.map(course => courseNames.get(course)).join(' · ');
    const venues = territory.venues?.length ? ' · '+territory.venues.map(
      id => venueNames[id]).filter(Boolean).join(' · ') : '';
    const status = progress.claimed ? 'CLAIMED' : hold === 100
      ? 'Warlord fight coming later' : `${hold} / 100 HOLD`;
    return `<article class="territory-card"><h4>${territory.name}</h4><p>${courses}${venues}</p><b>${status}</b>`+
      `<progress max="100" value="${hold}" aria-label="${territory.name} hold"></progress></article>`;
  }).join('');
  return `<section class="territory-map" aria-label="Territory map"><h3>TERRITORY MAP</h3>`+
    `<p>Win Wasteland events to build your hold. Four wins fill a territory. Warlord fights are coming later.</p>`+
    `<div class="territory-grid">${cards}</div></section>`;
}
