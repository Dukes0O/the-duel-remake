// HELI-PAY-CONTINUE: helicopter work pays about what winning races pays for the same minutes
// (docs/changes/HELI-PAY-CONTINUE.md has the table and the reasoning). Pure numbers, no graphics.
import assert from 'node:assert/strict';
import {HELI_PAY, HELI_MINUTES, HELI_PAYS, payForMinutes, cleanBonusFor, deliveryMinutes, payWords, resultWords} from '../src/heli/heli-pay.js';
import {CPU_REWARDS, DRIVING_MILESTONES} from '../src/progression.js';
import {JOB_ROUTES, RECOVERY, jobPay, jobCleanBonus, returnLoadPay, mapJobPay} from '../src/heli/heli-jobs.js';
import {SURVEY_PAY} from '../src/heli/heli-survey.js';
import {RESCUE_MONEY} from '../src/heli/heli-missions.js';
import {FIRE_MONEY, SKI_MONEY} from '../src/heli/heli-save.js';
import {SUPPLY_PAY, supplyPay} from '../src/heli/heli-rescue.js';
import {HELI_SKIING} from '../src/heli/heli-session.js';
import {TABLE_PAY} from '../src/heli/map-secrets.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

// The race rate the helicopter matches: a Medium win and its clean bonus over about 3 minutes.
const raceRate = (CPU_REWARDS.medium + Math.round(CPU_REWARDS.medium * 0.1)) / 3;
ok(Math.abs(raceRate - HELI_PAY.creditsPerMinute) <= 25, `350 a minute is the Medium race rate (${raceRate.toFixed(0)})`);
ok(DRIVING_MILESTONES.clean_debut, 'race pay is read, not changed');

// Every job is its minutes at the rate, to the nearest 50.
const near = (pay, minutes, label, slack = HELI_PAY.step / 2) => ok(Math.abs(pay - HELI_PAY.creditsPerMinute * minutes) <= slack, `${label}: ${pay} for ${minutes} min`);
// A cruise leg plays as a short fade, so it counts 1 minute whatever its length: a home pick-up is 6 minutes, a pick-up
// at another pad 8 (one more leg and a landing).
eq([deliveryMinutes(), deliveryMinutes(true)], [6, 8], 'minutes of a delivery');
near(JOB_ROUTES[0].pay, deliveryMinutes(), 'Woods to Snow');
near(JOB_ROUTES[1].pay, deliveryMinutes(true), 'Snow to Ridge, flying to Snow first');
near(JOB_ROUTES[2].pay, deliveryMinutes(), 'Woods to Ridge');
eq(JOB_ROUTES.map(route => route.pay), [2100, 2800, 2100], 'the three routes');
near(RECOVERY.pay, HELI_MINUTES.recovery, 'recovery');
near(SURVEY_PAY.bands[0].pay, HELI_MINUTES.survey, 'wildlife count, good');
eq([SURVEY_PAY.bands[0].pay, SURVEY_PAY.bands[1].pay, SURVEY_PAY.off.pay, SURVEY_PAY.rareBonus], [3500, 2350, 1150, 600], 'count bands');
near(FIRE_MONEY.firePay, HELI_MINUTES.fire, 'fire');
for (const kind of ['hiker', 'avalanche', 'hoist']) near(RESCUE_MONEY.basePay[kind], HELI_MINUTES[kind], kind);
near(supplyPay([{released: true}, {released: true}, {released: true}]).total, HELI_MINUTES.supply, 'supply run', HELI_PAY.step);
eq(supplyPay([{released: true}, {released: true}, {released: true}]).total, 4150, 'a clean supply run');
eq([SUPPLY_PAY.perCrate, SUPPLY_PAY.highCut, SUPPLY_PAY.allCratesBonus], [1250, 650, 400], 'supply crates');
near(HELI_SKIING.groupPay, HELI_MINUTES.skiGroup, 'ski group');
near(SKI_MONEY.medalTotal[3], HELI_MINUTES.skiGold, 'gold ski medal');
eq([...SKI_MONEY.medalTotal], [0, 700, 1400, 2300], 'ski medals');
near(SKI_MONEY.stash, HELI_MINUTES.stash, 'powder stash');
near(TABLE_PAY, HELI_MINUTES.table, 'the Table');
eq(payForMinutes(0), HELI_PAY.step, 'a job never pays less than one step');

// A crate on a return leg takes the same minutes as a car job from home, never less than its fuel.
eq(returnLoadPay('tremblant-snow', 'tremblant-woods'), 2100, 'Snow crate home');
eq(returnLoadPay('panorama-ridge', 'tremblant-woods'), 2100, 'Ridge crate home');
eq(returnLoadPay('panorama-ridge', 'tremblant-snow'), 2100, 'Ridge crate to Snow');
ok(mapJobPay('tremblant-woods', 'tremblant-snow') === JOB_ROUTES[0].pay, 'map jobs use the same rule');

// A clean delivery adds a quarter; Real pays a quarter more on both.
eq(cleanBonusFor(2100), 550, 'a quarter of 2,100, to the nearest 50');
eq(cleanBonusFor(2800), 700, 'a quarter of 2,800');
eq(jobPay(JOB_ROUTES[0], 'real'), 2625, 'Real pays 25% more');
eq(jobCleanBonus(JOB_ROUTES[0], 'real'), 688, 'and 25% more on the bonus');
eq(Object.values(HELI_PAYS.rescue).every(pay => pay > 0), true, 'every rescue pays');

// The words on the panels.
eq(payWords(2100, {bonus: 550}), 'Pays 2,100 credits, +550 for a clean delivery', 'before a job');
eq(payWords(3500, {upTo: true}), 'Pays up to 3,500 credits', 'before a count');
eq(resultWords('Job done', 2500, {bonus: 500, balance: 14300}), 'Job done: 2,500 credits (2,000 and 500 for a clean delivery). You now have 14,300.', 'after a clean job');
eq(resultWords('Fire out', 6300, {balance: 9000, extra: 'and the firefighter badge'}), 'Fire out: 6,300 credits and the firefighter badge. You now have 9,000.', 'after a fire');

console.log(`test-heli-pay: ${checks} checks passed`);
