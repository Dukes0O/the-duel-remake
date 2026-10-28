// The rescue line (docs/HELI_RESCUE.md sections 4, 5.4 and 12): the weights on
// the line, the speed warning, bumps and the casualty's condition, pay by
// condition, the set-down and hold,
// the handover, H doing nothing with people aboard, the supply crates and
// their pay, a steady line under a moving helicopter, and the same results
// from the same inputs.
import assert from 'node:assert/strict';
import {HELI_STEP, createHeliState, stepHeli, heliFingerprint} from '../src/heli/heli-flight.js';
import {flatGround} from '../src/heli/heli-ground.js';
import {CABLE, createLoad, hook, release, stepCable} from '../src/heli/heli-cable.js';
import {createBucket} from '../src/heli/heli-bucket.js';
import {
  RESCUE, SUPPLY_CRATES, SUPPLY_PAY, createRescueLine, setLineWho, peopleOnLine, hNothing, canFitLine, holdFraction,
  stepRescue, rescueHit, rescuePay, CONDITIONS, CONDITION_PAY, COLD_SHARE, FAILED_CONDITION, worsen, waitHurt, cabinHurt,
  handoverOutcome, createSupplyCrate, noteCrateRelease, crateResult, cratePay, supplyPay,
} from '../src/heli/heli-rescue.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const types = events => events.map(event => event.type);
const count = (events, type) => events.filter(event => event.type === type).length;

const flat = flatGround(0);
// A helicopter held still (or moving at a set speed) well above the line.
const still = (x = 0, z = 0, vx = 0, vz = 0) => ({x, y: 30, z, vx, vy: 0, vz});
// Steps the line `seconds` long, the way the session does: rescue before cable.
function run(line, heli, seconds, env = {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / HELI_STEP); i++) {
    events.push(...stepRescue(line, heli, env).events);
    events.push(...stepCable(line, heli, {ground: flat}).events);
  }
  return events;
}
// Steps only the rescue rules, for a line set by hand.
function rules(line, heli, seconds, env = {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / HELI_STEP); i++) events.push(...stepRescue(line, heli, env).events);
  return events;
}

// The numbers.
eq(RESCUE.rescuerKg, 90, 'the rescuer with gear weighs 90 kg');
eq(RESCUE.casualtyKg, 80, 'a casualty weighs 80 kg');
eq(RESCUE.pairKg, 170, 'both together are 170 kg');
eq(RESCUE.rescuerKg + RESCUE.casualtyKg, RESCUE.pairKg, 'and the sum agrees');
eq(RESCUE.speedLimit, 20, 'airspeed at most 20 m/s with people on the line');
eq(RESCUE.warnSpeed, 25, 'Roger warns over 25 m/s');
eq(RESCUE.bumpSpeed, 4, 'a bump is a hit over 4 m/s');
eq(RESCUE.bumpHardSpeed, 8, 'over 8 m/s it hurts two steps');
ok(!('bumpCut' in RESCUE), 'the flat 300-credit cut a bump is gone (RESCUE-HURT)');
eq(RESCUE.setDownRadius, 3, 'set down within 3 m of the casualty or beacon');
eq(RESCUE.setDownSpeed, 1.5, 'with the helicopter under 1.5 m/s');
eq(RESCUE.holds.hoist, 8, 'the hoist hold is 8 s');
eq(RESCUE.holds.avalanche, 12, 'the avalanche dig is 12 s');
eq(RESCUE.handoverRadius, 12, 'the handover circle is 12 m');
eq(RESCUE.handoverRadius, CABLE.landingRadius, 'H1\'s landing circle');
eq(RESCUE.handoverSpeed, 1, 'at 1 m/s or less');
ok(RESCUE.speedLimit < RESCUE.warnSpeed, 'the limit sits under the warning');

// A fitted line: on the hook, resting at the pad, 90 kg.
{
  const line = createRescueLine({x: 5, z: 6, heading: 1, ground: flat});
  ok(line.hooked && line.onGround && line.rescue, 'a fitted line is on the hook, resting, and flagged rescue');
  eq(line.who, 'rescuer', 'the rescuer rides alone');
  eq(line.massKg, 90, 'at 90 kg');
  near(line.y, RESCUE.restHeight, 1e-9, 'its clip point rides at its own rest height');
  ok(peopleOnLine(line), 'people are on the line');
  eq(line.condition, 'unhurt', 'every casualty starts unhurt');
  const hill = createRescueLine({x: 0, z: 0, ground: flatGround(40)});
  near(hill.y, 40 + RESCUE.restHeight, 1e-9, 'on a hill it rests on the hill');
  eq(setLineWho(line, 'pair'), 'pair', 'clipping a casualty on makes it a pair');
  eq(line.massKg, 170, 'at 170 kg');
  eq(setLineWho(line, 'rescuer'), 'rescuer', 'and back');
  eq(line.massKg, 90, 'to 90 kg');
}

// Weights on the line: 90 kg, then 170 kg after clipping, read by the cable.
{
  const line = createRescueLine({ground: flat});
  const heli = {x: 0, y: line.y + 15.01, z: 0, vx: 0, vy: 0, vz: 0};
  Object.assign(line, {onGround: false});
  const before = run(line, heli, 3);
  const pull90 = -stepCable(line, heli, {ground: flat}).force.y;
  near(pull90, 90 * 9.81, 15, 'the cable carries 90 kg');
  setLineWho(line, 'pair');
  run(line, heli, 3);
  const pull170 = -stepCable(line, heli, {ground: flat}).force.y;
  near(pull170, 170 * 9.81, 15, 'and 170 kg once the casualty is clipped on');
  ok(!types(before).includes('cargoHit'), 'hanging still hits nothing');
}

// The speed warning: over 25 m/s, once per crossing.
{
  const line = createRescueLine({ground: flat});
  const slow = rules(line, still(0, 0, 0, 20), 1);
  eq(count(slow, 'rescueFast'), 0, 'no warning at the 20 m/s limit');
  eq(count(rules(line, still(0, 0, 0, 25), 1), 'rescueFast'), 0, 'none at exactly 25 m/s');
  const first = rules(line, still(0, 0, 0, 26), 2);
  eq(count(first, 'rescueFast'), 1, 'one warning over 25 m/s');
  near(first.find(e => e.type === 'rescueFast').speed, 26, 1e-9, 'with the speed');
  eq(count(rules(line, still(0, 0, 0, 30), 2), 'rescueFast'), 0, 'staying fast does not warn again');
  rules(line, still(0, 0, 0, 10), 1);
  eq(count(rules(line, still(0, 0, 0, 27), 1), 'rescueFast'), 1, 'slowing down and speeding up again warns once more');
  const sideways = rules(createRescueLine({ground: flat}), still(0, 0, 18, 18), 1);
  eq(count(sideways, 'rescueFast'), 1, 'speed is along the ground in any direction (25.5 m/s)');
  const chatter = createRescueLine({ground: flat}); let warns = 0;
  for (let i = 0; i < 600; i++) warns += count(stepRescue(chatter, still(0, 0, 0, i % 2 ? 25.2 : 24.8)).events, 'rescueFast');
  eq(warns, 1, 'a speed wobbling around 25 m/s warns once, not at every wobble');
  const pair = createRescueLine({ground: flat}); setLineWho(pair, 'pair');
  eq(count(rules(pair, still(0, 0, 0, 30), 1), 'rescueFast'), 1, 'a pair is warned too');
  const gone = createRescueLine({ground: flat}); gone.done = true;
  eq(types(rules(gone, still(0, 0, 0, 30), 1)).join(), 'rescueFast', 'after the handover the rescuer still rides the line, so Roger still warns');
  gone.hooked = false;
  eq(rules(gone, still(0, 0, 0, 30), 1).length, 0, 'a line taken off says nothing');
}

// People can get hurt (section 4.1): the steps, the clock, the cabin and the pay.
{
  eq(CONDITIONS.join(), 'unhurt,hurt,badly', 'unhurt, hurt, badly hurt: never killed');
  eq(worsen('unhurt'), 'hurt', 'one step');
  eq(worsen('unhurt', 2), 'badly', 'two steps');
  eq(worsen('hurt', 2), 'badly', 'never past badly hurt');
  eq(worsen('badly'), 'badly', 'badly hurt stays badly hurt');
  eq(worsen('unhurt', 0), 'unhurt', 'no steps, no change');
  eq(FAILED_CONDITION, 'badly', 'a failed rescue brings them out badly hurt');
  // The clock: two thirds of the time gone, still unhurt.
  near(COLD_SHARE, 2 / 3, 1e-12, 'two thirds');
  eq(waitHurt('unhurt', 199, 300).condition, 'unhurt', 'before two thirds they are fine');
  const cold = waitHurt('unhurt', 200, 300);
  ok(cold.condition === 'hurt' && cold.cold, 'at two thirds they get cold and hurt, and Roger says so');
  eq(waitHurt('hurt', 290, 300).cold, false, 'only once: already hurt, no second cold line');
  eq(waitHurt('hurt', 290, 300).condition, 'hurt', 'and no second step');
  eq(waitHurt('unhurt', 290, 0).condition, 'unhurt', 'no clock, no cold');
  // The hiker in the cabin.
  eq(cabinHurt('unhurt', {type: 'touchdown', result: 'hard'}).condition, 'hurt', 'an H1 hard landing hurts the hiker one step');
  eq(cabinHurt('unhurt', {type: 'touchdown', result: 'soft'}).changed, false, 'a gentle landing does not');
  eq(cabinHurt('unhurt', {type: 'crash', cause: 'touchdown'}).condition, 'badly', 'a crash makes them badly hurt');
  eq(cabinHurt('badly', {type: 'crash'}).changed, false, 'no change when already badly hurt');
  // The handover: what it looks like and what Roger says.
  eq(JSON.stringify(handoverOutcome('unhurt')), JSON.stringify({look: 'walk', line: 'heli.radio.rescue.done'}), 'unhurt: they walk');
  eq(JSON.stringify(handoverOutcome('hurt')), JSON.stringify({look: 'limp', line: 'heli.radio.rescue.hurt'}), 'hurt: they limp beside a paramedic');
  eq(JSON.stringify(handoverOutcome('badly')), JSON.stringify({look: 'stretcher', line: 'heli.radio.rescue.badly'}), 'badly hurt: a stretcher');
  // Pay by condition: 100%, 60%, 25%.
  eq(JSON.stringify(CONDITION_PAY), JSON.stringify({unhurt: 1, hurt: 0.6, badly: 0.25}), 'the pay shares');
  eq(rescuePay(1200, 'unhurt'), 1200, 'unhurt, full pay');
  eq(rescuePay(1200, 'hurt'), 720, 'hurt, 60%');
  eq(rescuePay(1200, 'badly'), 300, 'badly hurt, 25%');
  eq(rescuePay(1000, 'hurt'), 600, 'the hiker hurt: 600');
  eq(rescuePay(1250, 'hurt'), 750, 'a Real-mode 1,250 hurt: 750');
  eq(rescuePay(1001, 'badly'), 250, 'rounded to a whole credit');
  eq(rescuePay(1200, 'lost'), 300, 'an unknown condition pays as badly hurt');
  eq(rescuePay(-5, 'unhurt'), 0, 'never below 0');
  for (const bad of [undefined, null, NaN, Infinity, '1200'])
    eq(rescuePay(bad, 'unhurt'), 0, `a base of ${String(bad)} pays 0, never a broken number`);
  eq(rescuePay(1200, 'toString'), 300, 'a condition named like a built-in pays as badly hurt');
  eq(rescuePay(1200, '__proto__'), 300, 'and so does __proto__');
  eq(rescuePay(0.5, 'unhurt'), 0, 'never more than the base: half a credit pays 0');
  eq(rescuePay(1200.9, 'unhurt'), 1200, 'and never more than the whole credits of the base');
  eq(rescuePay(0, 'unhurt'), 0, 'no pay stays 0');
}

// Bumps over 4 m/s hurt the casualty: one step, two over 8 m/s.
{
  const line = createRescueLine({ground: flat});
  // The rescuer alone is a professional: bumps on the way out hurt nobody.
  const alone = rescueHit(line, {type: 'cargoHit', id: 'rescue', speed: 9, kind: 'cargoHeavy', with: 'tree'});
  ok(!alone.bump && line.condition === 'unhurt', 'the rescuer alone is never hurt');
  setLineWho(line, 'pair');
  eq(rescueHit(line, {type: 'cargoHit', id: 'rescue', speed: 4, kind: 'cargoLight', with: 'ground'}).bump, false, 'exactly 4 m/s is no bump');
  eq(rescueHit(line, {type: 'cargoHit', id: 'rescue', speed: 3, kind: 'cargoLight'}).bump, false, 'slower is no bump');
  eq(rescueHit(line, {type: 'drop', id: 'rescue', speed: 9}).bump, false, 'only cargo hits count');
  eq(rescueHit(line, {type: 'cargoHit', id: 'bucket', speed: 9}).bump, false, 'a hit on another load is not ours');
  eq(line.condition, 'unhurt', 'none of those hurt anyone');
  const one = rescueHit(line, {type: 'cargoHit', id: 'rescue', speed: 4.5, kind: 'cargoLight', with: 'tree'});
  ok(one.bump && one.steps === 1, 'a hit over 4 m/s is a bump, one step');
  eq(one.condition, 'hurt', 'the casualty is hurt');
  eq(one.event.type, 'rescueBump', 'with an event for the radio');
  eq(one.event.condition, 'hurt', 'naming the condition');
  const eight = rescueHit(line, {type: 'cargoHit', id: 'rescue', speed: 8, kind: 'cargoLight', with: 'tree'});
  eq(eight.steps, 1, 'exactly 8 m/s is one step');
  eq(line.condition, 'badly', 'hurt and bumped again: badly hurt');
  const fresh = createRescueLine({ground: flat}); setLineWho(fresh, 'pair');
  const heavy = rescueHit(fresh, {type: 'cargoHit', speed: 12, kind: 'cargoHeavy', with: 'building'});
  ok(heavy.steps === 2 && heavy.condition === 'badly', 'a hit over 8 m/s is two steps: unhurt to badly hurt at once');
  eq(rescueHit(fresh, {type: 'cargoHit', speed: 20, kind: 'cargoWreck'}).condition, 'badly', 'and never past badly hurt');
  eq(Object.keys(one).sort().join(), 'bump,condition,event,steps', 'a bump reports the condition; paying is the session job');
  const done = createRescueLine({ground: flat}); setLineWho(done, 'pair'); done.done = true;
  eq(rescueHit(done, {type: 'cargoHit', id: 'rescue', speed: 9}).bump, false, 'after the handover nothing changes their condition');
  const swing = createRescueLine({ground: flat}); setLineWho(swing, 'pair');
  eq(rescueHit(swing, {type: 'cargoHit', id: 'rescue', speed: 9, with: 'helicopter'}).bump, false,
    'the line swinging into the helicopter is not a bump');
  // A real hit from H1's cable: the pair slid into a tree faster than 4 m/s.
  const tree = flatGround(0, [{x: 12, z: 0, radius: 0.5, base: 0, top: 15, height: 15, kind: 'tree', id: 't1', shape: 'cylinder'}]);
  const slider = createRescueLine({ground: tree, x: 7, z: 0}); setLineWho(slider, 'pair');
  slider.vx = 9;
  const hits = [];
  for (let i = 0; i < 240; i++) hits.push(...stepCable(slider, {x: 11, y: 15.3, z: 0, vx: 0, vy: 0, vz: 0}, {ground: tree}).events);
  const strike = hits.find(e => e.type === 'cargoHit');
  ok(strike, 'sliding into a tree makes H1 report a cargo hit');
  ok(rescueHit(slider, strike).bump, 'which becomes a bump');
  ok(slider.condition !== 'unhurt', 'and hurts them');
}

// A real touchdown through H1's cable: the rough set-down and the cable's
// ground bump never both count, and no touchdown over 1 m/s slips through.
{
  const touchdown = (vy, vx, options) => {
    const line = createRescueLine({x: 0, z: 0, ground: flat}); setLineWho(line, 'pair');
    line.lifted = true; line.onGround = false; line.wasOnGround = false;
    line.y += 0.02; line.vy = vy; line.vx = vx;
    const heli = {x: 0, y: line.y + 14, z: 0, vx: 0, vy: 0, vz: 0};
    const seen = [];
    for (let i = 0; i < 60; i++) {
      seen.push(...stepRescue(line, heli, {}).events.map(e => e.type));
      for (const e of stepCable(line, heli, {ground: flat}).events) { seen.push(e.type); rescueHit(line, e, options); }
    }
    return {condition: line.condition, seen};
  };
  eq(touchdown(-0.5, 0).condition, 'unhurt', 'set down gently: unhurt');
  const near4 = touchdown(-3.95, 0);
  eq(near4.condition, 'hurt', 'straight down at 3.95 m/s: one step, never two');
  ok(near4.seen.includes('cargoHit') !== near4.seen.includes('roughSetDown'), 'counted once: as the bump or as the rough set-down');
  eq(touchdown(-2, 6).condition, 'hurt', 'down at 2 m/s while sliding at 6 m/s: one step, not missed');
  eq(touchdown(-1, 7.9).condition, 'hurt', 'down at 1 m/s while sliding at 7.9 m/s: one step');
  eq(touchdown(-6, 0).condition, 'hurt', 'straight down at 6 m/s: the cable bump, one step');
  eq(touchdown(-10, 0).condition, 'badly', 'straight down at 10 m/s: two steps');
  // On the medevac skin's stretcher a bump starts above 8 m/s and is two
  // steps only above 14 (section 6.1).
  eq(touchdown(-6, 0, {stretcher: true}).condition, 'unhurt', 'on the stretcher, 6 m/s is not a bump');
  eq(touchdown(-10, 0, {stretcher: true}).condition, 'hurt', 'on the stretcher, 10 m/s is one step');
  eq(touchdown(-16, 0, {stretcher: true}).condition, 'badly', 'on the stretcher, 16 m/s is two steps');
  const stretcherLine = createRescueLine({ground: flat}); setLineWho(stretcherLine, 'pair');
  eq(rescueHit(stretcherLine, {type: 'cargoHit', id: 'rescue', speed: 8, with: 'tree'}, {stretcher: true}).bump, false, 'exactly 8 m/s on the stretcher is no bump');
  eq(rescueHit(stretcherLine, {type: 'cargoHit', id: 'rescue', speed: 14, with: 'tree'}, {stretcher: true}).steps, 1, 'exactly 14 m/s is one step');
}

// The hold: only with the rescuer at rest within 3 m and the helicopter slow.
const target = {x: 40, z: -10};
{
  const rescuer = () => createRescueLine({x: 41, z: -9, ground: flat});
  // A hoist rescue takes 8 s.
  const line = rescuer();
  const first = rules(line, still(41, -9), 7.9, {target, kind: 'hoist'});
  eq(count(first, 'holdStarted'), 1, 'the hold starts once');
  eq(count(first, 'holdDone'), 0, 'not done at 7.9 s');
  eq(line.who, 'rescuer', 'still 90 kg');
  near(holdFraction(line, 'hoist'), 7.9 / 8, 0.01, 'the bar is nearly full');
  const rest = rules(line, still(41, -9), 0.2, {target, kind: 'hoist'});
  eq(types(rest).join(), 'holdDone,clipped', 'done and clipped at 8 s, in that order');
  eq(line.who, 'pair', 'the line is now a pair');
  eq(line.massKg, 170, 'at 170 kg');
  eq(rest.find(e => e.type === 'clipped').massKg, 170, 'and the event says so');
  eq(rules(line, still(41, -9), 3, {target, kind: 'hoist'}).length, 0, 'no more holding once clipped');

  // An avalanche dig takes 12 s.
  const dig = rescuer();
  eq(count(rules(dig, still(41, -9), 11.9, {target, kind: 'avalanche'}), 'holdDone'), 0, 'not done at 11.9 s');
  near(holdFraction(dig, 'avalanche'), 11.9 / 12, 0.01, 'the dig bar');
  eq(types(rules(dig, still(41, -9), 0.2, {target, kind: 'avalanche'})).join(), 'holdDone,clipped', 'done at 12 s');

  // Exactly the edges of the 3 m ring.
  const edge = createRescueLine({x: 43, z: -10, ground: flat});
  eq(count(rules(edge, still(43, -10), 0.1, {target, kind: 'hoist'}), 'holdStarted'), 1, 'exactly 3 m away holds');
  const out = createRescueLine({x: 43.2, z: -10, ground: flat});
  eq(rules(out, still(43.2, -10), 9, {target, kind: 'hoist'}).length, 0, '3.2 m away never holds');
  eq(out.who, 'rescuer', 'and is never clipped');

  // No target, no kind, a pair, or an unknown kind: nothing to hold.
  eq(rules(rescuer(), still(41, -9), 9, {kind: 'hoist'}).length, 0, 'no target, no hold');
  eq(rules(rescuer(), still(41, -9), 9, {target}).length, 0, 'no kind, no hold');
  eq(rules(rescuer(), still(41, -9), 9, {target, kind: 'hiker'}).length, 0, 'a hiker needs no hold on the line');

  // The helicopter must be slow: under 1.5 m/s.
  const fast = rescuer();
  eq(rules(fast, still(41, -9, 1.6, 0), 9, {target, kind: 'hoist'}).length, 0, 'helicopter at 1.6 m/s: no hold');
  const slow = rescuer();
  eq(count(rules(slow, still(41, -9, 1.4, 0), 0.1, {target, kind: 'hoist'}), 'holdStarted'), 1, 'at 1.4 m/s the hold starts');

  // Reset when the helicopter speeds up mid-hold.
  const wobble = rescuer();
  rules(wobble, still(41, -9), 4, {target, kind: 'hoist'});
  eq(rules(wobble, still(41, -9, 2, 0), 0.2, {target, kind: 'hoist'}).length, 0, 'a moment over 1.5 m/s (0.2 s) is forgiven');
  ok(wobble.holding && wobble.hold > 3.9, 'and the hold carries on');
  for (let i = 0; i < 240; i++) rules(wobble, still(41, -9, i % 12 < 6 ? 1.55 : 1.45, 0), 1 / 120, {target, kind: 'hoist'});
  ok(wobble.holding, 'a speed wobbling around 1.5 m/s does not reset the hold');
  const dragged = rules(wobble, still(41, -9, 2, 0), 0.3, {target, kind: 'hoist'});
  eq(count(dragged, 'holdReset'), 1, 'the helicopter moving off for 0.25 s resets the hold');
  eq(wobble.hold, 0, 'the count is back to 0');
  const again = rules(wobble, still(41, -9), 7.9, {target, kind: 'hoist'});
  eq(count(again, 'holdStarted'), 1, 'it starts again');
  eq(count(again, 'holdDone'), 0, 'and needs the whole 8 s again');
  eq(count(rules(wobble, still(41, -9), 0.2, {target, kind: 'hoist'}), 'holdDone'), 1, 'which it then gets');

  // Reset when the rescuer is dragged faster than 1.5 m/s.
  const slide = rescuer();
  rules(slide, still(41, -9), 3, {target, kind: 'hoist'});
  slide.vx = 2;
  const slid = rules(slide, still(41, -9), 0.3, {target, kind: 'hoist'});
  eq(slid.find(e => e.type === 'holdReset')?.reason, 'dragged', 'the rescuer dragged at 2 m/s resets the hold');
  slide.vx = 1;
  eq(count(rules(slide, still(41, -9), 0.1, {target, kind: 'hoist'}), 'holdStarted'), 1, 'at 1 m/s it holds again');

  // Reset when lifted off.
  const lift = rescuer();
  rules(lift, still(41, -9), 5, {target, kind: 'hoist'});
  lift.onGround = false;
  const lifted = rules(lift, still(41, -9), 0.3, {target, kind: 'hoist'});
  eq(lifted.find(e => e.type === 'holdReset')?.reason, 'lifted', 'lifting the rescuer off resets the hold');
  eq(count(rules(lift, still(41, -9), 9, {target, kind: 'hoist'}), 'holdDone'), 0, 'in the air it never finishes');
  lift.onGround = true;
  eq(count(rules(lift, still(41, -9), 8.1, {target, kind: 'hoist'}), 'holdDone'), 1, 'back on the ground it can');

  // Drifting out of the ring resets too, without a reset event before the hold began.
  const drift = rescuer();
  rules(drift, still(41, -9), 2, {target, kind: 'avalanche'});
  drift.x = 45;
  eq(count(rules(drift, still(45, -9), 0.3, {target, kind: 'avalanche'}), 'holdReset'), 1, 'sliding out of the ring resets the dig');
  eq(count(rules(drift, still(45, -9), 5, {target, kind: 'avalanche'}), 'holdReset'), 0, 'and does not repeat the reset');

  // A real cable: hover at rest on the target, the load sits still, the hold runs.
  const real = rescuer();
  const hover = {x: 41, y: real.y + 14, z: -9, vx: 0, vy: 0, vz: 0};
  const events = run(real, hover, 8.2, {target, kind: 'hoist'});
  eq(types(events.filter(e => /^hold|clipped/.test(e.type))).join(), 'holdStarted,holdDone,clipped', 'a rescuer standing on a real cable holds and is clipped on');
  // Dragged by a real cable: the helicopter moves off with the line taut, the line slides or lifts and the hold resets.
  const pulled = rescuer();
  const mover = {x: 41, y: pulled.y + 14.9, z: -9, vx: 0, vy: 0, vz: 0};
  const log = [];
  for (let i = 0; i < 120 * 10; i++) {
    mover.vx = i > 120 * 3 ? 3 : 0; mover.x += mover.vx * HELI_STEP;
    log.push(...stepRescue(pulled, mover, {target, kind: 'hoist'}).events);
    log.push(...stepCable(pulled, mover, {ground: flat}).events);
  }
  ok(count(log, 'holdStarted') >= 1 && count(log, 'holdReset') >= 1, 'a helicopter flying off with the rescuer resets the hold');
  eq(count(log, 'holdDone'), 0, 'which never finishes while it moves');
}

// The handover: the pair at rest inside a landing circle at 1 m/s or less.
{
  const zones = [{x: 100, z: 0, radius: 12}, {x: 0, z: 0, radius: 12}];
  // A pair already carried (lifted) and set down gently.
  const pairAt = (x, z) => { const l = createRescueLine({x, z, ground: flat}); setLineWho(l, 'pair'); l.lifted = true; return l; };
  const inside = pairAt(105, 5);
  const events = rules(inside, still(105, 5), 1, {zones});
  eq(types(events).join(), 'handover', 'a pair set down inside a circle is handed over');
  eq(events[0].zone, 0, 'naming the circle');
  ok(inside.done, 'and the line is done');
  eq(rules(inside, still(105, 5), 2, {zones}).length, 0, 'the handover happens once');
  eq(inside.who, 'rescuer', 'the casualty goes to the paramedics');
  eq(inside.massKg, 90, 'leaving the rescuer\'s 90 kg on the line');
  ok(peopleOnLine(inside) && hNothing(inside), 'the rescuer rides home: H still does nothing');
  // Clipped on but never lifted: no handover where the casualty lay.
  const unlifted = createRescueLine({x: 105, z: 5, ground: flat}); setLineWho(unlifted, 'pair');
  eq(rules(unlifted, still(105, 5), 2, {zones}).length, 0, 'a pair never lifted is not handed over');
  // Set down hard: the speed it touched the ground at counts.
  // Harder than 1 m/s hurts them one step (section 4.1). Speeds set by hand
  // here; the real cable's touchdowns are checked with the bumps above.
  for (const [speed, handed, condition] of [[0.9, true, 'unhurt'], [2, false, 'hurt'], [3.5, false, 'hurt'], [6, false, 'hurt']]) {
    const pair = pairAt(105, 5); pair.onGround = false; pair.vy = -speed;
    rules(pair, still(105, 5), 1 / 120, {zones});
    pair.onGround = true; pair.vy = 0;
    const after = rules(pair, still(105, 5), 2, {zones});
    eq(count(after, 'handover'), handed ? 1 : 0, `set down at ${speed} m/s: ${handed ? 'handed over' : 'no handover'}`);
    eq(pair.condition, condition, `set down at ${speed} m/s: ${condition}`);
    eq(count(after, 'roughSetDown'), condition === 'hurt' ? 1 : 0, `set down at ${speed} m/s: rough set-downs counted`);
  }
  // The rescuer alone set down hard at the site hurts nobody.
  const solo = createRescueLine({x: 105, z: 5, ground: flat}); solo.onGround = false; solo.vy = -3;
  rules(solo, still(105, 5), 1 / 120, {zones}); solo.onGround = true; solo.vy = 0;
  eq(count(rules(solo, still(105, 5), 1, {zones}), 'roughSetDown'), 0, 'the rescuer alone set down hard is not hurt');
  eq(rules(pairAt(3, -4), still(3, -4), 1, {zones: []}).length, 0, 'no circles, no handover');
  eq(rules(pairAt(3, -4), still(3, -4), 1).length, 0, 'same with none given');
  eq(types(rules(pairAt(3, -4), still(3, -4), 1, {zones: [zones[1]]})).join(), 'handover', 'the home pad\'s circle works');
  eq(rules(pairAt(50, 0), still(50, 0), 3, {zones}).length, 0, 'outside every circle, nothing happens');
  eq(types(rules(pairAt(112, 0), still(112, 0), 1, {zones})).join(), 'handover', 'on the edge of the 12 m circle counts');
  eq(rules(pairAt(112.5, 0), still(112.5, 0), 1, {zones}).length, 0, 'just outside does not');
  const wide = [{x: 0, z: 0}];
  eq(types(rules(pairAt(11, 0), still(11, 0), 1, {zones: wide})).join(), 'handover', 'a circle with no radius uses 12 m');
  // Moving too fast.
  const moving = pairAt(105, 5); moving.vx = 1.2;
  eq(rules(moving, still(105, 5), 1, {zones}).length, 0, 'the pair sliding at 1.2 m/s is not handed over');
  moving.vx = 1;
  eq(types(rules(moving, still(105, 5), 1, {zones})).join(), 'handover', 'at 1 m/s it is');
  const flyer = pairAt(105, 5);
  eq(rules(flyer, still(105, 5, 3, 0), 1, {zones}).length, 0, 'with the helicopter moving at 3 m/s it waits');
  // Not on the ground.
  const hanging = pairAt(105, 5); hanging.onGround = false;
  eq(rules(hanging, still(105, 5), 2, {zones}).length, 0, 'hanging in the air is not a handover');
  // The rescuer alone is not handed over.
  const alone = createRescueLine({x: 105, z: 5, ground: flat});
  eq(rules(alone, still(105, 5), 2, {zones}).length, 0, 'the rescuer without a casualty is not a handover');
  // A real cable set-down: the pair lowered to the ground inside the circle.
  const heli = {x: 102, y: 40, z: 0, vx: 0, vy: -0.8, vz: 0};
  const lowered = pairAt(102, 0);
  Object.assign(lowered, {onGround: false, y: 25, vy: 0});
  const log = [];
  for (let i = 0; i < 120 * 40; i++) {
    heli.y = Math.max(16.2, heli.y - 0.8 * HELI_STEP); heli.vy = heli.y > 16.2 ? -0.8 : 0;
    log.push(...stepRescue(lowered, heli, {zones}).events);
    log.push(...stepCable(lowered, heli, {ground: flat, zone: zones[0]}).events);
    if (lowered.done) break;
  }
  ok(lowered.done && types(log).includes('setDown'), 'a pair lowered gently onto the ground in the circle is set down and handed over');
  eq(count(log, 'handover'), 1, 'once');
}

// H does nothing with people on the line; one fitting at a time.
{
  const line = createRescueLine({ground: flat});
  ok(hNothing(line), 'H does nothing with the rescuer on the line');
  ok(hNothing([line]), 'or in a list of loads');
  setLineWho(line, 'pair');
  ok(hNothing([createLoad({id: 'car', massKg: 1300, ground: flat}), line]), 'or with the pair, among other loads');
  ok(!hNothing([createLoad({id: 'car', massKg: 1300, ground: flat})]), 'H works as usual with a car');
  ok(!hNothing([]), 'and with nothing');
  ok(!hNothing(null), 'and with no list');
  ok(!hNothing(createBucket({ground: flat})), 'and with the bucket');
  line.done = true;
  ok(hNothing(line), 'the rescuer rides home after the handover, so H still does nothing');
  line.hooked = false;
  ok(!hNothing(line), 'H works again once the line is taken off at the pad');
  // The cable itself would let go; the rule is the caller's to apply.
  const held = createRescueLine({ground: flat});
  ok(release(held, flat).ok, 'the cable lets go of any hooked load, so the session must apply hNothing');
  const car = createLoad({id: 'car', massKg: 1300, ground: flat});
  ok(canFitLine([car]).ok, 'the line fits at the pad beside a car on the ground');
  car.hooked = true;
  eq(canFitLine([car]).ok, false, 'not while a car is on the hook');
  eq(canFitLine([createBucket({ground: flat})]).ok, false, 'not with the bucket fitted');
  eq(canFitLine([createRescueLine({ground: flat})]).ok, false, 'not with the line already fitted');
  ok(typeof canFitLine([createBucket({ground: flat})]).reason === 'string', 'with a reason');
  ok(canFitLine([]).ok && canFitLine(null).ok, 'and fits with nothing else about');
}

// Supply crates.
{
  eq(SUPPLY_CRATES.summitRun.map(c => c.id).join(), 'food,medicine,fuel', 'three crates: food, medicine, fuel');
  eq(SUPPLY_CRATES.summitRun.map(c => c.massKg).join(), '300,200,640', 'Summit Run: 300, 200 and 640 kg (drums tuned to the thin air at the pickup)');
  eq(SUPPLY_CRATES.tremblantSnow.map(c => c.massKg).join(), '400,500,900', 'Tremblant Snow\'s lodge: 400, 500 and 900 kg');
  eq(SUPPLY_CRATES.tremblantSnow.map(c => c.id).join(), 'food,medicine,fuel', 'with the same three ids');
  ok(Object.isFrozen(SUPPLY_CRATES) && Object.isFrozen(SUPPLY_CRATES.summitRun[0]), 'the table is frozen');
  const crate = createSupplyCrate({id: 'fuel', x: 10, z: 20, ground: flat});
  ok(crate.supply && crate.id === 'fuel' && !crate.hooked && crate.onGround, 'a crate is a supply load on the ground, not yet hooked');
  eq(crate.massKg, 640, 'the fuel drums weigh 640 kg');
  near(crate.y, CABLE.restHeight, 1e-9, 'resting like the lesson crate');
  eq(createSupplyCrate({id: 'fuel', set: 'tremblantSnow', ground: flat}).massKg, 900, 'the snow set is heavier');
  eq(createSupplyCrate({id: 'food', massKg: 275, ground: flat}).massKg, 275, 'a tuned mass overrides the table');
  assert.throws(() => createSupplyCrate({id: 'gold', ground: flat})); checks++;

  // Hooking and releasing a real crate.
  const heli = createHeliState({ground: flat, x: 10, z: 20, y: 14.4});
  Object.assign(heli, {onGround: false});
  const hooked = hook({...heli, y: crate.y + 15, vx: 0, vy: 0, vz: 0}, crate);
  ok(hooked.ok, 'a supply crate hooks like any load');
  release(crate, flat);

  // HELI-PAY-CONTINUE: a crate pays 1,450 (was 300), 750 less from height (was 150), 500 for all three (was 100).
  eq(cratePay({released: true, dropMetres: 0}), 1450, 'a clean crate pays 1,450');
  eq(cratePay({released: true, dropMetres: 1}), 1450, 'released from exactly 1 m is clean');
  eq(cratePay({released: true, dropMetres: 1.5}), 700, 'released from higher than 1 m pays 750 less');
  eq(cratePay({released: true, dropMetres: 12}), 700, 'however high');
  eq(cratePay({released: false, dropMetres: 0}), 0, 'a crate not down pays nothing');
  eq(cratePay({released: true}), 1450, 'no drop given is clean');
  const clean = {released: true, dropMetres: 0}, rough = {released: true, dropMetres: 6}, missing = {released: false, dropMetres: 0};
  eq(supplyPay([clean, clean, clean]).total, 4850, 'three clean crates in time pay 4,850');
  eq(supplyPay([clean, clean, clean]).bonus, 500, 'with the 500 bonus');
  eq(supplyPay([clean, clean, clean], {inTime: false}).total, 4350, 'no bonus after the clock');
  eq(supplyPay([clean, clean, rough]).total, 4100, 'one rough crate: 1,450 + 1,450 + 700 + 500');
  eq(supplyPay([clean, clean, missing]).total, 2900, 'two down: 2,900, no bonus');
  eq(supplyPay([clean, clean, missing]).down, 2, 'counted');
  eq(supplyPay([]).total, 0, 'none down pays 0');
  eq(supplyPay([rough, rough, rough]).total, 2600, 'three rough crates: 2,100 and the bonus');
  eq(SUPPLY_PAY.perCrate, 1450, 'the pay table: 1,450 a crate');
  eq(SUPPLY_PAY.highCut, 750, '750 less when dropped');
  eq(SUPPLY_PAY.allCratesBonus, 500, '500 for all three');
  eq(SUPPLY_PAY.dropFrom, CABLE.dropFrom, 'by H1\'s drop rule');

  // From a real release: set down in the yard, and dropped from height.
  const yard = {x: 0, z: 0, radius: 10};
  const place = (height) => {
    const c = createSupplyCrate({id: 'food', x: 3, z: 0, ground: flat});
    Object.assign(c, {hooked: true, onGround: false, y: CABLE.restHeight + height, vx: 0, vy: 0, vz: 0});
    const out = release(c, flat);
    noteCrateRelease(c, out.event);
    const events = [];
    for (let i = 0; i < 600; i++) events.push(...stepCable(c, {x: 3, y: 60, z: 0, vx: 0, vy: 0, vz: 0}, {ground: flat, zone: yard}).events);
    return {c, out, events};
  };
  const gentle = place(0.5);
  ok(crateResult(gentle.c, yard).released, 'a crate eased down in the yard is delivered');
  eq(cratePay(crateResult(gentle.c, yard)), 1450, 'and pays 1,450');
  const dropped = place(6);
  ok(crateResult(dropped.c, yard).released, 'a crate dropped in the yard is delivered');
  near(crateResult(dropped.c, yard).dropMetres, 6, 1e-6, 'from 6 m');
  eq(cratePay(crateResult(dropped.c, yard)), 700, 'for 700');
  ok(types(dropped.events).includes('drop'), 'H1 reports the drop');
  // Dropped, hooked again on the ground and let go there: the clean release counts.
  dropped.c.hooked = true;
  noteCrateRelease(dropped.c, release(dropped.c, flat).event);
  eq(cratePay(crateResult(dropped.c, yard)), 1450, 'a crate dropped, picked up again and let go on the ground pays 1,450');
  eq(noteCrateRelease(createSupplyCrate({id: 'food', ground: flat}), {type: 'cargoHit'}), 0, 'other events change nothing');
  const away = place(0.5); away.c.x = 40;
  eq(crateResult(away.c, yard).released, false, 'a crate outside the yard is not delivered');
  const slung = createSupplyCrate({id: 'food', x: 1, z: 0, ground: flat}); slung.hooked = true;
  eq(crateResult(slung, yard).released, false, 'a crate still on the hook is not delivered');
  eq(crateResult(createLoad({id: 'food', massKg: 100, x: 1, z: 0, ground: flat}), yard).released, false, 'only supply crates count');
  eq(crateResult(createSupplyCrate({id: 'food', x: 1, z: 0, ground: flat}), null).released, false, 'no yard, no delivery');
}

// The line hangs steady on the cable under a moving helicopter for 60 s.
function flightWith(who, seconds = 60) {
  const heli = createHeliState({ground: flat, altitudeOffset: 250});
  heli.y = 60; heli.onGround = false;
  const line = createRescueLine({ground: flat, x: heli.x, z: heli.z});
  setLineWho(line, who);
  Object.assign(line, {onGround: false, y: heli.y - CABLE.length});
  const script = t => ({lift: Math.sin(t * 0.4) * 0.3, pitch: Math.cos(t * 0.3) * 0.9, roll: Math.sin(t * 0.55) * 0.5, yaw: Math.sin(t * 0.2) * 0.4});
  let maxSpeed = 0, maxStretch = 0, maxHeli = 0, worstGap = Infinity;
  const events = [];
  for (let n = 0; n < Math.round(seconds / HELI_STEP); n++) {
    events.push(...stepRescue(line, heli, {target, kind: 'hoist', zones: [{x: 900, z: 900, radius: 12}]}).events);
    const cable = stepCable(line, heli, {ground: flat});
    events.push(...cable.events);
    stepHeli(heli, script(heli.t), {ground: flat, external: cable.force});
    maxSpeed = Math.max(maxSpeed, Math.hypot(line.vx, line.vy, line.vz));
    maxHeli = Math.max(maxHeli, Math.hypot(heli.vx, heli.vy, heli.vz));
    const gap = Math.hypot(heli.x - line.x, heli.y - line.y, heli.z - line.z);
    maxStretch = Math.max(maxStretch, gap - CABLE.length);
    worstGap = Math.min(worstGap, gap);
  }
  return {heli, line, maxSpeed, maxStretch, maxHeli, worstGap, events};
}
{
  for (const who of ['rescuer', 'pair']) {
    const run60 = flightWith(who);
    ok(!run60.heli.crashed, `${who}: the helicopter flies the whole 60 s`);
    ok(run60.maxHeli > 5, `${who}: and really moves (up to ${run60.maxHeli.toFixed(1)} m/s)`);
    ok(Number.isFinite(run60.line.x + run60.line.y + run60.line.z), `${who}: the line stays a number`);
    ok(run60.maxSpeed < run60.maxHeli * 1.6 + 3, `${who}: no runaway speed (line ${run60.maxSpeed.toFixed(1)} m/s, helicopter ${run60.maxHeli.toFixed(1)} m/s)`);
    ok(run60.maxStretch < 0.2, `${who}: the cable never stretches more than 20 cm (${(run60.maxStretch * 100).toFixed(1)} cm)`);
    ok(run60.worstGap > CABLE.bodyRadius, `${who}: the line never swings into the helicopter`);
    ok(!types(run60.events).includes('cargoHit'), `${who}: and hits nothing`);
    eq(run60.line.who, who, `${who}: nobody changes on the way`);
  }
}

// The same inputs give the same results, to the last digit.
{
  const finger = ({heli, line, events}) => `${heliFingerprint(heli)}|${[line.x, line.y, line.z, line.vx, line.vy, line.vz, line.massKg].map(v => v.toFixed(6)).join('|')}|${types(events).join()}`;
  eq(finger(flightWith('pair', 20)), finger(flightWith('pair', 20)), 'the same flight with the line gives the same fingerprint');
  const holdPrint = () => {
    const line = createRescueLine({x: 41, z: -9, ground: flat});
    const events = rules(line, still(41, -9), 9, {target, kind: 'hoist'});
    return `${types(events).join()}|${line.hold}|${line.who}|${line.massKg}`;
  };
  eq(holdPrint(), holdPrint(), 'and the same hold gives the same events');
  const before = JSON.stringify(createRescueLine({ground: flat}));
  eq(before, JSON.stringify(createRescueLine({ground: flat})), 'a new line is the same every time');
}

console.log(`test-heli-rescue: ${checks} checks passed`);
