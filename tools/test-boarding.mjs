import assert from 'node:assert/strict';
import {canBoardTarget, startBoarding, stepBoarding,
  computerBoardingAllowed} from '../src/crew-gear/boarding.js';

// Module acceptance first. Native event, render and audio hooks follow the
// Board re-slice; this checks the rule at the same 120 Hz step they will call.
const DT = 1 / 120, EPS = 1e-8;
let checks = 0;
function check(name, fn) {
  try {fn(); checks++;}
  catch (error) {console.error(`FAIL ${name}: ${error.stack}`); process.exitCode = 1;}
}
function fixture({mph = 30, crewId = 'jax', blockedSide = 0} = {}) {
  const rival = {s: 100, lateral: 0, prevS: 100, prevLateral: 0,
    speedMph: mph, armor: 100};
  const state = {mode: 'wasteland', status: 'racing', paused: false,
    onFoot: true, crewId, wastelandGateDiscovered: true, stageTimeSec: 0,
    fighter: {x: 0, y: 1.8, z: 100, s: 100, lateral: 0,
      groundY: 0, airHeight: 1.8, verticalSpeed: -3, yaw: 0},
    fighterInput: {fire: false}, opponents: [rival], traffic: [],
    crewGear: {grapple: null}, boarding: null};
  const course = {
    groundAt(s, lateral = 0) {return {x: lateral, y: 0, z: s, heading: 0};},
    nearest(x, z) {return {s: z, lateral: x};},
    roadHalfWidthAt() {return 4;},
    obstaclesNear() {return blockedSide ? [{x: blockedSide * 6, y: 0,
      z: 100, halfX: 2, halfZ: 5, height: 3, shape: 'box'}] : [];},
  };
  const events = [];
  const duel = {state, course, events, emit(e) {events.push(e);},
    _vehicleSpec() {return {height: 1.8, halfWidth: 1, halfLength: 2};},
    featureFlags: {enabled(name) {return name === 'crew-gear';}}};
  return {duel, rival, state};
}
function tick(duel, seconds, motion = {}, damageCar = () => 35) {
  const count = Math.round(seconds / DT);
  for (let i = 0; i < count; i++) {
    duel.state.stageTimeSec += DT;
    stepBoarding(duel, DT, {...motion, damageCar});
  }
}
function roof(duel, rival, previousY = 2.1) {
  return startBoarding(duel, rival, {method: 'roof', previousY});
}
check('roof boundary: 49 km/h boards; 51 does not', () => {
  const below = fixture({mph: 49 / 1.609344});
  const above = fixture({mph: 51 / 1.609344});
  assert.equal(roof(below.duel, below.rival), true);
  assert.equal(roof(above.duel, above.rival), false);
});
check('roof requires a downward crossing inside the car footprint', () => {
  const {duel, rival} = fixture();
  assert.equal(roof(duel, rival, 1.6), false);
  duel.state.fighter.x = 4;
  assert.equal(roof(duel, rival), false);
  duel.state.fighter.x = 0;
  duel.state.fighter.verticalSpeed = 1;
  assert.equal(roof(duel, rival), false);
});
check('Jax grapple boundary: 89 km/h boards; 91 does not', () => {
  for (const [kph, expected] of [[89, true], [91, false]]) {
    const {duel, rival} = fixture({mph: kph / 1.609344});
    duel.state.crewGear.grapple = {kind: 'car', targetId: 'cpu:0', arrived: true};
    assert.equal(startBoarding(duel, rival, {method: 'grapple'}), expected);
  }
});
check('grapple requires Jax, the actual arrival and 25 m launch reach', () => {
  const {duel, rival} = fixture();
  assert.equal(startBoarding(duel, rival, {method: 'grapple'}), false);
  duel.state.crewGear.grapple = {kind: 'car', targetId: 'cpu:0', arrived: true,
    launchDistance: 26};
  assert.equal(startBoarding(duel, rival, {method: 'grapple'}), false);
  duel.state.crewGear.grapple.launchDistance = 25;
  assert.equal(startBoarding(duel, rival, {method: 'grapple'}), true);
  assert.equal(duel.state.crewGear.grapple, null);
  const other = fixture({crewId: 'nell'});
  other.state.crewGear.grapple = {kind: 'car', targetId: 'cpu:0', arrived: true};
  assert.equal(startBoarding(other.duel, other.rival, {method: 'grapple'}), false);
});
check('player car, traffic and absent actor are excluded', () => {
  const {duel, rival, state} = fixture();
  const traffic = {s: 100, lateral: 0, speedMph: 0};
  state.traffic.push(traffic);
  assert.equal(canBoardTarget(duel, state, 'roof'), false);
  assert.equal(canBoardTarget(duel, traffic, 'roof'), false);
  assert.equal(canBoardTarget(duel, {}, 'roof'), false);
  assert.equal(canBoardTarget(duel, rival, 'roof'), true);
});
check('roof follows the car and hard turn throws after 0.3 continuous seconds', () => {
  const {duel, rival, state} = fixture();
  assert.equal(roof(duel, rival), true);
  rival.s += 10; rival.lateral = 2;
  tick(duel, .2, {sidewaysAcceleration: 9.1});
  assert.ok(state.boarding && state.boarding.phase === 'roof');
  assert.ok(Math.abs(state.fighter.x - 2) < EPS);
  tick(duel, .1, {sidewaysAcceleration: 9.1});
  assert.equal(state.boarding, null);
  assert.ok(state.fighter.lateral > 4, 'fighter lands beside the road');
});
check('a gentle step resets the continuous shake timer', () => {
  const {duel, rival, state} = fixture();
  roof(duel, rival);
  tick(duel, .2, {sidewaysAcceleration: 10});
  tick(duel, DT, {sidewaysAcceleration: 9});
  tick(duel, .2, {sidewaysAcceleration: 10});
  assert.equal(state.boarding.phase, 'roof');
});
check('crash needs more than 10 mph delta-v; six seconds also throws', () => {
  const first = fixture(); roof(first.duel, first.rival);
  tick(first.duel, DT, {crashDeltaMph: 10});
  assert.equal(first.state.boarding.phase, 'roof');
  tick(first.duel, DT, {crashDeltaMph: 10.01});
  assert.equal(first.state.boarding, null);
  const second = fixture(); roof(second.duel, second.rival);
  tick(second.duel, 6 - DT);
  assert.equal(second.state.boarding.phase, 'roof');
  tick(second.duel, DT);
  assert.equal(second.state.boarding, null);
});
check('one second hold plants one charge, then lands on the clear shoulder', () => {
  const {duel, rival, state} = fixture({blockedSide: 1});
  roof(duel, rival); state.fighterInput.fire = true;
  tick(duel, 1 - DT);
  assert.equal(state.boarding.phase, 'roof');
  tick(duel, DT);
  assert.equal(state.boarding.phase, 'charge');
  assert.ok(state.fighter.lateral < -4, 'blocked right side chooses left');
  assert.equal(state.boarding.chargesPlanted, 1);
  tick(duel, DT);
  assert.equal(state.boarding.chargesPlanted, 1);
});
check('fire release resets the hold; detonation once after two seconds', () => {
  const {duel, rival, state} = fixture();
  let hits = 0, amount = 0;
  const damageCar = (_duel, actor, damage) => {
    assert.equal(actor, rival); hits++; amount += damage; return damage;
  };
  roof(duel, rival); state.fighterInput.fire = true;
  tick(duel, .5, {}, damageCar);
  state.fighterInput.fire = false; tick(duel, DT, {}, damageCar);
  state.fighterInput.fire = true; tick(duel, .5, {}, damageCar);
  assert.equal(state.boarding.phase, 'roof');
  tick(duel, .5, {}, damageCar);
  assert.equal(state.boarding.phase, 'charge');
  const disabledBefore = rival.weaponsDisabledUntil;
  tick(duel, 2 - DT, {}, damageCar);
  assert.equal(hits, 0);
  tick(duel, DT, {}, damageCar);
  assert.equal(hits, 1); assert.equal(amount, 35);
  assert.equal(state.boarding, null);
  assert.ok(rival.weaponsDisabledUntil >= state.stageTimeSec + .8 - EPS);
  assert.notEqual(rival.weaponsDisabledUntil, disabledBefore);
  tick(duel, 1, {}, damageCar);
  assert.equal(hits, 1);
});
check('computer boarding is Hard only in the two named events', () => {
  for (const event of ['ambush-alley', 'convoy-raid'])
    assert.equal(computerBoardingAllowed('hard', event), true);
  for (const difficulty of ['easy', 'medium'])
    assert.equal(computerBoardingAllowed(difficulty, 'ambush-alley'), false);
  assert.equal(computerBoardingAllowed('hard', 'ordinary-race'), false);
});
check('fixed 120 Hz stepping gives equal 30/60/144 presentation outcomes', () => {
  function run(fps) {
    const {duel, rival, state} = fixture(); roof(duel, rival);
    state.fighterInput.fire = true;
    let remainder = 0;
    for (let frame = 0; frame < fps * 4; frame++) {
      remainder += 1 / fps;
      while (remainder + 1e-10 >= DT) {
        remainder = Math.max(0, remainder - DT);
        state.stageTimeSec += DT;
        stepBoarding(duel, DT, {damageCar: (_d, actor, damage) => {
          actor.armor -= damage; return damage;
        }});
      }
    }
    return {armor: rival.armor, boarding: state.boarding,
      fighter: [state.fighter.s, state.fighter.lateral],
      disabled: rival.weaponsDisabledUntil, events: duel.events};
  }
  assert.deepEqual(run(30), run(60));
  assert.deepEqual(run(30), run(144));
});
if (!process.exitCode) console.log(`Boarding module: ${checks} checks passed.`);
