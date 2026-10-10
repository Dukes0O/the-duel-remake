// What a Grand Prix shows on screen (docs/CIRCUITS.md 3.2): the five start
// lights, your position and the gaps to the cars either side, the running
// order on the left, the tow marker and the finishing table. Pure
// presentation: it reads the race state and never changes it.
const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

export const FIELD_HUD_IDS = Object.freeze(['start-lights', 'field-board', 'field-rows', 'field-gap-ahead', 'field-gap-behind', 'tow-marker']);

// The pieces the race HUD adds; placed inside the existing HUD markup.
export const fieldHudMarkup = Object.freeze({
  lights: '<div id="start-lights" class="start-lights" data-lights="0" role="img" aria-label="Start lights" hidden><i></i><i></i><i></i><i></i><i></i></div>',
  board: '<section id="field-board" class="field-board" aria-label="Running order" hidden><ol id="field-rows"></ol></section>',
  gaps: '<span id="field-gap-ahead" class="field-gap" hidden></span><span id="field-gap-behind" class="field-gap" hidden></span>',
  tow: '<span id="tow-marker" class="tow-marker" role="status" hidden>TOW</span>',
});

// "Mara Vale" becomes "M. VALE"; one-word names stay whole.
export function shortRacerName(name) {
  const parts = String(name).trim().split(/\s+/);
  return (parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : parts[0]).toUpperCase();
}

const gapText = seconds => (seconds == null ? '' : `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}`);

// One row of the running order.
export function runningOrderRows(field) {
  return field.order.map(row => {
    const gap = row.position === 1 ? '' : row.gapAheadSec == null ? '' : `+${gapText(row.gapAheadSec)}`;
    return `<li class="${row.you ? 'you' : ''}"><b>${row.position}</b><span>${escapeText(row.you ? 'YOU' : shortRacerName(row.name))}</span><em>${gap}</em></li>`;
  }).join('');
}

// Fills the Grand Prix parts of the race HUD. `ui` is the HUD's element map
// and `text` writes text only when it changed.
export function presentField(ui, text, s) {
  const field = s.field;
  const on = !!field;
  ui['field-board'].hidden = !on;
  ui['field-gap-ahead'].hidden = !on;
  ui['field-gap-behind'].hidden = !on;
  ui['tow-marker'].hidden = !on || field.tow < .2;
  const lights = on && s.status === 'countdown' ? field.start.lights : 0;
  ui['start-lights'].hidden = !on || s.status !== 'countdown';
  if (ui['start-lights'].dataset.lights !== String(lights)) ui['start-lights'].dataset.lights = String(lights);
  ui['countdown-number'].hidden = on;
  ui['gap-label'].hidden = on;
  ui['rival-gap'].hidden = on;
  if (!on) return;
  text('race-position', String(field.position).padStart(2, '0'));
  text('position-total', `/${String(field.size).padStart(2, '0')}`);
  const ahead = field.ahead, behind = field.behind;
  text('field-gap-ahead', ahead ? `AHEAD ${shortRacerName(ahead.name)}  −${gapText(field.order[field.position - 1]?.gapAheadSec)}` : 'LEADING THE RACE');
  text('field-gap-behind', behind ? `BEHIND ${shortRacerName(behind.name)}  +${gapText(behind.gapAheadSec)}` : 'LAST CAR');
  ui['tow-marker'].style.opacity = String(Math.min(1, .35 + field.tow * .65));
  const rows = runningOrderRows(field);
  if (ui['field-rows'].dataset.markup !== rows) { ui['field-rows'].dataset.markup = rows; ui['field-rows'].innerHTML = rows; }
  if (s.status === 'countdown') text('countdown-word', field.start.lights < 5 ? 'GET READY' : 'HOLD YOUR NERVE');
}

// The finishing order for the results screen: name, car, gap and best lap.
export function fieldResultsTable(result, time) {
  const rows = (result.field || []).map(row => {
    const gap = row.position === 1 ? 'WINNER' : `+${row.gapSec.toFixed(2)}${row.projected ? '*' : ''}`;
    return `<tr class="${row.you ? 'you' : ''}"><td>${row.position}</td><td>${escapeText(row.you ? 'YOU' : row.name)}</td>` +
      `<td>${escapeText(row.carName || row.car)}</td><td>${gap}</td><td>${row.bestLapSec == null ? '—' : time(row.bestLapSec)}</td></tr>`;
  }).join('');
  const note = (result.field || []).some(row => row.projected) ? '<p class="field-note">* Still racing when you finished; time estimated.</p>' : '';
  return `<table class="field-results" aria-label="Finishing order"><thead><tr><th>POS</th><th>DRIVER</th><th>CAR</th><th>GAP</th><th>BEST LAP</th></tr></thead><tbody>${rows}</tbody></table>${note}`;
}

const ordinal = n => {
  const suffixes = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
};

// Words for the results panel.
export function fieldResultsText(result, time) {
  const place = result.position, size = result.fieldSize;
  const winner = result.field.find(row => row.position === 1);
  const title = place === 1 ? 'GRAND PRIX<br>WINNER.' : place <= 3 ? 'ON THE<br>PODIUM.' : `FINISHED<br>${ordinal(place).toUpperCase()}.`;
  const gap = place === 1 ? `You won by ${(result.field[1]?.gapSec ?? 0).toFixed(2)} seconds.` :
    `${(result.field.find(row => row.you).gapSec).toFixed(2)} seconds behind ${winner.name}.`;
  const lap = result.fastestLap ? ` Fastest lap: ${result.fastestLap.you ? 'you' : result.fastestLap.name}, ${time(result.fastestLap.timeSec)}.` : '';
  return { title, description: `You finished ${ordinal(place)} of ${size}. ${gap}${lap}` };
}
