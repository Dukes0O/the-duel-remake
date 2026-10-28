// The mission engine (docs/HELI_FIRE.md section 3).
import assert from 'node:assert/strict';
import {MISSION_RULES, createMissions, armed, armMissions, noteRefuel, runEngine, inQuietSpell, callDue, callTime,
  openCall, answerCall, endMission, createCallClock, tickCallClock, SEASONS, SEASON_WEIGHTS, seasonOf, seasonOpen, pickKind,
  callOf, rescueOf, rescueConditions, RESCUE_CLOCKS, CASUALTY_KINDS, DUSK_SECONDS, CALL_WAIT, RESCUE_TALLY, RESCUE_MONEY, FAIL_REASONS,
  noteCallFlight, callTaken, takeCall, beginRescue, rescueLimit, clockLeft, duskOf, tickRescue, peoplePay, failRescue, finishRescue,
  isRescueKind} from '../src/heli/heli-missions.js';
import {normalizeHeli, createHeli, fireOf, missionsOf, heliHash, RESCUE_KINDS, MISSION_KINDS} from '../src/heli/heli-save.js';
import {HELI_RADIO_LINES} from '../src/heli/heli-radio-lines.js';
import {JOB_CARS, AIR_ONLY_CARS} from '../src/heli/heli-jobs.js';
import {fireOnNewDay, createFireRun} from '../src/heli/heli-fire-run.js';
import {dispatchBoardMarkup} from '../src/heli/heli-board.js';

let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const canBurn = {fire: ['tremblant-woods']}, nothing = {fire: []};
const armedFor = (name = 'Kyle', date = '2026-10-14') => armMissions(createMissions(), {date, playerName: name});
const refuel = (missions, times, options) => { for (let n = 0; n < times; n++) missions = noteRefuel(missions, options); return missions; };
const clean = missions => normalizeHeli({version: 1, missions}).missions;

check('the rules match the design', () => {
  assert.deepEqual({...MISSION_RULES, need: [...MISSION_RULES.need], callAfter: [...MISSION_RULES.callAfter]},
    {need: [3, 6], callAfter: [20, 60], callHeight: 30, answerSeconds: 20, quietDays: 2, quietEngineSeconds: 1200});
});

check('before arming nothing counts and no call comes', () => {
  const fresh = createMissions();
  assert.equal(armed(fresh), false);
  assert.equal(noteRefuel(fresh), fresh);
  assert.equal(callDue(fresh, {playDay: 9, conditions: canBurn}), false);
  const once = armedFor();
  assert.equal(armMissions(once, {date: '2026-12-01', playerName: 'Someone'}), once, 'arming twice changes nothing');
});

check('need is always 3 to 6 and every value comes up', () => {
  const seen = new Set();
  for (let k = 0; k < 400; k++) {
    let missions = armedFor('player ' + k, '2026-10-' + String(1 + k % 28).padStart(2, '0'));
    for (let round = 0; round < 5; round++) {
      assert(missions.need >= 3 && missions.need <= 6, String(missions.need));
      seen.add(missions.need);
      missions = endMission({...missions, call: {kind: 'fire', id: 'f', courseId: 'tremblant-woods', day: 0, answered: true}}, {playDay: 0});
    }
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5, 6]);
});

check('the same save gives the same needs and call times; other players differ', () => {
  const run = name => {
    let missions = armedFor(name);
    const out = [];
    for (let round = 0; round < 6; round++) {
      out.push([missions.need, callTime(missions)]);
      missions = endMission({...missions, call: {kind: 'fire', id: 'f', courseId: 'tremblant-woods', day: 0, answered: true}}, {playDay: round * 3});
    }
    return out;
  };
  assert.deepEqual(run('Kyle'), run('Kyle'));
  assert.notDeepEqual(run('Kyle'), run('Kai'));
  for (const [, at] of run('Kyle')) assert(at >= 20 && at <= 60);
  assert.deepEqual(clean(armedFor()), armedFor(), 'the record survives the save as it is');
});

check('only pump purchases count, up to need, and not while a call waits or a fire burns', () => {
  const start = armedFor();
  const counted = refuel(start, 10);
  assert.equal(counted.count, start.need, 'the count stops at need');
  assert.equal(noteRefuel(start, {fireOpen: true}), start, 'not during a mission');
  const waiting = {...start, call: {kind: 'fire', id: 'fire-1', courseId: 'tremblant-woods', day: 2, answered: false}};
  assert.equal(noteRefuel(waiting), waiting, 'not while a call waits');
});

check('a call is due at need, only when something can burn', () => {
  const full = refuel(armedFor(), 6);
  assert.equal(callDue(full, {playDay: 1, conditions: canBurn}), true);
  assert.equal(callDue(full, {playDay: 1, conditions: nothing}), false, 'nothing can burn: no call');
  assert.equal(callDue(full, {playDay: 1, conditions: {}}), false);
  assert.equal(callDue({...full, count: full.need - 1}, {playDay: 1, conditions: canBurn}), false);
  assert.equal(callDue(full, {playDay: 1, fireOpen: true, conditions: canBurn}), false);
});

check('the call comes mid-air at its time, 30 m up, never in a lesson, the opening or a cruise fade', () => {
  const clock = createCallClock(25);
  const step = (dt, state) => tickCallClock(clock, {dt, aboveGround: 50, ...state});
  assert.equal(step(24.9), false);
  assert.equal(step(0.2, {aboveGround: 12}), false, 'too low');
  assert.equal(step(0.2, {lesson: true}), false);
  assert.equal(step(0.2, {opening: true}), false);
  assert.equal(step(0.2, {fading: true}), false);
  assert.equal(step(0.1), true, 'once high enough and nothing else is on');
  assert.equal(step(0.1), false, 'once only');
  const landed = createCallClock(40);
  tickCallClock(landed, {dt: 30, aboveGround: 50});
  // A landing ends the flight: the session makes a new clock on the next lift-off.
  const next = createCallClock(40);
  assert.equal(tickCallClock(next, {dt: 39, aboveGround: 50}), false, 'the next flight starts its count again');
});

check('answer now or later: the call waits in the save until answered', () => {
  const full = refuel(armedFor(), 6);
  const {missions, call, seed} = openCall(full, {playDay: 4, conditions: canBurn});
  assert.deepEqual(call, {kind: 'fire', id: `fire-${full.draws}`, courseId: 'tremblant-woods', day: 4, answered: false});
  assert(Number.isSafeInteger(seed) && seed > 0);
  assert.deepEqual(clean(missions), missions, 'a waiting call survives the save');
  assert.equal(callDue(missions, {playDay: 4, conditions: canBurn}), false, 'one at a time');
  const answered = answerCall(missions);
  assert.equal(answered.call.answered, true);
  assert.equal(answerCall(answered), answered);
  assert.equal(answerCall(full), full, 'no call, nothing to answer');
  assert.deepEqual(openCall(full, {playDay: 4, conditions: nothing}), {missions: full, call: null});
  assert.deepEqual(openCall(answered, {playDay: 5, conditions: canBurn}), {missions: answered, call: null}, 'a second ring never reopens a call');
  assert.equal(openCall(full, {playDay: 4, conditions: canBurn, fireOpen: true}).call, null, 'not with a fire burning');
  assert.equal(openCall({...full, count: full.need - 1}, {playDay: 4, conditions: canBurn}).call, null, 'not before the count is reached');
});

check('the quiet spell: no call that play day or the next, nor within 20 minutes of engine time', () => {
  const full = refuel(armedFor(), 6);
  const {missions} = openCall(full, {playDay: 10, conditions: canBurn});
  let after = refuel(endMission(answerCall(missions), {playDay: 10}), 6);
  assert.deepEqual([after.count, after.call, after.last, after.quiet], [after.need, null, 'fire', {untilDay: 12, engineSeconds: 1200}]);
  assert.equal(inQuietSpell(after, 11), true);
  assert.equal(callDue(after, {playDay: 11, conditions: canBurn}), false, 'not the next play day');
  assert.equal(callDue(after, {playDay: 12, conditions: canBurn}), false, 'not before 20 minutes of engine time');
  after = runEngine(after, 1199.9);
  assert.equal(callDue(after, {playDay: 20, conditions: canBurn}), false, 'not before 20 minutes of engine time, on an open day');
  after = runEngine(after, 0.1);
  assert.equal(after.quiet.engineSeconds, 0);
  assert.equal(callDue(after, {playDay: 11, conditions: canBurn}), false, 'engine time alone is not enough');
  assert.equal(callDue(after, {playDay: 12, conditions: canBurn}), true);
  assert.equal(runEngine(after, 50), after, 'nothing to run down');
  let framed = refuel(endMission(answerCall(missions), {playDay: 10}), 6);
  for (let n = 0; n < 72_000 && framed.quiet.engineSeconds > 0; n++) framed = runEngine(framed, 1 / 60);
  assert.equal(framed.quiet.engineSeconds, 0, 'a frame at a time runs the 20 minutes down too');
  assert.equal(runEngine(after, -5), after);
});

check('the same kind may come twice or more in a row', () => {
  let missions = refuel(armedFor(), 6), kinds = [];
  for (let round = 0; round < 3; round++) {
    const opened = openCall(missions, {playDay: round * 3, conditions: canBurn});
    kinds.push(opened.call.kind);
    missions = runEngine(refuel(endMission(answerCall(opened.missions), {playDay: round * 3}), 6), 1200);
  }
  assert.deepEqual(kinds, ['fire', 'fire', 'fire']);
});

check('the course is a seeded pick among those that can burn', () => {
  const two = {fire: ['tremblant-woods', 'panorama-ridge']};
  const picks = new Set();
  for (let k = 0; k < 40; k++) picks.add(openCall(refuel(armedFor('p' + k), 6), {playDay: 1, conditions: two}).call.courseId);
  assert.deepEqual([...picks].sort(), ['panorama-ridge', 'tremblant-woods']);
  const full = refuel(armedFor(), 6);
  assert.deepEqual(openCall(full, {playDay: 1, conditions: two}), openCall(full, {playDay: 1, conditions: {fire: ['panorama-ridge', 'tremblant-woods']}}),
    'the order the courses are listed in does not matter');
});

check('no helper changes the record it was given', () => {
  const deepFreeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };
  const record = deepFreeze(refuel(armedFor(), 2));
  noteRefuel(record); runEngine(record, 5); callDue(record, {playDay: 1, conditions: canBurn}); callTime(record);
  const opened = openCall(deepFreeze(refuel(armedFor(), 6)), {playDay: 1, conditions: canBurn});
  answerCall(deepFreeze(opened.missions)); endMission(deepFreeze(opened.missions), {playDay: 1});
});

// Seasons (docs/HELI_FIRE.md section 3.6, Kyle 15 October 2026).
check('seasons turn every 12 play days, summer first', () => {
  assert.deepEqual(SEASONS, ['summer', 'autumn', 'winter', 'spring']);
  const at = day => seasonOf(day).name + ' ' + seasonOf(day).day;
  assert.deepEqual([0, 1, 12, 13, 24, 25, 36, 37, 48, 49].map(at),
    ['summer 1', 'summer 1', 'summer 12', 'autumn 1', 'autumn 12', 'winter 1', 'winter 12', 'spring 1', 'spring 12', 'summer 1']);
  assert.deepEqual(Object.fromEntries(SEASONS.map(name => [name, SEASON_WEIGHTS[name].fire])), {summer: 4, autumn: 2, winter: 0, spring: 1});
});

check('no forest fire call in winter; the count stands still until spring', () => {
  const full = refuel(armedFor(), 6);
  for (let day = 25; day <= 36; day++) {
    assert.equal(callDue(full, {playDay: day, conditions: canBurn}), false, 'winter day ' + day);
    assert.deepEqual(openCall(full, {playDay: day, conditions: canBurn}), {missions: full, call: null});
  }
  for (const day of [1, 13, 24, 37, 49]) assert.equal(callDue(full, {playDay: day, conditions: canBurn}), true, 'day ' + day);
});

check('refuels in winter do not count while fire is the only kind', () => {
  const start = armedFor();
  assert.equal(seasonOpen(25), false);
  assert.equal(seasonOpen(24), true);
  assert.equal(refuel(start, 6, {playDay: 30}).count, 0, 'winter: the count stands still');
  assert.equal(refuel(start, 2, {playDay: 37}).count, 2, 'spring: it counts again');
  assert.equal(refuel(start, 2).count, 2, 'no play day given: counts as before');
});

check('the weighted pick follows the season table', () => {
  // Summer: fire 4, hiker 2, hoist 1 (of 7). Kinds with weight 0 are never passed in.
  const kinds = ['fire', 'hiker', 'hoist'];
  assert.deepEqual([0, 3.99 / 7, 4 / 7, 5.99 / 7, 6 / 7, 0.999999].map(u => pickKind(kinds, 1, u)),
    ['fire', 'fire', 'hiker', 'hiker', 'hoist', 'hoist']);
  // Winter: hiker 1, hoist 1, supply 3 (fire weighs 0 and is filtered out before the pick).
  assert.deepEqual([0, 0.2, 0.4, 0.99].map(u => pickKind(['hiker', 'hoist', 'supply'], 25, u)), ['hiker', 'hoist', 'supply', 'supply']);
  assert.equal(pickKind(['fire'], 1, 0.999999999), 'fire');
});

check('the season pick takes one draw, so the course pick is unchanged', () => {
  const two = {fire: ['tremblant-woods', 'panorama-ridge']};
  for (let k = 0; k < 40; k++) {
    const full = refuel(armedFor('p' + k), 6), summer = openCall(full, {playDay: 1, conditions: two});
    assert.deepEqual(openCall(full, {playDay: 40, conditions: two}).call.courseId, summer.call.courseId, 'spring and summer pick the same course');
  }
});

const burningSave = playDay => {
  const opened = openCall(refuel(armedFor(), 6), {playDay: 20, conditions: canBurn});
  const heli = {...createHeli(), playDay: {last: '2026-11-10', count: playDay}, missions: answerCall(opened.missions),
    fire: {id: opened.call.id, courseId: 'tremblant-woods', seed: 77, startDay: 20, steps: 4, engineSeconds: 0,
      burning: [[525312, 75], [525313, 50]], burnt: [524800], damp: []}};
  return {credits: 300, heli: normalizeHeli(heli)};
};

check('the first snow puts a burning fire out: no pay, no loss, a scar, the mission ends', () => {
  const save = burningSave(25);
  assert(fireOf(save), 'the fire is burning before the snow');
  const result = fireOnNewDay(save, {enabled: true, world: null});
  assert.equal(result.snowed, true);
  assert.equal(result.courseId, 'tremblant-woods');
  assert.equal(fireOf(result.profile), null);
  assert.equal(result.profile.credits, 300, 'no pay');
  assert.deepEqual(result.profile.heli.burnt ?? {}, {}, 'the course is not lost');
  assert.deepEqual(result.profile.heli.scars.at(-1), {courseId: 'tremblant-woods', day: 25, cells: [524800, 525312, 525313]});
  const missions = missionsOf(result.profile);
  assert.equal(missions.call, null);
  assert.equal(missions.count, 0);
  assert.equal(missions.quiet.untilDay, 27);
  assert.equal(missions.firesOut, 0, 'not counted as put out');
  assert.equal(fireOnNewDay(burningSave(25), {enabled: false, world: null}).snowed, false, 'switch off: nothing');
  const autumn = burningSave(24);
  assert.equal(fireOnNewDay(autumn, {enabled: true, world: null}).snowed, false, 'autumn: the fire keeps burning');
});

check('the snow note shows that play day, however the day was noted', () => {
  // app.js may note the day before the visit, so the note comes from the save.
  const snowed = fireOnNewDay(burningSave(25), {enabled: true, world: null}).profile;
  const run = save => createFireRun({getSave: () => save, commit: r => r, emit: () => {}, world: () => null});
  assert.equal(run(snowed).season().note, 'The first snow put out the fire at Tremblant Woods.');
  assert.equal(run(snowed).season().name, 'winter');
  const nextDay = {...snowed, heli: {...snowed.heli, playDay: {last: '2026-11-11', count: 26}}};
  assert.equal(run(nextDay).season().note, null, 'only on the day it fell');
  assert.equal(run(burningSave(5)).season().note, null);
});

check('the board shows the season, and the first snow note on that visit', () => {
  const markup = dispatchBoardMarkup({season: {name: 'winter', day: 1, days: 12, note: 'The first snow put out the fire at Tremblant Woods.'}},
    {fire: {repairCost: 0}});
  assert.match(markup, /Winter, play day 1 of 12/);
  assert.match(markup, /The first snow put out the fire at Tremblant Woods\./);
  assert.doesNotMatch(dispatchBoardMarkup({season: {name: 'summer', day: 4, days: 12, note: null}}, {fire: null}), /Summer/,
    'fire switch off: no season line');
});

// ---- H4 Rescue (docs/HELI_RESCUE.md sections 3, 4.2 and 6) -----------------
const ROUTES = rescueConditions({summitRun: true});
const ALL = {fire: ['tremblant-woods', 'panorama-ridge'], ...ROUTES};
const RESCUE_ON = {rescue: true};

// What the engine gave before the rescue kinds joined it: a fingerprint of 60
// players over 5 rounds (the need, the call time, whether a call is due, the
// call and its seed, the record after each round), worked out from the
// engine as it stood at RESCUE-SAVE's merge. With the switch off, absent or
// false, it must not move.
function fireFingerprint(extra = {}) {
  const conditions = {fire: ['tremblant-woods', 'panorama-ridge']};
  const out = [];
  for (let k = 0; k < 60; k++) {
    let missions = armMissions(createMissions(), {date: '2026-10-' + String(1 + k % 28).padStart(2, '0'), playerName: 'player ' + k});
    for (let round = 0; round < 5; round++) {
      const day = 1 + round * 3 + k % 7;
      for (let n = 0; n < 7; n++) missions = noteRefuel(missions, {playDay: day, ...extra});
      const row = [missions.need, callTime(missions), callDue(missions, {playDay: day, conditions, ...extra})];
      const opened = openCall(missions, {playDay: day, conditions, ...extra});
      row.push(opened.call, opened.seed ?? 0);
      if (opened.call) missions = endMission(answerCall(opened.missions, extra), {playDay: day, ...extra});
      else missions = runEngine(missions, 1300);
      out.push(row, missions);
    }
  }
  return heliHash(JSON.stringify(out));
}
const FIRE_FINGERPRINT = 1254743498;

check('rescue switch off: every fire result and seeded draw is what it was', () => {
  assert.equal(fireFingerprint(), FIRE_FINGERPRINT, 'no switch given');
  assert.equal(fireFingerprint({rescue: false}), FIRE_FINGERPRINT, 'switch off');
  assert.deepEqual([...MISSION_KINDS], ['fire'], 'the save still lists only fire as an offered kind');
  const full = refuel(armedFor(), 6), withRows = {...ALL, fire: canBurn.fire};
  for (const day of [1, 13, 24, 37]) {
    assert.deepEqual(openCall(full, {playDay: day, conditions: withRows}), openCall(full, {playDay: day, conditions: canBurn}),
      'rescue rows in the conditions offer nothing while the switch is off, day ' + day);
  }
  assert.equal(callDue(full, {playDay: 25, conditions: ALL}), false, 'winter, switch off: still no call');
  assert.equal(seasonOpen(25), false);
});

check('rescue switch off: a stored rescue call is absent and never blocks a fire call', () => {
  const full = refuel(armedFor(), 6);
  for (const kind of RESCUE_KINDS) {
    const stored = {...full, call: {kind, id: kind + '-1', courseId: 'panorama-ridge', day: 3, answered: false, flights: 1}};
    assert.equal(callOf(stored), null, kind + ': not seen');
    assert.deepEqual(callOf(stored, RESCUE_ON), stored.call, kind + ': seen with the switch on');
    assert.equal(callDue(stored, {playDay: 4, conditions: canBurn}), true, kind + ': a fire call is still due');
    const opened = openCall(stored, {playDay: 4, conditions: canBurn});
    assert.equal(opened.call.kind, 'fire', kind + ': the fire call opens');
    assert.deepEqual(opened.missions.call, opened.call);
    assert.deepEqual(opened, openCall(full, {playDay: 4, conditions: canBurn}), kind + ': the same fire call as without the stored one');
    assert.equal(answerCall(stored), stored, kind + ': nothing to answer');
    assert.equal(noteRefuel({...stored, count: 0}, {}).count, 1, kind + ': a refuel still counts');
    assert.equal(noteCallFlight(stored), stored, kind + ': its flights do not count');
    assert.equal(callTaken(stored, {playDay: 99}), false);
    assert.equal(takeCall(stored, {playDay: 99}).missions, stored);
    const answeredStored = {...stored, call: {...stored.call, answered: true}};
    assert.equal(beginRescue(answeredStored), answeredStored, kind + ': no rescue begins');
    const inHand = {...full, rescue: {kind, id: kind + '-1', courseId: 'panorama-ridge', seed: 9, clockSeconds: 5, stage: 'fly', crates: [0, 0, 0], condition: 0}};
    assert.equal(rescueOf(inHand), null);
    assert.equal(callDue(inHand, {playDay: 4, conditions: canBurn}), true, kind + ': a stored rescue in hand does not block a fire call');
    assert.equal(tickRescue(inHand, 100).missions, inHand, 'the clock does not run');
  }
  // The same fire cycle over a record carrying the stored fields gives the same engine answers.
  const withStored = {...full, call: {kind: 'hiker', id: 'hiker-1', courseId: 'tremblant-woods', day: 1, answered: true},
    rescue: {kind: 'hiker', id: 'hiker-1', courseId: 'tremblant-woods', seed: 4, clockSeconds: 1, stage: 'fly', crates: [0, 0, 0], condition: 0}};
  const fireCall = openCall(withStored, {playDay: 4, conditions: canBurn});
  assert.equal(fireCall.call.id, openCall(full, {playDay: 4, conditions: canBurn}).call.id);
  const ended = endMission(answerCall(fireCall.missions), {playDay: 4});
  assert.equal(ended.last, 'fire');
  assert.equal(ended.call, null);
  assert.deepEqual(ended.rescue, withStored.rescue, 'the stored rescue is left alone for a build that has the switch on');
});

check('the season table holds the rescue rows of the packet', () => {
  const rows = kind => SEASONS.map(name => SEASON_WEIGHTS[name][kind]);
  assert.deepEqual(rows('fire'), [4, 2, 0, 1]);
  assert.deepEqual(rows('hiker'), [2, 2, 1, 2]);
  assert.deepEqual(rows('avalanche'), [0, 1, 3, 2]);
  assert.deepEqual(rows('hoist'), [1, 1, 1, 1]);
  assert.deepEqual(rows('supply'), [0, 1, 3, 1]);
  assert.deepEqual([...RESCUE_KINDS].sort(), ['avalanche', 'hiker', 'hoist', 'supply']);
  assert(RESCUE_KINDS.every(isRescueKind) && !isRescueKind('fire'));
});

check('rescue on: the kinds come by season, a kind with weight 0 never does', () => {
  const tally = day => {
    const counts = {};
    for (let k = 0; k < 600; k++) {
      const opened = openCall(refuel(armedFor('p' + k, '2026-10-' + String(1 + k % 28).padStart(2, '0')), 6), {playDay: day, conditions: ALL, ...RESCUE_ON});
      counts[opened.call.kind] = (counts[opened.call.kind] ?? 0) + 1;
    }
    return counts;
  };
  const summer = tally(1), winter = tally(25);
  assert.deepEqual(Object.keys(summer).sort(), ['fire', 'hiker', 'hoist'], 'summer: no avalanche, no supply');
  assert.deepEqual(Object.keys(winter).sort(), ['avalanche', 'hiker', 'hoist', 'supply'], 'winter: no fire');
  // Summer 4:2:1 of 7, winter 1:3:1:3 of 8 (hiker, avalanche, hoist, supply), each within 7 points.
  const near = (got, want) => Math.abs(got / 600 - want) < 0.07;
  assert(near(summer.fire, 4 / 7) && near(summer.hiker, 2 / 7) && near(summer.hoist, 1 / 7), JSON.stringify(summer));
  assert(near(winter.hiker, 1 / 8) && near(winter.avalanche, 3 / 8) && near(winter.hoist, 1 / 8) && near(winter.supply, 3 / 8), JSON.stringify(winter));
});

check('rescue on: winter is open, refuels count in winter and each kind picks a course it can happen on', () => {
  assert.equal(seasonOpen(25, RESCUE_ON), true);
  assert.equal(refuel(armedFor(), 6, {playDay: 30, ...RESCUE_ON}).count, armedFor().need, 'winter refuels count with rescues');
  assert.equal(refuel(armedFor(), 6, {playDay: 30}).count, 0, 'and not without');
  const seen = {};
  for (let k = 0; k < 400; k++) {
    const day = 1 + (k % 4) * 12;
    const {call} = openCall(refuel(armedFor('p' + k, '2026-10-' + String(1 + k % 28).padStart(2, '0')), 6), {playDay: day, conditions: ALL, ...RESCUE_ON});
    assert(ALL[call.kind].includes(call.courseId), call.kind + ' at ' + call.courseId);
    (seen[call.kind] ??= new Set()).add(call.courseId);
  }
  assert.deepEqual([...seen.hiker].sort(), ['panorama-ridge', 'tremblant-woods']);
  assert.deepEqual([...seen.avalanche].sort(), ['summit-run', 'tremblant-snow']);
  assert.deepEqual([...seen.hoist], ['panorama-ridge']);
  assert.deepEqual([...seen.supply], ['summit-run']);
});

check('where each kind happens, with and without Summit Run', () => {
  assert.deepEqual(rescueConditions(), {hiker: ['tremblant-woods', 'panorama-ridge'], avalanche: ['tremblant-snow'],
    hoist: ['panorama-ridge'], supply: ['tremblant-snow']});
  assert.deepEqual(rescueConditions({summitRun: true}), {hiker: ['tremblant-woods', 'panorama-ridge'],
    avalanche: ['tremblant-snow', 'summit-run'], hoist: ['panorama-ridge'], supply: ['summit-run']});
  assert.deepEqual(rescueConditions({summitRun: false}), rescueConditions());
});

check('rescue on: a call is the same for the same save, and the same kind may come again', () => {
  const full = refuel(armedFor(), 6);
  assert.deepEqual(openCall(full, {playDay: 3, conditions: ALL, ...RESCUE_ON}), openCall(full, {playDay: 3, conditions: ALL, ...RESCUE_ON}));
  let repeats = 0;
  for (let k = 0; k < 80 && !repeats; k++) {
    let missions = refuel(armedFor('r' + k), 6), last = null;
    for (let round = 0; round < 4; round++) {
      const opened = openCall(missions, {playDay: 25 + round * 3, conditions: ALL, ...RESCUE_ON});
      if (opened.call.kind === last) repeats++;
      last = opened.call.kind;
      missions = runEngine(refuel(endMission(answerCall(opened.missions, RESCUE_ON), {playDay: 25 + round * 3, ...RESCUE_ON}), 6, RESCUE_ON), 1200);
    }
  }
  assert(repeats > 0, 'the same kind came twice in a row');
  const opened = openCall(full, {playDay: 3, conditions: ALL, ...RESCUE_ON});
  assert.equal(opened.call.id, `${opened.call.kind}-${full.draws}`);
  assert.equal(opened.seed, heliHash(full.seed, opened.call.kind, full.draws));
  assert.deepEqual(clean(opened.missions), opened.missions, 'a waiting rescue call survives the save');
  assert.equal(callDue(opened.missions, {playDay: 3, conditions: ALL, ...RESCUE_ON}), false, 'one at a time');
  assert.equal(openCall(opened.missions, {playDay: 3, conditions: ALL, ...RESCUE_ON}).call, null, 'a second ring never reopens it');
});

check('the quiet spell holds after every kind: no call that play day or the next, nor within 20 minutes of engine time', () => {
  for (const kind of ['fire', ...RESCUE_KINDS]) {
    const call = {kind, id: kind + '-1', courseId: ALL[kind][0], day: 10, answered: true};
    let after = refuel(endMission({...refuel(armedFor(), 6), call}, {playDay: 10, ...RESCUE_ON}), 6, RESCUE_ON);
    assert.deepEqual([after.call, after.last, after.quiet], [null, kind, {untilDay: 12, engineSeconds: 1200}], kind);
    assert.equal(callDue(after, {playDay: 11, conditions: ALL, ...RESCUE_ON}), false, kind + ': not the next play day');
    assert.equal(callDue(after, {playDay: 12, conditions: ALL, ...RESCUE_ON}), false, kind + ': not before 20 minutes of engine time');
    after = runEngine(after, 1200);
    assert.equal(callDue(after, {playDay: 11, conditions: ALL, ...RESCUE_ON}), false, kind);
    assert.equal(callDue(after, {playDay: 12, conditions: ALL, ...RESCUE_ON}), true, kind + ': then a call is due');
  }
});

const waiting = (kind = 'hiker', extra = {}) => ({...refuel(armedFor(), 6), call: {kind, id: kind + '-1', courseId: ALL[kind][0], day: 10, answered: false, ...extra}});

check('a waiting rescue call goes to another crew after the next play day, or after 2 flights', () => {
  assert.deepEqual({...CALL_WAIT}, {days: 1, flights: 2});
  const m = waiting();
  assert.equal(callTaken(m, {playDay: 10, ...RESCUE_ON}), false, 'the day it came');
  assert.equal(callTaken(m, {playDay: 11, ...RESCUE_ON}), false, 'the next play day is still its day');
  assert.equal(callTaken(m, {playDay: 12, ...RESCUE_ON}), true, 'the next play day has ended');
  let flown = noteCallFlight(m, RESCUE_ON);
  assert.equal(flown.call.flights, 1);
  assert.equal(callTaken(flown, {playDay: 10, ...RESCUE_ON}), false, 'one flight is not enough');
  flown = noteCallFlight(flown, RESCUE_ON);
  assert.equal(flown.call.flights, 2);
  assert.equal(callTaken(flown, {playDay: 10, ...RESCUE_ON}), true, '2 flights: whichever comes first');
  assert.equal(callTaken({...m, call: {...m.call, flights: 1}}, {playDay: 11, ...RESCUE_ON}), false);
  assert.deepEqual(clean(flown), flown, 'the flights survive the save');
  for (const kind of RESCUE_KINDS) assert.equal(callTaken(waiting(kind), {playDay: 12, ...RESCUE_ON}), true, kind);
  assert.equal(callTaken(waiting('hiker', {answered: true}), {playDay: 40, ...RESCUE_ON}), false, 'an answered call is not given away');
  assert.equal(callTaken(waiting('fire'), {playDay: 40, ...RESCUE_ON}), false, 'a fire waits and grows');
  assert.equal(noteCallFlight(waiting('fire'), RESCUE_ON).call.flights, undefined, 'fire flights are not counted');
  assert.equal(noteCallFlight(waiting('hiker', {answered: true}), RESCUE_ON).call.flights, undefined);
});

check('a call taken by another crew: no pay, no charge, a quiet spell as if it had ended, Roger says so', () => {
  const m = waiting('avalanche', {flights: 2});
  const result = takeCall(m, {playDay: 10, ...RESCUE_ON});
  assert.equal(result.taken, 'avalanche');
  assert.equal(result.line, 'heli.radio.rescue.taken');
  assert(HELI_RADIO_LINES[result.line], 'the line exists');
  assert.deepEqual([result.missions.call, result.missions.count, result.missions.last, result.missions.quiet], [null, 0, 'avalanche', {untilDay: 12, engineSeconds: 1200}]);
  assert(result.missions.need >= 3 && result.missions.need <= 6);
  const same = takeCall(waiting(), {playDay: 11, ...RESCUE_ON});
  assert.deepEqual([same.taken, same.line], [null, null]);
  assert.equal(same.missions.call.kind, 'hiker');
});

check('the clocks: 15, 12, 15 and 31 minutes, in one table', () => {
  assert.deepEqual({...RESCUE_CLOCKS}, {hiker: 900, avalanche: 720, hoist: 900, supply: 1860});
  assert.deepEqual([...CASUALTY_KINDS], ['hiker', 'avalanche', 'hoist']);
  assert.equal(DUSK_SECONDS, 180);
  assert.equal(rescueLimit('hiker'), 900);
  assert.equal(rescueLimit('fire'), 0);
});

const answeredCall = kind => ({...refuel(armedFor(), 6), call: {kind, id: kind + '-1', courseId: ALL[kind][0], day: 10, answered: true}});

check('answering a rescue starts its record: the call is the id and place, the clock at 0, unhurt', () => {
  for (const kind of RESCUE_KINDS) {
    const m = answeredCall(kind), begun = beginRescue(m, RESCUE_ON);
    assert.deepEqual(begun.rescue, {kind, id: kind + '-1', courseId: ALL[kind][0], seed: heliHash(m.seed, kind, m.draws),
      clockSeconds: 0, stage: 'fly', crates: [0, 0, 0], condition: 0}, kind);
    assert.deepEqual(clean(begun), begun, kind + ': survives the save');
    assert.equal(beginRescue(begun, RESCUE_ON), begun, 'once only');
    assert.equal(beginRescue(m), m, 'switch off: nothing');
  }
  const unanswered = waiting();
  assert.equal(beginRescue(unanswered, RESCUE_ON), unanswered, 'not before it is answered');
  assert.equal(beginRescue(answeredCall('fire'), RESCUE_ON).rescue, undefined, 'a fire is not a rescue');
  const opened = openCall(refuel(armedFor(), 6), {playDay: 3, conditions: ALL, ...RESCUE_ON});
  assert.equal(beginRescue(answerCall(opened.missions, RESCUE_ON), RESCUE_ON).rescue.seed, opened.seed, 'the seed openCall handed out');
  assert.equal(rescueOf(beginRescue(answeredCall('hoist'), RESCUE_ON), RESCUE_ON).kind, 'hoist');
});

check('the clock runs in the air, on the ground and through a cruise leg, the same for a frame at a time', () => {
  const start = beginRescue(answeredCall('avalanche'), RESCUE_ON);
  const chunk = tickRescue(start, 300, RESCUE_ON);
  assert.equal(chunk.missions.rescue.clockSeconds, 300, 'a cruise leg adds its flying time at once');
  let framed = start;
  for (let n = 0; n < 300 * 120; n++) framed = tickRescue(framed, 1 / 120, RESCUE_ON).missions;
  assert(Math.abs(framed.rescue.clockSeconds - 300) < 1e-6, 'a frame at a time: ' + framed.rescue.clockSeconds);
  assert.equal(clockLeft(chunk.missions.rescue), 420);
  assert.equal(tickRescue(start, 0, RESCUE_ON).missions, start);
  assert.equal(tickRescue(start, -5, RESCUE_ON).missions, start);
  assert.equal(tickRescue(start, 10).missions, start, 'switch off: it does not run');
  assert.equal(tickRescue(answeredCall('hiker'), 10, RESCUE_ON).missions.rescue, undefined, 'no rescue in hand');
  assert.deepEqual(clean(chunk.missions).rescue.clockSeconds, 300);
});

check('getting cold: an unhurt casualty is hurt at two thirds of the clock, once; a supply run has none', () => {
  for (const kind of CASUALTY_KINDS) {
    const limit = RESCUE_CLOCKS[kind], start = beginRescue(answeredCall(kind), RESCUE_ON);
    const early = tickRescue(start, limit * 2 / 3 - 0.5, RESCUE_ON);
    assert.deepEqual([early.cold, early.missions.rescue.condition, early.expired], [false, 0, false], kind);
    const cold = tickRescue(early.missions, 1, RESCUE_ON);
    assert.deepEqual([cold.cold, cold.missions.rescue.condition], [true, 1], kind + ': cold at two thirds');
    const again = tickRescue(cold.missions, 5, RESCUE_ON);
    assert.deepEqual([again.cold, again.missions.rescue.condition], [false, 1], kind + ': once only');
    const hurt = {...early.missions, rescue: {...early.missions.rescue, condition: 1}}, hurtLater = tickRescue(hurt, 5, RESCUE_ON);
    assert.deepEqual([hurtLater.cold, hurtLater.missions.rescue.condition], [false, 1], 'already hurt: no new line');
    const badly = {...early.missions, rescue: {...early.missions.rescue, condition: 2}};
    assert.equal(tickRescue(badly, 50, RESCUE_ON).missions.rescue.condition, 2, 'never better, never past badly hurt');
  }
  const supply = beginRescue(answeredCall('supply'), RESCUE_ON), late = tickRescue(supply, 1400, RESCUE_ON);
  assert.deepEqual([late.cold, late.missions.rescue.condition, late.expired], [false, 0, false], 'nobody to get cold');
});

check('out of time: the clock stops at its limit and says so', () => {
  for (const kind of RESCUE_KINDS) {
    // The limit is the row of the course the call is at (Summit Run has its own rows, RESCUE-SUMMIT-TUNE).
    const start = beginRescue(answeredCall(kind), RESCUE_ON), limit = rescueLimit(kind, null, ALL[kind][0]);
    assert.equal(tickRescue(start, limit - 1, RESCUE_ON).expired, false, kind);
    const done = tickRescue(start, limit + 100, RESCUE_ON);
    assert.deepEqual([done.expired, done.missions.rescue.clockSeconds, clockLeft(done.missions.rescue)], [true, limit, 0], kind);
    assert.equal(tickRescue(done.missions, 5, RESCUE_ON).expired, true, kind + ': stays expired');
  }
});

check('the hiker\'s light dims over the last 3 minutes; other kinds do not dim', () => {
  const start = beginRescue(answeredCall('hiker'), RESCUE_ON).rescue;
  const at = seconds => duskOf({...start, clockSeconds: seconds});
  assert.deepEqual([at(0), at(719), at(720), at(810), at(900)], [0, 0, 0, 0.5, 1]);
  assert.equal(duskOf({...start, kind: 'avalanche', clockSeconds: 700}), 0);
});

const cash = (credits, {kind = 'hiker', playDay = 12, counts = {}, condition = 0, stage = 'carry', crates = [0, 0, 0]} = {}) => {
  const m = beginRescue(answeredCall(kind), RESCUE_ON);
  const missions = {...m, ...counts, rescue: {...m.rescue, condition, stage, crates}};
  return {credits, heli: normalizeHeli({...createHeli(), playDay: {last: '2026-11-10', count: playDay}, missions})};
};

check('the failure cost is one table: 400 credits, 200 for a supply run, the tally down one', () => {
  assert.deepEqual({...RESCUE_MONEY, basePay: {...RESCUE_MONEY.basePay}},
    {basePay: {hiker: 2650, avalanche: 3000, hoist: 3000}, failureCharge: 400, supplyFailureCharge: 200, tallyGain: 1, tallyDrop: 1});
  assert.deepEqual({...RESCUE_TALLY}, {hiker: 'searches', avalanche: 'searches', hoist: 'hoists', supply: 'supplies'});
  assert.deepEqual([...FAIL_REASONS], ['time', 'crash', 'left']);
});

check('a failed rescue: badly hurt, no pay, 400 taken by the repair rule, the tally down one', () => {
  const counts = {searches: 4, hoists: 2, supplies: 3, rescued: 6};
  for (const [kind, tally] of Object.entries(RESCUE_TALLY)) {
    for (const reason of FAIL_REASONS) {
      const save = cash(1000, {kind, counts});
      const result = failRescue(save, {reason, enabled: true});
      assert(result.ok, kind + ' ' + reason);
      assert.equal(result.condition, 2, 'badly hurt');
      const want = kind === 'supply' ? 200 : 400;
      assert.deepEqual([result.charged, result.forgiven, result.profile.credits], [want, 0, 1000 - want], kind + ' ' + reason);
      const missions = missionsOf(result.profile);
      assert.equal(missions[tally], counts[tally] - 1, kind + ': ' + tally + ' down one');
      for (const other of Object.keys(counts).filter(name => name !== tally)) assert.equal(missions[other], counts[other], other + ' unchanged');
      assert.deepEqual([missions.call, missions.rescue, missions.last, missions.count, missions.quiet],
        [null, null, kind, 0, {untilDay: 14, engineSeconds: 1200}], 'the mission ends with its quiet spell');
      assert.equal(result.crashRepair, reason === 'crash', 'only a crash also takes H1\'s crash repair');
      assert.equal(result.line, kind === 'supply' ? 'heli.radio.supply.late' : 'heli.radio.rescue.late');
      assert(HELI_RADIO_LINES[result.line]);
      assert.equal(missions.badges.includes('rescue'), false);
      assert.equal(missions.wreck, undefined, 'no car left on the slope after a failure');
    }
  }
  const stored = failRescue(cash(1000), {enabled: true}).profile.heli.missions;
  assert.deepEqual(clean(stored), stored, 'the failed record survives the save');
});

check('a failed rescue takes what the player has and forgives the rest; the tally never goes below zero', () => {
  const poor = failRescue(cash(150), {enabled: true});
  assert.deepEqual([poor.charged, poor.forgiven, poor.profile.credits], [150, 250, 0]);
  const broke = failRescue(cash(0), {enabled: true});
  assert.deepEqual([broke.charged, broke.forgiven, broke.profile.credits], [0, 400, 0]);
  assert.equal(failRescue(cash(1000, {kind: 'hoist', counts: {hoists: 0}}), {enabled: true}).profile.heli.missions.hoists, 0, 'zero stays zero');
  assert.equal(Object.hasOwn(failRescue(cash(1000, {kind: 'hoist'}), {enabled: true}).profile.heli.missions, 'hoists'), false, 'an absent tally stays absent');
  const supplyShort = failRescue(cash(100, {kind: 'supply', counts: {supplies: 1}}), {enabled: true});
  assert.deepEqual([supplyShort.charged, supplyShort.forgiven, supplyShort.profile.credits], [100, 100, 0]);
});

check('a supply run that runs out of time pays for the crates down, costs 200 and drops its tally', () => {
  const save = cash(500, {kind: 'supply', counts: {supplies: 2}, crates: [2, 1, 0]});
  const result = failRescue(save, {reason: 'time', cratePay: 300, enabled: true});
  assert.deepEqual([result.cratePaid, result.charged, result.profile.credits], [300, 200, 600], '500 + 300 - 200');
  assert.equal(missionsOf(result.profile).supplies, 1);
  const none = failRescue(cash(500, {kind: 'supply', counts: {supplies: 2}}), {enabled: true});
  assert.deepEqual([none.cratePaid, none.profile.credits], [0, 300]);
  const people = failRescue(cash(500, {kind: 'hiker', counts: {searches: 2}}), {cratePay: 300, enabled: true});
  assert.deepEqual([people.cratePaid, people.profile.credits], [0, 100], 'crate pay is for a supply run only');
});

check('a failure that cannot happen changes nothing', () => {
  const save = cash(1000);
  assert.equal(failRescue(save, {enabled: false}).ok, false);
  assert.equal(failRescue(save, {enabled: false}).profile, save);
  assert.equal(failRescue(save).profile, save, 'switch off by default');
  assert.equal(failRescue(save, {reason: 'sleep', enabled: true}).ok, false);
  assert.equal(failRescue(save, {cratePay: -1, enabled: true}).ok, false);
  assert.equal(failRescue(save, {cratePay: 1.5, enabled: true}).ok, false);
  const none = {credits: 1000, heli: normalizeHeli({...createHeli(), missions: refuel(armedFor(), 6)})};
  const result = failRescue(none, {enabled: true});
  assert.equal(result.ok, false);
  assert.equal(result.profile, none, 'no rescue in hand');
});

check('a rescue done: the pay, the tally up one, the people counted, the rescue badge once, the mission over', () => {
  // HELI-PAY-CONTINUE: the bases are 2,650 (hiker) and 3,000 (avalanche, hoist), was 1,000 and 1,200; the shares are the same.
  assert.deepEqual([0, 1, 2].map(c => peoplePay({kind: 'hiker', condition: c})), [2650, 1590, 663]);
  assert.deepEqual([0, 1, 2].map(c => peoplePay({kind: 'avalanche', condition: c})), [3000, 1800, 750]);
  assert.deepEqual([0, 1, 2].map(c => peoplePay({kind: 'hoist', condition: c})), [3000, 1800, 750]);
  assert.equal(peoplePay({kind: 'supply', condition: 0}), 0, 'a supply run is paid by crate');
  const first = finishRescue(cash(100, {kind: 'avalanche', condition: 1, playDay: 8}), {pay: 720, enabled: true});
  assert.deepEqual([first.ok, first.paid, first.profile.credits, first.firstBadge, first.rescued], [true, 720, 820, true, 1]);
  const m = missionsOf(first.profile);
  assert.deepEqual([m.searches, m.rescued, m.badges, m.call, m.rescue, m.last, m.quiet],
    [1, 1, ['rescue'], null, null, 'avalanche', {untilDay: 10, engineSeconds: 1200}]);
  assert.equal(m.wreck, undefined);
  const second = finishRescue(cash(0, {kind: 'hiker', counts: {searches: 4, rescued: 4, badges: ['rescue']}}), {pay: 1000, enabled: true});
  assert.deepEqual([missionsOf(second.profile).searches, missionsOf(second.profile).rescued, second.firstBadge], [5, 5, false]);
  assert.deepEqual(missionsOf(second.profile).badges, ['rescue'], 'the badge is given once');
  const supply = finishRescue(cash(0, {kind: 'supply', counts: {supplies: 4, rescued: 4}}), {pay: 1000, enabled: true});
  assert.deepEqual([missionsOf(supply.profile).supplies, missionsOf(supply.profile).rescued, supply.firstBadge, missionsOf(supply.profile).badges], [5, 4, false, []],
    'a supply run counts for supplies, not people, and gives no rescue badge');
  assert.equal(finishRescue(cash(999_999_900, {kind: 'hiker'}), {pay: 1000, enabled: true}).profile.credits, 1_000_000_000, 'capped like every credit change');
  assert.equal(finishRescue(cash(10, {kind: 'hiker'}), {pay: 1000, enabled: false}).ok, false);
  assert.equal(finishRescue(cash(10, {kind: 'hiker'}), {pay: -5, enabled: true}).ok, false);
  assert.equal(finishRescue(cash(10, {kind: 'hiker'}), {pay: 1.5, enabled: true}).ok, false);
  assert.equal(finishRescue({credits: 10, heli: createHeli()}, {pay: 5, enabled: true}).ok, false);
});

check('a hoist rescue leaves the driver\'s car for the recovery job, the same car for the same rescue', () => {
  const save = cash(0, {kind: 'hoist', playDay: 20});
  const done = finishRescue(save, {pay: 1200, site: {x: -120.46, z: 880.04}, enabled: true});
  const wreck = done.wreck;
  assert.deepEqual([wreck.courseId, wreck.x, wreck.z, wreck.day], ['panorama-ridge', -120.5, 880, 20]);
  assert(JOB_CARS.includes(wreck.carId) && !AIR_ONLY_CARS.includes(wreck.carId), 'a customer car Kestrel One can lift');
  assert.deepEqual(finishRescue(save, {pay: 1200, site: {x: -120.46, z: 880.04}, enabled: true}).wreck, wreck);
  const cars = new Set();
  for (let k = 0; k < 40; k++) {
    const other = cash(0, {kind: 'hoist'});
    other.heli.missions.rescue.seed = k * 7919;
    cars.add(finishRescue(other, {pay: 0, site: {x: 1, z: 2}, enabled: true}).wreck.carId);
  }
  assert(cars.size >= 3, 'different rescues leave different cars');
  assert.equal(finishRescue(save, {pay: 1200, enabled: true}).wreck, null, 'no site, no car');
  assert.equal(finishRescue(cash(0, {kind: 'avalanche'}), {pay: 0, site: {x: 1, z: 2}, enabled: true}).wreck, null, 'only a hoist leaves a car');
  assert.deepEqual(clean(done.profile.heli.missions), done.profile.heli.missions);
});

check('leaving the helicopter with a rescue in hand is the same failure as running out of time', () => {
  const save = cash(1000, {kind: 'hoist', counts: {hoists: 3}});
  const left = failRescue(save, {reason: 'left', enabled: true}), late = failRescue(save, {reason: 'time', enabled: true});
  assert.deepEqual(left.profile, late.profile);
  assert.deepEqual([left.charged, left.condition, left.crashRepair], [400, 2, false]);
});

check('no rescue helper changes the record it was given', () => {
  const deepFreeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };
  const answered = deepFreeze(answeredCall('supply')), begun = deepFreeze(beginRescue(answeredCall('supply'), RESCUE_ON));
  callOf(answered, RESCUE_ON); beginRescue(answered, RESCUE_ON); tickRescue(begun, 100, RESCUE_ON); noteCallFlight(deepFreeze(waiting()), RESCUE_ON);
  takeCall(deepFreeze(waiting()), {playDay: 99, ...RESCUE_ON}); endMission(begun, {playDay: 3, ...RESCUE_ON});
  failRescue(deepFreeze(cash(500, {kind: 'supply'})), {cratePay: 300, enabled: true});
  finishRescue(deepFreeze(cash(500, {kind: 'hoist'})), {pay: 100, site: {x: 1, z: 2}, enabled: true});
});

console.log(`Heli missions: ${checks} groups passed.`);
