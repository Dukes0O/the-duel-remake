// The Tune page in the garage and the tuned-lap line on the Time Trial result (docs/LAB.md section 5, card LAB-TUNE-VIEW).
// Words and buttons only. The rules are src/lab/lab-tune.js and lab-save.js; every change to the saved tune goes through
// app.labCommit, and nothing here touches a race.
import {CARS} from '../config.js';
import {labOf, labReady, withLab, setTune, stockKey, TUNE_SETTINGS, TUNED_BONUS, LAB_SAVE_VERSION} from './lab-save.js';
import {TUNE_SETTING_OF, LAB_LESSONS} from './lab-lessons.js';
import {LAB_TUNE, normalizeTune, isStockTune, ruleSetOf, bestLap} from './lab-tune.js';

const escape = text => String(text).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);
const lessonOf = setting => Object.keys(TUNE_SETTING_OF).find(id => TUNE_SETTING_OF[id] === setting);
const lessonName = id => LAB_LESSONS.find(item => item.id === id)?.name ?? id;
const signed = value => value > 0 ? `+${value}` : `${value}`;
const percent = fraction => `${Math.round(fraction * 1000) / 10}%`;
const signedPercent = fraction => `${fraction > 0 ? '+' : fraction < 0 ? '-' : ''}${percent(Math.abs(fraction))}`;

// The switches the page needs: the Lab and tuning both on.
export const tuningOn = flags => flags?.enabled?.('lab') === true && flags?.enabled?.('lab-tuning') === true;

// ---- the five settings, in the words of docs/LAB.md 5.1 ----
// steps: the steps the page offers (fuel has no step below 0: a full tank). low/high: the two ends. trade: the plain line.
export const TUNE_ROWS = Object.freeze([
  Object.freeze({setting: 'pressure', name: 'Tyre pressure', low: 'Lower', high: 'Higher', steps: [-2, -1, 0, 1, 2],
    trade: 'Lower pressure grips more but drags more. Higher is sharper, with less grip and a little more top speed.'}),
  Object.freeze({setting: 'wing', name: 'Wing angle', low: 'Less wing', high: 'More wing', steps: [-2, -1, 0, 1, 2],
    trade: 'More wing grips more in fast corners, most of all at speed, but costs top speed. Less wing is faster on the straights.'}),
  Object.freeze({setting: 'brakes', name: 'Brake balance', low: 'Toward the front', high: 'Toward the rear', steps: [-2, -1, 0, 1, 2],
    trade: 'Toward the rear stops shorter and keeps the car turning in while braking, but it slides sooner. The front is steadier.'}),
  Object.freeze({setting: 'springs', name: 'Springs', low: 'Softer', high: 'Stiffer', steps: [-2, -1, 0, 1, 2],
    trade: 'Stiffer springs grip more on smooth roads. Softer ones ride bumps and dirt better.'}),
  Object.freeze({setting: 'fuel', name: 'Fuel load', low: 'Full tank', high: 'Half tank', steps: [0, 1, 2],
    trade: 'A lighter tank speeds up and brakes better, but a half tank runs dry at 55% of the race. Pit to fill it again; the stop takes 5 seconds longer.'}),
]);

// What a step does, from the table's own numbers.
export function effectLine(setting, step) {
  const T = LAB_TUNE;
  if (!step) return 'Standard: the car as it is.';
  switch (setting) {
    case 'pressure': return `Grip ${signedPercent(T.pressure.gripPerStep * step)}, top speed ${signedPercent(T.pressure.topSpeedPerStep * step)}.`;
    case 'wing': return `Grip at 100 mph ${signedPercent(T.wing.gripAtReference * step)}, more at higher speed; top speed ${signedPercent(T.wing.topSpeedPerStep * step)}.`;
    case 'brakes': return `Braking ${signedPercent(T.brakes.brakingPerStep * step)}; cornering grip while braking ${signedPercent(T.brakes.cornerLeftPerStep * step)}.`;
    case 'springs': return `Grip ${signedPercent(T.springs.gripPerStep * step)}; off-road grip ${signedPercent(T.springs.offRoadGripPerStep * step)}, bumps ${signedPercent(-T.springs.bumpsPerStep * step)}.`;
    case 'fuel': return `${step === 1 ? 'Three-quarter' : 'Half'} tank. Acceleration and braking ${signedPercent(T.fuel.accelPerStep * step)}; the tank lasts ${percent(T.fuel.fullTankRaceShare * (1 - T.fuel.loadPerStep * step))} of a Grand Prix.`;
    default: return '';
  }
}

// ---- what the page may show and change, for one car ----
const isCar = car => typeof car === 'string' && Object.hasOwn(CARS, car);
// Rows for the page: {setting, name, low, high, steps, trade, open, locked, current, effect, note}. Empty while the switches are off.
export function tuneRows(profile, carId, flags) {
  if (!tuningOn(flags) || !isCar(carId)) return [];
  const lab = labOf(profile);
  if (lab.version !== LAB_SAVE_VERSION) return [];
  const tune = normalizeTune(lab.tune?.[carId]);
  return TUNE_ROWS.map(row => {
    const lesson = lessonOf(row.setting), open = lab.done[lesson] === true;
    const tankless = row.setting === 'fuel' && CARS[carId].electric === true;
    const note = tankless ? 'This car has no petrol tank.' : !open ? `Opens with ${lessonName(lesson)} in the Lab.` : '';
    // A forged value on a shut setting is shown as it is saved but the race ignores it (see usableTune).
    return {...row, lesson, open: open && !tankless, locked: !open, tankless, current: tune[row.setting], effect: effectLine(row.setting, tune[row.setting]), note};
  });
}

// The tune a race may use: only settings whose lesson is passed, and no fuel for a car with no tank. Saves written by hand
// cannot open a setting the Lab has not.
export function usableTune(profile, carId) {
  const lab = labOf(profile);
  if (lab.version !== LAB_SAVE_VERSION || !isCar(carId)) return undefined;
  const saved = lab.tune?.[carId];
  if (saved === undefined) return undefined;
  const tune = normalizeTune(saved);
  const usable = {};
  for (const name of TUNE_SETTINGS) {
    usable[name] = lab.done[lessonOf(name)] === true && !(name === 'fuel' && CARS[carId].electric === true) ? tune[name] : 0;
  }
  return usable;
}

// Reset: every setting of one car back to 0, including a forged one on a shut setting. Same shape as the Lab's own calls.
export function resetTuneIn(profile, carId, flags) {
  const {lab, refusal} = labReady(profile, flags, {tuning: true});
  if (refusal) return refusal;
  if (!isCar(carId)) return {ok: false, reason: 'Choose a car.', profile};
  const zero = Object.fromEntries(TUNE_SETTINGS.map(name => [name, 0]));
  return {ok: true, reason: '', profile: withLab(profile, {...lab, tune: {...lab.tune, [carId]: zero}})};
}
export const stepIn = (profile, carId, setting, step, flags) => setTune(profile, carId, setting, step, {flags});

// ---- the page ----
export function tunePanel({rows, carName, message = ''}) {
  if (!rows.length) return '';
  const stock = rows.every(row => row.current === 0);
  const body = rows.map(row => {
    const buttons = row.steps.map(step => {
      const on = row.current === step;
      return `<button type="button" class="tune-step${on ? ' on' : ''}" data-tune="${row.setting}:${step}" aria-pressed="${on}"${row.open ? '' : ' disabled'} aria-label="${escape(row.name)} ${step === 0 ? 'standard' : signed(step)}">${step === 0 ? '0' : signed(step)}</button>`;
    }).join('');
    const ends = `<span class="tune-ends"><small>${escape(row.low)}</small><small>${escape(row.high)}</small></span>`;
    const lock = row.note ? `<p class="tune-note">${escape(row.note)}</p>` : '';
    return `<li class="tune-row${row.open ? '' : ' shut'}" data-tune-row="${row.setting}"><div class="tune-name"><b>${escape(row.name)}</b><em>${row.open ? escape(row.effect) : ''}</em></div>`
      + `<div class="tune-steps" role="group" aria-label="${escape(row.name)}">${buttons}${ends}</div><p class="tune-trade">${escape(row.trade)}</p>${lock}</li>`;
  }).join('');
  return `<details class="paint-panel tune-panel" data-tune-panel><summary><span>TUNE</span><b>${stock ? 'STANDARD' : 'TUNED'}</b></summary>`
    + `<p class="tune-intro">${escape(carName)}. Five steps for each setting; 0 is the car as it is. Your tune applies to every race in this car. No setting is better everywhere.</p>`
    + `<ul class="tune-rows">${body}</ul><div class="tune-foot"><button type="button" class="secondary-button" data-tune-reset${stock ? ' disabled' : ''}>RESET ALL TO 0</button>`
    + `<p class="tune-message" role="status" aria-live="polite">${escape(message)}</p></div></details>`;
}

// ---- the Time Trial result line ----
const stockLapOf = (profile, car, courseId, rules) => {
  const lab = labOf(profile), seconds = lab.version === LAB_SAVE_VERSION ? lab.stockLaps?.[stockKey(car, courseId, rules)] : undefined;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

// The lines under a Time Trial result: [] when tuning is off, nothing was tuned and there is nothing to say.
// state: the finished race state (car, tune, lapTimes, assistedLaps, tyreSlipRules, engineCurve); result: the settled result
// (result.tunedLap = {percent, bonus} from settleTunedLap); time: the results screen's own time formatter.
export function tunedLapLines({profile, flags, state, result, courseId, time}) {
  if (!tuningOn(flags) || state?.mode !== 'timetrial' || result?.completed !== true || state.lesson || state.drivingLesson) return [];
  const rules = ruleSetOf(state);
  const stock = stockLapOf(profile, state.car, courseId, rules);
  const laps = (state.lapTimes ?? []).filter((seconds, index) => state.assistedLaps?.[index] !== true);
  const lap = bestLap(laps);
  const anyOpen = TUNE_SETTINGS.some(name => labOf(profile).done[lessonOf(name)] === true);
  if (!state.tune) {
    // A stock run: the stock lap it sets or keeps, for the player who has a setting open to be judged against.
    if (!anyOpen || stock === null) return [];
    return [`Stock lap: ${time(stock)}. A tuned lap is judged against it.`];
  }
  const tuned = result.tunedLap;
  if (!tuned || lap === null) return [];
  const notOnBoard = 'Tuned laps are not on the leaderboard.';
  if (stock === null) return [`Tuned lap: ${time(lap)}. You have no stock lap here yet: drive this course once with every setting at 0 and tuned laps are judged against it. ${notOnBoard}`];
  const ms = seconds => Math.round(seconds * 1000);
  const off = (ms(stock) - ms(lap)) / ms(stock) * 100;   // positive: faster
  const shown = Math.round(Math.abs(off) * 10) / 10;
  if (tuned.bonus > 0) return [`Tuned lap: ${tuned.percent}% faster than your stock lap. Bonus ${tuned.bonus}.`, notOnBoard];
  if (off >= 1) return [`Tuned lap: ${tuned.percent}% faster than your stock lap. The ${TUNED_BONUS} bonus for this course is already paid.`, notOnBoard];
  if (off > 0) return [`Tuned lap: ${Math.floor(off * 10) / 10}% faster than your stock lap. The ${TUNED_BONUS} bonus needs 1%.`, notOnBoard];
  return [`Tuned lap: ${shown === 0 ? 'no faster' : `${shown}% slower`} than your stock lap (${time(stock)}).`, notOnBoard];
}

// ---- the pit board ----
// The fuel part of the board's words, or '' when the car has no tank. state.fuel = {tankM, leftM, dry}.
export function fuelBoardText(fuel) {
  if (!fuel || !(fuel.tankM > 0)) return '';
  if (fuel.dry === true) return 'TANK EMPTY';
  const left = Math.max(0, Math.min(1, fuel.leftM / fuel.tankM));
  return `FUEL ${Math.round(left * 100)}%`;
}
