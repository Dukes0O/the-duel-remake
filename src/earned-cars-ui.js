// Earned cars on screen (docs/EARNED_CARS.md section 5): which cars show, the
// medal sheet panel, the locked page and the results lines. Markup only; no
// race state and no save writes.
import { CARS } from './config.js';
import { MEDAL_CARS, MEDAL_ROWS, MEDAL_LEVELS, MEDAL_COLOURS, medalRequirement,
  medalCarProgress, medalTotals } from './medals.js';

const ROW_NAMES = Object.freeze({ duel: 'DUEL', grandprix: 'GRAND PRIX' });
const escape = value => String(value).replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

// With the switch off the medal cars appear nowhere; every list is today's.
// The Falcone Sirena (SIRENA-CAR) is on no list yet: it exists only once the Lab restores it, and its garage sheet and
// place in the lists belong to DEEP-SIRENA-VIEW. Every list stays exactly what it was.
export const isShownCar = (id, enabled) => Object.hasOwn(CARS, id) && id !== 'falcone_sirena' && id !== 'mcmurtry_speirling' && (enabled === true || !medalRequirement(id));
export const shownCarIds = enabled => Object.keys(CARS).filter(id => isShownCar(id, enabled));
export const shownCars = enabled => Object.entries(CARS).filter(([id]) => isShownCar(id, enabled));

// "MEDALS 4/6", and for a car that needs gold "MEDALS 20/24 · GOLD 4/6".
export function medalProgressLabel(profile, id) {
  const progress = medalCarProgress(profile, id);
  if (!progress) return null;
  return `MEDALS ${Math.min(progress.medals, progress.needMedals)}/${progress.needMedals}` +
    (progress.needGold ? ` · GOLD ${Math.min(progress.gold, progress.needGold)}/${progress.needGold}` : '');
}

// The next medal car this player has not earned, in the ladder's order.
export function nextMedalCar(profile) {
  return MEDAL_CARS.find(id => !profile?.unlockedCars?.includes(id)) ?? null;
}

const winsText = count => `${count} ${count === 1 ? 'WIN' : 'WINS'}`;
function sheetCounts(profile, carId) {
  const sheet = profile?.medals?.version === 1 ? profile.medals.cars?.[carId] : null;
  return sheet ?? { duel: [0, 0, 0], grandprix: [0, 0, 0] };
}

export function medalSheetPanel(profile, carId, { grandPrixCareer = false } = {}) {
  const counts = sheetCounts(profile, carId);
  const filled = MEDAL_ROWS.reduce((sum, row) => sum + counts[row].filter(count => count > 0).length, 0);
  const rows = MEDAL_ROWS.map(row => {
    if (row === 'grandprix' && !grandPrixCareer)
      return `<tr><th scope="row">${ROW_NAMES[row]}</th><td colspan="3" class="medal-closed">OPENS WITH THE GRAND PRIX CAREER</td></tr>`;
    const cells = MEDAL_LEVELS.map((level, index) => {
      const count = counts[row][index], colour = MEDAL_COLOURS[level];
      return count > 0
        ? `<td class="medal ${colour}" aria-label="${colour} medal, ${winsText(count).toLowerCase()}"><i aria-hidden="true"></i><b>${winsText(count)}</b></td>`
        : `<td class="medal empty"><i aria-hidden="true"></i><b>WIN ON ${level.toUpperCase()}</b></td>`;
    }).join('');
    return `<tr><th scope="row">${ROW_NAMES[row]}</th>${cells}</tr>`;
  }).join('');
  const totals = medalTotals(profile), next = nextMedalCar(profile);
  const rule = next ? medalRequirement(next) : null;
  const nextText = rule ? ` · NEXT CAR AT ${rule.medals}${rule.gold ? ` WITH ${rule.gold} GOLD` : ''}` : '';
  return `<section class="medal-panel" aria-label="Medal sheet"><div class="medal-heading"><h3>MEDAL SHEET</h3><span>${filled} / 6</span></div>` +
    `<table class="medal-sheet"><thead><tr><th></th>${MEDAL_LEVELS.map(level => `<th scope="col">${level.toUpperCase()}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>` +
    `<p class="medal-total">ALL CARS: ${totals.medals} ${totals.medals === 1 ? 'MEDAL' : 'MEDALS'}${nextText}</p></section>`;
}

export function medalUnlockCard(profile, carId, { helicopter = false } = {}) {
  const progress = medalCarProgress(profile, carId);
  if (!progress) return '';
  const bar = (have, need, label) => `<b>${Math.min(have, need)} / ${need}</b><span>${label}</span>` +
    `<progress value="${Math.min(have, need)}" max="${need}" aria-label="${label}: ${Math.min(have, need)} of ${need}"></progress>`;
  return `<div class="unlock-card medal-unlock"><div><p class="eyebrow">EARNED, NOT BOUGHT</p><h3>${escape(CARS[carId].name)}</h3>` +
    `<p>Win medals with any of your cars. Each new medal also pays credits once.</p>` +
    `${helicopter ? '<p>Kestrel One brings it to Tremblant Woods.</p>' : ''}</div>` +
    `<div class="unlock-price">${bar(progress.medals, progress.needMedals, 'MEDALS')}` +
    `${progress.needGold ? bar(progress.gold, progress.needGold, 'GOLD MEDALS') : ''}` +
    `<p>Unlocks the moment you reach it. No credits.</p></div></div>`;
}

export const MEDAL_REWARD_NOTE = 'MEDAL REWARD · Arrives fully tuned. No upgrades needed.';

// Plain text lines for the results screen; the caller escapes them.
export function medalResultLines(result, { helicopter = false } = {}) {
  const lines = [];
  const medal = result?.medal;
  if (medal && Object.hasOwn(CARS, medal.car)) {
    lines.push(`NEW MEDAL · ${medal.colour.toUpperCase()} · ${CARS[medal.car].name.toUpperCase()} · ` +
      `${ROW_NAMES[medal.row]} · ${medal.level.toUpperCase()}${medal.bonus > 0 ? ` · +${medal.bonus} CR` : ''}`);
  }
  for (const id of result?.earnedCars ?? []) {
    if (!Object.hasOwn(CARS, id)) continue;
    lines.push(`NEW CAR EARNED · ${CARS[id].name.toUpperCase()} · IN YOUR GARAGE`);
    if (helicopter) lines.push('KESTREL ONE WILL BRING IT TO TREMBLANT WOODS');
  }
  return lines;
}
