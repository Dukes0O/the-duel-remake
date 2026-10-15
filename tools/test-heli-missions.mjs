// The mission engine (docs/HELI_FIRE.md section 3).
import assert from 'node:assert/strict';
import {MISSION_RULES, createMissions, armed, armMissions, noteRefuel, runEngine, inQuietSpell, callDue, callTime,
  openCall, answerCall, endMission, createCallClock, tickCallClock} from '../src/heli/heli-missions.js';
import {normalizeHeli} from '../src/heli/heli-save.js';

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
  assert.equal(callDue(after, {playDay: 30, conditions: canBurn}), false);
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

console.log(`Heli missions: ${checks} groups passed.`);
