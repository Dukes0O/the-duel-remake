import {rankForXp} from './notoriety.js';
import {ARSENAL_WEAPONS} from './weapon-upgrades.js';

const ROWS = Object.freeze([
  {id: 'flamethrower', name: 'FLAMETHROWER', rank: ARSENAL_WEAPONS.flamethrower.rank,
    text: 'Burn raiders and barricades from your car.', action: 'yard-armory', button: 'ARMORY'},
  {id: 'getting-out', name: 'GETTING OUT', rank: 1,
    text: 'Mad Max Duel, Fuel Run, Convoy Raid and Ambush Alley · Hold F.', action: 'yard-scrapdome', button: 'SCRAPDOME'},
  {id: 'hand-flamer', name: "CINDER'S HAND FLAMER", rank: 12,
    text: 'A fire tool for Cinder’s first story jobs.', action: 'yard-armory', button: 'ARMORY'},
  {id: 'ambush-alley', name: 'AMBUSH ALLEY', rank: 12,
    text: 'Hold the fort on foot through five waves.', action: 'yard-scrapdome', button: 'SCRAPDOME'},
]);

export function yardThingsToTry(profile, escapeHTML = value => String(value)) {
  const rank = rankForXp(profile?.wasteland?.xp);
  return `<section class="yard-things-to-try" aria-labelledby="yard-things-title"><h3 id="yard-things-title">THINGS TO TRY</h3><div class="yard-things-grid">${ROWS.map(row => {
    const open = rank >= row.rank;
    const progress = open ? 100 : Math.round(rank / row.rank * 100);
    return `<article class="yard-thing"><div><b>${row.name}</b><p>${escapeHTML(row.text)}</p>${open ? '<p class="yard-thing-status">OPEN</p>' : `<p class="yard-thing-status">Rank ${row.rank}: you are rank ${rank}</p><progress max="100" value="${progress}" aria-label="Progress to rank ${row.rank}"></progress>`}</div><button type="button" data-action="${row.action}">${row.button}</button></article>`;
  }).join('')}</div></section>`;
}
