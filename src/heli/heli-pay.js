// What helicopter work pays (HELI-PAY-CONTINUE). Pure numbers and two helpers, no imports, so every
// helicopter file can read them. One rule: a job pays about what winning ordinary races pays for the
// same minutes. A Medium race win is 1,000 credits plus 100 for a clean race, over about 3 minutes
// with the menu, countdown and results, which is about 350 credits a minute. The helicopter is slower
// and harder to control than a car, so it earns that same rate, never less.
//
// The minutes below are the typical time a job takes, worked out from its parts (see
// docs/changes/HELI-PAY-CONTINUE.md). A clean delivery (no hard landing, crash, dropped load or
// cargo knock while the job was in hand) adds a quarter on top.
export const HELI_PAY = Object.freeze({
  creditsPerMinute: 350,
  cleanShare: 0.25,
  step: 50,
  // The cruise leg burns this many kilograms of fuel a second (the same number as FIRE.cruiseKgPerSecond).
  cruiseKgPerSecond: 0.6,
});

// Minutes for the parts every delivery shares.
export const HELI_STEPS = Object.freeze({leavePad: 1, hook: 1, carryOut: 1, arrive: 1, setDown: 1});

// Typical minutes for the jobs that are not a simple delivery.
export const HELI_MINUTES = Object.freeze({
  recovery: 8.8,   // leave 1, cruise to the slope 3.3, arrive 1, find and hook 1.5, carry 1, set down 1
  survey: 10,      // leave 1, cruise about 2, arrive 1, search 5, fly back about 2, land 1 (a count at home skips the cruises)
  fire: 18,        // answered at once: 5 drops, 15 to 25 minutes of flying (docs/HELI_FIRE.md section 4)
  hiker: 10,       // 15 minute clock, finished in about 10
  avalanche: 11,   // 12 minute clock, a beacon search and a held dig
  hoist: 11,       // 12 minute clock, a hold over the driver and a lift
  supply: 14,      // leave 1, cruise 3.5, arrive 1, three crates of about 3 minutes each
  skiGroup: 16,    // to Summit Run 7, the run 2, home 7
  skiGold: 10,     // the trip out and the run, paid once for each new medal
  stash: 2,        // a hidden powder stash, found once
  table: 10,       // the trip to the Table, paid once
});

export const roundPay = value => Math.max(HELI_PAY.step, Math.round(value / HELI_PAY.step) * HELI_PAY.step);
export const payForMinutes = minutes => roundPay(HELI_PAY.creditsPerMinute * minutes);
export const cleanBonusFor = pay => roundPay(pay * HELI_PAY.cleanShare);
export const cruiseMinutes = fuelKg => fuelKg > 0 ? fuelKg / HELI_PAY.cruiseKgPerSecond / 60 : 0;

// A delivery from the home pad: leave, hook, carry out, cruise, arrive, set down.
// From another pad the helicopter first cruises there (`positionKg`, the fuel of that leg) and lands.
export function deliveryMinutes(cruiseKg, positionKg = null) {
  const steps = HELI_STEPS;
  const own = steps.hook + steps.carryOut + cruiseMinutes(cruiseKg) + steps.arrive + steps.setDown;
  return positionKg === null ? steps.leavePad + own : steps.leavePad + cruiseMinutes(positionKg) + steps.arrive + own;
}

const TOP = payForMinutes(HELI_MINUTES.survey);
const SUPPLY_TOTAL = payForMinutes(HELI_MINUTES.supply);
const SUPPLY_BONUS = roundPay(SUPPLY_TOTAL / 10);
const CRATE = roundPay((SUPPLY_TOTAL - SUPPLY_BONUS) / 3);
const GOLD = payForMinutes(HELI_MINUTES.skiGold);

// Every fixed amount, worked out from the minutes above.
export const HELI_PAYS = Object.freeze({
  recovery: payForMinutes(HELI_MINUTES.recovery),
  // The wildlife count: good, close and off, and the rare animal's bonus (3, 2 and 1 parts, a sixth for the rare one).
  survey: Object.freeze({good: TOP, close: roundPay(TOP * 2 / 3), off: roundPay(TOP / 3), rare: roundPay(TOP / 6)}),
  fire: payForMinutes(HELI_MINUTES.fire),
  rescue: Object.freeze({hiker: payForMinutes(HELI_MINUTES.hiker), avalanche: payForMinutes(HELI_MINUTES.avalanche),
    hoist: payForMinutes(HELI_MINUTES.hoist)}),
  // The medevac coat's stretcher adds a sixth of a hoist rescue (200 on 1,200 before).
  stretcher: roundPay(payForMinutes(HELI_MINUTES.hoist) / 6),
  supply: Object.freeze({perCrate: CRATE, highCut: roundPay(CRATE / 2), allCrates: SUPPLY_BONUS}),
  skiGroup: payForMinutes(HELI_MINUTES.skiGroup),
  // Heli-skiing medals, paid in total for each medal level (bronze, silver, gold) and once.
  skiMedals: Object.freeze([0, roundPay(GOLD * 0.3), roundPay(GOLD * 0.6), GOLD]),
  stash: payForMinutes(HELI_MINUTES.stash),
  table: payForMinutes(HELI_MINUTES.table),
});

// The words the panels use, so a job says the same thing before and after it.
const num = value => Math.round(value).toLocaleString('en-US');
// Before a job: "Pays 2,000 credits, +500 for a clean delivery".
export const payWords = (pay, {bonus = 0, upTo = false} = {}) =>
  `Pays ${upTo ? 'up to ' : ''}${num(pay)} credits${bonus > 0 ? `, +${num(bonus)} for a clean delivery` : ''}`;
// After a job: "Job done: 2,500 credits (2,000 and 500 for a clean delivery). You now have 14,300."
// `extra` is a short ending such as "and the rescue badge".
export function resultWords(label, pay, {bonus = 0, balance = null, extra = ''} = {}) {
  const split = bonus > 0 ? ` (${num(pay - bonus)} and ${num(bonus)} for a clean delivery)` : '';
  const total = Number.isFinite(balance) ? `. You now have ${num(balance)}.` : '';
  return `${label}: ${num(pay)} credits${split}${extra ? ` ${extra}` : ''}${total}`;
}
