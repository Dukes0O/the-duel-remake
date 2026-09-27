import {COURSE} from './config.js';
import {TERRITORIES} from './wasteland-career.js';
import {BUILT_WARLORD_IDS, WARLORDS} from './warlords.js';

const courseNames = new Map(COURSE.map(course => [course.id, course.name]));
const venueNames = Object.freeze({
  scrapdome: 'Scrapdome (coming later)',
  'salt-flats': 'Salt Flats Convoy Raid (coming later)',
});

export function territoryPanel(profile, {builtWarlordIds = BUILT_WARLORD_IDS} = {}) {
  const career = profile?.wasteland;
  if (career?.version !== 1 || career.discoveredGate !== true) return '';
  const cards = Object.entries(TERRITORIES).map(([id, territory]) => {
    const progress = career.territories?.[id] || {hold: 0, claimed: false};
    const warlord = WARLORDS[id];
    const warlordProgress = career.warlords?.[id] || {};
    const fightBuilt = builtWarlordIds.includes(id);
    const hold = Number.isSafeInteger(progress.hold)
      ? Math.max(0, Math.min(100, progress.hold)) : 0;
    const courses = territory.courses.map(course => courseNames.get(course)).join(' · ');
    const venues = territory.venues?.length ? ' · '+territory.venues.map(
      id => venueNames[id]).filter(Boolean).join(' · ') : '';
    let status = `${hold} / 100 HOLD`;
    let statusLabel = '';
    let action = '';
    if (hold === 100 && !fightBuilt) {
      status = 'WARLORD FIGHT COMING LATER';
      statusLabel = ' aria-label="Warlord fight coming later"';
    }
    else if (fightBuilt && warlordProgress.defeated === true) {
      status = `DEFEATED · ${warlord.reward.toUpperCase()} EARNED`+
        (progress.claimed === true ? ' · CLAIMED' : '');
      action = `<button type="button" data-warlord="${id}">REMATCH</button>`;
    } else if (hold === 100 && fightBuilt) {
      status = `${warlord.name.toUpperCase()} IS WAITING`;
      action = `<button type="button" data-warlord="${id}">FIGHT</button>`;
    }
    return `<article class="territory-card"><h4>${territory.name}</h4><p>${courses}${venues}</p><b${statusLabel}>${status}</b>`+
      action+
      `<progress max="100" value="${hold}" aria-label="${territory.name} hold"></progress></article>`;
  }).join('');
  return `<section class="territory-map" aria-label="Territory map"><h3>TERRITORY MAP</h3>`+
    `<p>Win Wasteland events to build your hold. Four wins fill a territory.</p>`+
    `<div class="territory-grid">${cards}</div></section>`;
}
