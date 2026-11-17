import assert from 'node:assert/strict';
import {BRAND_RULE, brandPay, brandSentence} from '../src/world/jobs/brand-rule.js';
import {stepOnFoot} from '../src/world/jobs/steps/onfoot.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';

// Rule snapshots, never a walking driver. The real layout and opponents follow
// in later rounds; these checks cover the brand and the lamp-lighting action.
const hearth = {id: 'hearth', position: {x: 0, y: 0, z: 0}};
const places = ['pump', 'tower', 'far'].map((id, index) =>
  ({id, position: {x: 60 + index * 40, y: 0, z: 0}}));
const step = {kind: 'onfoot', brand: true, hearth, places};
const foot = (x, extras = {}) => ({onFoot: true,
  fighter: {position: {x, y: 0, z: 0}}, ...extras});
const tick = (state, view, dt = 0) => stepOnFoot(step, state, view, dt);

// Job 2.2: a car cannot take a brand; the hearth's boundary is inclusive.
assert.equal(tick({}, {onFoot: false, player: hearth}).state.brandsUsed, 0);
assert.equal(tick({}, foot(3.01)).state.brandsUsed, 0);
const taken = tick({}, foot(3));
assert.equal(taken.state.brandsUsed, 1);
assert.equal(taken.state.brandSeconds, BRAND_RULE.burnSeconds);
assert.deepEqual(taken.events, [{type: 'brandCatch', id: 'hearth'}]);
assert.equal(tick(taken.state, foot(10), 89).state.brandSeconds, 1);
const expired = tick(taken.state, foot(10), 90);
assert.equal(expired.state.brandSeconds, 0);
assert.deepEqual(expired.events, [{type: 'brandOut'}]);
assert.deepEqual(tick(expired.state, foot(10), 1).events, []);
assert.equal(tick(expired.state, foot(0)).state.brandsUsed, 2);
const refreshed = tick({...taken.state, brandSeconds: 20}, foot(0));
assert.equal(refreshed.state.brandSeconds, 90);
assert.equal(refreshed.state.brandsUsed, 1);
assert.equal(tick(taken.state, {onFoot: false}, 30).state.brandSeconds, 90);
const ashed = tick(taken.state, foot(10, {brandAshed: true}));
assert.equal(ashed.state.brandSeconds, 0);
assert.equal(tick(ashed.state, foot(0)).state.brandsUsed, 2);

// Job 2.3: two continuous seconds, any order, burning brand required.
let lighting = tick(taken.state, foot(100), 1);
assert.equal(lighting.complete, false);
assert.equal(lighting.state.lamps.tower, undefined);
assert.equal(tick(lighting.state, foot(103), 1).state.lightingSeconds, 0);
assert.equal(tick(expired.state, foot(100), 2).state.lamps.tower, undefined);
lighting = tick(lighting.state, foot(100), 1);
assert.equal(lighting.state.lamps.tower, true);
assert.equal(lighting.state.lastLamp, 'tower');
assert.equal(lighting.state.lamps.pump, undefined);
const relit = tick({...lighting.state, brandSeconds: 0}, foot(103));
assert.equal(relit.state.brandSeconds, 90);
assert.equal(relit.state.brandsUsed, 2);
assert.equal(tick({...lighting.state, brandSeconds: 0}, foot(103.01)).state.brandSeconds, 0);
assert.equal(tick(taken.state, foot(62), 2).state.lamps.pump, true);
assert.equal(tick(taken.state, foot(62.01), 2).state.lamps.pump, undefined);
assert.equal(tick(taken.state, {onFoot: true, fighter: {
  position: places[0].position, speed: 4.5}}, 2).state.lamps.pump, undefined);

// Job 2.4/5 foundations: a smothered lamp can be lit again; recovery preserves
// lamps and uses the last lamp on Easy, the hearth on other difficulties.
const smothered = tick(lighting.state, foot(10, {smotheredLamps: ['tower']}));
assert.equal(smothered.state.lamps.tower, false);
assert.equal(lighting.state.lamps.tower, true, 'do not mutate the previous state');
assert.equal(tick(smothered.state, foot(100), 2).state.lamps.tower, true);
const down = {onFoot: true, difficulty: 'easy', fighter: {knockedDown: true}};
const recovered = tick(lighting.state, down);
assert.equal(recovered.requests[0].place.id, 'tower');
assert.equal(recovered.state.lamps.tower, true);
assert.equal(recovered.state.brandsUsed, 2);
assert.equal(tick(recovered.state, down).requests.length, 0);
assert.equal(tick(lighting.state, {...down, difficulty: 'medium'}).requests[0].place.id, 'hearth');

// Job 2.6: time starts with the first brand, continues in the car and caps at dusk.
assert.equal(tick({}, foot(10), 100).state.dusk, 0);
assert.equal(tick(taken.state, {onFoot: false}, 120).state.dusk, .5);
assert.equal(tick(taken.state, {onFoot: false}, 240).state.dusk, 1);
assert.equal(tick(taken.state, {onFoot: false}, 300).state.dusk, 1);

// Job 2.7 foundations: all lamps must be lit at once, with the designed pay.
const all = {...taken.state, lamps: {pump: true, tower: true, far: true}};
assert.equal(tick(all, foot(10)).complete, true);
assert.equal(tick(all, foot(10, {smotheredLamps: ['pump']})).complete, false);
assert.equal(brandPay(1), 100);
assert.equal(brandPay(2), 70);
assert.equal(brandPay(3), 50);
assert.equal(brandPay(9), 50);
assert.equal(brandSentence(1), 'You lit the town with one brand.');
assert.equal(brandSentence(2), 'You lit the town with two brands.');
assert.equal(brandSentence(3), 'You lit the town with 3 brands.');

// The existing job engine dispatches the new rule without a second fighter.
let job = createJob({id: 'brand-rule-check', steps: [step]});
job = stepJob(job, foot(0), 0);
assert.equal(job.stepState.brandsUsed, 1);
for (const lamp of places) job = stepJob(job, foot(lamp.position.x), 2);
assert.equal(job.done, true);
assert(job.events.some(event => event.type === 'done'));
console.log('PASS Light the Town: brand, lamp lighting, recovery requests, dusk and pay.');
