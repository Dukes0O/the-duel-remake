import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {SECRETS, secretOf, secretHint} from '../src/bowl/bowl-secrets.js';

const DT = 1/120;
const neutral = {throttle:0, brake:0, steer:0, boost:false};
const keyed = key => ({...neutral, throttle: +(key === 'Up'), brake: +(key === 'Down'),
  steer: key === 'Right' ? 1 : key === 'Left' ? -1 : 0});
function drive(id, schedule, {full = false, seed = 1989, repeat = false, control = false} = {}) {
  const duel = new Duel({seed});
  duel.featureFlags = {enabled: key => key === 'titan-bowl'};
  duel.startBowlNight({night:1, eventIndex:1, cpuDifficulty:'easy', playerId:'driver', seed});
  const s = duel.state, ramp = duel.course.features.ramps.find(r => r.id === id);
  const events = [], trace = [];
  duel.onChange((_, ev) => events.push(ev));
  s.status = 'racing';
  if (full) {
    if (control) duel.featureFlags = {enabled: () => false};
    for (let go = 0; go < (repeat ? 2 : 1); go++) for (const key of secretOf('fullWorks').code) {
      duel.setInput(keyed(key)); duel.step(DT);
      duel.setInput(neutral); duel.step(DT);
    }
  }
  duel.featureFlags = {enabled: key => key === 'titan-bowl'};
  Object.assign(s, {s: ramp.start - 2, prevS: ramp.start - 2, lateral: ramp.off, prevLateral: ramp.off,
    headingError:0, speedMph:60, gear:2});
  let air = 0;
  for (let i=0; i<650; i++) {
    duel.setInput(s.airborne ? keyed(schedule.get(++air)) : neutral);
    duel.step(DT);
    if (s.airborne) trace.push([s.s, s.lateral, s.airHeight, s.speedMph]);
    else if (air) break;
  }
  assert.ok(air > 0, 'the floor launched the car');
  return {events, trace, state:s};
}
const taps = code => new Map(code.map((key,i) => [3 + 30*i, key]));
const plain = drive('big-jump', new Map());
for (const secret of SECRETS) {
  const full = secret.id === 'fullWorks';
  const schedule = full ? new Map() : taps(secret.code.length ? secret.code : ['Up','Down']);
  const result = drive('big-jump', schedule, {full, repeat:true});
  const scored = result.events.find(ev => ev.bowlTrick?.kind === secret.id)?.bowlTrick;
  assert.equal(scored?.points, secret.points, secret.name);
  assert.equal(scored.landing, 'clean');
  assert.equal(result.events.filter(ev => ev.bowlSecretFound?.kind === secret.id).length, 1);
  assert.equal(result.state.bowlNight.event.crowd, 100);
  const baseline = full ? drive('big-jump',new Map(),{full:true,repeat:true,control:true}) : plain;
  assert.deepEqual([result.state.s,result.state.lateral],[baseline.state.s,baseline.state.lateral]);
  assert.deepEqual(result.trace, baseline.trace, secret.name + ' preserves flight');
  if (full) assert.equal(result.events.filter(ev => ev.bowlSecretArmed).length, 1);
  else if (secret.code.length) {
    const kicker = drive('jump-kicker', schedule);
    assert.ok(!kicker.events.some(ev => ev.bowlSecretFound || ev.bowlTrick?.kind === 'slam'), secret.name + ' on a kicker');
  }
}
assert.equal(secretHint(33,SECRETS.filter(t=>t.id!=='yoYo').map(t=>t.id)),'Front flip then ?');
assert.equal(secretHint(33,SECRETS.map(t=>t.id)),'');
let wins = 0;
for (let seed=1; seed<=10; seed++) {
  const rng = makeRng(seed), schedule = new Map();
  let t = rng.range(.1,.4);
  for (const key of secretOf('corkscrew').code) { schedule.set(Math.round(t/DT),key); t += rng.range(.15,.35); }
  if (drive('big-jump',schedule,{seed}).events.some(ev => ev.bowlTrick?.kind === 'corkscrew' && ev.bowlTrick.landing === 'clean')) wins++;
}
assert.ok(wins>=8, 'child Corkscrew: ' + wins + '/10');
assert.equal(secretHint(51,[]), secretHint(51,[]));
assert.equal(secretHint(51,[]).split(' ').filter(k=>k==='?').length,1);
console.log('Seven secret tricks landed; seeded child Corkscrews ' + wins + '/10.');
